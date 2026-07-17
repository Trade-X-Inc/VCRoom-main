import { createFileRoute } from "@tanstack/react-router";
import { DealFlowPage } from "./app.investor.deal-flow";

// R9 relocation — Discover › Deal Flow. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/discover/deal-flow")({
  component: DealFlowPage,
});
