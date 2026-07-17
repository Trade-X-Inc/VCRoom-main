import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// R9 extraction — Go Live › Digital Profile › Profile Privacy Settings. Renders the existing Profile
// page's "privacy" slice under route control; logic untouched.
function Page() {
  return <Profile view="privacy" />;
}

export const Route = createFileRoute("/app/go-live/digital-profile/privacy-settings")({
  component: Page,
});
