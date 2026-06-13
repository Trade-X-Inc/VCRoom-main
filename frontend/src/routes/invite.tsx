import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Gift, Lock, Zap, ArrowRight } from "lucide-react";

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
      localStorage.setItem("referral_code", ref);
      setReferralCode(ref);
    }
  }, [ref]);

  const benefits = [
    { icon: Zap, title: "3 Extra AI Analyses", desc: "Unlock additional AI-powered deal analysis and company scoring." },
    { icon: Gift, title: "Founding Member Badge", desc: "Show your early support with an exclusive badge on your profile." },
    { icon: Lock, title: "Locked-In Pricing", desc: "Founding members get special pricing forever." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="bg-[#0a0a0b] py-24 px-6 text-center">
        <div className="inline-block px-3 py-1 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 mb-5">
          <span className="text-sm text-[#7C3AED] font-medium">You're invited</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto" style={{ fontFamily: "Syne, sans-serif" }}>
          You're invited to Hockystick.
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
          Unlock exclusive benefits reserved for founding members.
        </p>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-100 bg-white shadow-sm p-6">
              <div className="h-10 w-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-[#7C3AED]" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/5 to-indigo-600/5 p-10 text-center">
          <p className="text-muted-foreground mb-6">Free during beta. No credit card required.</p>
          <Link to="/sign-up" search={{ role: "founder" } as any}
            className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] text-white px-8 py-3 font-semibold text-sm hover:bg-[#6d28d9] transition-colors">
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
          {referralCode && (
            <p className="text-xs text-muted-foreground mt-4">Referral code: {referralCode}</p>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to="/sign-in" className="text-[#7C3AED] hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
