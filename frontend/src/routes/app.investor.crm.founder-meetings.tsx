import { createFileRoute } from "@tanstack/react-router";
import { Meetings } from "./app.meetings";

// R9 relocation — CRM › Founder Meetings (shared Meetings page). Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/crm/founder-meetings")({
  component: Meetings,
});
