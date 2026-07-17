import { createFileRoute } from "@tanstack/react-router";
import { FounderReadinessLeaf } from "./app.index";

// R9 extraction — Prepare › Investment Readiness › Investment Audit. Renders the existing workstation card
// under route control; logic untouched.
function Page() {
  return <FounderReadinessLeaf card="investment-audit" />;
}

export const Route = createFileRoute("/app/prepare/investment-readiness/investment-audit")({
  component: Page,
});
