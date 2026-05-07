import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // FIX 3: Save role when user arrives via email confirmation link
  useEffect(() => {
    const saveRoleAfterConfirmation = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const metadata = session.user.user_metadata;
      if (!metadata?.role) return;
      // Only upsert if role is missing in DB (avoid overwriting legitimate data)
      const { data: existing } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!existing?.role) {
        const { error: upsertErr } = await supabase.from("users").upsert({
          id: session.user.id,
          role: metadata.role,
          full_name: metadata.full_name || "",
          updated_at: new Date().toISOString(),
        });
        if (upsertErr) console.error("[Auth] Role save on confirmation failed:", upsertErr);
        else console.log("[Auth] Role saved after email confirmation:", metadata.role);
      }
    };
    saveRoleAfterConfirmation();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appUser = await signIn(email, pw);
      if (!appUser) {
        setError("Invalid email or password.");
        return;
      }

      // FIX 1: If signup upsert failed earlier, re-save role from localStorage now that we have a valid session
      const pendingRole = localStorage.getItem(`pending_role_${email}`);
      if (pendingRole) {
        await supabase.from("users").upsert({
          id: appUser.id,
          role: pendingRole,
          updated_at: new Date().toISOString(),
        });
        localStorage.removeItem(`pending_role_${email}`);
      }

      // FIX 5: Debug — visible in browser console
      console.log("[Auth Debug] User ID:", appUser.id);
      console.log("[Auth Debug] appRole (from DB + metadata):", appUser.appRole);
      console.log("[Auth Debug] Pending localStorage role:", pendingRole ?? "none");

      // Navigate using effective role (localStorage takes precedence if DB was stale)
      const effectiveRole = (pendingRole as "investor" | "founder" | null) ?? appUser.appRole;
      const roleDefault = effectiveRole === "investor" ? "/app/investor" : "/app";
      const target = (search.redirect && search.redirect !== "/app") ? search.redirect : roleDefault;
      nav({ to: target as any });
    } catch (err: any) {
      setError(err?.message || "Sign in failed.");
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
