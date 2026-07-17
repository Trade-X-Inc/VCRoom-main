import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "./app.connections";

// R9 extraction — CRM › Pipeline Manager. Renders the existing Connections page's
// "pipeline" view under route control; logic untouched.
function Page() {
  return <ConnectionsPage view="pipeline" />;
}

export const Route = createFileRoute("/app/crm/pipeline-manager")({
  component: Page,
});
