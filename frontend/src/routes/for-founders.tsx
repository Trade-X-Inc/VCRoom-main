import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /for-founders — Step 5 of the public IA rebuild (18 Aug 2026); brought
// onto PUBLIC-REGISTER.md v2.0 (23 Aug 2026, Phase 3).
//
// VISUAL PASS ONLY, calibrated to /pricing's existing treatment rather than
// the landing page's — per instruction, these pages stay calmer than the
// landing page by design: v2.0 type scale, ground system, and table
// density, but no SectionHeader, MetricGrid, dark section, or stat strip.
// Three grounds: base (fold) -> recessed (founder controls) -> panel
// (document visibility) -> base (close).
//
// Replaces the deleted /founders (removed Step 1 — "AI email that sounds
// like you", "Pipeline that thinks", intro suggestions, none of which
// exist; see CLAUDE.md's public-surface correctness pass). /founders now
// 301s to this page (public/_redirects, updated in this commit).
//
// No product screenshot on this page, deliberately. The documents-table
// screen is the natural candidate — it's the one genuinely v2 route this
// audience would recognise — but its own content (the upload dropzone, the
// "Generate" AI-summary buttons) still carries hs-gradient purple, re-
// verified live this session, not assumed carried over from Steps 1-4:
// captured a fresh screenshot of the specimen room's documents tab and
// found the purple exactly where CLAUDE.md §20.5's escalation said it
// would be — inside <main>, not just the surrounding shell, so no crop
// excludes it without also cutting real table rows. See CLAUDE.md §20.5.
//
// Two real instruments instead: the founder-controls table (same data
// already on /, kept in sync rather than restated differently), and the
// document-visibility mechanism (shared/private, a real per-document
// toggle — app.deal-rooms.$id.documents.tsx's updateDocVisibility),
// connected explicitly to the disclosure schedule's own release classes
// on /resources/schedule rather than inventing a second vocabulary.
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
const ACCENT = "var(--v2-accent)";

// Section grounds (§5.2) — same tokens as /pricing, /.
const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
const G_RECESSED = "var(--pub-n-09)";

const MEASURE = "34rem";
const SHELL = "72rem";

// ── Primitives — ported from /pricing verbatim. ─────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
        letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0,
      }}
    >
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
    <p
      style={{
        fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2,
        maxWidth: MEASURE, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: UI, fontSize: "13px", lineHeight: 1.5, color: INK_3,
        maxWidth: MEASURE, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Instrument({
  label, head, rows, caption, align,
}: {
  label: string;
  head: string[];
  rows: React.ReactNode[][];
  caption: React.ReactNode;
  align?: number[];
}) {
  const numeric = new Set(align ?? []);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ background: PANEL, border: `1px solid ${RULE}`, overflowX: "auto" }}>
        <table
          style={{
            width: "100%", borderCollapse: "collapse",
            fontFamily: UI, fontSize: "13.5px", lineHeight: 1.55,
          }}
        >
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    fontSize: "11px", fontWeight: 500, letterSpacing: "0.09em",
                    textTransform: "uppercase", color: INK_3,
                    textAlign: numeric.has(i) ? "end" : "start",
                    padding: "0 20px 12px", borderBottom: `1.5px solid ${INK}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ borderBottom: ri === rows.length - 1 ? "none" : `1px solid ${RULE_LIGHT}` }}>
                {r.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: "14px 20px", color: INK,
                      textAlign: numeric.has(ci) ? "end" : "start",
                      fontFamily: numeric.has(ci) ? DATA : UI,
                      fontSize: numeric.has(ci) ? "12px" : "13.5px",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: numeric.has(ci) ? "nowrap" : "normal",
                      verticalAlign: "top",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>{caption}</Caption>
    </section>
  );
}

function Action({ to, search, children, variant = "primary" }: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <Link
      to={to as any}
      search={search as any}
      style={{
        display: "inline-flex", alignItems: "center", height: "40px",
        padding: "0 20px", borderRadius: "2px",
        fontFamily: UI, fontSize: "14px", fontWeight: 500,
        background: primary ? ACCENT : "transparent",
        color: primary ? "#FFFFFF" : INK,
        border: primary ? `1px solid ${ACCENT}` : `1px solid ${RULE}`,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

/** A full-bleed section: ground spans the viewport, content stays in the shell. */
function Section({ ground, children }: { ground: string; children: React.ReactNode }) {
  return (
    <section style={{ background: ground }}>
      <div
        style={{
          maxWidth: SHELL, margin: "0 auto", padding: "88px 24px",
          display: "flex", flexDirection: "column", gap: "56px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/for-founders")({
  head: () => ({
    meta: [
      { title: "For founders — Lengdon" },
      {
        name: "description",
        content:
          "What you control, what releases when, and what evidence backs a raise — for the founder opening the room.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for-founders" }],
  }),
  component: ForFoundersPage,
});

function ForFoundersPage() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />

      <main id="main-content">
        {/* ── FOLD — treatment A, base ────────────────────────────────────── */}
        <section style={{ background: G_BASE }}>
          <div
            className="pub-hero"
            style={{
              maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 96px",
              display: "grid", alignItems: "center", gap: "48px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <Eyebrow>For founders</Eyebrow>
              <h1
                className="pub-display"
                style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "14ch" }}
              >
                You open the room. You control what&rsquo;s in it.
              </h1>
              <p
                style={{
                  fontFamily: DOC, fontSize: "21px", lineHeight: 1.5, color: INK_2,
                  maxWidth: MEASURE, margin: 0,
                }}
              >
                Nothing is visible to an investor until you grant access —
                and every grant is logged, not implied.
              </p>
              <div style={{ marginTop: "8px" }}>
                <Action to="/sign-up">Create an account</Action>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT YOU CONTROL — treatment C, recessed ────────────────────── */}
        <Section ground={G_RECESSED}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Founder / Control</Eyebrow>
            <Title>What you control</Title>
            <Prose>
              One profile, one document vault, built once and reused across
              every room you open. An investor sees your public profile before
              requesting access — nothing more — and sees the rest only after
              you grant it.
            </Prose>
            <Prose>
              There is no fee until a raise on the Direct tier reaches its
              first close.
            </Prose>
          </div>

          <Instrument
            label="What a founder controls"
            head={["Control", "Set by", "Visible to"]}
            rows={[
              ["Document access", "Founder, per room", "Investor, after NDA"],
              ["Financial detail", "Founder, per disclosure", "Investor, after founder grants it"],
              ["Team member records", "Founder", "Investor, only inside an open room"],
              ["Counsel access at closing", "Either party", "Counsel — term summary and agreement only"],
            ]}
            caption="A lawyer invited at closing sees the term summary and the agreement. They do not see earlier diligence or negotiation history."
          />
        </Section>

        {/* ── PER-DOCUMENT VISIBILITY — treatment B, panel ────────────────── */}
        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Document / Visibility</Eyebrow>
            <Title>Per-document visibility</Title>
            <Prose>
              Every document you upload carries its own visibility — shared
              with the room, or private to you. Changing it takes one action,
              and the room only ever shows what you&rsquo;ve actually marked
              shared.
            </Prose>
            <Prose>
              This overrides the disclosure schedule&rsquo;s default release
              point for a specific file, regardless of what the schedule
              recommends.
            </Prose>
          </div>

          <Instrument
            label="Document visibility, as it actually works"
            head={["State", "Meaning", "Set where"]}
            rows={[
              ["Shared", "Visible to the investor in this room, appears in their workstation automatically", "Per document, in the room's document vault"],
              ["Private", "Visible only to you — never shown to the investor in this room", "Per document, same control"],
            ]}
            caption={
              <>
                This is a per-document toggle, not a schedule field — see the{" "}
                <Link to="/resources/schedule" style={{ color: ACCENT }}>disclosure schedule</Link>{" "}
                for the default release point each field is designed around.
              </>
            }
          />
        </Section>

        {/* ── CLOSE — treatment A, base ────────────────────────────────────── */}
        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Start / Direct tier</Eyebrow>
            <Title>Start on the Direct tier</Title>
            <Prose>No card, no trial clock.</Prose>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
              <Action to="/sign-up">Create an account</Action>
              <Action to="/resources/schedule" variant="secondary">See the disclosure schedule</Action>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
