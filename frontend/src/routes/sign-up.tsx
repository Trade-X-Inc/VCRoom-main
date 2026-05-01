import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Divider, Field, GoogleButton } from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(name || "Founder", email, pw, token);
      nav({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free for founders. 14-day trial for funds."
      footer={<>Already have an account? <Link to="/sign-in" search={{ redirect: "/app" }} className="text-foreground font-medium hover:text-brand">Sign in</Link></>}
    >
      <GoogleButton onClick={async () => setError("Google sign-up is not configured yet.")} />
      <Divider />
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reeves" required />
        <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
        <Field label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" required />

        <div className="rounded-lg border border-dashed border-border/60 bg-accent/30 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
            <KeyRound className="h-3.5 w-3.5 text-brand" /> Have an invite code? <span className="text-muted-foreground font-normal">(optional)</span>
          </div>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="vr_invite_••••"
            className="mt-2 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" defaultChecked className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand)]" />
          I agree to the <a className="text-foreground hover:text-brand" href="#">Terms</a> and <a className="text-foreground hover:text-brand" href="#">Privacy Policy</a>.
        </label>

        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create workspace <ArrowRight className="h-4 w-4" /></>}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </AuthLayout>
  );
}
