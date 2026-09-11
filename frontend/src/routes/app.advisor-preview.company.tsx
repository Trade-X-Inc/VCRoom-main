import { createFileRoute } from "@tanstack/react-router";
import {
  V2PageHeader, LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";
import { AdvisorPreviewBanner } from "@/components/app/AdvisorPreviewBanner";
import {
  PREVIEW_CLIENT_DETAIL, ADVISOR_STAGE_LABEL, ADVISOR_STAGE_ORDER,
} from "@/lib/advisor-preview-data";

// ─────────────────────────────────────────────────────────────────────────
// ADVISOR DASHBOARD — CLIENT DETAIL. DESIGN PREVIEW ONLY.
// ─────────────────────────────────────────────────────────────────────────
//
// FRONTEND ONLY. NOT WIRED TO ANY BACKEND. Same caveat as the portfolio
// screen: the advisor role does not exist (deal_room_members.role is
// founder | investor | lawyer, no advisor value added by this pass), there
// is no advisor↔client link, no authorization, no query. Content is
// invented placeholder data. The real role's schema/RLS/authorization
// design is a separate future effort.
//
// Figma frame 35:5043 ("Advisor Deal Desk — Project Lifecycle Tracking"),
// CONTENT REGION ONLY per CLAUDE.md §0a. The frame's own application shell
// (ADVISOR TERMINAL brand, left nav, search, "New Deal", "Switch View") is
// not ported — this renders inside the real AppShell.
//
// TWO DELIBERATE CONTENT CORRECTIONS, per the standing rule that the real
// workflow is authoritative and Figma supplies visual grammar only:
//
//   1. STAGE VOCABULARY. The frame uses an M&A/PE sell-side process —
//      "Teaser Distribution", "NDA Signing", "CIM Access", "Management
//      Presentation", "VDR Phase I". That is not this product's workflow.
//      Replaced with the real deal-room stages from
//      src/lib/deal-room-stages.ts (Information Vault → Interviews → Q&A →
//      Due Diligence → Term Sheet → Closing), used verbatim.
//
//   2. MOMENTUM SCORES DROPPED ENTIRELY. The frame's investor-pipeline
//      table carries a per-institution "+14.2 momentum" / "+8.5 momentum"
//      badge. That is a computed ranking signal on a counterparty —
//      prohibited outright by Foundation §15/§25 (scoring, ranking,
//      assessment), and the same shape as the Deal Intake thesis-fit
//      scores already found and deleted from this codebase (CLAUDE.md
//      §19a). Not translated, not softened, not rendered — removed.
//      The participant table shows only factual state: who they are, what
//      stage they are at, whether the NDA is signed.
//
// Also not ported: "Export Report" and "Add Investor" actions (no such
// advisor capability exists), and the frame's document-progress bar with
// "24/28 Invited · 85% Accessed" (an invented engagement metric).
//
// Extracted: the stage-timeline device, the header context strip, the
// document/question summary cards, and the participant table shape.

// NOTE ON THE FILENAME: this is "company", not "client". A route file named
// app.advisor-preview.client.tsx is rejected at runtime — the framework's
// import-protection treats **/*.client.* as a client-only module and denies
// it to the server environment, so the entire route tree fails to load with
// a 500. Found by running it, not by tsc (which passed clean). Do not
// rename this back.
export const Route = createFileRoute("/app/advisor-preview/company")({
  component: AdvisorClientPreview,
});

function AdvisorClientPreview() {
  const d = PREVIEW_CLIENT_DETAIL;
  const currentIndex = ADVISOR_STAGE_ORDER.indexOf(d.currentStage);

  return (
    <div className="mx-auto max-w-[1360px] font-v2-ui" style={{ padding: "24px 32px" }}>
      <AdvisorPreviewBanner />

      {/* "Acting on behalf of" context strip — the one piece of chrome that
          IS this screen's job: an advisor is never acting as themselves
          here, and the frame's own header made the mandate explicit too. */}
      <div
        className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border p-3"
        style={{
          borderColor: "var(--v2-accent)",
          background: "var(--v2-accent-wash)",
          borderRadius: "var(--v2-radius)",
        }}
      >
        <span
          className="font-bold"
          style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-accent)", textTransform: "uppercase" }}
        >
          Acting on behalf of
        </span>
        <span className="font-medium" style={{ fontSize: "13px", color: "var(--v2-ink)" }}>
          {d.company}
        </span>
        <span dir="ltr" className="font-v2-data" style={{ fontSize: "12px", color: "var(--v2-ink-secondary)" }}>
          {d.reference}
        </span>
      </div>

      <V2PageHeader
        breadcrumb={[{ label: "Portfolio", to: "/app/advisor-preview" }, { label: d.company }]}
        title={d.company}
        description={`${d.sector} · raising ${d.raiseTarget}`}
      />

      {/* Stage timeline — real vocabulary, not the frame's banker process. */}
      <section className="mt-6">
        <SectionLabel>Raise progress</SectionLabel>
        <div
          className="border bg-v2-panel p-5"
          style={{ borderColor: "var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
        >
          <div className="flex flex-wrap items-start gap-x-2 gap-y-4">
            {ADVISOR_STAGE_ORDER.map((stage, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <div key={stage} className="flex min-w-[120px] flex-1 flex-col gap-2">
                  <div
                    style={{
                      height: "2px",
                      background: done || active ? "var(--v2-accent)" : "var(--v2-rule)",
                    }}
                  />
                  <div
                    className="font-medium"
                    style={{
                      fontSize: "12px",
                      color: active ? "var(--v2-accent)" : done ? "var(--v2-ink)" : "var(--v2-ink-muted)",
                    }}
                  >
                    {ADVISOR_STAGE_LABEL[stage]}
                  </div>
                  {active && (
                    <div style={{ fontSize: "11px", color: "var(--v2-ink-muted)" }}>
                      Entered {d.stageEntered}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Participants — factual state only, no scores. */}
        <section>
          <SectionLabel>Participants</SectionLabel>
          <LedgerTable>
            <LedgerHead>
              <tr>
                <Th>Party</Th>
                <Th>Role</Th>
                <Th>Stage</Th>
                <Th>NDA</Th>
              </tr>
            </LedgerHead>
            <LedgerBody>
              {d.participants.map((p) => (
                <Tr key={p.name}>
                  <Td>{p.name}</Td>
                  <Td>{p.role}</Td>
                  <Td>{p.stage}</Td>
                  <Td>
                    <StatusLabel tone="satisfied">{p.ndaStatus}</StatusLabel>
                  </Td>
                </Tr>
              ))}
            </LedgerBody>
          </LedgerTable>
        </section>

        {/* Document / question summary — plain counts. */}
        <section>
          <SectionLabel>Open items</SectionLabel>
          <div className="flex flex-col gap-2">
            <SummaryCard label="Documents in the vault" value={String(d.documents.total)} />
            <SummaryCard label="Released to investors" value={String(d.documents.released)} />
            <SummaryCard
              label="Document requests open"
              value={String(d.documents.requested)}
              tone={d.documents.requested > 0 ? "attention" : undefined}
            />
            <SummaryCard
              label="Questions unanswered"
              value={String(d.openQuestions)}
              tone={d.openQuestions > 0 ? "attention" : undefined}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, tone,
}: { label: string; value: string; tone?: "attention" }) {
  return (
    <div
      className="flex items-center justify-between border bg-v2-panel p-4"
      style={{ borderColor: "var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
    >
      <span style={{ fontSize: "13px", color: "var(--v2-ink-secondary)" }}>{label}</span>
      <span
        className="font-v2-data"
        style={{ fontSize: "16px", color: tone === "attention" ? "var(--v2-attention)" : "var(--v2-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 font-bold"
      style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-ink-secondary)", textTransform: "uppercase" }}
    >
      {children}
    </div>
  );
}
