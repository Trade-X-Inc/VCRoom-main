import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/VentureCapital.tsx. Own distinct
// capabilities-grid + fund-lifecycle structure.

export const Route = createFileRoute("/for/venture-capital")({
  component: VentureCapital,
});

const CAPABILITIES = [
  {
    label: "Portfolio-wide consistency",
    body: "Standardize how every portfolio company runs its close. Same six-gate sequence, same NDA format, same sealed record — across every deal you lead or follow.",
  },
  {
    label: "Lead investor controls",
    body: "As lead, you set the room structure, invite co-investors, and control document release at each gate. No side channels. No ambiguity about who authorized what.",
  },
  {
    label: "Co-investor coordination",
    body: "Add co-investors into the same room with defined access levels. Each party signs their own NDA. Each party's actions are individually logged.",
  },
  {
    label: "Condition tracking",
    body: "Map every condition precedent to a gate. Board approval, regulatory sign-off, third-party consent — each one confirmed in sequence before the close proceeds.",
  },
  {
    label: "Counsel integration",
    body: "Invite outside counsel as observers or participants. They see the full gate state without becoming custodians of the room data.",
  },
  {
    label: "Permanent fund record",
    body: "At close, the sealed export goes into your fund's permanent records. LP reporting, audit support, and litigation defense all benefit from an immutable close record.",
  },
];

function VentureCapital() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Venture Capital"
          title="LEAD THE CLOSE."
          titleOutline="OWN THE RECORD."
          subtitle="From seed through growth rounds, Lengdon gives VC firms a consistent, structured close process that produces a permanent record — for every deal, every fund, every LP report."
          cta={{ label: "Set up your firm", to: "/sign-up" }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Built for VC</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            FIRM-GRADE<br />INFRASTRUCTURE.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {CAPABILITIES.map((c, i) => (
              <div
                key={i}
                className={`p-7 ${[0,1,3,4].includes(i) ? "border-r border-[#e6e9ef]" : ""} ${i < 3 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="w-1.5 h-1.5 bg-[#d4af37] mb-5 mt-0.5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-2">{c.label}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.7]">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Across the fund lifecycle</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.95] tracking-[-2px] mb-6">
                FROM FIRST<br />CLOSE TO EXIT.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75] mb-8">
                Use Lengdon for initial investment closes, follow-on rounds, secondary transactions, and eventual M&A or IPO preparation. Each transaction produces its own sealed record — and they accumulate into a complete history of the investment.
              </p>
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="inline-block bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Start your first room
              </Link>
            </div>
            <div className="border border-[#e6e9ef] divide-y divide-[#e6e9ef]">
              {[
                { stage: "Initial close", note: "Lead investor sets structure, conditions are mapped, NDAs signed by all parties" },
                { stage: "Follow-on round", note: "New room initialized with pro-rata terms, existing investors re-invited" },
                { stage: "Secondary transfer", note: "Transfer room tracks both buyer and seller consent through all six gates" },
                { stage: "Exit / M&A prep", note: "Acquisition room with full diligence gate, condition precedents, and sealed record for buyer" },
              ].map((s) => (
                <div key={s.stage} className="flex gap-5 p-6">
                  <div className="w-1.5 h-1.5 bg-[#d4af37] mt-1.5 shrink-0" />
                  <div>
                    <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[15px] tracking-[-0.3px] mb-1">{s.stage}</div>
                    <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.6]">{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Set up your firm.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">One account covers all your deals. Invite your team, build your first room.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Create account
              </Link>
              <Link to="/product/pricing" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                View pricing →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
