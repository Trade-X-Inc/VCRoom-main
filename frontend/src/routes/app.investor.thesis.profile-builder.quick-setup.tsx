import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Investor Profile Builder › Quick Setup. Renders the existing investor profile page's
// "quick-setup" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="quick-setup" />;
}

export const Route = createFileRoute("/app/investor/thesis/profile-builder/quick-setup")({
  component: Page,
});
