import { createFileRoute } from "@tanstack/react-router";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Thesis › Fund Vault › Document Privacy Settings. Depends on the
// Digital Document Vault existing first — no document table to set
// visibility on yet. Honest coming-soon state.
export const Route = createFileRoute("/app/investor/thesis/fund-vault/privacy-settings")({
  component: Page,
});

function Page() {
  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Thesis" }, { label: "Fund Vault" }, { label: "Document Privacy Settings" }]}
      title="Document Privacy Settings"
      description="Control which fund documents are visible in a deal room."
    >
      <EmptyState kind="empty" title="Not available yet" />
    </PageFrame>
  );
}
