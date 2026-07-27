import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

  // org_name / inviter_name are resolved server-side in preview_team_invite
  const companyName = invite?.org_name ?? "the team";
  const inviterName = invite?.inviter_name ?? "The team";
  const roleLabel = invite?.role ? (invite.role.charAt(0).toUpperCase() + invite.role.slice(1)) : "";

  if (pageState === "accepted") {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={24} style={{ color: "#10B981" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
            Welcome to {companyName}!
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.6 }}>
            You've joined as <strong style={{ color: "var(--foreground)" }}>{roleLabel}</strong>. Complete your team profile to get started.
          </p>
          <button
            onClick={() => navigate({ to: "/app/member-profile" as any })}
            style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Complete my profile →
          </button>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate({ to: "/app" as any })}
              style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer" }}
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
          <Loader2 size={28} style={{ color: "var(--brand)", animation: "spin 1s linear infinite", margin: "0 auto" }} />
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
          cta={{ label: "Go to hockystick.app →", href: "/" }}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {/* Invite card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Team invitation
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>
            Join {companyName}
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 16 }}>
            {inviterName} invited you to join{" "}
            <strong style={{ color: "var(--foreground)" }}>{companyName}</strong> as a{" "}
            <strong style={{ color: "var(--brand)" }}>{roleLabel}</strong> on Hockystick.
          </p>
          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            Invite sent to <strong style={{ color: "var(--foreground)" }}>{invite?.email}</strong>
          </div>
        </div>

        {/* Auth / Accept */}
        {user ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Signed in as <strong style={{ color: "var(--foreground)" }}>{user.email}</strong>
            </div>
            {/* Self-acceptance and email-match are enforced server-side by
                accept_team_invite (SECURITY DEFINER) — this preview never
                receives invited_by, so it can't pre-flight that specific
                case client-side; a mismatch surfaces as a toast from the
                RPC's response on click. */}
            {user.email !== invite?.email && (
              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#F59E0B", marginBottom: 16 }}>
                Note: this invite was sent to {invite?.email}. Make sure you're accepting with the right account.
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={accepting}
              style={{
                width: "100%", background: "#7C3AED", color: "#fff", border: "none",
                borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 600,
                cursor: accepting ? "not-allowed" : "pointer", opacity: accepting ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {accepting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Accept and join {companyName}
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
                    background: authMode === m ? "#7C3AED" : "transparent",
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
              <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>{authError}</div>
            )}

            <button
              onClick={handleAuth}
              disabled={authing}
              style={{
                width: "100%", background: "#7C3AED", color: "#fff", border: "none",
                borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 600,
                cursor: authing ? "not-allowed" : "pointer", opacity: authing ? 0.7 : 1,
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
        style={{ display: "inline-block", background: "#7C3AED", color: "#fff", textDecoration: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 500 }}
      >
        {cta.label}
      </a>
    </div>
  );
}
