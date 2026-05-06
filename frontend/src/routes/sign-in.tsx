import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Divider, Field, GoogleButton } from "@/components/auth/AuthLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/app" }),
  component: SignInPage,
});

function SignInPage() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const search = useSearch({ from: "/sign-in" });
  const [email, setEmail] = useState("jordan@atlas.ai");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appUser = await signIn(email, pw);
      nav({ to: appUser.appRole === "investor" ? "/app/investor" : "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/app" },
    });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Venture Room workspace."
      footer={<>Don't have an account? <Link to="/sign-up" className="text-foreground font-medium hover:text-brand">Create one</Link></>}
    >
      <GoogleButton onClick={google} />
      <Divider />
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground/80">Password</label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </AuthLayout>
  );
}
