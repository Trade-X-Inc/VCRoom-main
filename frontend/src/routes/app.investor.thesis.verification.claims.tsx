import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Verification › Claims. Renders the existing investor profile page's
// "claims" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="claims" />;
}

export const Route = createFileRoute("/app/investor/thesis/verification/claims")({
  component: Page,
});
