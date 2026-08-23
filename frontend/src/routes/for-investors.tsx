import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /for-investors — Step 5 of the public IA rebuild (18 Aug 2026).
//
// Replaces the deleted /investors (removed Step 1 — "All sourced deals,
// scored and stage-tagged", "AI risk analysis", neither of which exists;
// §15/§25). /investors now 301s to this page (public/_redirects, updated
// in this commit).
//
// INSTRUMENT — a real record-chain excerpt, per the approved plan. Every
// hash below is copied verbatim from a live query against
// pack_v1.record_entry (four linked entries, room 957f9750-00c7-402a-b1ba-
// d9c7a4e3ba2f, the pre-existing Atlas Robotics fixture — not the
// specimen room, since this excerpt needed real production entries with
// real prev_hash -> entry_hash links, not a synthetic chain). Genesis
// entry's prev_hash is the real zero-string the schema uses, not a
// placeholder. Actions shown are genuinely read-only (deal_room.getIdentity
// / getWorkflowState) — the chain records every gateway call, not just
// writes, which is itself worth stating plainly rather than implying only
// dramatic moments get recorded.
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

const MEASURE = "34rem";

// ── Primitives ───────────────────────────────────────────────────────────────

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
      <Label>{label}</Label>
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
            {rows.map((r, ri) => (
              <tr key={ri} style={{ borderBottom: ri === rows.length - 1 ? "none" : `1px solid ${RULE_LIGHT}` }}>
                {r.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      height: "36px", padding: "0 16px", color: INK,
                      textAlign: numeric.has(ci) ? "end" : "start",
                      fontFamily: numeric.has(ci) ? DATA : UI,
                      fontSize: numeric.has(ci) ? "11.5px" : "13.5px",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: numeric.has(ci) ? "nowrap" : "normal",
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

/** Truncates a hash for column width while staying visibly a real hash, not a placeholder. */
function hashDisplay(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/for-investors")({
  head: () => ({
    meta: [
      { title: "For investors — Lengdon" },
      {
        name: "description",
        content:
          "Request access, diligence in the room, negotiate terms — and every step writes to a chain you can independently verify.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for-investors" }],
  }),
  component: ForInvestorsPage,
});

function ForInvestorsPage() {
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
          maxWidth: "62rem", margin: "0 auto", padding: "72px 24px 96px",
          display: "flex", flexDirection: "column", gap: "56px",
        }}
      >
        {/* ── FOLD ────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Label>For investors</Label>
          <h1
            style={{
              fontFamily: UI, fontSize: "40px", lineHeight: 1.15, fontWeight: 700,
              letterSpacing: "-0.02em", color: INK, margin: 0, maxWidth: "18ch",
            }}
          >
            Every read and write leaves a linked entry.
          </h1>
          <p
            style={{
              fontFamily: DOC, fontSize: "19px", lineHeight: 1.5, color: INK_2,
              maxWidth: MEASURE, margin: 0,
            }}
          >
            Request access, diligence, negotiate — each step in a room
            writes to an append-only chain, not just the moments someone
            decided were worth recording.
          </p>
          <div style={{ marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
          </div>
        </section>

        <Rule />

        {/* ── PROSE 1 — the path into a room ─────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>How you reach a room</Title>
          <Prose>
            You request access to a founder&rsquo;s public profile. The
            founder approves or declines — approval is what actually creates
            the room and adds you as a member. There is no path that skips
            the founder&rsquo;s own decision.
          </Prose>
          <Prose>
            Once you&rsquo;re in, diligence and term negotiation both run
            inside the room. Every gateway call either of you makes —
            reading the room&rsquo;s state, proposing a term, confirming a
            gate — appends one entry to that room&rsquo;s record.
          </Prose>
        </section>

        {/* ── INSTRUMENT — record-chain excerpt ─────────────────────────────── */}
        <Instrument
          label="A real chained segment · Room 957f9750"
          head={["Seq", "Action", "Prev hash", "Entry hash"]}
          align={[]}
          rows={[
            ["1", "deal_room.getIdentity", "0000000000…000000", "f237bf94b3…198230f"],
            ["2", "deal_room.getWorkflowState", "f237bf94b3…198230f", "cedc568019…828edf6"],
            ["3", "deal_room.getIdentity", "cedc568019…828edf6", "6fd1412541…0cc1b6a"],
          ]}
          caption="Each entry's prev_hash is the entry before it's entry_hash — copied verbatim from a live query, not constructed for this page. Change an earlier entry and every hash after it stops matching, visibly, without trusting us to say so."
        />

        <Rule />

        {/* ── PROSE 2 — what this actually is ────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Not a blockchain claim</Title>
          <Prose>
            There&rsquo;s no token, no network, no consensus mechanism —
            none of that is what makes a record trustworthy. What makes it
            trustworthy is that it can&rsquo;t be quietly edited, and that a
            break in the chain is visible to anyone, immediately, without
            asking us to confirm it.
          </Prose>
          <Prose>
            The entries above are genuinely read actions — a room&rsquo;s
            state being fetched, not a term being changed. The chain records
            every gateway call, not only the dramatic ones.
          </Prose>
        </section>

        <Rule />

        {/* ── CLOSE ──────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>See a room work, end to end</Title>
          <Prose>No card, no trial clock.</Prose>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
            <Action to="/how-it-works" variant="secondary">See how it works</Action>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
