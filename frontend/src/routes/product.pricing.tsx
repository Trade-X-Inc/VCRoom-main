import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/Pricing.tsx.
//
// FLAGGED, NOT CHANGED, per instruction (content-claim correctness
// explicitly deferred for this task): the figures below (£499/room,
// £2,400/month, custom) do not match either pricing scheme already on
// record in this repo — CLAUDE.md §20.2 already tracks a BLOCKING,
// unresolved mismatch between the pre-existing plan_limits table (6
// subscription tiers) and the Foundation Document's 4-tier fee-by-event
// schedule (Direct $499 once, Standard $400-800/mo, deploying seat
// $2,500-6,000/yr, Institutional $25,000-120,000/yr). This page
// introduces a THIRD figure set. Reproduced verbatim as instructed; not
// reconciled against either existing scheme.

export const Route = createFileRoute("/product/pricing")({
  component: Pricing,
});

const PLANS = [
  {
    name: "Close",
    price: "£499",
    period: "per room",
    desc: "One transaction. One room. Full six-gate sequence, immutable record, and sealed export at close.",
    features: [
      "One transaction room",
      "Six-gate enforced sequence",
      "Per-person NDA enforcement",
      "Immutable audit record",
      "Both-party sealed export at close",
      "90-day archive access",
    ],
    cta: "Initialize room",
    href: "/sign-up",
    primary: false,
  },
  {
    name: "Firm",
    price: "£2,400",
    period: "per month",
    desc: "For funds, advisors, and firms running multiple transactions concurrently. Unlimited rooms, priority access, and dedicated infrastructure.",
    features: [
      "Unlimited concurrent rooms",
      "All features in Close",
      "Team access management",
      "Compliance-grade audit trail",
      "Permanent record retention",
      "Dedicated support",
      "Custom branding",
      "API access",
    ],
    cta: "Book a demo",
    href: "/company/contact",
    primary: true,
  },
  {
    name: "Institutional",
    price: "Custom",
    period: "annual contract",
    desc: "For large institutions with specific compliance, data residency, and integration requirements.",
    features: [
      "All features in Firm",
      "Data residency options",
      "SSO & identity provider integration",
      "Custom compliance reporting",
      "Dedicated account manager",
      "SLA-backed infrastructure",
    ],
    cta: "Contact us",
    href: "/company/contact",
    primary: false,
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — you can set up a room and complete the Counsel gate for free. You're charged only when you advance to the Agreement gate and both parties confirm intent to proceed.",
  },
  {
    q: "What happens to the room if the transaction falls through?",
    a: "The room and its immutable audit record are preserved. Both parties can still export a copy of the record, which documents exactly what happened and where the transaction ended.",
  },
  {
    q: "Can I run multiple transactions on the Close plan?",
    a: "Each Close plan covers a single transaction room. If you're running concurrent transactions, the Firm plan is more cost-effective and gives you unlimited rooms.",
  },
  {
    q: "How is pricing calculated for a transaction that spans multiple months?",
    a: "The Close plan is a flat per-room fee — not a subscription. You pay once when the room is created and can use it until the transaction closes or is terminated.",
  },
  {
    q: "What is included in the sealed export at close?",
    a: "Both parties receive a digitally signed PDF and structured JSON file containing the complete, verified audit trail — every action, every timestamp, every confirmation, every document reference.",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Product · Pricing"
          title="SIMPLE,"
          titleOutline="TRANSPARENT."
          subtitle="One room, one transaction. Or unlimited rooms for firms that close at scale. No per-user seats, no data volume charges, no surprise invoices."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col border p-8 relative ${
                  plan.primary
                    ? "bg-[#0a2540] border-[#0a2540]"
                    : "border-[#e6e9ef] hover:border-[#0a2540]/20 transition-colors"
                }`}
              >
                {plan.primary && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#d4af37]/70" />
                )}
                <div className="mb-8">
                  <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[11px] tracking-[2px] uppercase mb-4 ${plan.primary ? "text-white/40" : "text-[#94a3b8]"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-2 mb-1">
                    <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[48px] leading-none tracking-[-2px] ${plan.primary ? "text-white" : "text-[#0a2540]"}`}>
                      {plan.price}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] mb-5 ${plan.primary ? "text-white/40" : "text-[#94a3b8]"}`}>
                    {plan.period}
                  </div>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[14px] leading-[1.65] ${plan.primary ? "text-white/65" : "text-[#425466]"}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className={`flex flex-col gap-3 flex-1 mb-8 border-t pt-6 ${plan.primary ? "border-white/10" : "border-[#e6e9ef]"}`}>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.primary ? "bg-white/10 border border-white/20" : "bg-emerald-50 border border-emerald-200"}`}>
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                          <path d="M1 2.5L2.5 4L6 1" stroke={plan.primary ? "rgba(255,255,255,0.7)" : "#059669"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] ${plan.primary ? "text-white/70" : "text-[#425466]"}`}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={plan.href as any}
                  style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                  className={`block w-full py-4 font-semibold text-[14px] transition-colors duration-200 text-center ${
                    plan.primary
                      ? "bg-white text-[#0a2540] hover:bg-[#f0ece0]"
                      : "bg-[#0a2540] text-white hover:bg-[#13233a]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Common Questions</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            FAQ
          </h2>
          <div className="max-w-[780px] flex flex-col gap-0 border border-[#e6e9ef]">
            {FAQS.map((faq, i) => (
              <div key={i} className={`p-8 ${i < FAQS.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[17px] tracking-[-0.3px] mb-3">
                  {faq.q}
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[36px] leading-[1.0] tracking-[-1px] mb-2">
                Not sure which plan?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px]">
                Talk to us. We'll help you choose the right option for your transaction volume and structure.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Get started free
              </Link>
              <Link to="/company/contact" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#0a2540]/20 hover:border-[#0a2540]/40 text-[#0a2540] text-[14px] px-10 py-4 transition-all duration-200">
                Book a call →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
