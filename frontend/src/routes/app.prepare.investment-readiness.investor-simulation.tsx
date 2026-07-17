import { createFileRoute } from "@tanstack/react-router";
import { FounderReadinessLeaf } from "./app.index";

// R9 extraction — Prepare › Investment Readiness › Investor Simulation. Renders the existing workstation card
// under route control; logic untouched.
function Page() {
  return <FounderReadinessLeaf card="investor-simulation" />;
}

export const Route = createFileRoute("/app/prepare/investment-readiness/investor-simulation")({
  component: Page,
});
