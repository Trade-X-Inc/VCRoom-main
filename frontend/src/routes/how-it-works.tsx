import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /how-it-works — Step 4 of the public IA rebuild (18 Aug 2026).
//
// Two real diagrams, per register §3.6.2: a mechanism drawn, not tabulated,
// where the shape of the mechanism — a sequence, a state machine — is the
// point a table can only assert. Both are hand-built SVG, not images, so
// they stay crisp and inherit the register's own tokens directly.
//
// DIAGRAM 1 — the closing pipeline as a two-party swimlane. Verified against
// the live implementation (ClosingPipeline.tsx, close.tsx, LawyerGate.tsx)
// before drawing, not from memory:
//   Gate 1 (Legal counsel)     — a shared decision, not sequential: either a
//                                 counterparty accepts an invite, or both
//                                 agree to waive (enforce_counsel_waiver_write
//                                 trigger blocks a unilateral waiver).
//   Gate 2 (Agreement)         — genuinely two-sided: accepted_by_founder AND
//                                 accepted_by_investor must both be true.
//   Gate 3 (Platform fee)      — NOT mutual. Founder sets the amount; only
//                                 the designated payer confirms. Drawn as a
//                                 single rail acting, not a convergence.
//   Gate 4 (Signing)           — two-sided: each party uploads their own
//                                 signed copy into their own column.
//   Gate 5 (Investment payment)— two-sided, asymmetric: investor uploads
//                                 proof, founder alone confirms or flags.
//   Gate 6 (Close)             — the strongest mutual gate: both parties
//                                 confirm delivery/receipt independently;
//                                 finalize_deal_close() requires both flags.
// Renumbered 1-6 to match the homepage instrument (CLAUDE.md §20.12) — the
// app's own on-screen numbering (a "3-6" heading over cards 4,5,6,7) is a
// live bug, not a sequence worth reproducing.
//
// DIAGRAM 2 — term negotiation's real state machine, from
// term-negotiation-fn.ts, re-verified line by line before drawing:
//   unset -> proposed | counter         (proposeTerm)
//   proposed/counter -> accepted        (acceptTerm sets ONLY the caller's
//                                         own flag)
//   accepted -> locked                  (only when BOTH flags true against
//                                         the SAME current_value)
//   ANY state -> proposed | counter     (a NEW value resets BOTH acceptance
//                                         flags to false — proposeTerm's own
//                                         comment: "New value -> both sides
//                                         must re-accept")
// The reset edge is the one thing a status table can't show cleanly, which
// is why this earns a diagram rather than another instrument.
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

const VIZ_1 = "var(--pub-viz-1)"; // founder rail
const VIZ_2 = "var(--pub-viz-2)"; // investor rail
const VIZ_3 = "var(--pub-viz-3)"; // confirmed / locked
const VIZ_4 = "var(--pub-viz-4)"; // pending / not reached

const MEASURE = "34rem";

// ── Primitives — identical to /pricing, /, /resources/schedule. ────────────

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

// ── Diagram legend — shared by both diagrams. ───────────────────────────────

function Legend({ items }: { items: { swatch: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", background: it.swatch, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: UI, fontSize: "12px", color: INK_2 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── DIAGRAM 1 — the closing pipeline, two-party swimlane. ───────────────────

type Gate = {
  n: number;
  label: string;
  mode: "shared" | "mutual" | "single";
  singleActor?: "founder" | "investor";
};

const GATES: Gate[] = [
  { n: 1, label: "Legal counsel", mode: "shared" },
  { n: 2, label: "Agreement", mode: "mutual" },
  { n: 3, label: "Platform fee", mode: "single", singleActor: "founder" },
  { n: 4, label: "Signing", mode: "mutual" },
  { n: 5, label: "Investment payment", mode: "mutual" },
  { n: 6, label: "Close", mode: "mutual" },
];

function ClosingPipelineDiagram() {
  const colW = 150;
  const padL = 130;
  const width = padL + colW * GATES.length + 20;
  const founderY = 60;
  const investorY = 190;
  const midY = (founderY + investorY) / 2;

  return (
    <div style={{ background: PANEL, border: `1px solid ${RULE}`, padding: "24px", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} 250`}
        width={width}
        height={250}
        role="img"
        aria-label="Diagram: the closing pipeline drawn as a two-party swimlane. Founder and investor rails run in parallel. Gates 2, 4, 5 and 6 require both rails to converge before the next gate unlocks. Gate 3 is single-party: the founder sets the fee, only the designated payer confirms. Gate 1 is a shared decision made once, before the rails diverge."
          style={{ minWidth: `${width}px`, display: "block" }}
      >
        {/* Rail labels */}
        <text x={0} y={founderY + 4} fontFamily={UI} fontSize="12" fontWeight={600} fill={VIZ_1}>Founder</text>
        <text x={0} y={investorY + 4} fontFamily={UI} fontSize="12" fontWeight={600} fill={VIZ_2}>Investor</text>

        {/* Rails */}
        <line x1={padL} y1={founderY} x2={width - 20} y2={founderY} stroke={VIZ_1} strokeWidth={2} />
        <line x1={padL} y1={investorY} x2={width - 20} y2={investorY} stroke={VIZ_2} strokeWidth={2} />

        {GATES.map((g, i) => {
          const cx = padL + colW * i + colW / 2;
          return (
            <g key={g.n}>
              {/* Gate number + label above the lanes */}
              <text x={cx} y={20} textAnchor="middle" fontFamily={UI} fontSize="11" fontWeight={700} fill={INK}>
                {g.n}
              </text>
              <text x={cx} y={34} textAnchor="middle" fontFamily={UI} fontSize="11" fill={INK_2}>
                {g.label}
              </text>

              {g.mode === "mutual" && (
                <>
                  <circle cx={cx} cy={founderY} r={5} fill={VIZ_1} />
                  <circle cx={cx} cy={investorY} r={5} fill={VIZ_2} />
                  <line x1={cx} y1={founderY} x2={cx} y2={investorY} stroke={VIZ_3} strokeWidth={2} strokeDasharray="3 3" />
                  <circle cx={cx} cy={midY} r={4} fill={VIZ_3} />
                </>
              )}

              {g.mode === "shared" && (
                <>
                  <circle cx={cx} cy={founderY} r={5} fill={VIZ_1} />
                  <circle cx={cx} cy={investorY} r={5} fill={VIZ_2} />
                  <line x1={cx} y1={founderY} x2={cx} y2={investorY} stroke={VIZ_3} strokeWidth={2} strokeDasharray="3 3" />
                  <circle cx={cx} cy={midY} r={4} fill={VIZ_3} />
                  <text x={cx} y={midY - 12} textAnchor="middle" fontFamily={UI} fontSize="9.5" fill={INK_3}>
                    invite or waive
                  </text>
                </>
              )}

              {g.mode === "single" && (
                <>
                  <circle cx={cx} cy={founderY} r={5} fill={VIZ_1} />
                  <circle cx={cx} cy={investorY} r={5} fill={VIZ_4} />
                  <text x={cx} y={investorY + 20} textAnchor="middle" fontFamily={UI} fontSize="9.5" fill={INK_3}>
                    payer confirms
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: "16px" }}>
        <Legend
          items={[
            { swatch: VIZ_1, label: "Founder rail" },
            { swatch: VIZ_2, label: "Investor rail" },
            { swatch: VIZ_3, label: "Mutual confirmation — both required" },
            { swatch: VIZ_4, label: "Not required at this gate" },
          ]}
        />
      </div>
    </div>
  );
}

// ── DIAGRAM 2 — term negotiation state machine. ──────────────────────────────

function TermStateDiagram() {
  const width = 800;
  const height = 340;
  const nodes = {
    unset: { x: 90, y: 60, label: "Unset" },
    proposed: { x: 330, y: 60, label: "Proposed /\ncountered" },
    accepted: { x: 570, y: 60, label: "Accepted\n(one flag)" },
    locked: { x: 570, y: 220, label: "Locked\n(both flags)" },
  };

  return (
    <div style={{ background: PANEL, border: `1px solid ${RULE}`, padding: "24px", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Diagram: term negotiation's real state machine. Unset moves to Proposed or Countered. Proposed moves to Accepted when one party accepts, setting only that party's flag. Accepted moves to Locked only when both parties have accepted the same value. From any state, a new proposed value resets both acceptance flags and returns to Proposed or Countered — shown as a single reset path from every node back to the proposed state."
        style={{ minWidth: `${width}px`, display: "block" }}
      >
        <defs>
          <marker id="arrow-ink2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={INK_2} />
          </marker>
          <marker id="arrow-viz3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={VIZ_3} />
          </marker>
          <marker id="arrow-viz4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={VIZ_4} />
          </marker>
        </defs>

        {/* unset -> proposed */}
        <line x1={nodes.unset.x + 55} y1={nodes.unset.y} x2={nodes.proposed.x - 55} y2={nodes.proposed.y}
              stroke={INK_2} strokeWidth={1.5} markerEnd="url(#arrow-ink2)" />
        <text x={(nodes.unset.x + nodes.proposed.x) / 2} y={nodes.unset.y - 10} textAnchor="middle" fontFamily={UI} fontSize="10.5" fill={INK_3}>
          proposeTerm
        </text>

        {/* proposed -> accepted */}
        <line x1={nodes.proposed.x + 60} y1={nodes.proposed.y} x2={nodes.accepted.x - 60} y2={nodes.accepted.y}
              stroke={INK_2} strokeWidth={1.5} markerEnd="url(#arrow-ink2)" />
        <text x={(nodes.proposed.x + nodes.accepted.x) / 2} y={nodes.proposed.y - 10} textAnchor="middle" fontFamily={UI} fontSize="10.5" fill={INK_3}>
          acceptTerm — one flag
        </text>

        {/* accepted -> locked */}
        <line x1={nodes.accepted.x} y1={nodes.accepted.y + 40} x2={nodes.locked.x} y2={nodes.locked.y - 40}
              stroke={VIZ_3} strokeWidth={2} markerEnd="url(#arrow-viz3)" />
        <text x={nodes.accepted.x + 64} y={(nodes.accepted.y + nodes.locked.y) / 2 - 6} textAnchor="start" fontFamily={UI} fontSize="10.5" fill={SATISFIED}>
          both flags true,
          <tspan x={nodes.accepted.x + 64} dy="14">same value</tspan>
        </text>

        {/* reset path — from accepted and locked, back to proposed, on a new value */}
        <path
          d={`M ${nodes.locked.x - 60} ${nodes.locked.y} C ${nodes.proposed.x + 40} ${height - 20}, ${nodes.proposed.x - 20} ${height - 20}, ${nodes.proposed.x - 10} ${nodes.proposed.y + 42}`}
          fill="none" stroke={VIZ_4} strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#arrow-viz4)"
        />
        <text x={nodes.proposed.x + 90} y={height - 10} textAnchor="middle" fontFamily={UI} fontSize="10.5" fill={INK_3}>
          new value proposed — resets both flags to false
        </text>

        {/* Nodes */}
        {Object.entries(nodes).map(([key, n]) => {
          const isLocked = key === "locked";
          const isUnset = key === "unset";
          return (
            <g key={key}>
              <rect
                x={n.x - 55} y={n.y - 26} width={110} height={52}
                fill={isLocked ? "var(--v2-satisfied-wash)" : PANEL}
                stroke={isLocked ? VIZ_3 : isUnset ? VIZ_4 : INK_2}
                strokeWidth={isLocked ? 2 : 1.5}
              />
              {n.label.split("\n").map((line, i) => (
                <text
                  key={i}
                  x={n.x} y={n.y + (n.label.includes("\n") ? (i === 0 ? -3 : 12) : 5)}
                  textAnchor="middle" fontFamily={UI} fontSize="12" fontWeight={600}
                  fill={isLocked ? SATISFIED : INK}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ marginTop: "16px" }}>
        <Legend
          items={[
            { swatch: INK_2, label: "Propose or accept" },
            { swatch: VIZ_3, label: "Locks — both parties, same value" },
            { swatch: VIZ_4, label: "Reset — a new value voids prior acceptance" },
          ]}
        />
      </div>
    </div>
  );
}

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Lengdon" },
      {
        name: "description",
        content:
          "The closing pipeline and term negotiation, drawn as they actually run — six gates, two rails, and the state machine behind every term.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/how-it-works" }],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
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
          <Label>How it works</Label>
          <h1
            style={{
              fontFamily: UI, fontSize: "40px", lineHeight: 1.15, fontWeight: 700,
              letterSpacing: "-0.02em", color: INK, margin: 0, maxWidth: "20ch",
            }}
          >
            Two mechanisms, drawn as they actually run.
          </h1>
          <p
            style={{
              fontFamily: DOC, fontSize: "19px", lineHeight: 1.5, color: INK_2,
              maxWidth: MEASURE, margin: 0,
            }}
          >
            The closing pipeline and term negotiation are the two places a
            raise is actually decided. Both are shown below exactly as they
            run in the product, not simplified for the page.
          </p>
          <div style={{ marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
          </div>
        </section>

        <Rule />

        {/* ── PROSE 1 — closing pipeline ─────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>The closing pipeline</Title>
          <Prose>
            Six gates, and most of them need both sides to act — not one side
            declaring the other has agreed. The diagram below draws that
            distinction directly: where the two rails converge, both parties
            are required. Where they don&rsquo;t, one side alone is.
          </Prose>
          <Prose>
            Gate 3 is the one exception, deliberately: the founder sets the
            fee, and only the party paying it confirms. That&rsquo;s a single
            rail acting, not a convergence, and the diagram shows it that way
            rather than pretending every gate is symmetric.
          </Prose>
        </section>

        {/* ── DIAGRAM 1 ──────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Label>The closing pipeline · Two-party swimlane</Label>
          <ClosingPipelineDiagram />
          <Caption>
            A dashed line between rails marks a gate that needs both parties.
            Gate 1 is a shared decision made once, before work on the
            remaining gates begins. Gate 3 has no counterparty gate — the
            founder sets the fee, the designated payer alone confirms.
          </Caption>
        </section>

        <Rule />

        {/* ── PROSE 2 — term negotiation ─────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Term negotiation</Title>
          <Prose>
            A term doesn&rsquo;t lock because one party says it&rsquo;s
            agreed. Accepting a term sets only your own flag — the term
            finalizes only once both flags are true against the exact same
            value.
          </Prose>
          <Prose>
            The rule a table can&rsquo;t show cleanly: proposing a{" "}
            <em>new</em> value resets both flags to false, even if one side
            had already accepted the old one. There is no state where a
            stale acceptance carries forward onto a changed number.
          </Prose>
        </section>

        {/* ── DIAGRAM 2 ──────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Label>Term negotiation · State machine</Label>
          <TermStateDiagram />
          <Caption>
            Every arrow is a real transition from the negotiation code, not
            an illustration of intent — including the reset path, which
            fires on any new proposed value regardless of which state the
            term was in when it changed.
          </Caption>
        </section>

        <Rule />

        {/* ── CLOSE ──────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>See it on a real screen</Title>
          <Prose>
            The homepage shows the closing pipeline as a fee schedule and the
            term sheet negotiation view as a live screenshot.
          </Prose>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
            <Action to="/sign-up">Create an account</Action>
            <Action to="/" variant="secondary">See the homepage</Action>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
