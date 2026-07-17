import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Badges › Badge Overview & Guide. Renders the existing investor profile page's
// "badges-overview" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="badges-overview" />;
}

export const Route = createFileRoute("/app/investor/thesis/badges/overview")({
  component: Page,
});
