import { createFileRoute } from "@tanstack/react-router";
import { FounderReadinessLeaf } from "./app.index";

// R9 extraction — Prepare › Founder Coaching › Full Report & Flags. Renders the existing workstation card
// under route control; logic untouched.
function Page() {
  return <FounderReadinessLeaf card="coaching-report" />;
}

export const Route = createFileRoute("/app/prepare/founder-coaching/report-flags")({
  component: Page,
});
