import { createFileRoute } from "@tanstack/react-router";
import { AnalysisPage } from "./app.investor.analysis";

// R9 relocation — CRM › Deal Analysis. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/crm/deal-analysis")({
  component: AnalysisPage,
});
