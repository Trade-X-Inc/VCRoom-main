import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — shared shape for the 5
// /product/compare/* competitor pages, ported pixel-exact from
// LENGDONPUBLIC-NEW's src/pages/product/compare/*.tsx (all 5 files are
// structurally identical, differing only in the row data and two prose
// blocks — this component holds that one real shared shape).
//
// NAMED DIFFERENTLY from the pre-existing components/site/ComparePage.tsx
// on purpose — that file is a DIFFERENT, now-orphaned component from the
// prior lengdon-public-site/ migration (25 Aug 2026), built under a
// different content-discipline rule (content independently checked
// against real schema/code, competitor claims generalized to category
// level). This rebuild's rule is different — pixel-exact reproduction of
// the founder's new Figma source, claims reproduced verbatim and
// flagged rather than checked/softened. Reusing the old component would
// have silently mixed two different content-authority rules in one
// file. The old file is confirmed to have zero callers (grepped before
// writing this one) and should probably be deleted in a future cleanup
// pass — not done here, out of scope for this rebuild.
//
// FLAGGED, NOT CHANGED, applies to every competitor page built from
// this component: each row table asserts capabilities (immutable audit
// log, sealed dual-copy export, per-person NDA enforcement) that
// CLAUDE.md §12's own record states are NOT live in the product today —
// same flag as product.compare.index.tsx. Reproduced verbatim per
// instruction.

export interface CompareRow {
  feature: string;
  lengdon: boolean;
  them: boolean;
  note: string;
}

export interface CompetitorComparePageProps {
  eyebrow: string;
  title: string;
  titleOutline: string;
  subtitle: string;
  competitorName: string;
  competitorBlurbTitle: string;
  competitorBlurb: string;
  lengdonBlurbTitle: string;
  lengdonBlurb: string;
  rows: CompareRow[];
  ctaTitle: string;
  ctaSubtitle: string;
}

export function CompetitorComparePage({
  eyebrow, title, titleOutline, subtitle,
  competitorName, competitorBlurbTitle, competitorBlurb,
  lengdonBlurbTitle, lengdonBlurb,
  rows, ctaTitle, ctaSubtitle,
}: CompetitorComparePageProps) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow={eyebrow}
          title={title}
          titleOutline={titleOutline}
          subtitle={subtitle}
          cta={{ label: "See Lengdon in action", to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#e6e9ef] divide-y lg:divide-y-0 lg:divide-x divide-[#e6e9ef]">
            <div className="p-10">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[2px] uppercase mb-5">{competitorName}</div>
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#94a3b8] text-[24px] tracking-[-0.8px] mb-4 leading-[1.15]">{competitorBlurbTitle}</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] leading-[1.75]">
                {competitorBlurb}
              </p>
            </div>
            <div className="p-10 bg-[#0a2540]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/40 text-[11px] tracking-[2px] uppercase mb-5">Lengdon</div>
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[24px] tracking-[-0.8px] mb-4 leading-[1.15]">{lengdonBlurbTitle}</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/60 text-[14px] leading-[1.75]">
                {lengdonBlurb}
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="border border-[#e6e9ef] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-8 py-5 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Capability</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-5 font-semibold text-[#0a2540] text-[13px] text-center border-l border-[#e6e9ef]">Lengdon</div>
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-6 py-5 text-[#94a3b8] text-[13px] text-center border-l border-[#e6e9ef]">{competitorName}</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_160px_160px] ${i < rows.length - 1 ? "border-b border-[#e6e9ef]" : ""} hover:bg-[#fafbfc] transition-colors`}>
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
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">{ctaTitle}</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">{ctaSubtitle}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Start closing with Lengdon
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
