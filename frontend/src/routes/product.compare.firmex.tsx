import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/compare/Firmex.tsx.
//
// NOT built from the shared CompetitorComparePage component — this page's
// own intro section (a 3-column "Firmex says / Most people think / Lengdon
// delivers" block) is structurally different from the standard 2-column
// blurb the other 4 compare pages share (confirmed by reading all 5
// source files before building any of them). Reproducing it through the
// shared component would have meant inventing a variant the source
// doesn't have. Built standalone instead, same as Dealroom.

export const Route = createFileRoute("/product/compare/firmex")({
  component: CompareFirmex,
});

const ROWS = [
  { feature: "Six-gate enforced close sequence", lengdon: true, them: false, note: "Firmex has no transaction sequencing. It's a document management platform." },
  { feature: "Per-person NDA, individually bound", lengdon: true, them: false, note: "Firmex NDA management is document-centric — not identity-level access binding." },
  { feature: "Bilateral confirmation per gate", lengdon: true, them: false, note: "Firmex doesn't require both parties to confirm anything. Documents are uploaded; access is granted." },
  { feature: "Immutable audit log", lengdon: true, them: false, note: "Firmex activity logs are standard records — not sealed or cryptographically linked." },
  { feature: "Dual sealed export at close", lengdon: true, them: false, note: "Firmex rooms are administrator-controlled. Lengdon gives both parties an identical sealed close record." },
  { feature: "Payment gate confirmation", lengdon: true, them: false, note: "" },
  { feature: "Document hosting", lengdon: true, them: true, note: "" },
  { feature: "Permission groups", lengdon: true, them: true, note: "Firmex permissions are group-based. Lengdon's are per-person and gate-scoped." },
  { feature: "Bulk file management", lengdon: false, them: true, note: "" },
  { feature: "M&A diligence workflow", lengdon: false, them: true, note: "Lengdon begins after diligence." },
];

function CompareFirmex() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Lengdon vs Firmex"
          title="MANAGED FILES."
          titleOutline="VS CLOSED DEALS."
          subtitle="Firmex manages documents for M&A and financing transactions. Lengdon closes them. The two platforms represent different phases — and different definitions of 'done.'"
          cta={{ label: "Start closing", to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {[
              { label: "Firmex says", text: "\"Done\" means the documents are uploaded and the deal team has access.", dim: true },
              { label: "Most people think", text: "\"Done\" means both parties reviewed, confirmed, signed, paid, and closed.", dim: false },
              { label: "Lengdon delivers", text: "A sealed, dual-party export with every gate action permanently on record.", dim: false, dark: true },
            ].map((c, i) => (
              <div key={i} className={`p-10 ${i < 2 ? "border-r border-[#e6e9ef]" : ""} ${c.dark ? "bg-[#0a2540]" : ""}`}>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[11px] tracking-[2px] uppercase mb-4 ${c.dark ? "text-white/40" : "text-[#94a3b8]"}`}>{c.label}</div>
                <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className={`text-[20px] leading-[1.35] tracking-[-0.4px] ${c.dim ? "text-[#94a3b8]" : c.dark ? "text-white" : "text-[#0a2540]"}`}>{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="border border-[#e6e9ef] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-8 py-5 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Capability</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-5 font-semibold text-[#0a2540] text-[13px] text-center border-l border-[#e6e9ef]">Lengdon</div>
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-6 py-5 text-[#94a3b8] text-[13px] text-center border-l border-[#e6e9ef]">Firmex</div>
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
                Close the deal properly.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Firmex got you through diligence. Lengdon takes you to the sealed close.</p>
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
