import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// ComparePage — shared shape for the 5 /compare/* pages built in Group 4 of
// the lengdon-public-site/ migration (25 Aug 2026).
//
// CONTENT DISCIPLINE, checked before any copy was written: claims about
// each named competitor are kept to their real, public product category
// (document hosting / M&A data room / diligence workflow) — no invented
// weakness, no unverifiable pricing or feature claim about any one company.
// Where the lengdon-public-site/ SPA asserted something specific and
// unverifiable about a competitor, it is generalised to the category level
// instead (public-site-spec.html section D's own instruction: "Never
// disparage — state what each incumbent does well, then the structural
// difference").
//
// Our own claims were checked against real schema/code, not carried
// forward from the SPA: "single-notice diligence," "watermarked release,"
// and "sealed export at close" are ALL confirmed unbuilt in the live
// product (they describe the pack_v1 schema, which CLAUDE.md §8.3 states
// explicitly is unpromoted, 0 real rows) and do NOT appear anywhere in
// this component or its callers. What IS real and used instead: the
// six-gate closing pipeline with mutual confirmation (verified against
// ClosingPipeline.tsx/close.tsx for how-it-works.tsx, same standard
// applied here), the term-negotiation state machine, live auto-minted
// reference numbers with a real check digit (deal_rooms.reference_no,
// pack_api.deal_rooms_mint_reference(), migration 20260809060000 — public
// schema, not pack_v1), NDA-gated disclosure (nda_signed stage gate), and
// published pricing (/pricing, four tiers).
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const PANEL = "var(--pub-n-00)";

const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
const G_RECESSED = "var(--pub-n-09)";

const SHELL = "72rem";
const MEASURE = "34rem";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pub-title" style={{ fontFamily: UI, color: INK, margin: 0 }}>
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
      {children}
    </p>
  );
}

function Action({ to, children, variant = "primary" }: { to: string; children: React.ReactNode; variant?: "primary" | "secondary" }) {
  const primary = variant === "primary";
  return (
    <Link
      to={to as any}
      style={{
        display: "inline-flex", alignItems: "center", height: "40px",
        padding: "0 20px", borderRadius: "2px",
        fontFamily: UI, fontSize: "14px", fontWeight: 500,
        background: primary ? "var(--v2-accent)" : "transparent",
        color: primary ? "#FFFFFF" : INK,
        border: `1px solid var(--v2-accent)`, textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export function CardGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1px", background: RULE, border: `1px solid ${RULE}` }}>
      {items.map(([label, body], i) => (
        <div key={label} style={{ background: PANEL, padding: "22px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontFamily: DATA, fontSize: "11px", color: INK_3 }}>{String(i + 1).padStart(2, "0")}</span>
          <span style={{ fontFamily: UI, fontSize: "15px", fontWeight: 600, color: INK }}>{label}</span>
          <span style={{ fontFamily: UI, fontSize: "13.5px", color: INK_2 }}>{body}</span>
        </div>
      ))}
    </div>
  );
}

export function Instrument({
  head, rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: UI, fontSize: "14px", lineHeight: 1.55 }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" style={{ fontSize: "13.5px", fontWeight: 700, letterSpacing: "0", textTransform: "none", color: INK, textAlign: "start", padding: "0 24px 14px", borderBottom: `1.5px solid ${INK}`, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 1 ? "var(--pub-n-09)" : "transparent" }}>
              {r.map((cell, ci) => (
                <td key={ci} style={{ padding: "18px 24px", color: ci === 0 ? INK : INK_2, fontWeight: ci === 0 ? 600 : 400, verticalAlign: "top" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function usePublicPageLightTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    window.scrollTo(0, 0);
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);
}

/** A single competitor comparison page, e.g. /compare/datasite. */
export function ComparePage({
  competitor, doesWell, structuralDiff, whenToChoose,
}: {
  competitor: string;
  doesWell: Array<[string, string]>;
  structuralDiff: Array<[string, string, string]>;
  whenToChoose: string;
}) {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Comparison</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              {competitor} vs a deal room that runs the transaction.
            </h1>
            <Prose>
              {competitor} is a strong virtual data room for its category.
              It stores and shares documents. We add the closing pipeline,
              term negotiation, and a live reference number on the record.
            </Prose>
          </div>
        </section>

        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>What {competitor} does well</Eyebrow>
            <Title>Stated plainly, not disparaged</Title>
          </div>
          <CardGrid items={doesWell} />
        </Section>

        <Section ground={G_RECESSED}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Where we differ</Eyebrow>
            <Title>Structural, not a feature checklist</Title>
          </div>
          <Instrument
            head={["Dimension", competitor, "Lengdon"]}
            rows={structuralDiff.map(([dim, theirs, ours]) => [dim, theirs, ours])}
          />
          {/* CTA audit, 25 Aug 2026: a reader who has just seen the exact
              structural differences is at a real decision point, not only
              at the fold or the very end of the page. */}
          <Action to="/sign-up" variant="secondary">See pricing</Action>
        </Section>

        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>When to choose which</Eyebrow>
            <Title>Honest guidance</Title>
            <Prose>{whenToChoose}</Prose>
            <div style={{ marginTop: "8px" }}>
              <Action to="/sign-up">Start on the Direct tier</Action>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ ground, children }: { ground: string; children: React.ReactNode }) {
  return (
    <section style={{ background: ground }}>
      <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "56px" }}>
        {children}
      </div>
    </section>
  );
}
