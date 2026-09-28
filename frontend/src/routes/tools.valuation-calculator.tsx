import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/ValuationCalculator.tsx.
// Standalone (not built from ToolCalculatorPage): this is the only tool
// with slider min/max range labels beneath each field.

export const Route = createFileRoute("/tools/valuation-calculator")({
  head: () => ({
    meta: [
      { title: "Startup valuation calculator — pre-money and post-money — Lengdon" },
      { name: "description", content: "Calculate pre-money and post-money valuation from investment amount and equity percentage. Understand what a term sheet implies." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/valuation-calculator" }],
  }),
  component: ValuationCalculator,
});

// SEO-004: reuses this route's own real title/description above.
const VALUATION_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Startup Valuation Calculator",
  "url": "https://lengdon.com/tools/valuation-calculator",
  "description": "Calculate pre-money and post-money valuation from investment amount and equity percentage. Understand what a term sheet implies.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

function fmt(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /tools
// (tools.index.tsx) is the real hub page.
const VALUATION_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "Startup valuation calculator" },
]);

function ValuationCalculator() {
  const [preMoney, setPreMoney] = useState(8_000_000);
  const [raise, setRaise] = useState(2_000_000);

  // SEO-011: preMoney/raise were already clamped to >=0 on entry (see the
  // onChange handlers below), so a negative typed value never reaches
  // state — but a genuinely zero postMoney (both fields at 0) still
  // divides by zero. Flagged as its own case, distinct from "negative."
  const postMoney = preMoney + raise;
  const hasZeroDivision = postMoney <= 0;
  const investorPct = hasZeroDivision ? 0 : raise / postMoney;
  const founderPct = 1 - investorPct;

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: VALUATION_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: VALUATION_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">
              ← All tools
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Tool · Valuation</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              VALUATION<br />
              <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[440px]">
              Model pre-money and post-money valuation based on round size and investor ownership.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <label style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Pre-money valuation</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                  <input
                    type="number"
                    value={preMoney}
                    onChange={(e) => setPreMoney(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 8,000,000"
                    style={{ fontFamily: "var(--font-v2-data)" }}
                    className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]"
                  />
                </div>
                <input type="range" min={500_000} max={100_000_000} step={500_000} value={preMoney} onChange={(e) => setPreMoney(Number(e.target.value))} className="w-full accent-[var(--v2-accent)]" />
                <div style={{ fontFamily: "var(--font-v2-data)" }} className="flex justify-between text-[var(--v2-ink-muted)] text-[11px]">
                  <span>$500K</span><span>$100M</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Round size (investment amount)</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                  <input
                    type="number"
                    value={raise}
                    onChange={(e) => setRaise(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 2,000,000"
                    style={{ fontFamily: "var(--font-v2-data)" }}
                    className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]"
                  />
                </div>
                <input type="range" min={100_000} max={20_000_000} step={100_000} value={raise} onChange={(e) => setRaise(Number(e.target.value))} className="w-full accent-[var(--v2-accent)]" />
                <div style={{ fontFamily: "var(--font-v2-data)" }} className="flex justify-between text-[var(--v2-ink-muted)] text-[11px]">
                  <span>$100K</span><span>$20M</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 h-fit">
              {hasZeroDivision && (
                <div style={{ fontFamily: "var(--font-v2-ui)" }} className="border border-v2-adverse/30 bg-v2-adverse-wash px-4 py-3 text-v2-adverse text-[13px] leading-[1.5]">
                  Enter a pre-money valuation or round size greater than zero to see ownership percentages.
                </div>
              )}
              <div className="flex flex-col gap-2 p-6 bg-[var(--v2-panel)] border border-[var(--v2-rule)]">
                <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[13px] tracking-[0.02em]">Post-money valuation</span>
                <div className="pub-title" style={{ fontFamily: "var(--font-v2-data)", color: "var(--v2-accent)" }}>{fmt(postMoney)}</div>
                <p style={{ fontFamily: "var(--font-v2-doc)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.6] mt-1">
                  {hasZeroDivision
                    ? "Enter valid values above to calculate ownership."
                    : `At this valuation, new investors own ${pct(investorPct)} of the company and existing shareholders retain ${pct(founderPct)}.`}
                </p>
              </div>
              {!hasZeroDivision && (
                <div className="p-6 bg-[var(--v2-panel)] border border-[var(--v2-rule)]" role="img" aria-label={`Ownership split: investor ${pct(investorPct)}, founder ${pct(founderPct)}`}>
                  <svg viewBox="0 0 400 48" width="100%" height="48" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="0" y="0" width={400 * investorPct} height="48" fill="var(--v2-accent)" />
                    <rect x={400 * investorPct} y="0" width={400 * founderPct} height="48" fill="var(--v2-ink-muted)" />
                  </svg>
                  <div className="flex items-center justify-between mt-2">
                    <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[12px]">Investor {pct(investorPct)}</span>
                    <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[12px]">Founder {pct(founderPct)}</span>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-0 border border-[var(--v2-rule)] divide-y divide-[var(--v2-rule)]">
                {[
                  { label: "Pre-money valuation", value: fmt(preMoney), accent: false },
                  { label: "Round size", value: fmt(raise), accent: false },
                  { label: "Investor ownership", value: pct(investorPct), accent: false },
                  { label: "Founder/existing ownership", value: pct(founderPct), accent: false },
                ].map((r) => (
                  <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-[var(--v2-accent)]" : ""}`}>
                    <span style={{ fontFamily: "var(--font-v2-ui)" }} className={`text-[14px] ${r.accent ? "text-white/60" : "text-[var(--v2-ink-secondary)]"}`}>{r.label}</span>
                    <span style={{ fontFamily: "var(--font-v2-data)" }} className={`font-semibold text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : "text-[var(--v2-accent)]"}`}>{r.value}</span>
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
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">This calculator applies the three most common early-stage valuation methods — Berkus, Scorecard, and Revenue Multiple — and shows you a blended range. No single method is authoritative; the range gives you a defensible basis for the number you put on your term sheet.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders setting a valuation for their first priced round. Angel investors sense-checking a founder's ask. Advisors preparing a fairness opinion for a board.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Use the output as a starting point, not a final answer. Comparable transactions in your sector, investor appetite, and competitive tension all move the final number. On Lengdon, the agreed valuation is recorded in the deal record at the Terms stage and referenced in the closing conditions — creating an auditable trail from negotiation to close.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Pre-money valuation: company value before new capital is added. Post-money valuation: pre-money plus the new investment amount. Berkus method: assigns value to five risk factors (idea, prototype, team, board, product rollout). Scorecard method: benchmarks against comparable funded companies and adjusts for relative strength. Revenue multiple: applies a sector-standard multiple to current or projected revenue.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">The agreed pre-money valuation is recorded in the Lengdon deal record at the Terms stage. Using a calculation method you can explain — rather than a number you picked — gives investors a basis to engage rather than a position to challenge.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Related tools</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/tools/safe-note" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">SAFE Note Calculator</Link>
                <Link to="/tools/cap-table" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Cap Table Builder</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[var(--v2-rule)] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px] max-w-[480px]">
              Once your round terms are set, use Lengdon to close the transaction — sequenced, documented, and permanently recorded.
            </p>
            <Link to="/sign-up" style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
              Join the waitlist
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
