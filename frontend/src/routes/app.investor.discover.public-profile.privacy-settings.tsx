import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Discover › Public Investor Profile › Profile Privacy Settings. Renders the existing investor profile page's
// "privacy-settings" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="privacy-settings" />;
}

export const Route = createFileRoute("/app/investor/discover/public-profile/privacy-settings")({
  component: Page,
});
