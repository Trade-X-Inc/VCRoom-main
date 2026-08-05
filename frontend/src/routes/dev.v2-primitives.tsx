// Dev-only isolation page for the v2 primitives (Step 0.4 verification).
// Renders every primitive in isolation on the v2 surface, plus the critical
// ReferenceLine present-vs-absent comparison, plus a v1-vocabulary block to
// eyeball that v2 tokens do NOT leak into v1 styling. Not linked from any nav;
// reachable at /dev/v2-primitives during development only.

import { createFileRoute } from "@tanstack/react-router";
import {
  ReferenceLine, V2Button,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td,
  StatusLabel,
} from "@/components/v2";

export const Route = createFileRoute("/dev/v2-primitives")({
  component: V2PrimitivesPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2
        className="font-v2-ui uppercase text-v2-ink-muted"
        style={{ fontSize: "11px", letterSpacing: "0.09em", marginBottom: "12px" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function V2PrimitivesPage() {
  return (
    <main
      className="bg-v2-surface text-v2-ink"
      style={{ minHeight: "100vh", padding: "40px", fontFamily: "var(--font-v2-ui)" }}
    >
      <div style={{ maxWidth: "960px" }}>
        <h1 className="font-v2-ui" style={{ fontSize: "25px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          v2 primitives
        </h1>
        <p className="text-v2-ink-secondary font-v2-ui" style={{ fontSize: "13.5px", marginBottom: "32px" }}>
          Isolation check — Design Constitution v2. Not a product screen.
        </p>

        {/* ── ReferenceLine: present vs absent (the load-bearing check) ── */}
        <Section title="Reference line — present vs absent">
          <div className="bg-v2-panel border border-v2-rule" style={{ padding: "20px", borderRadius: "var(--v2-radius)" }}>
            <div style={{ fontSize: "12px", color: "var(--v2-ink-muted)", marginBottom: "8px" }}>
              With a reference number (how it looks once numbering ships):
            </div>
            <ReferenceLine refNo="ATLS01-ROM-2026-000042-31" caption="Deal room · opened 14 March 2026" />

            <div style={{ fontSize: "12px", color: "var(--v2-ink-muted)", margin: "20px 0 8px" }}>
              With no reference number (today's documents-group reality) — the
              boxed area below should be EMPTY, no placeholder, no reserved space:
            </div>
            <div style={{ outline: "1px dashed var(--v2-rule)", padding: "0" }}>
              <ReferenceLine refNo={null} caption="this caption must not render either" />
            </div>
            <div style={{ fontSize: "12px", color: "var(--v2-ink-muted)", marginTop: "8px" }}>
              ↑ if anything appears inside the dashed box, the null-absence contract is broken.
            </div>
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <div className="bg-v2-panel border border-v2-rule" style={{ padding: "20px", display: "flex", gap: "12px", flexWrap: "wrap", borderRadius: "var(--v2-radius)" }}>
            <V2Button variant="primary">Release document</V2Button>
            <V2Button variant="secondary">Add from library</V2Button>
            <V2Button variant="quiet">Regenerate</V2Button>
            <V2Button variant="adverse">Remove document</V2Button>
            <V2Button variant="secondary" disabled>Disabled</V2Button>
          </div>
        </Section>

        {/* ── Status labels ── */}
        <Section title="Status labels — text + colour, never colour alone">
          <div className="bg-v2-panel border border-v2-rule" style={{ padding: "20px", display: "flex", gap: "20px", flexWrap: "wrap", borderRadius: "var(--v2-radius)" }}>
            <StatusLabel tone="satisfied">Complete</StatusLabel>
            <StatusLabel tone="attention">Outstanding</StatusLabel>
            <StatusLabel tone="adverse">Declined</StatusLabel>
            <StatusLabel tone="neutral">Draft</StatusLabel>
          </div>
        </Section>

        {/* ── Ledger table with selected + status rows ── */}
        <Section title="Ledger table — 36px rows, status/selected left-rules, tabular numerics">
          <div className="bg-v2-panel border border-v2-rule" style={{ padding: "20px", borderRadius: "var(--v2-radius)" }}>
            <LedgerTable>
              <LedgerHead>
                <Tr>
                  <Th>Document</Th>
                  <Th>Category</Th>
                  <Th numeric>Size (KB)</Th>
                  <Th>Status</Th>
                </Tr>
              </LedgerHead>
              <LedgerBody>
                <Tr>
                  <Td>Audited financials 2024</Td>
                  <Td>Financials</Td>
                  <Td numeric>1,204</Td>
                  <Td><StatusLabel tone="satisfied">Complete</StatusLabel></Td>
                </Tr>
                <Tr selected>
                  <Td>Cap table (fully diluted)</Td>
                  <Td>Legal</Td>
                  <Td numeric>88</Td>
                  <Td><StatusLabel tone="attention">Outstanding</StatusLabel></Td>
                </Tr>
                <Tr status="adverse">
                  <Td>Supply agreement</Td>
                  <Td>Legal</Td>
                  <Td numeric>—</Td>
                  <Td><StatusLabel tone="adverse">Not provided</StatusLabel></Td>
                </Tr>
                <Tr status="satisfied">
                  <Td>Pitch deck</Td>
                  <Td>Pitch Deck</Td>
                  <Td numeric>4,096</Td>
                  <Td><StatusLabel tone="satisfied">Complete</StatusLabel></Td>
                </Tr>
              </LedgerBody>
            </LedgerTable>
          </div>
        </Section>

        {/* ── Typography faces ── */}
        <Section title="Faces — Archivo / Source Serif 4 / JetBrains Mono">
          <div className="bg-v2-panel border border-v2-rule" style={{ padding: "20px", borderRadius: "var(--v2-radius)", display: "grid", gap: "8px" }}>
            <div className="font-v2-ui" style={{ fontSize: "15px" }}>Archivo — interface. Dense, tall x-height, legible at 13px.</div>
            <div className="font-v2-doc" style={{ fontSize: "15px" }}>Source Serif 4 — the document surface, exports and agreements.</div>
            <div className="font-v2-data" style={{ fontSize: "13px" }}>JetBrains Mono — ATLS01-ROM-2026-000042-31 · USD 18,400 · 30 Jul 2026</div>
          </div>
        </Section>

        {/* ── v1 isolation check ── */}
        <Section title="v1 isolation check — this block uses v1 vocabulary; must be UNCHANGED">
          <div className="bg-card border border-border" style={{ padding: "20px" }}>
            <div className="font-sans text-foreground" style={{ fontSize: "14px", marginBottom: "8px" }}>
              This uses v1 tokens (bg-card, text-foreground, font-sans = DM Sans) and the
              v1 brand accent. If v2 changed anything here, a token leaked.
            </div>
            <span className="bg-brand text-brand-foreground" style={{ padding: "6px 12px", fontSize: "13px", display: "inline-block" }}>
              v1 brand button (should be purple #7C3AED, DM Sans)
            </span>
          </div>
        </Section>
      </div>
    </main>
  );
}
