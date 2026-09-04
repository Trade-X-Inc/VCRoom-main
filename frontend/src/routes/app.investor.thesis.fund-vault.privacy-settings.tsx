import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LcsPageHeader, LcsEmptyState } from "@/components/lcs";

// R9 (c) — Thesis › Fund Vault › Document Privacy Settings. Depends on the
// Digital Document Vault existing first — no document table to set
// visibility on yet. Honest coming-soon state.
export const Route = createFileRoute("/app/investor/thesis/fund-vault/privacy-settings")({
  component: Page,
});

function Page() {
  return (
    <div className="p-6 lg:p-8 max-w-[1360px] mx-auto">
      <div
        className="flex items-center gap-1.5 text-[12px] font-medium mb-3"
        style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <span>Investor</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Thesis</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Fund Vault</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Document Privacy Settings</span>
      </div>
      <LcsPageHeader
        title="Document Privacy Settings"
        description="Control which fund documents are visible in a deal room."
      />
      <LcsEmptyState title="Not available yet" text="This is not built yet." />
    </div>
  );
}
