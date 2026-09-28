import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/Sectors.tsx. Note: LENGDONPUBLIC-NEW
// only has this one index page — the current app's 5 individual sector
// detail pages (sectors.energy.tsx etc.) have no counterpart and are
// tracked separately in DELETED-PUBLIC-ROUTES.md as founder-decision
// items, not silently dropped.
//
// Corrected 8 Sep 2026: "secondary transactions" / "Secondary share
// transfer" / "GP-led secondary" all removed — Foundation Document §15
// explicitly excludes a secondary market in unlisted shares; these
// described Lengdon as a venue for exactly that, not merely used
// different wording than the audit's literal "secondary transfers"
// search term. "Sealed export" also removed here (no export capability
// exists — CLAUDE.md §12, §20.15) and "transaction room" corrected to
// "deal room."

export const Route = createFileRoute("/sectors/")({
  head: () => ({
    meta: [
      { title: "Sector schedules — diligence built for the sector, not just tech — Lengdon" },
      { name: "description", content: "Field sets and checklists for technology, manufacturing, property, healthcare and energy deals. One engine, different fields, three evidence tiers." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors" }],
  }),
  component: Sectors,
});

// SEO-012 Phase 2 — one inline-SVG icon per sector, 20x20 viewBox, 2px
// stroke, no fills, matching this file's own #0a2540 ink (this route
// predates the --v2-* token system per the header comment above, so
// icons match its existing surrounding color rather than introducing a
// token mismatch mid-file). Mapped to the real, live 8-sector array
// below, not the deleted sectors.energy.tsx-style names.
function IconChip() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="10" height="10" />
      <circle cx="8" cy="8" r="0.6" fill="#0a2540" stroke="none" />
      <circle cx="12" cy="8" r="0.6" fill="#0a2540" stroke="none" />
      <circle cx="8" cy="12" r="0.6" fill="#0a2540" stroke="none" />
      <circle cx="12" cy="12" r="0.6" fill="#0a2540" stroke="none" />
      <path d="M7.5 2v3M12.5 2v3M7.5 15v3M12.5 15v3M2 7.5h3M2 12.5h3M15 7.5h3M15 12.5h3" />
    </svg>
  );
}

function IconTrajectory() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 15c3-1 5-3 6.5-6S13 4 17 3" />
      <path d="M12.5 3H17v4.5" />
    </svg>
  );
}

function IconHelix() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2.5c0 5 8 5.5 8 10.5s-8 5-8 4.5" />
      <path d="M14 2.5c0 5-8 5.5-8 10.5s8 5 8 4.5" />
      <path d="M6.7 6h6.6M6.4 10h7.2M6.7 14h6.6" />
    </svg>
  );
}

function IconFacade() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17V6l7-3.5L17 6v11" />
      <path d="M3 17h14" />
      <rect x="5.5" y="8" width="2.4" height="2.4" />
      <rect x="8.8" y="8" width="2.4" height="2.4" />
      <rect x="12.1" y="8" width="2.4" height="2.4" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="7" width="15" height="9.5" />
      <path d="M7 7V4.5h6V7" />
      <path d="M2.5 11.5h15" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5l6.5 2.5v4.5c0 4-2.7 6.8-6.5 8-3.8-1.2-6.5-4-6.5-8V5z" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 14l4-9 4 9" />
      <path d="M6 14h8" />
      <circle cx="10" cy="5" r="1.4" fill="#0a2540" stroke="none" />
      <circle cx="6" cy="14" r="1.4" fill="#0a2540" stroke="none" />
      <circle cx="14" cy="14" r="1.4" fill="#0a2540" stroke="none" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#0a2540" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14" />
      <path d="M10 3c2.4 2 2.4 12 0 14M10 3c-2.4 2-2.4 12 0 14" />
    </svg>
  );
}

const SECTORS = [
  {
    name: "Technology & SaaS",
    icon: IconChip,
    tag: "Most common",
    desc: "Software companies raising seed through growth rounds. Typical use cases: priced equity rounds, SAFE conversions, bridge notes.",
    examples: ["Seed equity close", "Series A / B priced round", "SAFE conversion at priced round", "Bridge note conversion"],
  },
  {
    name: "Venture-Backed Startups",
    icon: IconTrajectory,
    tag: "",
    desc: "Early-stage companies with institutional investors managing cap table complexity across multiple instrument types and investor classes.",
    examples: ["Multi-investor round close", "Pro-rata exercise", "Bridge note conversion", "First institutional round"],
  },
  {
    name: "Life Sciences & Biotech",
    icon: IconHelix,
    tag: "",
    desc: "Companies with regulatory-dependent milestones and complex condition precedents tied to FDA approvals, clinical trial results, and IP licensing.",
    examples: ["Milestone-triggered tranche close", "Out-licensing agreement", "IND-dependent financing", "Co-development agreement"],
  },
  {
    name: "Real Assets & Infrastructure",
    icon: IconFacade,
    tag: "",
    desc: "Hard asset transactions requiring multi-party consent, regulatory approvals, and extended condition periods before capital deployment.",
    examples: ["Property acquisition close", "Infrastructure fund drawdown", "Development financing", "Joint venture formation"],
  },
  {
    name: "Private Equity Buyouts",
    icon: IconBriefcase,
    tag: "",
    desc: "Control transactions requiring rigorous documentation across multiple principals, counsel teams, and regulatory bodies.",
    examples: ["Lower middle-market buyout", "Carve-out transaction", "Management buyout", "Add-on acquisition"],
  },
  {
    name: "Family Office Direct Investments",
    icon: IconShield,
    tag: "",
    desc: "Principal-only investments where the family office acts as the sole decision-maker and requires a permanent, portable record independent of fund manager systems.",
    examples: ["Co-investment alongside VC", "Direct equity stake", "Convertible investment", "Club deal participation"],
  },
  {
    name: "SPV & Syndicate Vehicles",
    icon: IconNetwork,
    tag: "",
    desc: "Multi-LP vehicles closing into a single investment. Each LP signs individually; each LP can reference their own record at close by its own number.",
    examples: ["AngelList-style SPV close", "Scout fund investment", "Syndicate formation", "Multi-LP commitment close"],
  },
  {
    name: "Emerging Markets",
    icon: IconGlobe,
    tag: "",
    desc: "Transactions requiring heightened documentation standards, multi-jurisdiction regulatory conditions, and cross-border counsel coordination.",
    examples: ["Cross-border venture investment", "Regional fund close", "Multi-currency transaction", "Dual-jurisdiction condition management"],
  },
];

function Sectors() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Where Lengdon operates"
          title="SECTORS WE"
          titleOutline="SERVE."
          subtitle="Private capital transactions across industries and asset classes. Wherever a sequenced, documented, permanently recorded close is required — Lengdon provides the infrastructure."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {SECTORS.map((s, i) => (
              <div
                key={s.name}
                className={`p-8 ${i % 2 === 0 ? "border-r border-[#e6e9ef]" : ""} ${i < SECTORS.length - 2 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 shrink-0"><s.icon /></div>
                    <div className="w-2 h-2 bg-[#d4af37] mt-0.5 shrink-0" />
                  </div>
                  {s.tag && (
                    <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[2px] uppercase text-[#d4af37]/80 bg-[#d4af37]/10 px-2 py-0.5">
                      {s.tag}
                    </span>
                  )}
                </div>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.5px] mb-3">{s.name}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7] mb-5">{s.desc}</p>
                <div className="flex flex-col gap-1.5">
                  {s.examples.map((ex) => (
                    <div key={ex} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#94a3b8] shrink-0" />
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#64748b] text-[12px]">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[640px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-[#0a2540]/30" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Universal principle</span>
            </div>
            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.95] tracking-[-2px] mb-6">
              THE CLOSE IS<br />THE SAME.
            </h2>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
              Regardless of sector, asset class, or transaction type, the fundamental requirement is identical: both parties need to formally agree, confirm, sign, pay, and close — with a record that proves it happened. Lengdon's enforced closing sequence applies universally.
            </p>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">Your sector. Your close.</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Start with a deal room. No setup call required.</p>
            </div>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              Join the waitlist
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
