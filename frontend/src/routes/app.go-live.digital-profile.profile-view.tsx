import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Go Live › Digital Profile › Full Digital Profile View. Renders the existing Profile
// page's "preview" slice under route control; logic untouched.
function Page() {
  return <Profile view="preview" />;
}

export const Route = createFileRoute("/app/go-live/digital-profile/profile-view")({
  component: Page,
});
