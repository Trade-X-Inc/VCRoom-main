import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";
import { CHANGELOG } from "@/lib/docs/content/changelog";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/resources/Changelog.tsx, then REWIRED
// 8 Sep 2026 to real content.
//
// The source's ENTRIES array (v1.0.0 through v1.4.0, invented features
// like a Firm plan / custom branding / a public API, a fabricated "40%
// faster" stat) was never real — see CLAUDE.md §7.4 and this file's own
// prior header comment, which flagged the fabrication but reproduced it
// verbatim pending a decision. That decision is: replace it entirely with
// this repository's own real, dated changelog. CHANGELOG is imported
// directly from src/lib/docs/content/changelog.tsx (previously written,
// but orphaned — nothing on the live site imported it) rather than copied
// here, so there is exactly one source of this content, not two files that
// happen to agree today and drift apart later. This page supplies its own
// visual shell (matching the rest of the public site) around that one real
// data source; every entry, date, and correction renders exactly as
// written there, including its self-corrections left in place rather than
// rewritten (the project's standing "annotate, don't erase" convention —
// see CLAUDE.md §19's changelog-handling precedent).
//
// Grouped by month (not by version — there is no real version-number
// scheme), each entry tagged by its real feature area rather than a
// New/Improved/Fixed split invented for the fake entries.
//
// The source's second "Notify me" email-capture form is a duplicate of
// the real, functional one already in SiteFooter.tsx — not reproduced as
// a second form; kept as a pointer to the footer's real one, same
// treatment as the blog index page's newsletter section.

export const Route = createFileRoute("/resources/changelog")({
  component: Changelog,
});

const AREA_STYLES: Record<string, string> = {
  Security: "border-red-200 text-red-700",
  Legal: "border-amber-200 text-amber-800",
  AI: "border-purple-200 text-purple-700",
  "Deal rooms": "border-blue-200 text-blue-700",
  Investors: "border-emerald-200 text-emerald-700",
};

function Changelog() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Resources · Changelog"
          title="WHAT'S"
          titleOutline="NEW."
          subtitle="Every entry below is derived from the platform's actual release history — including the corrections, left in place rather than rewritten when an earlier entry was wrong."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="max-w-[820px] flex flex-col gap-0">
            {CHANGELOG.map((month, mi) => (
              <div key={month.month} className={`${mi < CHANGELOG.length - 1 ? "pb-14 border-b border-[#e6e9ef] mb-14" : ""}`}>
                <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-6">
                  {month.month}
                </h2>
                <div className="flex flex-col gap-6">
                  {month.entries.map((entry, ei) => (
                    <div key={ei} className="flex gap-6">
                      <div className="w-[92px] shrink-0 pt-0.5">
                        <time
                          dateTime={entry.date}
                          style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                          className="text-[#94a3b8] text-[12px] tabular-nums"
                        >
                          {new Date(entry.date + "T00:00:00Z").toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            timeZone: "UTC",
                          })}
                        </time>
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <span
                          style={{ fontFamily: "'Inter:Medium', sans-serif" }}
                          className={`inline-block self-start text-[10px] tracking-[0.5px] uppercase border px-2 py-0.5 ${
                            AREA_STYLES[entry.area] ?? "border-[#e6e9ef] text-[#94a3b8]"
                          }`}
                        >
                          {entry.area}
                        </span>
                        <p
                          style={{ fontFamily: "'Inter:Regular', sans-serif", whiteSpace: "pre-line" }}
                          className="text-[#425466] text-[14px] leading-[1.65]"
                        >
                          {entry.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] tracking-[-0.8px] mb-2">
                Get release notifications.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px]">
                We'll notify you when this page updates. No other email from us.
              </p>
            </div>
            <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">
              Subscribe from the footer below.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
