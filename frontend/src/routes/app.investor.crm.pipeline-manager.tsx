import { createFileRoute } from "@tanstack/react-router";
import { DecisionsPage } from "./app.investor.decisions";

// R9 relocation — CRM › Pipeline Manager. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/crm/pipeline-manager")({
  component: DecisionsPage,
});
