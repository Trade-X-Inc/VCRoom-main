import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Prepare › Profile Builder › Team Cards. Renders the existing Profile
// page's "team-cards" slice under route control; logic untouched.
function Page() {
  return <Profile view="team-cards" />;
}

export const Route = createFileRoute("/app/prepare/profile-builder/team-cards")({
  component: Page,
});
