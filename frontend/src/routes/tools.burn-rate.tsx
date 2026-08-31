import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolCalculatorPage, fmtMoney } from "@/components/site/ToolCalculatorPage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/BurnRate.tsx. Calculation logic
// (net/gross burn, runway, cash-out date) is the source's own, unchanged.

export const Route = createFileRoute("/tools/burn-rate")({
  component: BurnRate,
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
      ctaLabel="Start closing with Lengdon"
    />
  );
}
