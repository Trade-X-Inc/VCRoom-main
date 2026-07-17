import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Discover › Public Investor Profile › Full Digital Profile View. Renders the existing investor profile page's
// "profile-view" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="profile-view" />;
}

export const Route = createFileRoute("/app/investor/discover/public-profile/profile-view")({
  component: Page,
});
