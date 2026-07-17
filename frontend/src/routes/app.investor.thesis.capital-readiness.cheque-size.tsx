import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Capital Readiness › Cheque Size Confirmation. Renders the existing investor profile page's
// "cheque-size" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="cheque-size" />;
}

export const Route = createFileRoute("/app/investor/thesis/capital-readiness/cheque-size")({
  component: Page,
});
