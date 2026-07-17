import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Prepare › Profile Builder › Full Profile. Renders the existing Profile
// page's "full" slice under route control; logic untouched.
function Page() {
  return <Profile view="full" />;
}

export const Route = createFileRoute("/app/prepare/profile-builder/full-profile")({
  component: Page,
});
