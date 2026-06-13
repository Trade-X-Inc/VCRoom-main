import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hockystick" },
      { name: "description", content: "Free during beta. No credit card. Raise with confidence — pay for results." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: 0,
    period: "month",
    tagline: "Test the platform before you commit",
    borderColor: "border-white/8",
    badge: "Beta" as string | null,
    badgeStyle: { background: "rgba(16,185,129,0.15)", color: "#10B981" } as React.CSSProperties,
    features: [
      "Verified founder profile",
      "Public profile page",
      "1 active deal room",
      "5 document templates",
      "3 AI document reviews per month",
      "Basic investor thesis matching",
      "Profile view analytics",
    ],
    notIncluded: [
      "Unlimited deal rooms",
      "Full Document Intelligence Centre",
      "Investor simulation",
      "Priority matching",
      "AI coaching",
    ],
    cta: "Start free",
    ctaUrl: "/sign-up?plan=free",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Starter",
    price: 49,
    period: "month",
    tagline: "For founders preparing to raise",
    borderColor: "border-white/10",
    badge: null as string | null,
    badgeStyle: {} as React.CSSProperties,
    features: [
      "Verified founder profile",
      "Public profile page (hockystick.app/p/you)",
      "1 active deal room",
      "Document Intelligence Centre (10 templates)",
      "AI document review",
      "Investor thesis matching",
      "Profile view analytics",
      "Email support",
    ],
    notIncluded: [
      "Unlimited deal rooms",
      "Investor simulation",
      "Priority matching",
    ],
    cta: "Start raising",
    ctaUrl: "/sign-up?plan=starter",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Growth",
    price: 149,
    period: "month",
    tagline: "For founders actively in conversations",
    borderColor: "border-[#7C3AED]/50",
    badge: "Most popular",
    badgeStyle: { background: "#7C3AED", color: "#fff" } as React.CSSProperties,
    features: [
      "Everything in Starter",
      "Unlimited deal rooms",
      "Full Document Intelligence Centre (16 templates)",
      "AI investor simulation",
      "Deal room digital documents",
      "Investor verification badges visible",
      "Real-time investor view notifications",
      "3-day nudge automation",
      "Priority thesis matching",
      "Priority support",
    ],
    notIncluded: [
      "White-glove onboarding",
      "Custom verification",
    ],
    cta: "Start raising",
    ctaUrl: "/sign-up?plan=growth",
    featured: true,
    comingSoon: false,
  },
  {
    name: "Scale",
    price: 499,
    period: "month",
    tagline: "For serious raises of $2M and above",
    borderColor: "border-white/20",
    badge: null as string | null,
    badgeStyle: {} as React.CSSProperties,
    features: [
      "Everything in Growth",
      "Hockystick Verified badge (manual review)",
      "White-glove profile setup",
      "Dedicated investor matching",
      "Deal brief generation for matched investors",
      "Term sheet builder",
      "Custom NDA templates",
      "API access",
      "Dedicated account manager",
      "Priority deal room support",
    ],
    notIncluded: [] as string[],
    cta: "Talk to us",
    ctaUrl: "/contact?plan=scale",
    featured: false,
    comingSoon: false,
  },
  {
    name: "Enterprise",
    price: null as number | null,
    period: null as string | null,
    tagline: "For accelerators, funds, and platforms",
    borderColor: "border-white/8",
    badge: "Coming soon",
    badgeStyle: { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" } as React.CSSProperties,
    features: [
      "Multi-founder cohort management",
      "White-label deal rooms",
      "Bulk founder onboarding",
      "Custom verification workflows",
      "Investor network access",
      "Analytics dashboard for fund managers",
      "SLA support",
      "Custom contract",
    ],
    notIncluded: [] as string[],
    cta: "Join waitlist",
    ctaUrl: "/contact?plan=enterprise",
    featured: false,
    comingSoon: true,
  },
];

const faqs = [
  {
    q: "Is it really free during beta?",
    a: "Yes. All features are free during the beta period. When paid plans launch, existing beta users get 60 days free on their chosen tier.",
  },
  {
    q: "Does Hockystick take a success fee?",
    a: "No. We charge subscription fees only. There is no success fee or commission on deals closed through the platform.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade at any time. Changes take effect on your next billing date.",
  },
  {
    q: "What is the Hockystick Verified badge?",
    a: "The Verified badge is a manual review by the Hockystick team confirming your identity and business. It signals to investors that your profile has been independently checked. Available on Scale plan and above.",
  },
  {
    q: "Do you support Arabic language?",
    a: "English-first for now. Arabic interface and Arabic-language AI analysis are on the roadmap for Q4 2026.",
  },
  {
    q: "What is the accelerator/enterprise plan?",
    a: "The Enterprise plan lets accelerators and VC firms onboard their entire cohort or portfolio onto Hockystick, with a unified dashboard. Launching Q3 2026 — join the waitlist via the contact form.",
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <SiteHeader />
      <main className="px-6 py-24">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs text-[#7C3AED] uppercase tracking-[0.2em] mb-4">Pricing</p>
          <h1 className="font-syne font-bold text-4xl md:text-5xl text-white mb-4 leading-tight">
            Raise with confidence.<br />Pay for results.
          </h1>
          <p className="text-white/60 text-lg">
            Free during beta. Paid plans launch when you're ready.
            No hidden fees. No success fee on deals.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#10B981] bg-[#10B981]/10 px-4 py-2 rounded-full">
            ✓ Free during beta · Upgrade anytime
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 max-w-7xl mx-auto mb-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.borderColor}`}
              style={{ background: plan.featured ? "rgba(124,58,237,0.05)" : "rgba(255,255,255,0.02)" }}
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full w-fit mb-4"
                  style={plan.badgeStyle}
                >
                  {plan.badge}
                </span>
              )}

              {/* Name + price */}
              <p className="font-syne font-bold text-white text-xl mb-1">{plan.name}</p>
              <p className="text-xs text-white/40 mb-4">{plan.tagline}</p>

              {plan.price != null ? (
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white font-syne">${plan.price}</span>
                  <span className="text-white/40 text-sm ml-1">/{plan.period}</span>
                </div>
              ) : (
                <div className="mb-6">
                  <span className="text-2xl font-bold text-white font-syne">Custom</span>
                </div>
              )}

              {/* CTA */}
              <a
                href={plan.ctaUrl}
                className={`block text-center py-3 rounded-xl text-sm font-medium mb-6 transition-colors ${
                  plan.comingSoon
                    ? "cursor-not-allowed"
                    : ""
                }`}
                style={
                  plan.featured
                    ? { background: "#7C3AED", color: "#fff" }
                    : plan.comingSoon
                    ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }
                    : { background: "rgba(255,255,255,0.08)", color: "#fff" }
                }
              >
                {plan.cta}
              </a>

              {/* Features */}
              <div className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[#10B981] mt-0.5 shrink-0">✓</span>
                    <span className="text-white/70">{f}</span>
                  </div>
                ))}
                {plan.notIncluded.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-white/20 mt-0.5 shrink-0">○</span>
                    <span className="text-white/25">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/30 mb-16 max-w-2xl mx-auto">
          All plans are free during beta. Paid plans launch when we're ready to scale.
        </p>

        {/* Investor pricing note */}
        <div
          className="max-w-3xl mx-auto text-center p-8 rounded-2xl border border-white/8 mb-16"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <p className="font-syne font-bold text-white text-xl mb-2">Investors join free</p>
          <p className="text-white/50 text-sm leading-relaxed">
            Investors access Hockystick at no charge. Browse verified founder profiles, receive thesis-matched deal flow,
            open deal rooms, and run structured due diligence — all free. Premium investor features launching Q3 2026.
          </p>
        </div>

        {/* Web3 waitlist */}
        <div
          className="max-w-3xl mx-auto text-center p-8 rounded-2xl border border-white/5 mb-16"
          style={{ background: "rgba(255,255,255,0.01)" }}
        >
          <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">Coming soon</span>
          <p className="font-syne font-bold text-white text-xl mt-3 mb-2">Hockystick for Web3</p>
          <p className="text-white/40 text-sm leading-relaxed mb-4">
            Verified token raises. On-chain due diligence. VARA-compliant deal rooms.
            Built for the UAE Web3 ecosystem — launching 2027.
          </p>
          <a
            href="/contact?interest=web3"
            className="text-sm text-white/50 hover:text-white underline underline-offset-2 transition-colors"
          >
            Join the Web3 waitlist →
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-syne font-bold text-2xl text-white text-center mb-8">Common questions</h2>
          <div className="space-y-4">
            {faqs.map((item, i) => (
              <details
                key={i}
                className="border border-white/8 rounded-xl group"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none text-sm font-medium text-white">
                  {item.q}
                  <span className="text-white/40 transition-transform group-open:rotate-180 ml-4 shrink-0">↓</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-white/60 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

      </main>
      <SiteFooter />
    </div>
  );
}
