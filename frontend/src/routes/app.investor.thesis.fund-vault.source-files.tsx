import { createFileRoute } from "@tanstack/react-router";
import { InvestorProfilePage } from "./app.investor.profile";

// R9 extraction — Thesis › Fund Vault › Source Files. Renders the existing investor profile page's
// "source-files" slice under route control; logic untouched.
function Page() {
  return <InvestorProfilePage view="source-files" />;
}

export const Route = createFileRoute("/app/investor/thesis/fund-vault/source-files")({
  component: Page,
});
