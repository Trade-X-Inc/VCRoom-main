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

export const Route = createFileRoute("/sectors/")({
  component: Sectors,
});

const SECTORS = [
  {
    name: "Technology & SaaS",
    tag: "Most common",
    desc: "Software companies raising seed through growth rounds. Typical use cases: priced equity rounds, SAFE conversions, secondary transactions.",
    examples: ["Seed equity close", "Series A / B priced round", "SAFE conversion at priced round", "Secondary share transfer"],
  },
  {
    name: "Venture-Backed Startups",
    tag: "",
    desc: "Early-stage companies with institutional investors managing cap table complexity across multiple instrument types and investor classes.",
    examples: ["Multi-investor round close", "Pro-rata exercise", "Bridge note conversion", "First institutional round"],
  },
  {
    name: "Life Sciences & Biotech",
    tag: "",
    desc: "Companies with regulatory-dependent milestones and complex condition precedents tied to FDA approvals, clinical trial results, and IP licensing.",
    examples: ["Milestone-triggered tranche close", "Out-licensing agreement", "IND-dependent financing", "Co-development agreement"],
  },
  {
    name: "Real Assets & Infrastructure",
    tag: "",
    desc: "Hard asset transactions requiring multi-party consent, regulatory approvals, and extended condition periods before capital deployment.",
    examples: ["Property acquisition close", "Infrastructure fund drawdown", "Development financing", "Joint venture formation"],
  },
  {
    name: "Private Equity Buyouts",
    tag: "",
    desc: "Control transactions requiring rigorous documentation across multiple principals, counsel teams, and regulatory bodies.",
    examples: ["Lower middle-market buyout", "Carve-out transaction", "Management buyout", "Add-on acquisition"],
  },
  {
    name: "Family Office Direct Investments",
    tag: "",
    desc: "Principal-only investments where the family office acts as the sole decision-maker and requires a permanent, portable record independent of fund manager systems.",
    examples: ["Co-investment alongside VC", "Direct equity stake", "Convertible investment", "Club deal participation"],
  },
  {
    name: "SPV & Syndicate Vehicles",
    tag: "",
    desc: "Multi-LP vehicles closing into a single investment. Each LP signs individually; each LP receives their own sealed export at close.",
    examples: ["AngelList-style SPV close", "GP-led secondary via SPV", "Scout fund investment", "Syndicate formation"],
  },
  {
    name: "Emerging Markets",
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
          subtitle="Private capital transactions across industries and asset classes. Wherever a sequenced, documented, and sealed close is required — Lengdon provides the infrastructure."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {SECTORS.map((s, i) => (
              <div
                key={s.name}
                className={`p-8 ${i % 2 === 0 ? "border-r border-[#e6e9ef]" : ""} ${i < SECTORS.length - 2 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-2 h-2 bg-[#d4af37] mt-0.5 shrink-0" />
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
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{ex}</span>
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
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Universal principle</span>
            </div>
            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.95] tracking-[-2px] mb-6">
              THE CLOSE IS<br />THE SAME.
            </h2>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
              Regardless of sector, asset class, or transaction type, the fundamental requirement is identical: both parties need to formally agree, confirm, sign, pay, and close — with a record that proves it happened. Lengdon's six-gate sequence applies universally.
            </p>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">Your sector. Your close.</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Start with a transaction room. No setup call required.</p>
            </div>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              Open a room
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
