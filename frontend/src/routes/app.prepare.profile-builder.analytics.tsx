import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// Go Live nav re-homing (Sep 2026) — was /app/go-live/profile-analytics.
// Renders the existing Profile page's "analytics" slice under route
// control; logic untouched. Moved here because it's real content a
// founder returns to repeatedly, same class as this section's other
// five Profile Builder sub-pages it now sits beside.
function Page() {
  return <Profile view="analytics" />;
}

export const Route = createFileRoute("/app/prepare/profile-builder/analytics")({
  component: Page,
});
