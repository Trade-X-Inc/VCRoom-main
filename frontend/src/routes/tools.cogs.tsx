import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Cogs.tsx. Standalone: this tool's
// fields have no sliders and include a benchmark note in the results
// panel, unlike the slider-based tools.

export const Route = createFileRoute("/tools/cogs")({
  head: () => ({
    meta: [
      { title: "COGS calculator — cost of goods sold for your business — Lengdon" },
      { name: "description", content: "Calculate cost of goods sold and gross margin. Model how pricing, volume and direct costs affect your unit economics." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/cogs" }],
  }),
  component: CogsCalculator,
});

// SEO-004: reuses this route's own real title/description above.
const COGS_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "COGS Calculator",
  "url": "https://lengdon.com/tools/cogs",
  "description": "Calculate cost of goods sold and gross margin. Model how pricing, volume and direct costs affect your unit economics.",
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
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function CogsCalculator() {
  const [revenue, setRevenue] = useState(1_200_000);
  const [hosting, setHosting] = useState(80_000);
  const [supportStaff, setSupportStaff] = useState(120_000);
  const [thirdPartyLicenses, setThirdPartyLicenses] = useState(30_000);
  const [paymentProcessing, setPaymentProcessing] = useState(24_000);
  const [other, setOther] = useState(10_000);

  const totalCogs = hosting + supportStaff + thirdPartyLicenses + paymentProcessing + other;
  const grossProfit = revenue - totalCogs;
  const grossMargin = revenue > 0 ? grossProfit / revenue : 0;

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: COGS_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "var(--font-v2-ui)" }} className="inline-flex items-center gap-2 text-white/50 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Tool · COGS</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              COGS<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[440px]">Cost of goods sold and gross margin analysis for SaaS and technology companies.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-6">
              {[
                { label: "Annual recurring revenue (ARR)", value: revenue, set: setRevenue, note: "" },
                { label: "Hosting & infrastructure", value: hosting, set: setHosting, note: "Cloud, CDN, databases" },
                { label: "Customer support staff (COGS-attributed)", value: supportStaff, set: setSupportStaff, note: "Portion of support team costs in COGS" },
                { label: "Third-party licenses & APIs", value: thirdPartyLicenses, set: setThirdPartyLicenses, note: "" },
                { label: "Payment processing fees", value: paymentProcessing, set: setPaymentProcessing, note: "" },
                { label: "Other direct costs", value: other, set: setOther, note: "" },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <label style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] tracking-[0.3px]">{field.label}</label>
                    {field.note && <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[11px]">{field.note}</span>}
                  </div>
                  <div className="flex items-center border border-[var(--v2-rule)] focus-within:border-[var(--v2-accent)] transition-colors">
                    <span style={{ fontFamily: "var(--font-v2-ui)" }} className="px-4 text-[var(--v2-ink-muted)] text-[14px] border-r border-[var(--v2-rule)]">$</span>
                    <input type="number" value={field.value} onChange={(e) => field.set(Math.max(0, Number(e.target.value)))} style={{ fontFamily: "var(--font-v2-ui)" }} className="flex-1 px-4 py-3 text-[14px] text-[var(--v2-accent)] focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-0 border border-[var(--v2-rule)] divide-y divide-[var(--v2-rule)] h-fit">
              {[
                { label: "Total COGS", value: fmt(totalCogs), accent: false },
                { label: "Gross profit", value: fmt(grossProfit), accent: true },
                { label: "Gross margin", value: pct(grossMargin), accent: false },
                { label: "COGS as % of revenue", value: pct(totalCogs / (revenue || 1)), accent: false },
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-[var(--v2-accent)]" : ""}`}>
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className={`text-[14px] ${r.accent ? "text-white/60" : "text-[var(--v2-ink-secondary)]"}`}>{r.label}</span>
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className={`font-semibold text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : grossProfit < 0 && r.label === "Gross profit" ? "text-v2-adverse" : "text-[var(--v2-accent)]"}`}>{r.value}</span>
                </div>
              ))}
              <div className="px-6 py-5">
                <div style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[12px] leading-[1.6]">
                  SaaS benchmarks: Strong &gt;70% gross margin, average 60–70%, below 50% indicates infrastructure cost issues.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Cost of Goods Sold (COGS) is the direct cost of producing whatever a company sells. This calculator separates COGS from operating expenses, computes gross margin, and shows gross profit — the line investors use to assess unit economics before scaling costs are layered in.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders presenting unit economics in a pitch. Investors evaluating whether a business model is viable at scale. Finance teams preparing investor-ready P&L summaries.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Gross margin percentage is one of the first numbers a sophisticated investor will benchmark against sector norms. For SaaS, above 70% is expected. For hardware or food, below 40% is common. Know where you sit before entering a deal room.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">COGS: direct costs — materials, manufacturing, hosting costs directly tied to revenue, direct labour. Gross profit: revenue minus COGS. Gross margin: gross profit as a percentage of revenue. Operating expenses (OpEx): indirect costs not included in COGS — sales, marketing, G&A, R&D.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Your gross margin percentage determines how investors benchmark you against sector peers. In a Lengdon deal room, your P&L summary is part of the diligence checklist — COGS and gross margin appear as confirmed line items, not a slide deck approximation.</p>
            </div>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px]">
              <Link to="/tools/valuation-calculator" className="underline hover:opacity-70 transition-opacity">Use your gross margin in the valuation calculator →</Link>
            </p>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[var(--v2-rule)] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px] max-w-[480px]">Metrics ready for investor review? Lengdon closes the round — sequenced, recorded, sealed.</p>
            <Link to="/sign-up" style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Join the waitlist</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
