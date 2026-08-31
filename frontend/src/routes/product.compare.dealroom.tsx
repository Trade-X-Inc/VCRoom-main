import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — "Sealed dual-party export" row removed
// (not a live capability, same standard as CLAUDE.md §12 Group 4).
// Crypto vocabulary removed: "immutable"/"cryptographically sealed" ->
// "append-only".
//
// NOT built from the shared CompetitorComparePage component — this
// page's own intro section (a 4-column "transaction phases" diagram) is
// structurally different from the standard 2-column blurb the other 4
// compare pages share. See the same note on the Firmex page.

export const Route = createFileRoute("/product/compare/dealroom")({
  component: CompareDealroom,
});

const ROWS = [
  { feature: "Transaction closing sequence", lengdon: true, them: false, note: "Dealroom is a deal pipeline and portfolio management tool. It has no closing sequence." },
  { feature: "Per-person NDA enforcement", lengdon: true, them: false, note: "Dealroom manages deal flow — it doesn't bind individuals to NDAs in a transaction context." },
  { feature: "Gate-by-gate dual confirmation", lengdon: true, them: false, note: "Dealroom tracks pipeline stages but doesn't enforce bilateral confirmation at each gate." },
  { feature: "Append-only close record", lengdon: true, them: false, note: "Dealroom activity is CRM-style logging. Lengdon's record is append-only." },
  { feature: "Payment confirmation gate", lengdon: true, them: false, note: "" },
  { feature: "Deal pipeline tracking", lengdon: false, them: true, note: "Lengdon is not a CRM or pipeline tool." },
  { feature: "Investor database and discovery", lengdon: false, them: true, note: "" },
  { feature: "Portfolio analytics", lengdon: false, them: true, note: "" },
  { feature: "Document sharing", lengdon: true, them: true, note: "Lengdon's documents are gate-scoped. Dealroom's are unstructured." },
];

function CompareDealroom() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Lengdon vs Dealroom"
          title="PIPELINE."
          titleOutline="VS CLOSE."
          subtitle="Dealroom helps you find deals, track pipelines, and manage investor relationships. Lengdon closes the deals that make it to term sheet. Different tools. Different moments in a transaction."
          cta={{ label: "Initialize a close room", to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Transaction phases</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-0 border border-[#e6e9ef]">
            {[
              { phase: "Sourcing", tool: "Dealroom", active: false },
              { phase: "Diligence", tool: "VDR platforms", active: false },
              { phase: "Term sheet", tool: "Both", active: false },
              { phase: "Closing", tool: "Lengdon", active: true },
            ].map((p, i) => (
              <div key={p.phase} className={`flex-1 p-8 ${i < 3 ? "border-r border-[#e6e9ef]" : ""} ${p.active ? "bg-[#0a2540]" : ""}`}>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[12px] mb-2 ${p.active ? "text-white/40" : "text-[#94a3b8]"}`}>Phase {i + 1}</div>
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[22px] tracking-[-0.6px] mb-1 ${p.active ? "text-white" : "text-[#c9d0db]"}`}>{p.phase}</div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] ${p.active ? "text-white/60" : "text-[#c9d0db]"}`}>{p.tool}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="border border-[#e6e9ef] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-8 py-5 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Capability</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-5 font-semibold text-[#0a2540] text-[13px] text-center border-l border-[#e6e9ef]">Lengdon</div>
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-6 py-5 text-[#94a3b8] text-[13px] text-center border-l border-[#e6e9ef]">Dealroom</div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_160px_160px] ${i < ROWS.length - 1 ? "border-b border-[#e6e9ef]" : ""} hover:bg-[#fafbfc] transition-colors`}>
                <div className="px-8 py-5">
                  <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px] mb-1">{row.feature}</div>
                  {row.note && <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{row.note}</div>}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-[#e6e9ef]">
                  {row.lengdon ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#e6e9ef] flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke="#e6e9ef" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                  )}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-[#e6e9ef]">
                  {row.them ? (
                    <div className="w-5 h-5 rounded-full bg-[#94a3b8]/15 border border-[#94a3b8]/30 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#e6e9ef] flex items-center justify-center">
                      <div className="w-2 h-px bg-[#c9d0db]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Found the deal.<br />Now close it.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Dealroom builds your pipeline. Lengdon closes it — with a record that lasts.</p>
            </div>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              Open your room
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
