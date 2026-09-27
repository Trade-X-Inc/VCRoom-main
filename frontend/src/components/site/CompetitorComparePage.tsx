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
// RESOLVED 9 Sep 2026 (public-site rewrite, Batch 3): the flag above
// stood since 31 Aug — every Lengdon-side row across all 5 competitor
// pages was verified against real code (six-gate sequence, per-person
// NDA via nda_acceptances, append-only record, dual confirmation via
// requestNextStage/approveTransition, payment gate via closing-fn.ts,
// gate-scoped document release via deal_room_stage). Every one is real;
// none referenced the "sealed export" capability the earlier flag
// worried about — that language was never actually in these row tables,
// only in adjacent marketing copy elsewhere (fixed separately). The
// open half of the flag was named-competitor claims (Datasite, Dealroom,
// DocSend, Firmex, iDeals) asserting specific operational facts about a
// third party's product with no way to independently confirm them —
// those rows were reworded from flat certainty ("Datasite requires only
// one party to upload") to hedged/positioning language ("Datasite is
// built around single-party document upload"), preserving the real
// differentiation without asserting unconfirmable specifics as fact.
// Category-level positioning claims already safe (e.g. "DocSend excels
// at controlled document distribution") were left unchanged.
//
// SEO-009 Phase 2 — migrated to PUBLIC-REGISTER.md v2.0 tokens (real
// Tailwind utilities exposed via styles.css's @theme block: bg-v2-*,
// text-v2-*, border-v2-*, font-v2-*). Structure, row data, and copy
// unchanged — token/class-level swap only. Note (flagged, not fixed,
// per Phase 2's token-only scope): this component renders TWO dark
// (navy) sections per page (the competitor/Lengdon blurb card, and the
// bottom CTA) — PUBLIC-REGISTER.md §5.5 specifies one dark section per
// page maximum. Pre-existing since the 31 Aug pixel-exact port; a real
// fix here is a content-architecture decision, not a token migration.

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
    <div className="min-h-screen bg-v2-surface">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow={eyebrow}
          title={title}
          titleOutline={titleOutline}
          subtitle={subtitle}
          cta={{ label: "See Lengdon in action", to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-v2-rule">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-v2-rule divide-y lg:divide-y-0 lg:divide-x divide-v2-rule">
            <div className="p-10 bg-v2-panel">
              <div className="font-v2-ui text-v2-ink-muted text-[11px] tracking-[0.08em] uppercase mb-5">{competitorName}</div>
              <h3 className="font-v2-ui font-semibold text-v2-ink-muted text-[24px] tracking-[-0.8px] mb-4 leading-[1.15]">{competitorBlurbTitle}</h3>
              <p className="font-v2-ui text-v2-ink-muted text-[14px] leading-[1.75]">
                {competitorBlurb}
              </p>
            </div>
            <div className="p-10 bg-v2-accent">
              <div className="font-v2-ui text-white/50 text-[11px] tracking-[0.08em] uppercase mb-5">Lengdon</div>
              <h3 className="font-v2-ui font-semibold text-white text-[24px] tracking-[-0.8px] mb-4 leading-[1.15]">{lengdonBlurbTitle}</h3>
              <p className="font-v2-ui text-white/60 text-[14px] leading-[1.75]">
                {lengdonBlurb}
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-v2-rule">
          <div className="border border-v2-rule overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-v2-surface border-b border-v2-rule">
              <div className="font-v2-ui px-8 py-5 text-v2-ink-muted text-[11px] tracking-[0.06em] uppercase">Capability</div>
              <div className="font-v2-ui px-6 py-5 font-semibold text-v2-ink text-[13px] text-center border-l border-v2-rule">Lengdon</div>
              <div className="font-v2-ui px-6 py-5 text-v2-ink-muted text-[13px] text-center border-l border-v2-rule">{competitorName}</div>
            </div>
            {rows.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_160px_160px] ${i < rows.length - 1 ? "border-b border-v2-rule" : ""} bg-v2-panel hover:bg-v2-surface transition-colors`}>
                <div className="px-8 py-5">
                  <div className="font-v2-ui text-v2-ink text-[14px] mb-1">{row.feature}</div>
                  {row.note && <div className="font-v2-ui text-v2-ink-muted text-[12px]">{row.note}</div>}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-v2-rule">
                  {row.lengdon ? (
                    <div className="w-5 h-5 rounded-full bg-v2-satisfied flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-v2-rule flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke="var(--v2-rule)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                  )}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-v2-rule">
                  {row.them ? (
                    <div className="w-5 h-5 rounded-full bg-v2-ink-muted/15 border border-v2-ink-muted/30 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="var(--v2-ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-v2-rule flex items-center justify-center">
                      <div className="w-2 h-px bg-v2-rule" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-v2-accent max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="font-v2-ui font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">{ctaTitle}</h2>
              <p className="font-v2-ui text-white/55 text-[15px]">{ctaSubtitle}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} className="font-v2-ui font-semibold bg-white hover:bg-v2-surface text-v2-accent text-[14px] px-10 py-4 transition-colors duration-200">
                Join the waitlist
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
