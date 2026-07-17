import { createFileRoute } from "@tanstack/react-router";
import { EmailComposer } from "./app.email";

// R9 relocation — CRM › Email Outreach. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/crm/email-outreach")({
  component: EmailComposer,
});
