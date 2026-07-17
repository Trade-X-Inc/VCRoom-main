import { createFileRoute } from "@tanstack/react-router";
import { Profile } from "./app.profile";
import { PermissionGate } from "@/components/app/PermissionGate";

// R9 extraction — Prepare › Profile Builder › Fundraising Thesis. Renders the existing Profile
// page's "fundraising-thesis" slice under route control; logic untouched.
function Page() {
  return <Profile view="fundraising-thesis" />;
}

export const Route = createFileRoute("/app/prepare/profile-builder/fundraising-thesis")({
  component: () => (
    <PermissionGate permission="edit_profile">
      <Page />
    </PermissionGate>
  ),
});
