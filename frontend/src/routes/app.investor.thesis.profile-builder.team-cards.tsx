import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Investor Profile Builder › Team Cards. Renders the existing investor profile page's
// "team-cards" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="team-cards" />;
}

export const Route = createFileRoute("/app/investor/thesis/profile-builder/team-cards")({
  component: Page,
});
