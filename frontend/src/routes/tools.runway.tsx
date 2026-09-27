import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ToolCalculatorPage, fmtMoney } from "@/components/site/ToolCalculatorPage";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Runway.tsx. Calculation logic is
// the source's own, unchanged.

export const Route = createFileRoute("/tools/runway")({
  head: () => ({
    meta: [
      { title: "Runway calculator — how long does your cash last — Lengdon" },
      { name: "description", content: "Enter your cash balance and monthly burn to see your runway in months. Model scenarios to extend it before your next raise." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/runway" }],
  }),
  component: RunwayCalculator,
});

// SEO-004: reuses this route's own real title/description above.
const RUNWAY_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Runway Calculator",
  "url": "https://lengdon.com/tools/runway",
  "description": "Enter your cash balance and monthly burn to see your runway in months. Model scenarios to extend it before your next raise.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD.
const RUNWAY_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "Runway calculator" },
]);

function RunwayCalculator() {
  const [cash, setCash] = useState(3_000_000);
  const [burn, setBurn] = useState(200_000);
  const [growth, setGrowth] = useState(0);

  // SEO-011: cash/burn previously had no clamp — a typed negative value
  // flowed straight through. growth's own negative range (min: -20) is
  // intentional (declining burn), not an error case, so it's excluded.
  const hasInvalidInput = cash < 0 || burn < 0;
  const safeCash = Math.max(0, cash);
  const safeBurn = Math.max(0, burn);

  const baseMonths = safeBurn > 0 ? safeCash / safeBurn : 999;
  const adjustedBurn = safeBurn * (1 + growth / 100);
  const adjustedMonths = adjustedBurn > 0 ? safeCash / adjustedBurn : 999;

  const outDate = new Date();
  outDate.setMonth(outDate.getMonth() + Math.floor(adjustedMonths));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: RUNWAY_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: RUNWAY_BREADCRUMB_JSON_LD }} />
      <ToolCalculatorPage
      toolLabel="Runway"
      titleLine1="RUNWAY"
      titleLine2Outline="CALCULATOR"
      subtitle="Months remaining at current burn — with an optional growth rate adjustment."
      fields={[
        { label: "Current cash balance", value: cash, set: setCash, min: 100_000, max: 50_000_000, step: 100_000, prefix: "$" },
        { label: "Monthly net burn", value: burn, set: setBurn, min: 10_000, max: 2_000_000, step: 10_000, prefix: "$" },
        { label: "Monthly burn growth rate (%)", value: growth, set: setGrowth, min: -20, max: 50, step: 1, prefix: "%" },
      ]}
      errorMessage={hasInvalidInput ? "Cash balance and monthly burn can't be negative — enter zero or a positive number." : undefined}
      primaryResult={{
        label: "Adjusted runway",
        value: adjustedMonths >= 999 ? "∞" : `${Math.floor(adjustedMonths)} months`,
        explanation: adjustedMonths >= 999
          ? "At this burn rate, cash isn't depleting — there's no cash-out date to project."
          : `At this burn rate, with the growth rate applied, you have ${Math.floor(adjustedMonths)} month${Math.floor(adjustedMonths) === 1 ? "" : "s"} before you need to raise or become profitable.`,
      }}
      results={[
        { label: "Runway at flat burn", value: `${Math.floor(baseMonths)}mo` },
        { label: "Adjusted monthly burn", value: fmtMoney(adjustedBurn), accent: true },
        { label: "Projected cash-out date", value: adjustedMonths >= 999 ? "N/A" : outDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ]}
      ctaText="Know your raise timeline. When you're ready to close, Lengdon handles the full seven-stage sequence."
      ctaLabel="Join the waitlist"
      belowCalculator={
        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Runway is the number of months a company can operate before it runs out of cash, assuming no new revenue or fundraising. This calculator gives you current runway, projected runway under different burn scenarios, and the latest date to close your next round to avoid a cash-out event.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders timing their fundraise. Investors assessing urgency and negotiating leverage. Board members monitoring financial health between rounds.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Standard advice: begin your next raise when you have 9–12 months of runway remaining. Less than 6 months and you are raising from a position of weakness. Use this number to set your fundraising start date, not your wire date.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Runway: months of cash at current burn. Cash-out date: the calendar date cash reaches zero. Fundraising buffer: the months required to close a round (seed: 3–6 months; Series A: 4–8 months). Hard deadline: cash-out date minus fundraising buffer — the latest date to begin raising.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Runway is the first number an investor uses to assess urgency. In a Lengdon deal room, the runway figure you calculate here feeds into the deal brief — so your stated timeline to close is grounded in a real number, visible to all parties.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Related tools</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/tools/burn-rate" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Burn Rate Calculator</Link>
                <Link to="/tools/cap-table" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Cap Table Builder</Link>
              </div>
            </div>
          </div>
        </section>
      }
      />
    </>
  );
}
