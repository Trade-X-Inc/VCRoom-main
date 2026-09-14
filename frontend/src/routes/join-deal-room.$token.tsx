import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { LcsCard, LcsButton, LcsStatusPill } from "@/components/lcs";

// Build Step 2 — the deal-room invite link join screen. Per the approved
// component plan: composed from existing LCS content primitives, no new
// visual language invented. Structurally mirrors join-room.tsx's proven
// five-state machine (loading/invalid/expired/already_accepted/valid,
// plus accepted) and its token-preview-then-accept RPC shape
// (get_lawyer_invite_by_token/accept_lawyer_invite), adapted to
// get_deal_room_invite_by_token/accept_deal_room_invite_link.
//
// The one new state this join screen has that join-room.tsx doesn't:
// wrong_role — the accepting user's real account role doesn't match the
// link's intended_role (role-family matching, enforced server-side in
// the accept RPC; this page just renders the rejection).
//
// IMPORTANT, found during this build (9 Sep 2026 dated comment in
// sign-up.tsx, confirmed by reading it): /sign-up is no longer a real
// account-creation page — new signups are paused sitewide and that route
// is now a waitlist form (submits to waitlist_entries/Notion/HubSpot, no
// supabase.auth.signUp call left in it at all). This page therefore does
// NOT redirect there. It does its own inline supabase.auth.signUp, the
// same pattern join-room.tsx and join-investor.$token.tsx both still use
// today, unpaused — invite-driven signup is the live exception to the
// general pause, not something this build introduced. Flagged in the
// build report; not assumed silently.
export const Route = createFileRoute("/join-deal-room/$token")({
  component: JoinDealRoomPage,
});

// Matches get_deal_room_invite_by_token's live return shape exactly —
// pulled via pg_get_functiondef during Build Step 2's reconciliation, not
// assumed. Live-corrected 14 Sep 2026 to include company_name (via
// startups.company_name — NOT startups.name) and investor_name, and to
// return accepted/expired as pre-computed booleans rather than raw
// accepted_at, so no client-side "is this expired" recompute is needed
// (the server's own boundary is expires_at <= now(), not <, per
// accept_deal_room_invite_link's matching check — recomputing client-side
// with the wrong operator would disagree with the server at the exact
// expiry instant). There is no `id` field on this response.
interface InviteInfo {
  deal_room_id: string;
  intended_role: "founder" | "investor";
  expires_at: string | null;
  accepted: boolean;
  expired: boolean;
  company_name: string | null;
  investor_name: string | null;
}

type PageState = "loading" | "invalid" | "expired" | "already_accepted" | "valid" | "accepted";

function JoinDealRoomPage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [dealRoomId, setDealRoomId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [signupName, setSignupName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authing, setAuthing] = useState(false);

  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadInvite() {
    setPageState("loading");
    const { data, error } = await supabase.rpc("get_deal_room_invite_by_token", { p_token: token });
    const row = Array.isArray(data) ? data[0] : data;
    // A token matching no row returns an empty result set (the live
    // function's early `return;` with no rows), not a single null-ish
    // row — so `!row` is the correct "not found" check here.
    if (error || !row) { setPageState("invalid"); return; }
    if (row.accepted) { setInvite(row); setPageState("already_accepted"); return; }
    if (row.expired) { setInvite(row); setPageState("expired"); return; }
    setInvite(row);
    setPageState("valid");
  }

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) {
        toast.error("Session expired — please sign in again.");
        setAccepting(false);
        return;
      }

      const { data, error } = await supabase.rpc("accept_deal_room_invite_link", { p_token: token });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        const msg = result?.error === "self_accept_not_allowed"
          ? "You created this link — you can't accept your own invitation."
          : result?.error === "already_accepted"
            ? "This invitation has already been accepted."
            : result?.error === "expired"
              ? "This invitation has expired."
              : result?.error === "wrong_role"
                ? `This link is for a${invite?.intended_role === "investor" ? "n investor" : " founder"} account. You're signed in with a different account type — sign in with the right account, or ask for a new link.`
                : "Could not accept invitation.";
        toast.error(msg);
        setAccepting(false);
        return;
      }

      // accept_deal_room_invite_link's live return shape is
      // table(ok boolean, error text) — it does NOT return deal_room_id
      // (confirmed via pg_get_functiondef during Build Step 2's
      // reconciliation; this file originally assumed a third column that
      // was never actually returned). The target room is already known
      // from the token preview (get_deal_room_invite_by_token, fetched
      // in loadInvite above), which doesn't change between preview and
      // accept for the same token — reading it from `invite` instead of
      // the accept response is correct, not a workaround.
      setDealRoomId(invite?.deal_room_id ?? null);
      setPageState("accepted");
    } catch (e: any) {
      toast.error(e.message ?? "Could not accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  // Inline signup/signin — mirrors join-room.tsx's and
  // join-investor.$token.tsx's pattern exactly (real supabase.auth calls,
  // not the paused /sign-up waitlist route). Role is forced to the
  // link's intended_role via user_metadata, same as
  // join-investor.$token.tsx's role: "founder" hardcoding — the
  // recipient does not choose their role here, the link already decided
  // it. The server-side role-lock in accept_deal_room_invite_link is
  // still the real enforcement boundary; this metadata is what makes the
  // resulting account actually match it on the happy path.
  async function handleAuth() {
    if (!invite) return;
    setAuthing(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        if (!signupName.trim()) { setAuthError("Enter your name"); setAuthing(false); return; }
        if (!email.trim()) { setAuthError("Enter your email"); setAuthing(false); return; }
        if (password.length < 6) { setAuthError("Password must be at least 6 characters"); setAuthing(false); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: signupName.trim(), role: invite.intended_role } },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then accept the invitation.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e: any) {
      setAuthError(e.message ?? "Authentication failed");
    } finally {
      setAuthing(false);
    }
  }

  const companyName = invite?.company_name ?? "the company";
  const roleLabel = invite?.intended_role === "founder" ? "founder" : "investor";

  if (pageState === "loading" || authLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lcs-ink-muted)" }} />
        </div>
      </Shell>
    );
  }

  if (pageState === "invalid") {
    return (
      <Shell>
        <StateCard
          title="Invitation not found"
          message="This invitation link is invalid or has already been used. Ask whoever invited you to send a new one."
        />
      </Shell>
    );
  }

  if (pageState === "expired") {
    return (
      <Shell>
        <StateCard
          title="Invitation expired"
          message={`This invitation has expired. Ask your contact at ${companyName} to send a new one.`}
        />
      </Shell>
    );
  }

  if (pageState === "already_accepted") {
    return (
      <Shell>
        <StateCard title="Already joined" message="This invitation has already been accepted." success />
      </Shell>
    );
  }

  if (pageState === "accepted") {
    return (
      <Shell>
        <div className="text-center max-w-sm mx-auto">
          <div className="grid h-14 w-14 place-items-center rounded-full mx-auto mb-4" style={{ background: "var(--lcs-satisfied-wash)" }}>
            <Check className="h-6 w-6" style={{ color: "var(--lcs-satisfied)" }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>You're in</h2>
          <p className="text-sm mb-6" style={{ color: "var(--lcs-ink-muted)" }}>
            You've joined {companyName}'s deal room. Both sides complete a short checklist before the room goes live.
          </p>
          <LcsButton
            variant="primary"
            onClick={() => dealRoomId && navigate({ to: "/app/deal-rooms/$id", params: { id: dealRoomId } })}
          >
            Continue to the deal room
          </LcsButton>
        </div>
      </Shell>
    );
  }

  // valid — token preview, then inline sign-in-or-up (role forced via the
  // link's intended_role, matching join-investor.$token.tsx's precedent
  // for how an invite link carries a role decision), then accept.
  return (
    <Shell>
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <LcsCard title="Deal room invitation">
          <div className="p-4 flex flex-col gap-3">
            <div>
              <div className="text-base font-semibold" style={{ color: "var(--lcs-ink)" }}>{companyName} deal room</div>
              <p className="text-sm mt-1" style={{ color: "var(--lcs-ink-muted)" }}>
                You've been invited to join as the {roleLabel}.
              </p>
            </div>
            <LcsStatusPill status="pending" label={`Joins as ${roleLabel}`} dot={false} />
          </div>
        </LcsCard>

        {user ? (
          <LcsCard title="Accept">
            <div className="p-4 flex flex-col gap-3">
              <div className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                Signed in as <strong style={{ color: "var(--lcs-ink)" }}>{user.email}</strong>
              </div>
              <LcsButton variant="primary" onClick={handleAccept} disabled={accepting}>
                {accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept and join as {roleLabel}
              </LcsButton>
            </div>
          </LcsCard>
        ) : (
          <LcsCard title={authMode === "signup" ? "Create your account" : "Sign in"}>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <LcsButton
                  variant={authMode === "signup" ? "primary" : "secondary"}
                  onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                  className="flex-1"
                >
                  Create account
                </LcsButton>
                <LcsButton
                  variant={authMode === "signin" ? "primary" : "secondary"}
                  onClick={() => { setAuthMode("signin"); setAuthError(""); }}
                  className="flex-1"
                >
                  Sign in
                </LcsButton>
              </div>

              {authMode === "signup" && (
                <input
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Your name"
                  className="h-9 px-3 text-sm border"
                  style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink)" }}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-9 px-3 text-sm border"
                style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink)" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "signup" ? "Create a password (min 6 characters)" : "Password"}
                className="h-9 px-3 text-sm border"
                style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink)" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
              />

              {authError && <div className="text-xs" style={{ color: "var(--lcs-attention)" }}>{authError}</div>}

              <LcsButton variant="primary" onClick={handleAuth} disabled={authing}>
                {authing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {authMode === "signup" ? "Create account to continue" : "Sign in to accept invitation"}
              </LcsButton>
            </div>
          </LcsCard>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--lcs-surface)", fontFamily: "var(--font-lcs-ui)" }}>
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}

function StateCard({ title, message, success = false }: { title: string; message: string; success?: boolean }) {
  return (
    <div className="text-center max-w-sm mx-auto">
      <div
        className="grid h-14 w-14 place-items-center rounded-full mx-auto mb-4"
        style={{ background: success ? "var(--lcs-satisfied-wash)" : "var(--lcs-attention-wash)" }}
      >
        {success
          ? <Check className="h-6 w-6" style={{ color: "var(--lcs-satisfied)" }} />
          : <AlertTriangle className="h-6 w-6" style={{ color: "var(--lcs-attention)" }} />}
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>{title}</h2>
      <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>{message}</p>
    </div>
  );
}
