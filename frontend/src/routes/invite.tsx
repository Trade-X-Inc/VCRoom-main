import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Fixed 9 Sep 2026 (pre-promotion gap-closing pass): this referral-link
// page (direct-URL only, no internal links to it — shared externally
// with a ?ref= code) still carried two fabrications matching the exact
// class already removed everywhere else on the site: "3 Extra AI
// Analyses... AI-powered deal analysis and company scoring" (Foundation
// §15/§25 — scoring/assessment is prohibited) and "Locked-In Pricing...
// special pricing forever" (an invented pricing promise with no real
// mechanism — no locked-rate tier exists anywhere in product.pricing.tsx
// or the plan schema). Also v1-styled throughout (hs-gradient, Syne,
// dark #0a0a0b hero, --brand/--accent tokens) — migrated to the real v2
// tokens and PageHero, per CLAUDE.md's standing "any page found
// rendering v1 during any work gets migrated on the spot" rule, since
// this pass was already in the file for the content fix. Replaced both
// benefit cards with real, verifiable product properties (matching the
// sign-up page's own left-panel feature list) rather than inventing a
// smaller, safer benefit in their place.

export const Route = createFileRoute("/invite")({
  head: () => ({
    meta: [
      { title: "You're invited | Lengdon" },
      { name: "description", content: "Join the Lengdon waitlist." },
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

  const properties = [
    { label: "Six-gate closing sequence", detail: "Enforced by the system, not by convention" },
    { label: "Per-person NDA", detail: "Individual, not company-level" },
    { label: "Append-only audit record", detail: "Every action recorded, permanently" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="You're invited"
          title="JOIN THE"
          titleOutline="WAITLIST."
          subtitle="We're not onboarding new accounts right now. Join the waitlist and we'll reach out when it's your turn."
          dark
        />

        <section className="max-w-[1280px] mx-auto w-full px-10 py-20 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {properties.map((p, i) => (
              <div key={p.label} className={`p-8 ${i < properties.length - 1 ? "md:border-r" : ""} border-[#e6e9ef]`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-2">
                  {p.label}
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.6]">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1280px] mx-auto w-full px-10 py-20">
          <div className="max-w-[480px] mx-auto text-center">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] mb-6">
              Free during beta. No credit card required.
            </p>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
              className="inline-flex items-center gap-2 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-10 py-4 transition-colors duration-200"
            >
              Join the waitlist
            </Link>
            {referralCode && (
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] mt-4">
                Referral code: {referralCode}
              </p>
            )}
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] mt-6">
              Already have an account?{" "}
              <Link to="/sign-in" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="text-[#0a2540] hover:opacity-60 transition-opacity">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
