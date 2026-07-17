import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Investor Profile Builder › Investment Thesis. Renders the existing investor profile page's
// "investment-thesis" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="investment-thesis" />;
}

export const Route = createFileRoute("/app/investor/thesis/profile-builder/investment-thesis")({
  component: Page,
});
