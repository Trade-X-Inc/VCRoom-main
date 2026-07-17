import { createFileRoute } from "@tanstack/react-router";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Thesis › Fund Vault › Digital Document Vault. No investor
// document-storage table exists yet (confirmed against the schema) —
// honest coming-soon state, no fabricated document list.
export const Route = createFileRoute("/app/investor/thesis/fund-vault/digital-document-vault")({
  component: Page,
});

function Page() {
  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Thesis" }, { label: "Fund Vault" }, { label: "Digital Document Vault" }]}
      title="Digital Document Vault"
      description="Hockystick-processed fund documents."
    >
      <EmptyState kind="empty" title="Not available yet" />
    </PageFrame>
  );
}
