import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Investor Profile Builder › Full Profile. Renders the existing investor profile page's
// "full-profile" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="full-profile" />;
}

export const Route = createFileRoute("/app/investor/thesis/profile-builder/full-profile")({
  component: Page,
});
