import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Go Live › Profile View Analytics. Renders the existing Profile
// page's "analytics" slice under route control; logic untouched.
function Page() {
  return <Profile view="analytics" />;
}

export const Route = createFileRoute("/app/go-live/profile-analytics")({
  component: Page,
});
