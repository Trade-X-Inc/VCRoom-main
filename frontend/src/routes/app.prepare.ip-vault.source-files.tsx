import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "./app.documents";

// R9 extraction — Prepare › IP Vault › Source Files. Renders the existing Documents
// workspace's "source-files" slice under route control; logic untouched.
function Page() {
  return <Documents view="source-files" />;
}

export const Route = createFileRoute("/app/prepare/ip-vault/source-files")({
  component: Page,
});
