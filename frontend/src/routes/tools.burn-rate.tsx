import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ToolCalculatorPage, fmtMoney } from "@/components/site/ToolCalculatorPage";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/BurnRate.tsx. Calculation logic
// (net/gross burn, runway, cash-out date) is the source's own, unchanged.

export const Route = createFileRoute("/tools/burn-rate")({
  head: () => ({
    meta: [
      { title: "Burn rate calculator — monthly cash burn and runway — Lengdon" },
      { name: "description", content: "Calculate your monthly burn rate from revenue and expenses. See how long your cash lasts and what changes extend runway." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools/burn-rate" }],
  }),
  component: BurnRate,
});

// SEO-004: reuses this route's own real title/description above.
const BURN_RATE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Burn Rate Calculator",
  "url": "https://lengdon.com/tools/burn-rate",
  "description": "Calculate your monthly burn rate from revenue and expenses. See how long your cash lasts and what changes extend runway.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@id": "https://lengdon.com/#organization" },
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD.
const BURN_RATE_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools", url: "https://lengdon.com/tools" },
  { name: "Burn rate calculator" },
]);

function BurnRate() {
  const [cashBalance, setCashBalance] = useState(2_000_000);
  const [monthlyRevenue, setMonthlyRevenue] = useState(80_000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(300_000);

  // SEO-011: cashBalance/monthlyRevenue previously had no clamp at all —
  // a typed negative value flowed straight into netBurn/runway with no
  // warning. Results below use the clamped-safe values (never NaN or
  // negative); the raw values are what's checked for the error message,
  // so the input itself isn't silently overwritten while typing.
  const hasInvalidInput = cashBalance < 0 || monthlyRevenue < 0 || monthlyExpenses < 0;
  const safeCash = Math.max(0, cashBalance);
  const safeRevenue = Math.max(0, monthlyRevenue);
  const safeExpenses = Math.max(0, monthlyExpenses);

  const netBurn = Math.max(0, safeExpenses - safeRevenue);
  const grossBurn = safeExpenses;
  const runway = netBurn > 0 ? Math.floor(safeCash / netBurn) : 999;
  const runoutDate = new Date();
  runoutDate.setMonth(runoutDate.getMonth() + runway);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: BURN_RATE_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: BURN_RATE_BREADCRUMB_JSON_LD }} />
      <ToolCalculatorPage
      toolLabel="Burn Rate"
      titleLine1="BURN RATE"
      titleLine2Outline="CALCULATOR"
      subtitle="Net and gross burn analysis. Know your runway before your next raise."
      fields={[
        { label: "Cash balance", value: cashBalance, set: setCashBalance, min: 0, max: 20_000_000, step: 100_000 },
        { label: "Monthly revenue", value: monthlyRevenue, set: setMonthlyRevenue, min: 0, max: 2_000_000, step: 10_000 },
        { label: "Monthly expenses (total)", value: monthlyExpenses, set: setMonthlyExpenses, min: 10_000, max: 3_000_000, step: 10_000 },
      ]}
      errorMessage={hasInvalidInput ? "Cash balance, revenue and expenses can't be negative — enter zero or a positive number." : undefined}
      primaryResult={{
        label: "Runway",
        value: runway >= 999 ? "∞" : `${runway} months`,
        explanation: runway >= 999
          ? "At your current revenue, expenses aren't outpacing income — there's no cash-out date to project."
          : `At this burn rate, you have ${runway} month${runway === 1 ? "" : "s"} before you need to raise or become profitable.`,
      }}
      results={[
        { label: "Gross burn / month", value: fmtMoney(grossBurn) },
        { label: "Net burn / month", value: fmtMoney(netBurn), accent: true },
        { label: "Cash out date", value: runway >= 999 ? "Profitable" : runoutDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ]}
      runwayTimeline={
        !hasInvalidInput && runway < 999
          ? { months: runway, cashOutLabel: runoutDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) }
          : null
      }
      ctaText="Planning your next raise? Lengdon closes the round once terms are agreed — sequenced, documented, permanently recorded."
      ctaLabel="Join the waitlist"
      belowCalculator={
        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[var(--v2-rule)]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Burn rate is the speed at which a company spends its cash reserves. This calculator gives you gross burn (total monthly spend), net burn (spend minus revenue), and monthly runway in months — the three numbers every investor will ask for in a first meeting.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Founders preparing for fundraising conversations. CFOs producing board-ready financials. Investors running a quick pre-LOI sanity check on a company's cash position.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Net burn and runway feed directly into your fundraising brief. On Lengdon, these figures anchor the financial section of your deal room and are referenced in the diligence checklist as confirmed inputs — so investors see a number that matches your data room, not a slide deck estimate.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Gross burn: total cash out per month before revenue offsets. Net burn: cash out minus cash in — the true depletion rate. Runway: months of cash remaining at current net burn. Zero-cash date: the calendar date at which the company runs out of money at current burn.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.7]">Investors will ask for your net burn figure in the first meeting. Having it pre-calculated and attached to your deal room means you are not estimating in the room — you are referencing a number that is already in the data room and consistent with your financial exhibits.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[22px] tracking-[-0.3px] mb-3">Related tools</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/tools/runway" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Runway Calculator</Link>
                <Link to="/tools/valuation-calculator" style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-accent)] text-[14px] underline hover:opacity-70 transition-opacity">Valuation Calculator</Link>
              </div>
            </div>
          </div>
        </section>
      }
      />
    </>
  );
}
