import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// R14B — lawyer / legal counsel room-scoped join. Deliberately separate
// from join.tsx: that route always creates a startup_team_accounts row
// (fund-wide); a lawyer must never exist as anything but a
// deal_room_members row in exactly this room. Same UI shell and auth
// pattern as join.tsx (reuse, not a parallel design), different
// acceptance target (accept_lawyer_invite RPC, not a direct table insert).
export const Route = createFileRoute("/join-room")({
  component: JoinRoomPage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
});

interface LawyerInviteInfo {
  id: string;
  deal_room_id: string;
  side: "founder" | "investor";
  email: string;
  expires_at: string | null;
  accepted_at: string | null;
  company_name: string | null;
  investor_name: string | null;
}

type PageState = "loading" | "invalid" | "expired" | "already_accepted" | "valid" | "accepted";

function JoinRoomPage() {
  const { token } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<LawyerInviteInfo | null>(null);
  const [dealRoomId, setDealRoomId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authError, setAuthError] = useState("");
  const [authing, setAuthing] = useState(false);

  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadInvite() {
    setPageState("loading");
    const { data, error } = await supabase.rpc("get_lawyer_invite_by_token", { p_token: token });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { setPageState("invalid"); return; }
    if (row.accepted_at) { setInvite(row); setPageState("already_accepted"); return; }
    if (row.expires_at && new Date(row.expires_at) < new Date()) { setInvite(row); setPageState("expired"); return; }
    setInvite(row);
    setPageState("valid");
  }

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      // Always fetch a fresh session at accept-time, never the hook's
      // possibly-stale closure — same rule as join.tsx.
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) {
        toast.error("Session expired — please sign in again.");
        setAccepting(false);
        return;
      }

      const { data, error } = await supabase.rpc("accept_lawyer_invite", { p_token: token });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result?.ok) {
        const msg = result?.error === "self_acceptance_blocked"
          ? "You sent this invite — you can't accept your own invitation. Open this link in a private window or sign in with the invited account."
          : result?.error === "already_accepted"
            ? "This invitation has already been accepted."
            : result?.error === "expired"
              ? "This invitation has expired."
              : "Could not accept invitation.";
        toast.error(msg);
        setAccepting(false);
        return;
      }

      setDealRoomId(result.deal_room_id);
      setPageState("accepted");
    } catch (e: any) {
      toast.error(e.message ?? "Could not accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  async function handleAuth() {
    if (!invite) return;
    setAuthing(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        if (!signupName.trim()) { setAuthError("Enter your name"); setAuthing(false); return; }
        if (signupPassword.length < 6) { setAuthError("Password must be at least 6 characters"); setAuthing(false); return; }
        const { error } = await supabase.auth.signUp({
          email: invite.email,
          password: signupPassword,
          options: { data: { full_name: signupName.trim() } },
        });
        if (error) throw error;
        toast.success("Account created — please check your email to confirm, then sign in.");
        setAuthMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password: signupPassword,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setAuthError(e.message ?? "Authentication failed");
    } finally {
      setAuthing(false);
    }
  }

  const companyName = invite?.company_name ?? "the company";
  const sideLabel = invite?.side === "founder" ? "the founder side" : "the investor side";

  if (pageState === "accepted") {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={24} style={{ color: "#10B981" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
            You're in — as Legal Counsel
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.6 }}>
            You'll need to sign the room's NDA before you can access anything inside.
          </p>
          <button
            onClick={() => dealRoomId && navigate({ to: "/app/deal-rooms/$id/nda", params: { id: dealRoomId } })}
            style={{ background: "var(--gradient-brand)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Continue to the deal room →
          </button>
        </div>
      </PublicShell>
    );
  }

  if (pageState === "loading" || authLoading) {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Loader2 size={28} style={{ color: "var(--brand)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </PublicShell>
    );
  }

  if (pageState === "invalid") {
    return (
      <PublicShell>
        <ErrorCard
          title="Invitation not found"
          message="This invitation link is invalid or has already been used. Ask whoever invited you to send a new invitation."
          cta={{ label: "Go to hockystick.app →", href: "/" }}
        />
      </PublicShell>
    );
  }

  if (pageState === "expired") {
    return (
      <PublicShell>
        <ErrorCard
          title="Invitation expired"
          message={`This invitation has expired. Ask your contact at ${companyName} to send a new invitation.`}
          cta={{ label: "Go to hockystick.app →", href: "/" }}
        />
      </PublicShell>
    );
  }

  if (pageState === "already_accepted") {
    return (
      <PublicShell>
        <ErrorCard
          title="Already joined"
          message="This invitation has already been accepted."
          cta={{ label: "Go to your dashboard →", href: "/app" }}
          success
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Legal counsel invitation
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
            {companyName} deal room
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 16 }}>
            You've been invited to represent <strong style={{ color: "var(--foreground)" }}>{sideLabel}</strong> for the Investment Terms stage of this deal room.
          </p>
          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            Access is scoped to the deal summary, term sheet, the Investment Terms meeting, and its records only — not earlier-stage documents or diligence.
          </div>
        </div>

        {user ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Signed in as <strong style={{ color: "var(--foreground)" }}>{user.email}</strong>
            </div>
            {user.email !== invite?.email && (
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#F59E0B", marginBottom: 16 }}>
                Note: this invite was sent to {invite?.email}. Make sure you're accepting with the right account.
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: "100%", background: "var(--gradient-brand)", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600,
                cursor: accepting ? "not-allowed" : "pointer", opacity: accepting ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {accepting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Accept and join as Legal Counsel
            </button>
          </div>
        ) : (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--accent)", borderRadius: 8, padding: 3 }}>
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthError(""); }}
                  style={{
                    flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 500, borderRadius: 6,
                    border: "none", cursor: "pointer",
                    background: authMode === m ? "var(--gradient-brand)" : "transparent",
                    color: authMode === m ? "#fff" : "var(--muted-foreground)",
                  }}
                >
                  {m === "signup" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>

            {authMode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Your name</label>
                <input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full name" style={inputStyle} />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input value={invite?.email ?? ""} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
            </div>

            <div style={{ marginBottom: authError ? 10 : 18 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder={authMode === "signup" ? "Create a password (min 6 chars)" : "Your password"}
                style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") handleAuth(); }}
              />
            </div>

            {authError && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{authError}</div>}

            <button
              onClick={handleAuth}
              disabled={authing}
              style={{
                width: "100%", background: "var(--gradient-brand)", color: "#fff", border: "none",
                borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 600,
                cursor: authing ? "not-allowed" : "pointer", opacity: authing ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {authing ? <Loader2 size={14} className="animate-spin" /> : null}
              {authMode === "signup" ? "Create account to continue" : "Sign in to accept invitation"}
            </button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--accent)",
  border: "1px solid var(--border)", borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: "var(--foreground)",
  outline: "none", boxSizing: "border-box",
};

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <Logo withWordmark />
      </div>
      {children}
      <div style={{ marginTop: 32, fontSize: 11, color: "var(--faint)" }}>
        Hockystick · Where deals get done
      </div>
    </div>
  );
}

function ErrorCard({
  title, message, cta, success = false,
}: {
  title: string; message: string; cta: { label: string; href: string }; success?: boolean;
}) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: success ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        {success
          ? <Check size={22} style={{ color: "#10B981" }} />
          : <AlertTriangle size={22} style={{ color: "#EF4444" }} />}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
      <a
        href={cta.href}
        style={{ display: "inline-block", background: "var(--gradient-brand)", color: "#fff", textDecoration: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 500 }}
      >
        {cta.label}
      </a>
    </div>
  );
}
