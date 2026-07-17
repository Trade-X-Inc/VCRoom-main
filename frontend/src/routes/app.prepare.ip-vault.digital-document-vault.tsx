import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "./app.documents";

// R9 extraction — Prepare › IP Vault › Digital Document Vault. Renders the existing Documents
// workspace's "digital-document-vault" slice under route control; logic untouched.
function Page() {
  return <Documents view="digital-document-vault" />;
}

export const Route = createFileRoute("/app/prepare/ip-vault/digital-document-vault")({
  component: Page,
});
