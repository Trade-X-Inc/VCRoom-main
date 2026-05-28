import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Check, Gift, Lock } from "lucide-react";

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "You're Invited — Hockystick" },
      { name: "description", content: "Join Hockystick and unlock exclusive founding member benefits." },
    ],
  }),
  component: Invite,
});

function Invite() {
  const { ref } = Route.useSearch() as { ref?: string };
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (ref) {
      // Store referral code in localStorage for later retrieval during signup
      localStorage.setItem("referral_code", ref);
      setReferralCode(ref);
    }
  }, [ref]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <span className="text-sm font-medium text-purple-400">You're invited</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em] leading-tight mb-4">
            You're invited to Hockystick
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join us and unlock exclusive benefits reserved for founding members.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">3 Extra AI Analyses</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Unlock additional AI-powered deal analysis and company scoring.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Gift className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">Founding Member Badge</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Show your early support with an exclusive badge on your profile.
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold">Locked-In Pricing</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Founding members get special pricing forever—even if we raise rates later.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-600/10 to-indigo-600/10 border border-purple-500/20 rounded-xl p-8 mb-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Ready to join?</p>
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              <Button size="lg" className="gap-2">
                Create your account
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              {referralCode && `Referral code: ${referralCode}`}
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{" "}
            <Link to="/sign-in" className="text-foreground hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v6m0 6v6M3 12h6m6 0h6" />
      <path d="M5.64 5.64l4.24 4.24m5.64 5.64l4.24 4.24M18.36 5.64l-4.24 4.24m-5.64 5.64l-4.24 4.24" />
    </svg>
  );
}
