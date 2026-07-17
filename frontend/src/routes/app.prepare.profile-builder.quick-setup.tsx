import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Prepare › Profile Builder › Quick Setup. Renders the existing Profile
// page's "quick" slice under route control; logic untouched.
function Page() {
  return <Profile view="quick" />;
}

export const Route = createFileRoute("/app/prepare/profile-builder/quick-setup")({
  component: Page,
});
