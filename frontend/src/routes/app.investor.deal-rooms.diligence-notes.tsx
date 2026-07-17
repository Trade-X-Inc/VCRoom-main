import { createFileRoute } from "@tanstack/react-router";
import { DiligencePage } from "./app.investor.diligence";

// R9 relocation — Deal Rooms › Diligence Notes. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/deal-rooms/diligence-notes")({
  component: DiligencePage,
});
