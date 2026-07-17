import { createFileRoute } from "@tanstack/react-router";
import { IntakePage } from "./app.investor.intake";

// R9 relocation — Discover › Deal Intake. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/discover/deal-intake")({
  component: IntakePage,
});
