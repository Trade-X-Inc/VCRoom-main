import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

// Legal/compliance audit, 13 Sep 2026: this account-creation flow had no
// Terms/Privacy acceptance at all (join-room.tsx had the same gap;
// join-investor.$token.tsx had an unlinked sentence with no real link,
// no checkbox, and no record of acceptance). TERMS_VERSION mirrors the
// "last updated" date already on legal.terms.tsx/legal.privacy.tsx —
// bump it whenever either document's substance changes, not on every
// edit, so an acceptance record stays meaningfully tied to what was
// actually agreed to.
const TERMS_VERSION = "2026-08-26";

export const Route = createFileRoute("/join")({
  component: JoinTeamPage,
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
});

interface InvitePreview {
  valid: boolean;
  org_name?: string;
  inviter_name?: string;
  role?: string;
  expires_at?: string | null;
  email?: string;
}

type PageState = "loading" | "invalid" | "valid" | "accepted";

function JoinTeamPage() {
  const { token } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [accepting, setAccepting] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authError, setAuthError] = useState("");
  const [authing, setAuthing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    loadInvite();
  }, [token]);

  async function loadInvite() {
    setPageState("loading");
    // preview_team_invite is a SECURITY DEFINER RPC — team_invites itself is
    // deny-all for anon/authenticated. Token possession is the intended
    // authorization to see this preview (same model as a password-reset
    // link); it is NOT the authorization to accept — see handleAccept.
    const { data, error } = await supabase.rpc("preview_team_invite", { p_token: token });
    if (error || !data?.valid) { setPageState("invalid"); return; }
    setInvite(data as InvitePreview);
    setPageState("valid");
  }

  async function handleAccept() {
    if (!invite || !token) return;
    setAccepting(true);
    try {
      // Always fetch a fresh session at accept-time — never trust the hook's
      // potentially-stale closure value, which could still hold a prior
      // user's session (e.g. the founder who sent the invite testing the link
      // while logged in as themselves).
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) {
        toast.error("Session expired — please sign in again.");
        setAccepting(false);
        return;
      }

      // accept_team_invite (SECURITY DEFINER) does everything server-side:
      // re-verifies the caller's real email against the invite's email,
      // blocks self-acceptance, enforces single-use, and creates the
      // startup_team_accounts / team_member_profiles rows. The client never
      // writes these tables directly — token possession only got the caller
      // this far (a preview + a signup form); this call is what actually
      // gates joining.
      const { data, error } = await supabase.rpc("accept_team_invite", { p_token: token });
      if (error) throw error;
      if (!data?.ok) {
        const messages: Record<string, string> = {
          not_authenticated: "Session expired — please sign in again.",
          invalid_token: "This invitation link is invalid or has already been used.",
          already_accepted: "You have already joined this team.",
          expired: "This invitation has expired.",
          email_mismatch: "This invite was sent to a different email address. Sign in with the invited account to accept.",
          self_acceptance: "You cannot accept your own invitation. Open this link in a private window or sign in with the invited account.",
        };
        toast.error(messages[data?.error] ?? "Could not accept invitation");
        setAccepting(false);
        return;
      }

      setPageState("accepted");
    } catch (e: any) {
      toast.error(e.message ?? "Could not accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  async function handleAuth() {
    // preview_team_invite only ever includes `email` when valid:true, and
    // pageState only reaches the auth form in that case — but the type is
    // optional since the RPC omits it for a dead token, so guard explicitly.
    if (!invite?.email) return;
    setAuthing(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        if (!signupName.trim()) { setAuthError("Enter your name"); setAuthing(false); return; }
        if (signupPassword.length < 6) { setAuthError("Password must be at least 6 characters"); setAuthing(false); return; }
        if (!termsAccepted) { setAuthError("You must agree to the Terms of Service and Privacy Policy to continue"); setAuthing(false); return; }
        const { error } = await supabase.auth.signUp({
          email: invite.email,
          password: signupPassword,
          options: {
            data: {
              full_name: signupName.trim(),
              terms_accepted_at: new Date().toISOString(),
              terms_version: TERMS_VERSION,
            },
          },
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

  // org_name / inviter_name are resolved server-side in preview_team_invite
  const companyName = invite?.org_name ?? "the team";
  const inviterName = invite?.inviter_name ?? "The team";
  const roleLabel = invite?.role ? (invite.role.charAt(0).toUpperCase() + invite.role.slice(1)) : "";

  if (pageState === "accepted") {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={24} style={{ color: "#059669" }} />
          </div>
          <h2 style={{ fontFamily: FONT_SEMIBOLD, fontSize: 20, color: INK, marginBottom: 8 }}>
            Welcome to {companyName}!
          </h2>
          <p style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: INK_MUTED, marginBottom: 24, lineHeight: 1.6 }}>
            You've joined as <strong style={{ fontFamily: FONT_MEDIUM, color: INK }}>{roleLabel}</strong>. Complete your team profile to get started.
          </p>
          <button
            onClick={() => navigate({ to: "/app/member-profile" as any })}
            style={{ fontFamily: FONT_SEMIBOLD, background: INK, color: "#fff", border: "none", padding: "11px 24px", fontSize: 14, cursor: "pointer" }}
          >
            Complete my profile →
          </button>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate({ to: "/app" as any })}
              style={{ fontFamily: FONT_REGULAR, background: "transparent", border: "none", color: INK_FAINT, fontSize: 13, cursor: "pointer" }}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </PublicShell>
    );
  }

  if (pageState === "loading" || authLoading) {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Loader2 size={28} style={{ color: INK, animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </PublicShell>
    );
  }

  if (pageState === "invalid") {
    // Covers invalid, expired, and already-accepted alike — the preview RPC
    // deliberately returns only {valid:false} for all three, without
    // distinguishing which, so a dead token can't be used to probe whether
    // it ever existed or in what state.
    return (
      <PublicShell>
        <ErrorCard
          title="Invitation not available"
          message="This invitation link is invalid, expired, or has already been used. Ask the team admin to send a new invitation."
          cta={{ label: "Go to lengdon.com →", href: "/" }}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {/* Invite card */}
        <div style={{ background: "#fff", border: `1px solid ${RULE}`, padding: 28, marginBottom: 20 }}>
          <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, color: INK_FAINT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Team invitation
          </div>
          <h2 style={{ fontFamily: FONT_SEMIBOLD, fontSize: 20, color: INK, marginBottom: 6 }}>
            Join {companyName}
          </h2>
          <p style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: INK_MUTED, lineHeight: 1.6, marginBottom: 16 }}>
            {inviterName} invited you to join{" "}
            <strong style={{ fontFamily: FONT_MEDIUM, color: INK }}>{companyName}</strong> as a{" "}
            <strong style={{ fontFamily: FONT_MEDIUM, color: INK }}>{roleLabel}</strong> on Lengdon.
          </p>
          <div style={{ background: "#f8f9fb", border: `1px solid ${RULE}`, padding: "10px 14px", fontSize: 12, color: INK_MUTED, lineHeight: 1.5 }}>
            Invite sent to <strong style={{ fontFamily: FONT_MEDIUM, color: INK }}>{invite?.email}</strong>
          </div>
        </div>

        {/* Auth / Accept */}
        {user ? (
          <div style={{ background: "#fff", border: `1px solid ${RULE}`, padding: 24, textAlign: "center" }}>
            <div style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: INK_MUTED, marginBottom: 16 }}>
              Signed in as <strong style={{ fontFamily: FONT_MEDIUM, color: INK }}>{user.email}</strong>
            </div>
            {/* Self-acceptance and email-match are enforced server-side by
                accept_team_invite (SECURITY DEFINER) — this preview never
                receives invited_by, so it can't pre-flight that specific
                case client-side; a mismatch surfaces as a toast from the
                RPC's response on click. */}
            {user.email !== invite?.email && (
              <div style={{ fontFamily: FONT_REGULAR, background: "#FFFBEB", border: "1px solid #FDE68A", padding: "8px 12px", fontSize: 12, color: "#92400E", marginBottom: 16 }}>
                Note: this invite was sent to {invite?.email}. Make sure you're accepting with the right account.
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                fontFamily: FONT_SEMIBOLD,
                width: "100%", background: INK, color: "#fff", border: "none",
                padding: "12px 24px", fontSize: 14,
                cursor: accepting ? "not-allowed" : "pointer", opacity: accepting ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {accepting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Accept and join {companyName}
            </button>
          </div>
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${RULE}`, padding: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8f9fb", padding: 3 }}>
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthError(""); }}
                  style={{
                    fontFamily: FONT_MEDIUM,
                    flex: 1, padding: "7px 0", fontSize: 12,
                    border: "none", cursor: "pointer",
                    background: authMode === m ? INK : "transparent",
                    color: authMode === m ? "#fff" : INK_MUTED,
                  }}
                >
                  {m === "signup" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>

            {authMode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Your name</label>
                <input
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Full name"
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email</label>
              <input
                value={invite?.email ?? ""}
                readOnly
                style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
              />
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

            {authError && (
              <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{authError}</div>
            )}

            {authMode === "signup" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => { setTermsAccepted(e.target.checked); setAuthError(""); }}
                  style={{ marginTop: 2, width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_MUTED, lineHeight: 1.5 }}>
                  I agree to Lengdon's{" "}
                  <Link to="/legal/terms" target="_blank" style={{ color: INK }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/legal/privacy" target="_blank" style={{ color: INK }}>Privacy Policy</Link>.
                </span>
              </label>
            )}

            <button
              onClick={handleAuth}
              disabled={authing || (authMode === "signup" && !termsAccepted)}
              style={{
                fontFamily: FONT_SEMIBOLD,
                width: "100%", background: INK, color: "#fff", border: "none",
                padding: "11px 24px", fontSize: 13,
                cursor: (authing || (authMode === "signup" && !termsAccepted)) ? "not-allowed" : "pointer",
                opacity: (authing || (authMode === "signup" && !termsAccepted)) ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {authing ? <Loader2 size={14} className="animate-spin" /> : null}
              {authMode === "signup" ? `Create account to join ${companyName}` : `Sign in to accept invitation`}
            </button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

const INK = "#0a2540";
const INK_MUTED = "#425466";
const INK_FAINT = "#64748b";
const RULE = "#e6e9ef";
const FONT_SEMIBOLD = "'Geist:SemiBold', sans-serif";
const FONT_MEDIUM = "'Inter:Medium', sans-serif";
const FONT_REGULAR = "'Inter:Regular', sans-serif";

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_MEDIUM, fontSize: 11, color: INK_MUTED,
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  fontFamily: FONT_REGULAR,
  width: "100%", background: "#fff",
  border: `1px solid ${RULE}`,
  padding: "10px 12px", fontSize: 13, color: INK,
  outline: "none", boxSizing: "border-box",
};

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <Logo withWordmark />
      </div>
      {children}
      <div style={{ fontFamily: FONT_REGULAR, marginTop: 32, fontSize: 11, color: INK_FAINT }}>
        Lengdon · Where deals get done
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
        width: 52, height: 52,
        background: success ? "#ECFDF5" : "#FEF2F2",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
      }}>
        {success
          ? <Check size={22} style={{ color: "#059669" }} />
          : <AlertTriangle size={22} style={{ color: "#DC2626" }} />}
      </div>
      <h2 style={{ fontFamily: FONT_SEMIBOLD, fontSize: 18, color: INK, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: INK_MUTED, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
      <a
        href={cta.href}
        style={{ fontFamily: FONT_SEMIBOLD, display: "inline-block", background: INK, color: "#fff", textDecoration: "none", padding: "11px 24px", fontSize: 13 }}
      >
        {cta.label}
      </a>
    </div>
  );
}
