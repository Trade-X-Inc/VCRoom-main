import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ToolCalculatorPage, fmtMoney } from "@/components/site/ToolCalculatorPage";

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

function BurnRate() {
  const [cashBalance, setCashBalance] = useState(2_000_000);
  const [monthlyRevenue, setMonthlyRevenue] = useState(80_000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(300_000);

  const netBurn = Math.max(0, monthlyExpenses - monthlyRevenue);
  const grossBurn = monthlyExpenses;
  const runway = netBurn > 0 ? Math.floor(cashBalance / netBurn) : 999;
  const runoutDate = new Date();
  runoutDate.setMonth(runoutDate.getMonth() + runway);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: BURN_RATE_JSON_LD }} />
      <ToolCalculatorPage
      toolLabel="Burn Rate"
      titleLine1="BURN RATE"
      titleLine2Outline="CALCULATOR"
      subtitle="Net and gross burn analysis. Know your runway before your next raise."
      fields={[
        { label: "Cash balance", value: cashBalance, set: setCashBalance, min: 0, max: 20_000_000, step: 100_000 },
        { label: "Monthly revenue", value: monthlyRevenue, set: setMonthlyRevenue, min: 0, max: 2_000_000, step: 10_000 },
        { label: "Monthly expenses (total)", value: monthlyExpenses, set: (v) => setMonthlyExpenses(Math.max(0, v)), min: 10_000, max: 3_000_000, step: 10_000 },
      ]}
      results={[
        { label: "Gross burn / month", value: fmtMoney(grossBurn) },
        { label: "Net burn / month", value: fmtMoney(netBurn), accent: true },
        { label: "Runway (months)", value: runway >= 999 ? "∞" : `${runway}mo` },
        { label: "Cash out date", value: runway >= 999 ? "Profitable" : runoutDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ]}
      ctaText="Planning your next raise? Lengdon closes the round once terms are agreed — sequenced, documented, permanently recorded."
      ctaLabel="Join the waitlist"
      belowCalculator={
        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16 border-t border-[#e6e9ef]">
          <div className="max-w-[720px] flex flex-col gap-10">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.3px] mb-3">What this calculator does</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">Burn rate is the speed at which a company spends its cash reserves. This calculator gives you gross burn (total monthly spend), net burn (spend minus revenue), and monthly runway in months — the three numbers every investor will ask for in a first meeting.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.3px] mb-3">Who uses it</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">Founders preparing for fundraising conversations. CFOs producing board-ready financials. Investors running a quick pre-LOI sanity check on a company's cash position.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.3px] mb-3">What to do with the output</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">Net burn and runway feed directly into your fundraising brief. On Lengdon, these figures anchor the financial section of your deal room and are referenced in the diligence checklist as confirmed inputs — so investors see a number that matches your data room, not a slide deck estimate.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.3px] mb-3">Key terms</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">Gross burn: total cash out per month before revenue offsets. Net burn: cash out minus cash in — the true depletion rate. Runway: months of cash remaining at current net burn. Zero-cash date: the calendar date at which the company runs out of money at current burn.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.3px] mb-3">How to use this in a deal room</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">Investors will ask for your net burn figure in the first meeting. Having it pre-calculated and attached to your deal room means you are not estimating in the room — you are referencing a number that is already in the data room and consistent with your financial exhibits.</p>
            </div>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#0a2540] text-[14px]">
              <Link to="/tools/runway" className="underline hover:opacity-70 transition-opacity">Calculate your runway from this burn rate →</Link>
            </p>
          </div>
        </section>
      }
      />
    </>
  );
}
