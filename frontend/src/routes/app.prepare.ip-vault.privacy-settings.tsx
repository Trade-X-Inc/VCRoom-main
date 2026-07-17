import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "./app.documents";

// R9 extraction — Prepare › IP Vault › Document Privacy Settings. Renders the existing Documents
// workspace's "privacy-settings" slice under route control; logic untouched.
function Page() {
  return <Documents view="privacy-settings" />;
}

export const Route = createFileRoute("/app/prepare/ip-vault/privacy-settings")({
  component: Page,
});
