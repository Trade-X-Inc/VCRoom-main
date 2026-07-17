import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "./app.documents";

// R9 extraction — Prepare › IP Vault › Document Intake. Renders the existing Documents
// workspace's "document-intake" slice under route control; logic untouched.
function Page() {
  return <Documents view="document-intake" />;
}

export const Route = createFileRoute("/app/prepare/ip-vault/document-intake")({
  component: Page,
});
