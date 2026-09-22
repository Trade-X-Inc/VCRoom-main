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
// Corrected 8 Sep 2026: the FAQ's own "both parties can still export a
// copy of the record" line was missed by the pass above and still
// asserted the export capability as live fact -- no export capability
// of any kind exists (CLAUDE.md §12, §20.15). Fixed to describe the
// real mechanism (the record itself stays inspectable in the room).
// "One transaction room" corrected to "One deal room." Also removed
// "Data residency options" from the Institutional plan's feature list --
// no per-room jurisdiction-selection feature exists anywhere in the
// deal-room code (verified against a live query of the real production
// Supabase project). Pricing tiers, figures and plan names themselves
// are UNTOUCHED -- those are the still-open §20.2 item and out of scope
// for this pass.
//
// Corrected 9 Sep 2026 (public-site rewrite, Batch 2): the Institutional
// plan's own description sentence still said "specific compliance, data
// residency, and integration requirements" -- the word "data residency"
// survived in the description even though the 8 Sep pass removed it
// from the feature-list bullet one line below. Also found and removed:
// "API access" (Deploying seat) -- docs/standard.tsx's own API page
// states this is "not yet published"; and "SSO & identity provider
// integration" (Institutional) -- the real auth mechanism is
// email/password and Google OAuth (sign-in.tsx), no SAML/SSO/identity-
// provider integration exists anywhere in the codebase. Both replaced
// with real, already-verified capabilities (team invite/role management,
// per-person NDA enforcement) rather than left as gaps in the card.
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
//
// Added 9 Sep 2026 (waitlist wiring task): a beta banner between the
// pricing cards and the FAQ. All 4 plan CTAs and the bottom "Get
// started" CTA now route to the waitlist (new signups are paused).
// Copy deliberately states only the real deferred-payment offer — no
// invented savings figure or discount comparison (the exact fabrication
// class this project has spent four rewrite batches removing from
// every other page). Approved wording, option C of 3 proposed.
//
// Beta rework, 22 Sep 2026 — direct instruction, keeping the real
// current 4-tier structure (Direct/Standard/Deploying seat/
// Institutional), NOT the separate 6-category plan_limits scheme
// (founder_starter/pro/scale, investor_growth/pro/enterprise) —
// that table is confirmed dead-enforcement/display-only elsewhere in
// the app and this route never used its naming; introducing it here
// would have been a new fabrication, not a fix. All $ figures
// replaced with "—" (§14's "12 of 14 conditions satisfied, not 86%"
// discipline extended to "no invented-looking number where there
// isn't a real one yet"). Every CTA is "Join Waitlist." New H2 "Beta
// — Free to Join" added above the plan grid.
//
// Forward-looking feature bullets sourced ONLY from
// lengdon-product-roadmap.md (pasted directly by the founder — the
// doc lives in their claude.ai Project, not this repo), mapped to
// the 4 real tiers by maturity per direct instruction: Direct
// (migration/structural-audit intake check, single-notice diligence
// enforcement, evidence-ladder tagging, species-aware investor
// onboarding + verification ladder), Standard (conditions register
// for staged/milestone rounds), Deploying seat (champion package,
// soft-circle momentum visibility), Institutional (monthly
// money-report system of record, auto-assembled second-raise data
// room, portfolio-company API access, execution-layer/third-party
// API integration). Every one of these is written strictly
// future-tense ("coming at launch" / "planned for [tier]") — never
// "includes," never present tense — since none of it is built yet.
//
// AI Agentic/MCP-assisted workflow at the Direct tier is NOT in the
// roadmap doc — checked the full pasted text twice, no mention
// anywhere. Included anyway per explicit direct instruction, but
// kept visually/textually separate from the roadmap-sourced bullets
// rather than blended in or attributed to the doc — it's a founder
// product claim, not something this source material backs.
//
// What stayed present-tense: the small set of bullets describing
// mechanisms that are ALREADY real and live today (six-gate
// sequence, per-person NDA enforcement, append-only record, team
// invite/role management) — the future-tense rule applies to NEW
// roadmap claims, not to retracting accurate statements about what
// already exists.

export const Route = createFileRoute("/product/pricing")({
  component: Pricing,
});

const PLANS = [
  {
    name: "Direct",
    price: "—",
    period: "once, at first close",
    desc: "One transaction. One room. Full six-gate sequence and append-only record, billed once the deal closes.",
    features: [
      "One deal room",
      "Six-gate enforced sequence",
      "Per-person NDA enforcement",
      "Append-only audit record",
      "Billed only on close — nothing due until then",
    ],
    roadmapFeatures: [
      "Migration tooling with a structural audit, planned for launch — importing existing data runs a set of structural checks automatically",
      "Single-notice diligence enforcement, coming at launch — one open diligence thread at a time, no drip-fed requests",
      "Evidence-ladder document tagging, coming at launch — every document carries a visible confidence rung",
      "Species-aware investor onboarding and a five-rung verification ladder, planned for launch",
    ],
    aiFeature: "AI Agentic / MCP-assisted workflow, planned for launch",
    cta: "Join Waitlist",
    href: "/sign-up",
    primary: false,
  },
  {
    name: "Standard",
    price: "—",
    period: "per month, active raise only",
    desc: "For a founder running a live raise across multiple prospective investors and rooms at once.",
    features: [
      "Unlimited concurrent rooms",
      "All features in Direct",
      "Billed only while a raise is active",
      "Team access management",
    ],
    roadmapFeatures: [
      "Conditions register for staged and milestone rounds, planned for this tier — conditions tracked with an owner and status, tranche release gated on completion",
    ],
    cta: "Join Waitlist",
    href: "/sign-up",
    primary: true,
  },
  {
    name: "Deploying seat",
    price: "—",
    period: "per seat, per year",
    desc: "For investors, funds, and firms actively deploying capital across multiple transactions.",
    features: [
      "All features in Standard",
      "Per-seat annual pricing",
      "Priority support",
      "Team invite and role management",
    ],
    roadmapFeatures: [
      "Auto-generated champion package, planned for this tier — a forwardable one-click summary built for a partner to send to colleagues",
      "Soft-circle momentum visibility, planned for this tier — a live, honest indicator of round-fill status",
    ],
    cta: "Join Waitlist",
    href: "/company/contact",
    primary: false,
  },
  {
    name: "Institutional",
    price: "—",
    period: "no published number",
    desc: "For large institutions with specific compliance and integration requirements.",
    features: [
      "All features in Deploying seat",
      "Per-person NDA enforcement across every room",
      "Dedicated account manager",
      "Custom compliance requirements, discussed directly",
    ],
    roadmapFeatures: [
      "Monthly money-report system of record, planned for this tier — a standing report of cash, runway, burn, and gate status, visible to committed investors after close",
      "Auto-assembled second-raise data room, planned for this tier — built from a founder's own reporting history",
      "API access for portfolio companies, planned for this tier — pulling out cap table state, verification tier, and report history",
      "Execution-layer API integration for third-party platforms, planned for this tier",
    ],
    cta: "Join Waitlist",
    href: "/company/contact",
    primary: false,
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "During beta, everything is free — join the waitlist and use the platform at no cost. The Direct plan's own free step (setting up a room and completing the Counsel gate before anything is billed) is what carries forward once general availability opens.",
  },
  {
    q: "What happens to the room if the transaction falls through?",
    a: "The room and its append-only audit record are preserved. Both parties can still open the room and review exactly what happened and where the transaction ended.",
  },
  {
    q: "When will I be billed on the Direct plan?",
    a: "Not during beta — nothing is charged. Once general availability opens, Direct is billed once, at first close, and nothing is due while the room is open.",
  },
  {
    q: "What's the difference between Standard and Deploying seat?",
    a: "Standard is planned for a founder running a live raise — billed monthly, only while the raise is active, once general availability opens. Deploying seat is planned for an investor or firm actively deploying capital across multiple transactions — billed per seat, annually. Both are free to join during beta.",
  },
  {
    q: "How will Institutional pricing be determined?",
    a: "Institutional pricing will be scoped individually based on transaction volume, compliance requirements, and integration needs once general availability opens — there's no published number. During beta, join the waitlist and contact us directly.",
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
          subtitle="Free to join during beta. Eventually you'll pay once when you close, monthly while you're raising, or per seat while you're deploying — no data volume charges, no surprise invoices."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(24px,4vw,32px)] leading-[1.1] tracking-[-0.5px] mb-10">
            Beta — Free to Join
          </h2>
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
                  <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[11px] tracking-[2px] uppercase mb-4 ${plan.primary ? "text-white/50" : "text-[#64748b]"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-end gap-2 mb-1">
                    <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[clamp(32px,6vw,48px)] leading-none tracking-[-2px] ${plan.primary ? "text-white" : "text-[#0a2540]"}`}>
                      {plan.price}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] mb-5 ${plan.primary ? "text-white/50" : "text-[#64748b]"}`}>
                    {plan.period}
                  </div>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[14px] leading-[1.65] ${plan.primary ? "text-white/65" : "text-[#425466]"}`}>
                    {plan.desc}
                  </p>
                </div>

                <div className={`flex flex-col gap-3 mb-6 border-t pt-6 ${plan.primary ? "border-white/10" : "border-[#e6e9ef]"}`}>
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

                {/* Forward-looking, not-yet-built capabilities — visually
                    distinct from the live "features" list above (dashed
                    marker, "Coming soon" label, muted tone) so a reader
                    can never mistake a roadmap item for something they
                    get today. Sourced only from lengdon-product-roadmap.md;
                    every line stays future-tense. */}
                {(plan.roadmapFeatures?.length || plan.aiFeature) && (
                  <div className={`flex flex-col gap-1 flex-1 mb-8 border-t border-dashed pt-6 ${plan.primary ? "border-white/15" : "border-[#cbd5e1]"}`}>
                    <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[10px] tracking-[1.5px] uppercase mb-2 ${plan.primary ? "text-white/40" : "text-[#64748b]"}`}>
                      Coming soon
                    </div>
                    {plan.roadmapFeatures?.map((f) => (
                      <div key={f} className="flex items-start gap-3">
                        <div className={`w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 ${plan.primary ? "text-white/30" : "text-[#64748b]"}`} style={{ fontSize: 11 }}>
                          →
                        </div>
                        <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[12.5px] leading-[1.5] ${plan.primary ? "text-white/45" : "text-[#64748b]"}`}>{f}</span>
                      </div>
                    ))}
                    {plan.aiFeature && (
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 ${plan.primary ? "text-white/30" : "text-[#64748b]"}`} style={{ fontSize: 11 }}>
                          →
                        </div>
                        <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[12.5px] leading-[1.5] ${plan.primary ? "text-white/45" : "text-[#64748b]"}`}>{plan.aiFeature}</span>
                      </div>
                    )}
                  </div>
                )}

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

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="border border-[#0a2540]/15 bg-[#f8f9fb] p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">In beta</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] leading-[1.1] tracking-[-0.8px] mb-3">
                Beta pricing: deferred, not discounted.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7] max-w-[560px]">
                Everything above is what you'll eventually pay. Right now, nothing is charged — beta access is free until we launch. Join the waitlist to get in before general availability opens.
              </p>
            </div>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
              className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-10 py-4 transition-colors duration-200"
            >
              Join Waitlist
            </Link>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Common Questions</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-16">
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
                Join Waitlist
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
