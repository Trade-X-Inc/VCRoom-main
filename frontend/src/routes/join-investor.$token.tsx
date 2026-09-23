/**
 * /join-investor/$token — Founder joins via an investor's personal invite link.
 *
 * Flow:
 * 1. Validate token against investor_invite_links (active = true)
 * 2. Show investor fund name so the founder knows who invited them
 * 3. Founder signs up / logs in normally
 * 4. On auth: store token in sessionStorage, redirect to /app/profile-builder
 * 5. Profile-builder confirms profile → fires processInviteLinkJoin
 *    (that server fn inserts watchlist row, increments uses_count, sends notification)
 *
 * The sessionStorage key "pending_investor_invite_token" is read by
 * app.profile.tsx after the founder saves their profile for the first time.
 */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Link as LinkIcon, AlertTriangle, Check, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

// Legal/compliance audit, 13 Sep 2026: replaced the bare, unlinked
// "By joining, you agree to Lengdon's terms of service." sentence at
// the bottom of this page with a real checkbox — linked documents,
// required before signup, and recorded on the account (terms_accepted_at
// / terms_version in user_metadata). See join.tsx's TERMS_VERSION
// comment for the versioning convention.
const TERMS_VERSION = "2026-08-26";

export const Route = createFileRoute("/join-investor/$token")({
  component: JoinViaInviteLinkPage,
});

interface LinkInfo {
  id: string;
  investor_id: string;
  token: string;
  label: string | null;
  uses_count: number;
  fund_name?: string;
  investor_name?: string;
}

type PageState = "loading" | "invalid" | "valid" | "authed";

const INK = "#0a2540";
const INK_MUTED = "#425466";
const INK_FAINT = "#64748b";
const RULE = "#e6e9ef";
const FONT_SEMIBOLD = "'Geist:SemiBold', sans-serif";
const FONT_MEDIUM = "'Inter:Medium', sans-serif";
const FONT_REGULAR = "'Inter:Regular', sans-serif";

const card = { background: "#fff", border: `1px solid ${RULE}` };
const inputStyle: React.CSSProperties = {
  fontFamily: FONT_REGULAR,
  width: "100%", background: "#fff", border: `1px solid ${RULE}`,
  padding: "10px 14px", fontSize: 14, color: INK,
  outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  fontFamily: FONT_SEMIBOLD,
  width: "100%", background: INK, color: "#fff", border: "none",
  padding: "11px 0", fontSize: 14, cursor: "pointer",
};

function JoinViaInviteLinkPage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [authing, setAuthing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load link info
  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    (async () => {
      const { data: link } = await supabase
        .from("investor_invite_links")
        .select("id, investor_id, token, label, uses_count")
        .eq("token", token)
        .eq("active", true)
        .maybeSingle();

      if (!link) { setPageState("invalid"); return; }

      // Fetch investor name/fund — anon-callable whitelist RPC, since this
      // page can be viewed by an unauthenticated visitor before signup.
      // investor_profiles has no bare peer-read RLS anymore.
      const { data: profile } = await supabase.rpc("get_public_investor_profile_by_user_id", {
        p_user_id: link.investor_id,
      });

      setLinkInfo({
        ...link,
        fund_name: profile?.fund_name ?? undefined,
        investor_name: profile?.your_name ?? undefined,
      });
      setPageState("valid");
    })();
  }, [token]);

  // If user already authed, store token + redirect
  useEffect(() => {
    if (!authLoading && user?.id && linkInfo) {
      // Store pending invite token for profile save to pick up
      sessionStorage.setItem("pending_investor_invite_token", token);
      sessionStorage.setItem("pending_investor_invite_link_id", linkInfo.id);
      sessionStorage.setItem("pending_investor_id", linkInfo.investor_id);
      setPageState("authed");
      // Give them a moment to read, then redirect
      setTimeout(() => navigate({ to: "/app" }), 1500);
    }
  }, [user, authLoading, linkInfo, token, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthing(true);
    setAuthError("");
    try {
      if (authMode === "signup" && !termsAccepted) {
        setAuthError("You must agree to the Terms of Service and Privacy Policy to continue");
        setAuthing(false);
        return;
      }
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: "founder",
              terms_accepted_at: new Date().toISOString(),
              terms_version: TERMS_VERSION,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm, then continue.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Logo withWordmark size="lg" />
        <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT, marginTop: 8 }}>Where deals get done</div>
      </div>

      <div style={{ ...card, padding: 32, width: "100%", maxWidth: 420 }}>
        {pageState === "loading" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: INK }} />
            <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginTop: 12 }}>Verifying invite link…</p>
          </div>
        )}

        {pageState === "invalid" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <AlertTriangle className="h-8 w-8 mx-auto" style={{ color: "#B45309" }} />
            <div style={{ fontFamily: FONT_SEMIBOLD, color: INK, marginTop: 12 }}>Link not valid</div>
            <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              This invite link may have expired or already been used. Ask your contact to send a fresh link.
            </p>
          </div>
        )}

        {pageState === "authed" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Check className="h-8 w-8 mx-auto" style={{ color: "#059669" }} />
            <div style={{ fontFamily: FONT_SEMIBOLD, color: INK, marginTop: 12 }}>Connected</div>
            <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginTop: 8 }}>Redirecting to your dashboard…</p>
          </div>
        )}

        {pageState === "valid" && !authLoading && !user && (
          <>
            {/* Investor context banner */}
            {linkInfo && (
              <div style={{ background: "#f8f9fb", border: `1px solid ${RULE}`, padding: "12px 14px", marginBottom: 24, display: "flex", gap: 10 }}>
                <Building2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: INK }} />
                <div>
                  <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, color: INK }}>
                    {linkInfo.fund_name ?? "An investor"} invited you
                  </div>
                  <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_MUTED, marginTop: 2, lineHeight: 1.5 }}>
                    Create your founder profile to connect and manage your fundraising in one place.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {(["signup", "signin"] as const).map((mode) => (
                <button key={mode} onClick={() => setAuthMode(mode)}
                  style={{ fontFamily: FONT_MEDIUM, flex: 1, padding: "8px 0", border: "none", fontSize: 13, cursor: "pointer",
                    background: authMode === mode ? INK : "#f8f9fb",
                    color: authMode === mode ? "#fff" : INK_MUTED }}>
                  {mode === "signup" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {authMode === "signup" && (
                <input style={inputStyle} placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
              )}
              <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />

              {authError && (
                <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: "#DC2626", padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA" }}>{authError}</div>
              )}

              {authMode === "signup" && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
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
                type="submit"
                disabled={authing || (authMode === "signup" && !termsAccepted)}
                style={{ ...btnPrimary, opacity: (authing || (authMode === "signup" && !termsAccepted)) ? 0.5 : 1, cursor: (authing || (authMode === "signup" && !termsAccepted)) ? "not-allowed" : "pointer" }}
              >
                {authing
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Continuing…</span>
                  : authMode === "signup" ? "Create account & connect" : "Sign in & connect"
                }
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <a href="/auth/google" style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 12, textDecoration: "none" }}>
                Or continue with Google →
              </a>
            </div>
          </>
        )}
      </div>

      <p style={{ fontFamily: FONT_REGULAR, color: INK_FAINT, fontSize: 11, marginTop: 20, textAlign: "center" }}>
        <Link to="/legal/terms" style={{ color: INK_FAINT }}>Terms of Service</Link>
        {" "}·{" "}
        <Link to="/legal/privacy" style={{ color: INK_FAINT }}>Privacy Policy</Link>
      </p>
    </div>
  );
}
