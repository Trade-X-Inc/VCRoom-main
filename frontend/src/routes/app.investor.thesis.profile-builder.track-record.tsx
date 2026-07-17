import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Investor Profile Builder › Track Record. Renders the existing investor profile page's
// "track-record" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="track-record" />;
}

export const Route = createFileRoute("/app/investor/thesis/profile-builder/track-record")({
  component: Page,
});
