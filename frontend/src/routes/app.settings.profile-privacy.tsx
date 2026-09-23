import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";

// Go Live nav re-homing (Sep 2026) — was
// /app/go-live/digital-profile/privacy-settings. Renders the existing
// Profile page's "privacy" slice (company-profile section-visibility,
// distinct from Settings > Profile's own account-level fields) under
// route control; logic untouched. Moved into Settings as a real sibling
// route alongside Billing/Notifications/Security/Activity.
function Page() {
  return <Profile view="privacy" />;
}

export const Route = createFileRoute("/app/settings/profile-privacy")({
  component: Page,
});
