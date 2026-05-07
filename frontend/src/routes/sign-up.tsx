import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuthLayout, Divider, Field, GoogleButton } from "@/components/auth/AuthLayout";
import { supabase } from "@/lib/supabase";
import { type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2, KeyRound, MailCheck, Rocket, TrendingUp, Check, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/sign-up")({
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role === "investor" ? "investor" : "founder") as AppRole,
  }),
  component: SignUpPage,
});

function RoleCard({
  active,
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-4 text-left transition-all",
        active
          ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-glow"
          : "border-border/60 hover:border-border bg-card",
      )}
    >
      {active && (
        <div className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-gradient-brand text-brand-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg",
          active ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-sm font-semibold leading-tight">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </button>
  );
}

function SignUpPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [role, setRole] = useState<AppRole>(search.role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Resend state
  const [countdown, setCountdown] = useState(0);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Tick the countdown down by 1 every second
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { full_name: name || role, role, invite_token: token || null },
        },
      });
      if (signUpError) throw signUpError;

      // Belt-and-suspenders: persist role locally so sign-in can re-save if upsert failed
      localStorage.setItem(`pending_role_${email}`, role);

      // Check if we got an immediate session (email confirmation disabled)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && data.user?.id) {
        const now = new Date().toISOString();
        await supabase.from("users").upsert({
          id: data.user.id,
          email,
          full_name: name || role,
          role,
          created_at: now,
          updated_at: now,
        });
        localStorage.removeItem(`pending_role_${email}`);
        nav({ to: role === "investor" ? "/app/investor" : "/app" });
        return;
      }

      // Email confirmation required — save role and show confirmation screen
      if (data.user?.id) {
        const now = new Date().toISOString();
        const { error: upsertError } = await supabase.from("users").upsert({
          id: data.user.id,
          email,
          full_name: name || role,
          role,
          created_at: now,
          updated_at: now,
        });
        if (upsertError) console.error("Failed to save user role:", upsertError);
      }
      setConfirmed(true);
      setCountdown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create account.";
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setError("An account with this email already exists. Sign in instead, or use a different email.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendStatus("sending");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin + "/auth/callback" },
      });
      if (resendError) throw resendError;
      setResendStatus("sent");
      setCountdown(60);
      setTimeout(() => setResendStatus("idle"), 3000);
    } catch {
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 3000);
    }
  };

  // Derive webmail link from email domain
  const webmailLink = (() => {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (domain === "gmail.com") return "https://mail.google.com";
    if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "https://outlook.live.com";
    if (domain === "yahoo.com") return "https://mail.yahoo.com";
    return null;
  })();

  const google = async () => {
    localStorage.setItem("oauth_pending_role", role);
    console.log("Saving role before OAuth:", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) console.error(error);
  };

  if (confirmed) {
    return (
      <AuthLayout
        title="Check your inbox"
        footer={
          <>
            Already confirmed?{" "}
            <Link
              to="/sign-in"
              search={{ redirect: role === "investor" ? "/app/investor" : "/app" }}
              className="text-foreground font-medium hover:text-brand"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-success/10 ring-4 ring-success/20">
            <MailCheck className="h-8 w-8 text-success" />
          </div>

          <div>
            <p className="text-sm font-medium">Confirmation email sent to</p>
            <p className="mt-1 text-sm text-brand font-semibold">{email}</p>
          </div>

          <div className="w-full rounded-xl border border-border/60 bg-card p-4 text-left space-y-3">
            {[
              "Open the email from Venture Room",
              "Click the confirmation link",
              "You'll be redirected to sign in",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-[10px] font-bold mt-0.5">
                  {i + 1}
                </div>
                <span className="text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Not seeing it? Check your <span className="font-medium text-foreground">spam or junk folder.</span>
          </p>

          <div className="w-full flex flex-col gap-2">
            {webmailLink && (
              <a
                href={webmailLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Open email app
              </a>
            )}

            <button
              onClick={resend}
              disabled={countdown > 0 || resendStatus === "sending"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                resendStatus === "sent"
                  ? "bg-success/10 text-success border border-success/30"
                  : resendStatus === "error"
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : countdown > 0
                  ? "border border-border/60 text-muted-foreground cursor-not-allowed opacity-60"
                  : "border border-brand/40 bg-brand/5 text-brand hover:bg-brand/10",
              )}
            >
              {resendStatus === "sending" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              ) : resendStatus === "sent" ? (
                <><Check className="h-4 w-4" /> Email sent!</>
              ) : resendStatus === "error" ? (
                "Failed — try again"
              ) : countdown > 0 ? (
                <><RefreshCw className="h-3.5 w-3.5" /> Resend in {countdown}s</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" /> Resend confirmation email</>
              )}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free for founders. 14-day trial for funds."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/sign-in"
            search={{ redirect: "/app" }}
            className="text-foreground font-medium hover:text-brand"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-2 mb-2">
        <div className="text-xs font-medium text-muted-foreground">I am a…</div>
        <div className="grid grid-cols-2 gap-2.5">
          <RoleCard
            active={role === "founder"}
            onClick={() => setRole("founder")}
            icon={Rocket}
            label="I'm a Founder"
            sub="Raising capital for my startup"
          />
          <RoleCard
            active={role === "investor"}
            onClick={() => setRole("investor")}
            icon={TrendingUp}
            label="I'm an Investor"
            sub="Reviewing investment opportunities"
          />
        </div>
      </div>

      <GoogleButton onClick={google} />
      <Divider />

      <form onSubmit={submit} className="space-y-3.5">
        <Field
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={role === "investor" ? "Alex Johnson" : "Sam Rivera"}
          required
        />
        <Field
          label="Work email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <Field
          label="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <div className="rounded-lg border border-dashed border-border/60 bg-accent/30 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
            <KeyRound className="h-3.5 w-3.5 text-brand" /> Have an invite code?{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </div>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="vr_invite_••••"
            className="mt-2 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" required className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand)]" />
          I agree to the{" "}
          <Link to={"/terms" as any} className="text-foreground hover:text-brand underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to={"/privacy" as any} className="text-foreground hover:text-brand underline underline-offset-2">
            Privacy Policy
          </Link>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {role === "investor" ? "Create investor workspace" : "Create founder workspace"}{" "}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </AuthLayout>
  );
}
