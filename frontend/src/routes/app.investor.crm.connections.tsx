import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "./app.investor.connections";

// R9 relocation — CRM › Connections. Same component and behavior, new home;
// the old route redirects here.
export const Route = createFileRoute("/app/investor/crm/connections")({
  component: ConnectionsPage,
});
