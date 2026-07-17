import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Badges › Verification Tier Status. Renders the existing investor profile page's
// "tier-status" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="tier-status" />;
}

export const Route = createFileRoute("/app/investor/thesis/badges/tier-status")({
  component: Page,
});
