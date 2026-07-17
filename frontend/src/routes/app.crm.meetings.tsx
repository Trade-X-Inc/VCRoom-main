import { createFileRoute } from "@tanstack/react-router";
import { Meetings } from "./app.meetings";

// R9 relocation — CRM › Connection Meetings. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/crm/meetings")({
  component: Meetings,
});
