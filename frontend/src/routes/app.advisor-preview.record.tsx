import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import {
  V2PageHeader, LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";
import { AdvisorPreviewBanner } from "@/components/app/AdvisorPreviewBanner";
import { PREVIEW_CLOSE_RECORD } from "@/lib/advisor-preview-data";

// ─────────────────────────────────────────────────────────────────────────
// ADVISOR DASHBOARD — SEALED CLOSE RECORD. DESIGN PREVIEW ONLY.
// ─────────────────────────────────────────────────────────────────────────
//
// FRONTEND ONLY. NOT WIRED TO ANY BACKEND. The advisor role does not exist
// (deal_room_members.role is founder | investor | lawyer; no advisor value
// added by this pass), and there is no advisor authorization of any kind.
// Content is invented placeholder data.
//
// THIS SCREEN NEEDS A SECOND, SHARPER CAVEAT THAN THE OTHER TWO.
//
// It depicts a capability — advisor-initiated export of a sealed,
// hash-chained close record — that is REAL IN SPECIFICATION but NOT
// AVAILABLE. Specifically:
//
//   • The record chain is real in spec (CLAUDE.md §8.3): append-only,
//     hash-chained, each entry carrying its predecessor's hash, actor
//     identity and actor type. It is BUILT, but only in the isolated
//     pack_v1 schema — NOT promoted to public, NOT cut over, and holding
//     0 real entries. pack_v1 is explicitly a discardable design-proving
//     namespace.
//   • Reference numbering is real in spec (Foundation §9.1 / CLAUDE.md
//     §8.4) and implemented as pack_v1.next_reference(), but §20.6 records
//     that it sits on no user-facing table today — ReferenceLine renders
//     nothing, everywhere, until that lands.
//   • There is NO export capability of any kind — no sealed export, no
//     PDF render, no share-record action. The frame's "Export PDF" and
//     "Share Record" buttons are NOT ported for exactly this reason.
//     CLAUDE.md §12 records that "sealed export" was one of four
//     differentiator claims found to be FALSE of the live product during
//     the public-site work, and removed from public copy on that basis.
//     Rendering a working-looking export button here would re-introduce
//     the same false claim inside the app.
//
// So: the shape below is faithful to the spec, and every value in it is
// invented. Nobody should read this screen as evidence the export exists.
//
// REFERENCE NUMBERS ARE REAL-FORMAT AND CHECK-DIGIT VERIFIED. The frame
// showed "000042-ROM-2026-000017-31", which is close but not the spec: the
// ORG segment must be a 6-char org code (pack_v1.next_org_code(), base-36),
// not a 6-digit number. Every reference rendered here uses the real
// {ORG}-{TYP}-{YYYY}-{SEQ}-{CD} format with a TYP from the real set
// (RSE/ROM/NDA/REQ/TRM/CPR/REL/CLS), and every check digit was computed by
// the actual pack_v1.mod97_check_digits() implementation and verified
// against it — not hand-written. (Six of eight were wrong on the first
// pass and were corrected against the live function; see the commit
// message.) They are still fictional numbers for fictional deals.
//
// Figma frame 35:3313 ("Advisor Record Export — Multi-Party Final Close"),
// CONTENT REGION ONLY per CLAUDE.md §0a. Its application shell (ADVISOR
// TERMINAL brand, left nav, "Switch View") is not ported.
//
// Extracted: the sealed-record header treatment, the three summary tiles,
// the chained-event ledger table, and the closing-gates checklist.

export const Route = createFileRoute("/app/advisor-preview/record")({
  component: AdvisorRecordPreview,
});

function AdvisorRecordPreview() {
  const r = PREVIEW_CLOSE_RECORD;

  return (
    <div className="mx-auto max-w-[1360px] font-v2-ui" style={{ padding: "24px 32px" }}>
      <AdvisorPreviewBanner />

      {/* Second, screen-specific caveat — the capability question, which the
          generic preview banner does not cover. */}
      <div
        className="mb-6 border p-4"
        style={{
          borderColor: "var(--v2-rule)",
          background: "var(--v2-surface)",
          borderRadius: "var(--v2-radius)",
        }}
      >
        <div
          className="font-bold"
          style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-ink-secondary)", textTransform: "uppercase" }}
        >
          About this record
        </div>
        <p className="mt-1" style={{ fontSize: "13px", color: "var(--v2-ink-secondary)" }}>
          The hash-chained record and its reference numbering are specified and built, but only
          in an isolated schema holding no real entries — neither is in use by the product yet.
          There is no export capability at all. This page shows the intended shape, not a
          working export.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" style={{ color: "var(--v2-ink-muted)" }} />
        <span
          className="font-bold"
          style={{ fontSize: "11px", letterSpacing: "0.055em", color: "var(--v2-ink-muted)", textTransform: "uppercase" }}
        >
          Sealed transaction record
        </span>
      </div>

      <V2PageHeader
        breadcrumb={[{ label: "Portfolio", to: "/app/advisor-preview" }, { label: r.company }]}
        title={r.company}
        description={`Closed ${r.closedOn}. The record is complete and cannot be changed.`}
      />

      {/* Summary tiles. The frame's "TERMINAL HASH 0x9f8c3b4a…" tile is NOT
          ported: pack_v1's chain is real but unpromoted and empty, so a
          rendered hash here would be a fabricated cryptographic artifact —
          worse than an invented number, because it looks verifiable. */}
      <div className="mb-6 mt-6 grid gap-3 sm:grid-cols-3">
        <RecordTile label="Close value" value={r.closeValue} />
        <RecordTile
          label="Confirmations"
          value={`${r.confirmations.received} of ${r.confirmations.required}`}
        />
        <RecordTile label="Reference" value={r.reference} mono />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* The chained record. */}
        <section>
          <SectionLabel>The record</SectionLabel>
          <LedgerTable>
            <LedgerHead>
              <tr>
                <Th>Reference</Th>
                <Th>Recorded</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
              </tr>
            </LedgerHead>
            <LedgerBody>
              {r.entries.map((e) => (
                <Tr key={e.reference}>
                  <Td>
                    <span dir="ltr" className="font-v2-data text-v2-accent" style={{ fontSize: "12px", letterSpacing: "0.04em" }}>
                      {e.reference}
                    </span>
                  </Td>
                  <Td>
                    <span dir="ltr" className="font-v2-data" style={{ fontSize: "12px" }}>{e.at}</span>
                  </Td>
                  <Td>{e.action}</Td>
                  <Td>
                    {e.actor}
                    <span className="ms-2" style={{ fontSize: "11px", color: "var(--v2-ink-muted)" }}>
                      {e.actorType}
                    </span>
                  </Td>
                </Tr>
              ))}
            </LedgerBody>
          </LedgerTable>
          <p className="mt-3" style={{ fontSize: "12px", color: "var(--v2-ink-muted)" }}>
            Entries are appended, never edited or removed. Each carries the hash of the entry
            before it.
          </p>
        </section>

        {/* Closing gates. */}
        <section>
          <SectionLabel>Closing gates</SectionLabel>
          <div
            className="border bg-v2-panel"
            style={{ borderColor: "var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
          >
            {r.gates.map((g, i) => (
              <div
                key={g.label}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--v2-rule)" }}
              >
                <span style={{ fontSize: "13px", color: "var(--v2-ink)" }}>{g.label}</span>
                <StatusLabel tone="satisfied">Satisfied</StatusLabel>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RecordTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
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
        dir={mono ? "ltr" : undefined}
        className={mono ? "mt-2 font-v2-data text-v2-accent" : "mt-2 font-v2-data"}
        style={{ fontSize: mono ? "13px" : "20px", letterSpacing: mono ? "0.04em" : "-0.4px", color: mono ? undefined : "var(--v2-ink)" }}
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
