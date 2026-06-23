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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Link as LinkIcon, AlertTriangle, Check, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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

const dark = "#0A0A0B";
const card = { background: "#111114", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16 };
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#18181C", border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#FAFAFA",
  outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", background: "#7C3AED", color: "#fff", border: "none",
  borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
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

      // Fetch investor name/fund
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("fund_name, your_name")
        .eq("user_id", link.investor_id)
        .maybeSingle();

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
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role: "founder" } },
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
    <div style={{ minHeight: "100vh", background: dark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif", letterSpacing: "-0.5px" }}>
          Hocky<span style={{ color: "#7C3AED" }}>stick</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Where deals get done</div>
      </div>

      <div style={{ ...card, padding: 32, width: "100%", maxWidth: 420 }}>
        {pageState === "loading" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "#7C3AED" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 12 }}>Verifying invite link…</p>
          </div>
        )}

        {pageState === "invalid" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <AlertTriangle className="h-8 w-8 mx-auto" style={{ color: "#F59E0B" }} />
            <div style={{ color: "#fff", fontWeight: 600, marginTop: 12, fontFamily: "Syne, sans-serif" }}>Link not valid</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              This invite link may have expired or already been used. Ask your contact to send a fresh link.
            </p>
          </div>
        )}

        {pageState === "authed" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Check className="h-8 w-8 mx-auto" style={{ color: "#10B981" }} />
            <div style={{ color: "#fff", fontWeight: 600, marginTop: 12, fontFamily: "Syne, sans-serif" }}>Connected</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>Redirecting to your dashboard…</p>
          </div>
        )}

        {pageState === "valid" && !authLoading && !user && (
          <>
            {/* Investor context banner */}
            {linkInfo && (
              <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 10, padding: "12px 14px", marginBottom: 24, display: "flex", gap: 10 }}>
                <Building2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#A855F7" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {linkInfo.fund_name ?? "An investor"} invited you
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.5 }}>
                    Create your founder profile to connect and manage your fundraising in one place.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {(["signup", "signin"] as const).map((mode) => (
                <button key={mode} onClick={() => setAuthMode(mode)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: authMode === mode ? "#7C3AED" : "rgba(255,255,255,0.05)",
                    color: authMode === mode ? "#fff" : "rgba(255,255,255,0.4)" }}>
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
                <div style={{ fontSize: 12, color: "#EF4444", padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>{authError}</div>
              )}

              <button type="submit" disabled={authing} style={{ ...btnPrimary, opacity: authing ? 0.6 : 1 }}>
                {authing
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Continuing…</span>
                  : authMode === "signup" ? "Create account & connect" : "Sign in & connect"
                }
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <a href="/auth/google" style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none" }}>
                Or continue with Google →
              </a>
            </div>
          </>
        )}
      </div>

      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 20, textAlign: "center" }}>
        By joining, you agree to Hockystick's terms of service.
      </p>
    </div>
  );
}
