import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — replaces the prior three-tier scheme
// (£499/room, £2,400/month, custom) with the real four-tier fee-by-
// event schedule per direct instruction: Direct (USD 499 once, at
// first close), Standard (USD 799/month, active raise only), Deploying
// seat (USD 3,999/seat/year), Institutional (scoped individually, no
// published number). This does not resolve CLAUDE.md §20.2's separate,
// still-BLOCKING mismatch against the pre-existing `plan_limits` table
// (6 subscription-model tiers, a different axis entirely — role-based
// subscription vs. fee-by-triggering-event) — that reconciliation still
// needs a product decision and a migration, not a copy change. It does
// mean the public marketing page and the Foundation Document's own
// published schedule (§20.3/§20.4) now agree with each other, closing
// the gap between "two different public/internal figures" that existed
// before this pass. Card grid extended from 3 to 4 columns using the
// same bordered-panel pattern already used elsewhere on the site (see
// for.founders.tsx, registry.tsx) rather than a new layout. Crypto
// vocabulary removed: "immutable" -> "append-only"; "sealed export" ->
// "record export" (the export/registry delivery mechanism is not yet
// live — CLAUDE.md §12/§20.6).
//
// NOTE ON FIGURES: the instruction specified point prices (Standard
// $799/mo, Deploying seat $3,999/seat/yr). CLAUDE.md §20.2's existing
// record of the Foundation Document shows these as ranges instead
// ($400-800/mo, $2,500-6,000/yr) — the point figures used here are
// within both ranges, read as the founder finalizing a specific number
// within the previously-published range, not a conflicting figure.
// Flagged here rather than silently reconciled, since CLAUDE.md's own
// text is the one that would need updating to match, and that's a
// documentation change outside this task's scope.

export const Route = createFileRoute("/product/pricing")({
  component: Pricing,
});

const PLANS = [
  {
    name: "Direct",
    price: "$499",
    period: "once, at first close",
    desc: "One transaction. One room. Full six-gate sequence and append-only record, billed once the deal closes.",
    features: [
      "One transaction room",
      "Six-gate enforced sequence",
      "Per-person NDA enforcement",
      "Append-only audit record",
      "Billed only on close — nothing due until then",
    ],
    cta: "Initialize room",
    href: "/sign-up",
    primary: false,
  },
  {
    name: "Standard",
    price: "$799",
    period: "per month, active raise only",
    desc: "For a founder running a live raise across multiple prospective investors and rooms at once.",
    features: [
      "Unlimited concurrent rooms",
      "All features in Direct",
      "Billed only while a raise is active",
      "Team access management",
    ],
    cta: "Get started",
    href: "/sign-up",
    primary: true,
  },
  {
    name: "Deploying seat",
    price: "$3,999",
    period: "per seat, per year",
    desc: "For investors, funds, and firms actively deploying capital across multiple transactions.",
    features: [
      "All features in Standard",
      "Per-seat annual pricing",
      "Priority support",
      "API access",
    ],
    cta: "Book a demo",
    href: "/company/contact",
    primary: false,
  },
  {
    name: "Institutional",
    price: "Scoped individually",
    period: "no published number",
    desc: "For large institutions with specific compliance, data residency, and integration requirements.",
    features: [
      "All features in Deploying seat",
      "Data residency options",
      "SSO & identity provider integration",
      "Dedicated account manager",
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
    a: "The room and its append-only audit record are preserved. Both parties can still export a copy of the record, which documents exactly what happened and where the transaction ended.",
  },
  {
    q: "When am I billed on the Direct plan?",
    a: "Once — at first close. Nothing is due while the room is open. If the transaction doesn't close, you aren't charged.",
  },
  {
    q: "What's the difference between Standard and Deploying seat?",
    a: "Standard is for a founder running a live raise — billed monthly, only while the raise is active. Deploying seat is for an investor or firm actively deploying capital across multiple transactions — billed per seat, annually.",
  },
  {
    q: "How is Institutional pricing determined?",
    a: "Institutional pricing is scoped individually based on transaction volume, compliance requirements, and integration needs. There's no published number — contact us for a quote.",
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
          subtitle="Pay once when you close, monthly while you're raising, or per seat while you're deploying. No data volume charges, no surprise invoices."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
