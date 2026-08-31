import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ToolCalculatorPage, fmtMoney } from "@/components/site/ToolCalculatorPage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Runway.tsx. Calculation logic is
// the source's own, unchanged.

export const Route = createFileRoute("/tools/runway")({
  component: RunwayCalculator,
});

function RunwayCalculator() {
  const [cash, setCash] = useState(3_000_000);
  const [burn, setBurn] = useState(200_000);
  const [growth, setGrowth] = useState(0);

  const baseMonths = burn > 0 ? cash / burn : 999;
  const adjustedBurn = burn * (1 + growth / 100);
  const adjustedMonths = adjustedBurn > 0 ? cash / adjustedBurn : 999;

  const outDate = new Date();
  outDate.setMonth(outDate.getMonth() + Math.floor(adjustedMonths));

  return (
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
      results={[
        { label: "Runway at flat burn", value: `${Math.floor(baseMonths)}mo` },
        { label: "Adjusted monthly burn", value: fmtMoney(adjustedBurn), accent: true },
        { label: "Adjusted runway", value: adjustedMonths >= 999 ? "∞" : `${Math.floor(adjustedMonths)}mo` },
        { label: "Projected cash-out date", value: adjustedMonths >= 999 ? "N/A" : outDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
      ]}
      ctaText="Know your raise timeline. When you're ready to close, Lengdon handles the full six-gate sequence."
      ctaLabel="Start your room"
    />
  );
}
