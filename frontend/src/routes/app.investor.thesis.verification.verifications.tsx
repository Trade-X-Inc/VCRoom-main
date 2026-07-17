import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Verification › Verifications. Renders the existing investor profile page's
// "verifications" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="verifications" />;
}

export const Route = createFileRoute("/app/investor/thesis/verification/verifications")({
  component: Page,
});
