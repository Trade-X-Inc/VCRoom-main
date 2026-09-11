import { createFileRoute, Link } from "@tanstack/react-router";
import {
  V2PageHeader, LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";
import { AdvisorPreviewBanner } from "@/components/app/AdvisorPreviewBanner";
import {
  PREVIEW_CLIENTS, PREVIEW_OUTSTANDING, ADVISOR_STAGE_LABEL,
} from "@/lib/advisor-preview-data";

// ─────────────────────────────────────────────────────────────────────────
// ADVISOR DASHBOARD — GLOBAL PORTFOLIO OVERVIEW. DESIGN PREVIEW ONLY.
// ─────────────────────────────────────────────────────────────────────────
//
// FRONTEND ONLY. NOT WIRED TO ANY BACKEND. The advisor role does not exist
// in this product: deal_room_members.role is founder | investor | lawyer,
// there is no advisor value (this pass deliberately did not add one), no
// advisor↔client linking table, no portfolio-rollup query, and no RLS or
// authorization for an advisor principal. All content comes from
// src/lib/advisor-preview-data.ts, which is invented placeholder data.
// Designing and building the real role — schema, RLS, an adversarial
// authorization trace per CLAUDE.md §20.1 — is a separate, future-scoped
// effort. This screen exists ahead of its data model, on purpose, for
// design review; it must not be mistaken for a working feature, which is
// why it carries a visible in-app banner and no nav entry.
//
// Figma frame 35:5389 ("Advisor Terminal — Global Portfolio Overview"),
// CONTENT REGION ONLY per CLAUDE.md §0a. The frame draws a complete
// separate application — its own "ADVISOR TERMINAL / Institutional Alpha"
// brand, left nav (Overview/Analytics/Investors/Documents/Audit
// Trail/Settings), top search bar, "New Deal" button and a "Switch View"
// control. NONE of that is ported: this renders inside the real AppShell,
// same rule applied to every deal-room screen this session.
//
// Also NOT ported, deliberately:
//   • "TOTAL AUM ACTIVE $4.2B" / "CAPITAL DEPLOYED (Q3) $850M" stat tiles
//     with "+2.4%" / "+12%" trend deltas — this product does not compute
//     AUM or deployment, and a trend delta over invented data is precisely
//     the fabricated-statistic pattern CLAUDE.md §7.4 prohibits. The two
//     tiles kept ("clients", "outstanding items") are plain counts of the
//     rows actually rendered below, so they cannot disagree with the table.
//   • The frame's "Export Report" action — no such capability exists.
//
// Extracted: the stat-tile row, the client table shape (Ref / Company /
// Sector / Target / Stage / Days / Last activity), and the right-hand
// outstanding-items panel.

export const Route = createFileRoute("/app/advisor-preview/")({
  component: AdvisorPortfolioPreview,
});

function AdvisorPortfolioPreview() {
  const outstandingCount = PREVIEW_CLIENTS.filter((c) => c.nextAction).length;

  return (
    <div className="mx-auto max-w-[1360px] font-v2-ui" style={{ padding: "24px 32px" }}>
      <AdvisorPreviewBanner />

      <V2PageHeader
        title="Portfolio"
        description="Every company you represent, and what each one is waiting on."
      />

      {/* Stat tiles — plain counts only, derived from the rows below. */}
      <div className="mb-6 mt-6 grid gap-3 sm:grid-cols-2">
        <StatTile label="Companies represented" value={String(PREVIEW_CLIENTS.length)} />
        <StatTile
          label="Waiting on you"
          value={String(outstandingCount)}
          tone={outstandingCount > 0 ? "attention" : "satisfied"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Client roster */}
        <section>
          <SectionLabel>Companies</SectionLabel>
          <LedgerTable>
            <LedgerHead>
              <tr>
                <Th>Reference</Th>
                <Th>Company</Th>
                <Th>Sector</Th>
                <Th numeric>Target</Th>
                <Th>Stage</Th>
                <Th numeric>Days in stage</Th>
                <Th>Last activity</Th>
              </tr>
            </LedgerHead>
            <LedgerBody>
              {PREVIEW_CLIENTS.map((c) => (
                <Tr key={c.reference}>
                  <Td>
                    <span dir="ltr" className="font-v2-data text-v2-accent" style={{ fontSize: "12px", letterSpacing: "0.04em" }}>
                      {c.reference}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      to="/app/advisor-preview/company"
                      className="font-medium underline decoration-v2-rule underline-offset-2"
                      style={{ color: "var(--v2-ink)" }}
                    >
                      {c.company}
                    </Link>
                  </Td>
                  <Td>{c.sector}</Td>
                  <Td numeric>{c.raiseTarget}</Td>
                  <Td>{ADVISOR_STAGE_LABEL[c.stage]}</Td>
                  <Td numeric>{c.daysInStage}</Td>
                  <Td>{c.lastActivity}</Td>
                </Tr>
              ))}
            </LedgerBody>
          </LedgerTable>
        </section>

        {/* Outstanding — the frame's "Urgent Actions" panel. */}
        <section>
          <SectionLabel>Outstanding</SectionLabel>
          <div className="flex flex-col gap-2">
            {PREVIEW_OUTSTANDING.map((item, i) => (
              <div
                key={i}
                className="border bg-v2-panel p-4"
                style={{ borderColor: "var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="font-medium" style={{ fontSize: "13px", color: "var(--v2-ink)" }}>
                    {item.company}
                  </span>
                  <StatusLabel tone={item.tone}>
                    {item.tone === "attention" ? "Outstanding" : "Presented"}
                  </StatusLabel>
                </div>
                <div style={{ fontSize: "13px", color: "var(--v2-ink)" }}>{item.label}</div>
                <div className="mt-1" style={{ fontSize: "12px", color: "var(--v2-ink-muted)" }}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label, value, tone,
}: { label: string; value: string; tone?: "attention" | "satisfied" }) {
  return (
    <div
      className="border bg-v2-panel"
      style={{ borderColor: "var(--v2-rule)", borderRadius: "var(--v2-radius)", padding: "17px" }}
    >
      <div
        className="font-bold"
        style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-ink-secondary)", textTransform: "uppercase" }}
      >
        {label}
      </div>
      <div
        className="mt-2 font-v2-data"
        style={{
          fontSize: "24px",
          letterSpacing: "-0.6px",
          color: tone === "attention" ? "var(--v2-attention)" : "var(--v2-ink)",
        }}
      >
        {value}
      </div>
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
