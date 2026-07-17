import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "./app.connections";

// R9 extraction — CRM › Connections. Renders the existing Connections page's
// "list" view under route control; logic untouched.
function Page() {
  return <ConnectionsPage view="list" />;
}

export const Route = createFileRoute("/app/crm/connections")({
  component: Page,
});
