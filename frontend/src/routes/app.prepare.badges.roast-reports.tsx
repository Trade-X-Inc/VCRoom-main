import { createFileRoute } from "@tanstack/react-router";
import { RoastManagement } from "./app.roast.index";

// R9 extraction — Prepare › Badges › Founder Roast Reports. Renders the
// existing roast management page's completed-sessions slice under route
// control; logic untouched.
function Page() {
  return <RoastManagement view="reports" />;
}

export const Route = createFileRoute("/app/prepare/badges/roast-reports")({
  component: Page,
});
