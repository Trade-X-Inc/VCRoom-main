import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout, Field } from "@/components/auth/AuthLayout";
import { ArrowRight, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };

  return (
    <AuthLayout
      title={sent ? "Check your email" : "Reset your password"}
      subtitle={sent ? `We sent a reset link to ${email}.` : "Enter your email and we'll send a reset link."}
      footer={<><Link to="/sign-in" search={{ redirect: "/app" }} className="text-foreground font-medium hover:text-brand">Back to sign in</Link></>}
    >
      {sent ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success"><Check className="h-6 w-6" /></div>
          <p className="mt-4 text-sm text-muted-foreground">If an account exists, you'll receive an email within a minute.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send reset link <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
