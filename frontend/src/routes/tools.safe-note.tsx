import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/SafeNote.tsx. Standalone: unique
// toggle (capped/uncapped) + conditional-field shape.

export const Route = createFileRoute("/tools/safe-note")({
  head: () => ({
    meta: [
      { title: "SAFE note calculator — convert your SAFE at any valuation — Lengdon" },
      { name: "description", content: "Model how a SAFE converts at different valuations and round sizes. See dilution, ownership percentage and post-money cap table." },
      ...socialMeta({ title: "SAFE note calculator — convert your SAFE at any valuation — Lengdon", description: "Model how a SAFE converts at different valuations and round sizes. See dilution, ownership percentage and post-money cap table.", path: "/tools/safe-note" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/safe-note" }],
  }),
  component: SafeNote,
});

// SEO-004: reuses this route's own real title/description above rather
// than inventing separate copy for the structured-data name/description.
const SAFE_NOTE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SAFE Note Calculator",
  "url": "https://lengdon.com/tools/safe-note",
  "description": "Model how a SAFE converts at different valuations and round sizes. See dilution, ownership percentage and post-money cap table.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /tools
// (tools.index.tsx) is the real hub page.
const SAFE_NOTE_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "SAFE note calculator" },
]);

function SafeNote() {
  const [safeAmount, setSafeAmount] = useState(500_000);
  const [capType, setCapType] = useState<"capped" | "uncapped">("capped");
  const [valuationCap, setValuationCap] = useState(10_000_000);
  const [discount, setDiscount] = useState(20);
  const [priceRoundValuation, setPriceRoundValuation] = useState(18_000_000);
  const [priceRoundRaise, setPriceRoundRaise] = useState(3_000_000);

  const postMoney = priceRoundValuation + priceRoundRaise;
  const pricePerShare = 1;
  const capPrice = capType === "capped" ? (valuationCap / priceRoundValuation) * pricePerShare : Infinity;
  const discountPrice = pricePerShare * (1 - discount / 100);
  const conversionPrice = Math.min(capPrice, discountPrice);
  const ownershipPct = safeAmount / (postMoney + safeAmount);

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SAFE_NOTE_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SAFE_NOTE_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Tool · SAFE Note</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              SAFE NOTE<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[440px]">Model how a SAFE converts to equity at a priced round — with cap and discount scenarios.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label htmlFor="safe-amount" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">SAFE investment amount</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                  <input id="safe-amount" type="number" value={safeAmount} onChange={(e) => setSafeAmount(Math.max(0, Number(e.target.value)))} placeholder="e.g. 500,000" style={{ fontFamily: "var(--font-v2-data)" }} className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label id="safe-type-label" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">SAFE type</label>
                <div role="group" aria-labelledby="safe-type-label" className="flex gap-0 border border-[var(--v2-rule)]">
                  {(["capped", "uncapped"] as const).map((t) => (
                    <button key={t} onClick={() => setCapType(t)} aria-pressed={capType === t} style={{ fontFamily: "var(--font-v2-ui)" }} className={`flex-1 py-3 text-[13px] transition-colors ${capType === t ? "bg-[var(--v2-accent)] text-white" : "text-[var(--v2-ink-secondary)] hover:bg-[var(--v2-surface)]"} ${t === "capped" ? "border-r border-[var(--v2-rule)]" : ""}`}>
                      {t === "capped" ? "Valuation cap" : "Uncapped"}
                    </button>
                  ))}
                </div>
              </div>

              {capType === "capped" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="safe-valuation-cap" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Valuation cap</label>
                  <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                    <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                    <input id="safe-valuation-cap" type="number" value={valuationCap} onChange={(e) => setValuationCap(Math.max(0, Number(e.target.value)))} placeholder="e.g. 10,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="safe-discount" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Discount rate (%)</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <input id="safe-discount" type="number" min={0} max={50} value={discount} onChange={(e) => setDiscount(Math.max(0, Math.min(50, Number(e.target.value))))} placeholder="e.g. 20" style={{ fontFamily: "var(--font-v2-data)" }} className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]" />
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-l border-[var(--v2-rule)]">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="safe-price-round-valuation" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Priced round pre-money valuation</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                  <input id="safe-price-round-valuation" type="number" value={priceRoundValuation} onChange={(e) => setPriceRoundValuation(Math.max(1, Number(e.target.value)))} placeholder="e.g. 18,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="safe-price-round-raise" style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">Priced round raise amount</label>
                <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors bg-[var(--v2-panel)]">
                  <span style={{ fontFamily: "var(--font-v2-data)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                  <input id="safe-price-round-raise" type="number" value={priceRoundRaise} onChange={(e) => setPriceRoundRaise(Math.max(0, Number(e.target.value)))} placeholder="e.g. 3,000,000" style={{ fontFamily: "var(--font-v2-data)" }} className="flex-1 px-4 py-3.5 text-[14px] text-[var(--v2-accent)] focus:outline-none bg-[var(--v2-panel)]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 h-fit">
              <div className="flex flex-col gap-2 p-6 bg-[var(--v2-panel)] border border-[var(--v2-rule)]">
                <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[13px] tracking-[0.02em]">Estimated ownership post-close</span>
                <div className="pub-title" style={{ fontFamily: "var(--font-v2-data)", color: "var(--v2-accent)" }}>{pct(ownershipPct)}</div>
                <p style={{ fontFamily: "var(--font-v2-doc)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.6] mt-1">
                  This is the percentage of the company the SAFE holder owns immediately after the priced round closes and the SAFE converts, at the {capType === "capped" ? "cap or discount price, whichever is more favorable to the investor" : "discounted price"}.
                </p>
              </div>
              <div className="flex flex-col gap-0 border border-[var(--v2-rule)] divide-y divide-[var(--v2-rule)]">
                {[
                  { label: "Conversion price (relative)", value: capType === "capped" ? `Cap: ${(capPrice * 100).toFixed(1)}% · Disc: ${pct(1 - discount / 100)}` : `Discount only: ${pct(1 - discount / 100)}`, accent: false },
                  { label: "Effective conversion price", value: `${(conversionPrice * 100).toFixed(1)}% of round price`, accent: true },
                  { label: "Priced round post-money", value: fmt(postMoney), accent: false },
                  { label: "SAFE amount invested", value: fmt(safeAmount), accent: false },
                ].map((r) => (
                  <div key={r.label} className={`flex items-start justify-between px-6 py-5 gap-4 ${r.accent ? "bg-[var(--v2-accent)]" : ""}`}>
                    <span style={{ fontFamily: "var(--font-v2-ui)" }} className={`text-[13px] leading-[1.4] ${r.accent ? "text-white/60" : "text-[var(--v2-ink-secondary)]"}`}>{r.label}</span>
                    <span style={{ fontFamily: "var(--font-v2-data)" }} className={`font-semibold text-[14px] tracking-[-0.3px] text-right shrink-0 ${r.accent ? "text-white" : "text-[var(--v2-accent)]"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
              {capType === "capped" && Number.isFinite(capPrice) && (
                <div className="flex flex-col gap-3 p-6 bg-[var(--v2-panel)] border border-[var(--v2-rule)]" role="img" aria-label={`SAFE conversion price comparison: via cap ${(capPrice * 100).toFixed(1)}%, via discount ${(discountPrice * 100).toFixed(1)}%. Investor gets the lower price.`}>
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[13px] tracking-[0.02em]">Cap vs. discount — investor gets the lower price</span>
                  <div className="flex items-end gap-6 h-[80px]">
                    {[
                      { label: "Via cap", price: capPrice, fill: "var(--v2-accent)" },
                      { label: "Via discount", price: discountPrice, fill: "var(--v2-ink-muted)" },
                    ].map((bar) => {
                      const isLower = bar.price === conversionPrice;
                      const maxPrice = Math.max(capPrice, discountPrice);
                      const heightPct = maxPrice > 0 ? (bar.price / maxPrice) * 100 : 0;
                      return (
                        <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div
                            style={{
                              width: "100%", height: `${heightPct}%`, background: bar.fill,
                              outline: isLower ? "2px solid var(--v2-satisfied)" : "none", outlineOffset: "2px",
                            }}
                          />
                          <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[11px]">{bar.label}</span>
                          <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] font-semibold">{(bar.price * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">A SAFE (Simple Agreement for Future Equity) converts to equity at a future priced round. This calculator shows you how many shares your SAFE converts to, at what price, and what percentage of the post-money cap table the SAFE holder will own — accounting for both valuation cap and discount rate mechanics.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders issuing SAFEs to angel investors or pre-seed funds. Investors evaluating a SAFE offer before signing. Advisors modeling dilution scenarios before a priced round.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Use the converted share count and ownership percentage as inputs to your cap table model. If you are building a deal room on Lengdon, the SAFE terms attach directly to the deal record and flow into the diligence checklist automatically.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Valuation cap: the maximum company valuation at which the SAFE converts, regardless of the actual round valuation. Discount rate: the percentage reduction on the per-share price the SAFE holder receives versus new investors. Post-money SAFE: the cap is calculated on the post-money valuation including the SAFE itself.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">When you issue a SAFE through Lengdon, the calculated conversion terms attach to the deal record at the Brief stage. At close, the conversion is sealed into the record and referenced in the closing conditions — so every party has the same numbers at every stage, with no version confusion.</p>
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
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px] max-w-[480px]">SAFE terms agreed. Now use Lengdon to close the priced round with a permanent record.</p>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Join the waitlist</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
