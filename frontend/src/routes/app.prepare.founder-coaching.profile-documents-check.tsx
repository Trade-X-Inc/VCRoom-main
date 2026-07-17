import { createFileRoute } from "@tanstack/react-router";
import { FounderReadinessLeaf } from "./app.index";

// R9 extraction — Prepare › Founder Coaching › Full Profile & Documents Check. Renders the existing workstation card
// under route control; logic untouched.
function Page() {
  return <FounderReadinessLeaf card="coaching-check" />;
}

export const Route = createFileRoute("/app/prepare/founder-coaching/profile-documents-check")({
  component: Page,
});
