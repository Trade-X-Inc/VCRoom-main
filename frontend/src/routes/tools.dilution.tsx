import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Dilution.tsx. Standalone: unique
// dynamic funding-round editor + waterfall dilution shape.

export const Route = createFileRoute("/tools/dilution")({
  head: () => ({
    meta: [
      { title: "Dilution modeller — model equity dilution across funding rounds — Lengdon" },
      { name: "description", content: "See how your ownership stake changes across seed, Series A and later rounds. Model new shares, options pool and investor dilution." },
      ...socialMeta({ title: "Dilution modeller — model equity dilution across funding rounds — Lengdon", description: "See how your ownership stake changes across seed, Series A and later rounds. Model new shares, options pool and investor dilution.", path: "/tools/dilution" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/dilution" }],
  }),
  component: Dilution,
});

// SEO-009 Phase 5: reuses this route's own real title/description above —
// the only one of the 7 /tools/* pages missing this JSON-LD (a gap in
// SEO-004, found during the SEO-009 audit), matching the sibling tools'
// established SoftwareApplication schema exactly.
const DILUTION_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Dilution Modeller",
  "url": "https://lengdon.com/tools/dilution",
  "description": "See how your ownership stake changes across seed, Series A and later rounds. Model new shares, options pool and investor dilution.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

interface Round { name: string; raise: number; preVal: number; }
const DEFAULT_ROUNDS: Round[] = [
  { name: "Pre-Seed (SAFE)", raise: 500_000, preVal: 5_000_000 },
  { name: "Seed", raise: 2_000_000, preVal: 10_000_000 },
  { name: "Series A", raise: 8_000_000, preVal: 25_000_000 },
];

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /tools
// (tools.index.tsx) is the real hub page.
const DILUTION_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "Dilution modeller" },
]);

function Dilution() {
  const [founderShares] = useState(10_000_000);
  const [rounds, setRounds] = useState<Round[]>(DEFAULT_ROUNDS);

  // SEO-011: preVal was already clamped to >=1 on entry (below), but
  // raise had no clamp at all — a negative raise would produce a
  // negative investorPct and push founderPctAfter outside [0,1]. Checked
  // here rather than silently clamped at entry, since a negative raise
  // is the kind of typo worth surfacing, not quietly overwriting.
  const hasInvalidInput = rounds.some((r) => r.raise < 0);

  let remaining = founderShares;
  const totalShares = founderShares;

  const roundResults = rounds.map((r) => {
    const safeRaise = Math.max(0, r.raise);
    const newShares = (safeRaise / r.preVal) * totalShares;
    const investorPct = safeRaise / (r.preVal + safeRaise);
    remaining = remaining * (1 - investorPct);
    return { ...r, investorPct, founderPctAfter: remaining / (totalShares + newShares) };
  });

  const founderFinal = roundResults.length > 0 ? roundResults[roundResults.length - 1].founderPctAfter : 1;

  const updateRound = (i: number, key: keyof Round, val: number | string) => {
    setRounds((p) => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DILUTION_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DILUTION_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Tool · Dilution</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              DILUTION<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>MODELER</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[440px]">See how founder ownership dilutes across successive funding rounds.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[18px] tracking-[-0.4px] mb-6">Funding rounds</h2>
              <div className="flex flex-col gap-4">
                {rounds.map((r, i) => {
                  const raiseId = `dilution-round-${i}-raise`;
                  const preValId = `dilution-round-${i}-preval`;
                  return (
                    <div key={i} className="border border-[var(--v2-rule)] p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <input value={r.name} onChange={(e) => updateRound(i, "name", e.target.value)} aria-label={`Round ${i + 1} name`} style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[15px] tracking-[-0.3px] focus:outline-none border-b border-transparent focus:border-[var(--v2-rule)] pb-0.5" />
                        <button onClick={() => setRounds((p) => p.filter((_, idx) => idx !== i))} aria-label={`Remove ${r.name || `round ${i + 1}`}`} className="text-[var(--v2-ink-muted)] hover:text-v2-adverse text-[18px] transition-colors">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label htmlFor={raiseId} style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[11px] tracking-[0.3px]">Raise amount ($)</label>
                          <input id={raiseId} type="number" value={r.raise} onChange={(e) => updateRound(i, "raise", Number(e.target.value))} placeholder="e.g. 2,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="border border-[var(--v2-rule)] px-3 py-2 text-[13px] text-[var(--v2-accent)] focus:outline-none focus:border-[var(--v2-accent)] bg-[var(--v2-panel)]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor={preValId} style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[11px] tracking-[0.3px]">Pre-money valuation ($)</label>
                          <input id={preValId} type="number" value={r.preVal} onChange={(e) => updateRound(i, "preVal", Math.max(1, Number(e.target.value)))} placeholder="e.g. 10,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="border border-[var(--v2-rule)] px-3 py-2 text-[13px] text-[var(--v2-accent)] focus:outline-none focus:border-[var(--v2-accent)] bg-[var(--v2-panel)]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => setRounds((p) => [...p, { name: `Round ${p.length + 1}`, raise: 5_000_000, preVal: 20_000_000 }])}
                  style={{ fontFamily: "var(--font-v2-ui)" }}
                  className="border border-dashed border-[var(--v2-rule)] hover:border-[var(--v2-accent)]/30 text-[var(--v2-ink-muted)] hover:text-[var(--v2-accent)] text-[13px] py-4 transition-all"
                >
                  + Add round
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[18px] tracking-[-0.4px]">Founder ownership over time</h2>
              {hasInvalidInput && (
                <div style={{ fontFamily: "var(--font-v2-ui)" }} className="border border-v2-adverse/30 bg-v2-adverse-wash px-4 py-3 text-v2-adverse text-[13px] leading-[1.5]">
                  Raise amount can't be negative — enter zero or a positive number for each round.
                </div>
              )}
              <div className="flex flex-col gap-2 p-6 bg-[var(--v2-panel)] border border-[var(--v2-rule)]">
                <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[13px] tracking-[0.02em]">Final founder ownership</span>
                <div className="pub-title" style={{ fontFamily: "var(--font-v2-data)", color: "var(--v2-accent)" }}>{pct(founderFinal)}</div>
                <p style={{ fontFamily: "var(--font-v2-doc)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.6] mt-1">
                  After all {rounds.length} round{rounds.length === 1 ? "" : "s"} modeled above, this is what the founder retains — down from 100% before any raise.
                </p>
              </div>
              <div className="border border-[var(--v2-rule)] overflow-hidden">
                <div className="bg-[var(--v2-accent)] px-6 py-4 flex justify-between">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[11px] tracking-[1px] uppercase">Before any raise</span>
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="font-semibold text-white text-[15px]">100.0%</span>
                </div>
                {roundResults.map((r, i) => (
                  <div key={i} className="px-6 py-5 flex items-center justify-between border-t border-[var(--v2-rule)]">
                    <div>
                      <div style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] mb-0.5">{r.name}</div>
                      <div style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[12px]">{pct(r.investorPct)} new investor ownership</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-v2-data)" }} className="font-semibold text-[var(--v2-accent)] text-[18px] tracking-[-0.5px]">
                      {pct(r.founderPctAfter)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Every priced funding round issues new shares to new investors, which reduces — dilutes — the percentage every existing shareholder owns, even though their share count doesn't change. This calculator models founder ownership across a sequence of rounds you define, showing the dilution at each stage and the cumulative result.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Pre-money valuation: the company's value before the new round's capital is added. Dilution: the reduction in an existing shareholder's ownership percentage caused by new shares being issued, regardless of whether they sell any shares themselves.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Related tools</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/tools/cap-table" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Cap Table Builder</Link>
                <Link to="/tools/valuation-calculator" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Valuation Calculator</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[var(--v2-rule)] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px] max-w-[480px]">Model is clear. Close the round with Lengdon — a structured sequence both parties execute, and one sealed record both parties can always see.</p>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Join the waitlist</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
