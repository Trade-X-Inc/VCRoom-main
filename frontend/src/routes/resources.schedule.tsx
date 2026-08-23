import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /resources/schedule — Step 3 of the public IA rebuild (18 Aug 2026).
//
// Publishes the real technology/seed disclosure schedule in full — the
// register's own highest-ranked credibility device (§6 item 1: "a real
// document schedule, readable in full by anyone, no account required. No
// competitor publishes theirs"), and until this page, the one thing on that
// list with no page of its own.
//
// Every field below is read directly from pack_v1.schedule_field for the one
// published schedule (technology/seed, v1, id 11111111-1111-1111-1111-
// 111111111111) — queried live, not paraphrased. Field IDs are turned into
// sentence-case labels (tech.seed.problem_statement -> "Problem statement")
// but the underlying key, section, value type, visibility tier, release
// class, and full three-rung evidence ladder are all real values, copied
// verbatim. Order matches the schedule's own sort_order — not re-grouped by
// section, since that would impose an organization nobody actually chose.
//
// Only one schedule exists today (CLAUDE.md §20.1 step 2d / the IA
// investigation). This page states that plainly rather than implying a
// library of sector schedules that doesn't exist — see the prose note below
// the fold.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const SURFACE = "var(--v2-surface)";
const PANEL = "var(--v2-panel)";
const ACCENT = "var(--v2-accent)";
const SATISFIED = "var(--v2-satisfied)";
const ATTENTION = "var(--v2-attention)";

const MEASURE = "34rem";

// ── Primitives — identical to /pricing's and /'s, reused rather than
// re-derived, so all three pages read as one system. ────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: UI, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
        letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: UI, fontSize: "25px", lineHeight: 1.25, fontWeight: 600,
        letterSpacing: "-0.01em", color: INK, margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: DOC, fontSize: "16px", lineHeight: 1.65, color: INK_2,
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
        fontFamily: UI, fontSize: "12.5px", lineHeight: 1.5, color: INK_3,
        maxWidth: MEASURE, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Rule() {
  return <hr style={{ border: 0, borderTop: `1px solid ${RULE}`, margin: 0 }} />;
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
        display: "inline-flex", alignItems: "center", height: "36px",
        padding: "0 18px", borderRadius: "2px",
        fontFamily: UI, fontSize: "13.5px", fontWeight: 500,
        background: primary ? ACCENT : PANEL,
        color: primary ? "#FFFFFF" : INK,
        border: primary ? `1px solid ${ACCENT}` : `1px solid ${RULE}`,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

// ── Schedule data — every value copied verbatim from a live query against
// pack_v1.schedule_field, schedule_id 11111111-1111-1111-1111-111111111111
// (technology / seed / v1 / published 4 Aug 2026). Field IDs formatted to
// sentence case for readability; nothing else altered. ─────────────────────

type ValueType = "text" | "number" | "money" | "date" | "enum" | "structured";
type VisibilityTier = "brief" | "presented" | "room" | "closing";
type ReleaseClass = "open_release" | "view_only" | "release_on_request";

type ScheduleField = {
  id: string;
  label: string;
  section: string;
  valueType: ValueType;
  required: boolean;
  visibilityTier: VisibilityTier;
  releaseClass: ReleaseClass;
  ladder: { minimum: string[]; preferred: string[]; alternative: string[] };
};

const FIELDS: ScheduleField[] = [
  {
    id: "tech.seed.problem_statement", label: "Problem statement", section: "Market",
    valueType: "text", required: true, visibilityTier: "brief", releaseClass: "open_release",
    ladder: { minimum: ["founder narrative"], preferred: ["customer interviews"], alternative: ["market report"] },
  },
  {
    id: "tech.seed.solution", label: "Solution", section: "Market",
    valueType: "text", required: true, visibilityTier: "presented", releaseClass: "open_release",
    ladder: { minimum: ["spec"], preferred: ["working product"], alternative: ["prototype"] },
  },
  {
    id: "tech.seed.market_size_tam", label: "Market size (TAM)", section: "Market",
    valueType: "money", required: true, visibilityTier: "presented", releaseClass: "view_only",
    ladder: { minimum: ["top-down estimate"], preferred: ["third-party market report"], alternative: ["bottom-up model"] },
  },
  {
    id: "tech.seed.business_model", label: "Business model", section: "Financials",
    valueType: "text", required: true, visibilityTier: "presented", releaseClass: "view_only",
    ladder: { minimum: ["stated model"], preferred: ["signed contracts"], alternative: ["pricing page + pipeline"] },
  },
  {
    id: "tech.seed.mrr", label: "MRR", section: "Financials",
    valueType: "money", required: true, visibilityTier: "room", releaseClass: "release_on_request",
    ladder: { minimum: ["management accounts"], preferred: ["processor export"], alternative: ["bank statements"] },
  },
  {
    id: "tech.seed.traction", label: "Traction", section: "Market",
    valueType: "text", required: true, visibilityTier: "presented", releaseClass: "view_only",
    ladder: { minimum: ["stated metrics"], preferred: ["analytics export"], alternative: ["dashboard screenshots"] },
  },
  {
    id: "tech.seed.team", label: "Team", section: "Team",
    valueType: "structured", required: true, visibilityTier: "presented", releaseClass: "view_only",
    ladder: { minimum: ["stated bios"], preferred: ["employment records"], alternative: ["LinkedIn + offer letters"] },
  },
  {
    id: "tech.seed.use_of_funds", label: "Use of funds", section: "Financials",
    valueType: "text", required: true, visibilityTier: "room", releaseClass: "view_only",
    ladder: { minimum: ["stated allocation"], preferred: ["board-approved budget"], alternative: ["founder budget"] },
  },
  {
    id: "tech.seed.cap_table", label: "Cap table", section: "Legal",
    valueType: "structured", required: true, visibilityTier: "room", releaseClass: "release_on_request",
    ladder: { minimum: ["founder-maintained sheet"], preferred: ["cap table software export"], alternative: ["shareholder agreements"] },
  },
  {
    id: "tech.seed.incorporation", label: "Incorporation", section: "Legal",
    valueType: "structured", required: true, visibilityTier: "room", releaseClass: "view_only",
    ladder: { minimum: ["stated entity details"], preferred: ["certificate of incorporation"], alternative: ["registry extract"] },
  },
  {
    id: "tech.seed.runway_months", label: "Runway (months)", section: "Financials",
    valueType: "number", required: true, visibilityTier: "room", releaseClass: "view_only",
    ladder: { minimum: ["stated runway"], preferred: ["bank statements + burn"], alternative: ["management accounts"] },
  },
];

const VISIBILITY_LABEL: Record<VisibilityTier, string> = {
  brief: "Brief", presented: "Presented", room: "Room", closing: "Closing",
};

const RELEASE_LABEL: Record<ReleaseClass, string> = {
  open_release: "Open release", view_only: "View only", release_on_request: "Release on request",
};

const VALUE_TYPE_LABEL: Record<ValueType, string> = {
  text: "Text", number: "Number", money: "Money", date: "Date", enum: "Enum", structured: "Structured",
};

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/resources/schedule")({
  head: () => ({
    meta: [
      { title: "The disclosure schedule — Lengdon" },
      {
        name: "description",
        content:
          "Every field a technology seed round discloses, its required evidence, and when it releases — published in full, no account required.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/resources/schedule" }],
  }),
  component: SchedulePage,
});

function SchedulePage() {
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
    <div style={{ background: SURFACE, minHeight: "100vh" }}>
      <SiteHeader />

      <main
        id="main-content"
        style={{
          maxWidth: "68rem", margin: "0 auto", padding: "72px 24px 96px",
          display: "flex", flexDirection: "column", gap: "56px",
        }}
      >
        {/* ── FOLD ────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Label>Resources · Disclosure schedule</Label>
          <h1
            style={{
              fontFamily: UI, fontSize: "40px", lineHeight: 1.15, fontWeight: 700,
              letterSpacing: "-0.02em", color: INK, margin: 0, maxWidth: "20ch",
            }}
          >
            Every field a seed round discloses.
          </h1>
          <p
            style={{
              fontFamily: DOC, fontSize: "19px", lineHeight: 1.5, color: INK_2,
              maxWidth: MEASURE, margin: 0,
            }}
          >
            Eleven fields, what evidence backs each one, and when it releases
            to the other side. Published in full — no account required.
          </p>
          <div style={{ marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
          </div>
        </section>

        <Rule />

        {/* ── PROSE 1 — what this is and what it isn't ──────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>What the schedule governs</Title>
          <Prose>
            A raise moves through stages — brief, presented, inside the room,
            at closing. Each field below has a stage it releases at by
            default, evidence it's checked against, and whether it's a plain
            statement or something that needs to be shown.
          </Prose>
          <Prose>
            This is the real technology, seed-stage schedule, published as it
            is used — not a sample. Every field, every evidence rung, every
            release stage below is read directly from it.
          </Prose>
          <Prose>
            <strong style={{ color: INK, fontWeight: 600 }}>
              One schedule exists today.
            </strong>{" "}
            Sector- and stage-specific versions are the design this table is
            built for, not yet the library it publishes. This page will grow
            as more are added — it will not describe schedules that don't
            exist yet.
          </Prose>
        </section>

        {/* ── INSTRUMENT — the schedule itself ──────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Label>Technology · Seed · v1 · Published 4 August 2026</Label>
          <div style={{ background: PANEL, border: `1px solid ${RULE}`, overflowX: "auto" }}>
            <table
              style={{
                width: "100%", borderCollapse: "collapse",
                fontFamily: UI, fontSize: "13.5px", lineHeight: 1.55,
              }}
            >
              <thead>
                <tr>
                  {["Field", "Section", "Type", "Releases at", "Evidence required"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        fontSize: "11px", fontWeight: 500, letterSpacing: "0.09em",
                        textTransform: "uppercase", color: INK_3, textAlign: "start",
                        padding: "0 16px 8px", borderBottom: `1.5px solid ${INK}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{ borderBottom: i === FIELDS.length - 1 ? "none" : `1px solid ${RULE_LIGHT}` }}
                  >
                    <td style={{ padding: "14px 16px", color: INK, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600 }}>{f.label}</div>
                      <div
                        style={{
                          fontFamily: DATA, fontSize: "11px", color: INK_3, marginTop: "2px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {f.id}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: INK_2, verticalAlign: "top", whiteSpace: "nowrap" }}>
                      {f.section}
                    </td>
                    <td style={{ padding: "14px 16px", color: INK_2, verticalAlign: "top", whiteSpace: "nowrap" }}>
                      {VALUE_TYPE_LABEL[f.valueType]}
                    </td>
                    <td style={{ padding: "14px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontFamily: UI, fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em",
                          textTransform: "uppercase", color: f.visibilityTier === "closing" ? ATTENTION : INK_2,
                        }}
                      >
                        {VISIBILITY_LABEL[f.visibilityTier]}
                      </span>
                      <div style={{ fontSize: "11px", color: INK_3, marginTop: "2px" }}>
                        {RELEASE_LABEL[f.releaseClass]}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: INK_2, verticalAlign: "top", minWidth: "260px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <div>
                          <span style={{ color: INK_3, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Min · </span>
                          {f.ladder.minimum.join(", ")}
                        </div>
                        <div>
                          <span style={{ color: SATISFIED, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pref · </span>
                          {f.ladder.preferred.join(", ")}
                        </div>
                        <div>
                          <span style={{ color: INK_3, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Alt · </span>
                          {f.ladder.alternative.join(", ")}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Caption>
            &ldquo;Releases at&rdquo; is the default stage a field becomes visible
            to a counterparty — Brief, Presented, Room, or Closing. Evidence
            has three rungs: the minimum accepted, the preferred standard,
            and an accepted alternative when the preferred form isn&rsquo;t
            available.
          </Caption>
        </section>

        <Rule />

        {/* ── CLOSE ──────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Build against a schedule that&rsquo;s already published</Title>
          <Prose>No card, no trial clock.</Prose>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
            <Action to="/pricing" variant="secondary">See pricing</Action>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
