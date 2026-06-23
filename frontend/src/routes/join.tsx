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

interface InviteInfo {
  id: string;
  token: string;
  startup_id: string | null;
  investor_profile_id: string | null;
  email: string;
  role: string;
  invited_by: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  startups: { company_name: string | null; founder_name: string | null } | null;
  investor_profiles: { your_name: string | null; fund_name: string | null } | null;
}

type PageState = "loading" | "invalid" | "expired" | "already_accepted" | "valid" | "accepted";

function JoinTeamPage() {
  const { token } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
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
    const { data, error } = await supabase
      .from("team_invites")
      .select(`
        id, token, startup_id, investor_profile_id,
        email, role, invited_by, expires_at, accepted_at,
        startups (company_name, founder_name),
        investor_profiles!investor_profile_id (your_name, fund_name)
      `)
      .eq("token", token!)
      .maybeSingle();

    if (error || !data) { setPageState("invalid"); return; }
    if (data.accepted_at) { setInvite(data as InviteInfo); setPageState("already_accepted"); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setInvite(data as InviteInfo); setPageState("expired"); return; }
    setInvite(data as InviteInfo);
    setPageState("valid");
  }

  async function handleAccept() {
    if (!invite) return;
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

      // Block self-acceptance: the person who sent the invite cannot be the
      // same account that accepts it.
      if (freshUser.id === invite.invited_by) {
        toast.error("You cannot accept your own invitation. Open this link in a private window or sign in with the invited account.");
        setAccepting(false);
        return;
      }

      // 1. Insert into startup_team_accounts
      const { error: accountErr } = await supabase.from("startup_team_accounts").insert({
        startup_id: invite.startup_id ?? null,
        investor_profile_id: invite.investor_profile_id ?? null,
        user_id: freshUser.id,
        role: invite.role,
        invite_id: invite.id,
        invited_by: invite.invited_by,
        display_name: freshUser.user_metadata?.full_name ?? "",
        avatar_url: null,
      });
      if (accountErr) {
        if (accountErr.code === "23505") {
          // Already a member — mark accepted anyway
          await supabase.from("team_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
          setPageState("accepted");
          return;
        }
        throw accountErr;
      }

      // 2. Mark invite accepted
      await supabase.from("team_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

      // 3. Create empty team_member_profiles row
      await supabase
        .from("team_member_profiles")
        .upsert({ user_id: freshUser.id }, { onConflict: "user_id", ignoreDuplicates: true });

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

  // Derive display name for the team being joined
  const isStartupInvite = !!invite?.startup_id;
  const isInvestorInvite = !!invite?.investor_profile_id;
  const companyName = isStartupInvite
    ? (invite?.startups?.company_name ?? "the company")
    : isInvestorInvite
      ? (invite?.investor_profiles?.fund_name
          ? `${invite.investor_profiles.fund_name} (${invite.investor_profiles.your_name ?? "investment team"})`
          : (invite?.investor_profiles?.your_name ?? "the investment team"))
      : "the team";
  const inviterName = isStartupInvite
    ? (invite?.startups?.founder_name ?? "The team")
    : (invite?.investor_profiles?.your_name ?? "The team");
  const roleLabel = invite ? (invite.role.charAt(0).toUpperCase() + invite.role.slice(1)) : "";

  if (pageState === "accepted") {
    return (
      <PublicShell>
        <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={24} style={{ color: "#10B981" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Welcome to {companyName}!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.6 }}>
            You've joined as <strong style={{ color: "#fff" }}>{roleLabel}</strong>. Complete your team profile to get started.
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
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}
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
          <Loader2 size={28} style={{ color: "#7C3AED", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      </PublicShell>
    );
  }

  if (pageState === "invalid") {
    return (
      <PublicShell>
        <ErrorCard
          title="Invitation not found"
          message="This invitation link is invalid or has already been used. Ask the team admin to send a new invitation."
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
          message={`This invitation has expired. Ask ${companyName} to send a new invitation.`}
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
          message="You have already joined this team."
          cta={{ label: "Go to your dashboard →", href: "/app" }}
          success
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {/* Invite card */}
        <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Team invitation
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            Join {companyName}
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 16 }}>
            {inviterName} invited you to join{" "}
            <strong style={{ color: "#fff" }}>{companyName}</strong> as a{" "}
            <strong style={{ color: "#7C3AED" }}>{roleLabel}</strong> on Hockystick.
          </p>
          <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            Invite sent to <strong style={{ color: "#fff" }}>{invite?.email}</strong>
          </div>
        </div>

        {/* Auth / Accept */}
        {user ? (
          <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              Signed in as <strong style={{ color: "#fff" }}>{user.email}</strong>
            </div>
            {/* Block self-acceptance — same account as the sender */}
            {user.id === invite?.invited_by ? (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#EF4444", lineHeight: 1.6, textAlign: "left" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>You sent this invite — you can't accept your own invitation.</strong>
                To accept, open this link in a private/incognito window and sign in as <strong>{invite.email}</strong>, or sign out first.
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : (
          <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3 }}>
              {(["signup", "signin"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthError(""); }}
                  style={{
                    flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 500, borderRadius: 6,
                    border: "none", cursor: "pointer",
                    background: authMode === m ? "#7C3AED" : "transparent",
                    color: authMode === m ? "#fff" : "rgba(255,255,255,0.4)",
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
  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: "#fff",
  outline: "none", boxSizing: "border-box",
};

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32 }}>
        <Logo withWordmark />
      </div>
      {children}
      <div style={{ marginTop: 32, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
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
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
      <a
        href={cta.href}
        style={{ display: "inline-block", background: "#7C3AED", color: "#fff", textDecoration: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 500 }}
      >
        {cta.label}
      </a>
    </div>
  );
}
