import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// / — the homepage, rebuilt under PUBLIC-REGISTER.md v2.0 (18 Aug 2026).
//
// This is the first page built under v2.0 and sets the pattern the rest of
// the public surface follows. It is a VISUAL pass: every word of copy is
// carried verbatim from the v1.0 build, which was approved separately and is
// not re-litigated here. What changed is type scale, section grounds, the
// hero, and the addition of a structural graphic.
//
// WHY v1.0 LOOKED WRONG, in one line: it inherited DESIGN.md §13's
// prohibitions (no gradient, no shadow, 2px radius, no coloured fills) which
// govern the dense authenticated app and are wrong as marketing constraints.
// DESIGN.md's scope section was corrected on 18 Aug 2026 to say so. See
// PUBLIC-REGISTER.md §11 for the measured competitive evidence.
//
// HERO ALIGNMENT — asymmetric, stated deliberately as §4 requires. The left
// column carries eyebrow/display/lead/action; the right carries the
// structural graphic with the reference-line specimen beneath it. Reason: the
// specimen is this page's proof-of-artifact device, and an asymmetric split
// gives it the same optical weight as the tagline instead of subordinating it
// beneath a centred block.
//
// SECTION TREATMENTS — four, at §5.3.1's ceiling, never two adjacent alike:
//   A  base      --pub-n-06   hero, founder-controls, close
//   B  panel     --pub-n-00   term-sheet screenshot, provenance
//   C  recessed  --pub-n-09   closing pipeline
//   D  DEEP      --pub-n-0d   the refusals — ONE per page (§5.5), used as
//                             punctuation: "what we refuse to build" is the
//                             page's conviction moment and the one place
//                             weight is earned rather than decorative.
//
// SIGNAL BLUE — field colour only (§5.4): the hero graphic's strokes and one
// transition rule. Never chrome; buttons/links/reference line stay ledger
// navy. No body prose sits on raw --pub-signal (5.04 = AA only, §10.1).
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

// Section grounds (§5.2)
const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
const G_RECESSED = "var(--pub-n-09)";
const G_DEEP = "var(--pub-n-0d)";

// Inverted ink for the deep section
const DEEP_INK = "var(--pub-n-02)";
const DEEP_INK_2 = "var(--pub-n-18)";
// Muted ink for the deep section's SECONDARY table column. --pub-n-38 chosen
// by measuring every ramp step against the table's own composited ground
// (rgba(255,255,255,0.03) over --pub-n-0d = #141B27, not the raw ground):
// 8.06 = AAA, with a 2.07 separation from the primary column's --pub-n-02.
// --pub-n-52 gives more separation (3.44) but drops to AA (4.86), so it loses.
// The hierarchy is the point — the refusal is the statement, the reason
// supports it; equal weight on both reads as a wall of assertions.
const DEEP_INK_MUTED = "var(--pub-n-38)";
const DEEP_RULE = "#243040";

const SIGNAL = "var(--pub-signal)";

/** Measure cap for prose — 66–72 characters (§3.2). Applies to PROSE only. */
const MEASURE = "34rem";
const SHELL = "72rem";

// ── Primitives ───────────────────────────────────────────────────────────────

/** §5.6 eyebrow — TOPIC / SUBTOPIC, monospace, factual. Never theatrical. */
function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      style={{
        fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
        letterSpacing: "0.09em", textTransform: "uppercase",
        color: onDark ? DEEP_INK_2 : INK_3, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Title({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <h2 className="pub-title" style={{ fontFamily: UI, color: onDark ? DEEP_INK : INK, margin: 0 }}>
      {children}
    </h2>
  );
}

function Prose({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      style={{
        fontFamily: DOC, fontSize: "17px", lineHeight: 1.65,
        color: onDark ? DEEP_INK_2 : INK_2, maxWidth: MEASURE, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Caption({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      style={{
        fontFamily: UI, fontSize: "13px", lineHeight: 1.5,
        color: onDark ? DEEP_INK_2 : INK_3, maxWidth: MEASURE, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

/**
 * Section header — title beside a short lead line, row on desktop, per a
 * design reference's proximity pattern (reviewed 23 Aug 2026, structure
 * only — see MetricGrid's comment). NOT a content cut: `lead` is a short
 * line placed for visual rhythm alongside the title; every full approved
 * paragraph still renders in full immediately beneath, unchanged. `lead` is
 * additional framing text, never a substitute for the paragraphs below it.
 */
function SectionHeader({
  eyebrow, title, lead, onDark = false,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  lead: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <div
      className="pub-section-header"
      style={{
        display: "flex", flexDirection: "column", gap: "20px",
        paddingBottom: "20px",
        borderBottom: `1px solid ${onDark ? DEEP_RULE : RULE}`,
      }}
    >
      <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
      <div className="pub-section-header-row" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Title onDark={onDark}>{title}</Title>
        <p
          style={{
            fontFamily: DOC, fontSize: "15px", lineHeight: 1.55, fontStyle: "italic",
            color: onDark ? DEEP_INK_2 : INK_3, maxWidth: "22rem", margin: 0,
          }}
        >
          {lead}
        </p>
      </div>
    </div>
  );
}

/**
 * Instrument block — a real table, roomier than application density (§6.2).
 * 13.5px, ~49px rows (14/20px cell padding, not a fixed height), 1.5px
 * header rule, no zebra, tabular figures. Sits on panel white inside
 * whichever section ground surrounds it, so tables stay legible on every
 * treatment including the deep one. Density raised 19 Aug 2026 — the prior
 * 36px fixed-height rows read as cramped against the generous type scale
 * around them.
 */
function Instrument({
  label, head, rows, caption, onDark = false, mutedFrom,
}: {
  label: string;
  head: string[];
  rows: React.ReactNode[][];
  caption: React.ReactNode;
  onDark?: boolean;
  /** Column index at and beyond which cells render in the muted ink. Used to
   *  keep a primary claim dominant and its supporting reason subordinate. */
  mutedFrom?: number;
}) {
  const headRule = onDark ? DEEP_INK_2 : INK;
  const cellInk = onDark ? DEEP_INK : INK;
  const cellInkMuted = onDark ? DEEP_INK_MUTED : INK_2;
  const headInk = onDark ? DEEP_INK : INK_3;
  const zebraBg = onDark ? "rgba(255,255,255,0.04)" : "var(--pub-n-09)";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Eyebrow onDark={onDark}>{label}</Eyebrow>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%", borderCollapse: "collapse",
            fontFamily: UI, fontSize: "14px", lineHeight: 1.55,
          }}
        >
          <thead>
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    fontSize: "13.5px", fontWeight: 700, letterSpacing: "0",
                    textTransform: "none", color: headInk, textAlign: "start",
                    padding: "0 24px 14px", borderBottom: `1.5px solid ${headRule}`,
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
              <tr key={ri} style={{ background: ri % 2 === 1 ? zebraBg : "transparent" }}>
                {r.map((cell, ci) => {
                  const muted = mutedFrom !== undefined && ci >= mutedFrom;
                  return (
                    <td
                      key={ci}
                      style={{
                        padding: "18px 24px",
                        color: muted ? cellInkMuted : cellInk,
                        textAlign: "start", fontVariantNumeric: "tabular-nums",
                        verticalAlign: "top",
                      }}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption onDark={onDark}>{caption}</Caption>
    </section>
  );
}

/**
 * Metric grid — a row of hairline-divided cells (label + value), no card
 * chrome, no shadow. Structural device taken from a design reference
 * reviewed 23 Aug 2026 (structure only — its copy, brand, and all-caps mono
 * voice were not carried over, per instruction). Used where a section's
 * content is better read as a small set of facts than as another table —
 * breaks up what would otherwise be four consecutive Instrument tables.
 *
 * BINDING CONSTRAINT: every value here must be a real, derivable fact about
 * the mechanism (a literal count, a literal absence) — never an invented
 * statistic. Where no honest number exists for a cell, `value` takes a
 * structural label instead of a number. See call sites for the derivation
 * of each cell.
 */
function MetricGrid({ cells }: { cells: { label: string; value: string }[] }) {
  return (
    <div
      className="pub-metric-grid"
      style={{
        display: "grid",
        border: `1px solid ${RULE}`,
        background: PANEL,
        ["--pub-metric-cols" as any]: `repeat(${cells.length}, 1fr)`,
      }}
    >
      {cells.map((c) => (
        <div key={c.label} style={{ padding: "24px 20px" }}>
          <Eyebrow>{c.label}</Eyebrow>
          <div
            style={{
              fontFamily: DATA, fontSize: "32px", fontWeight: 500,
              color: INK, marginTop: "10px", lineHeight: 1.1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
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
function Section({
  ground, children, onDark = false, topRule = false,
}: {
  ground: string;
  children: React.ReactNode;
  onDark?: boolean;
  topRule?: boolean;
}) {
  return (
    <section
      style={{
        background: ground,
        borderTop: topRule ? `2px solid ${SIGNAL}` : undefined,
        color: onDark ? DEEP_INK : undefined,
      }}
    >
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

// ── Structural graphic (§6.1) ────────────────────────────────────────────────
// A calm geometric field: layered, slightly offset squares converging toward
// a shared centre, with corner alignment ticks — a registration mark, the
// device used to check that layers of a physical document (or a printed
// plate) are aligned. Drawn once on load and then still.
//
// REBUILT 19 AUG 2026 from the original concentric-rings version, which the
// founder judged too plain relative to the type scale around it. Rejected two
// alternatives before this one: a "ruled ledger fold" (a rule field with one
// rule splitting into a confirmed pair) read as visually flat; a "sequential
// confirmation" row of squares strengthening into one checked mark was
// rejected outright under Rule 6.1.1 — it reads as a progress/step indicator,
// which implies a completion or stage claim the same way the original
// node-link version implied a relationship claim.
//
// DELIBERATELY NOT A NODE-LINK GRAPH, and not a progress indicator either.
// Offset squares converging on a shared centre have no readable "entities,"
// no "connections," and no implied sequence or completion state — there is
// nothing here for a viewer to interpret as data. aria-hidden; reduced
// motion renders the finished frame.

function StructuralGraphic() {
  const size = 380;
  const c = size / 2;
  // Each square is offset from centre by a shrinking amount as it nests
  // inward, converging toward true registration at the centremost square —
  // the visual idea is layers of the same record coming into alignment.
  const squares = [
    { half: 148, dx: -14, dy: 10 },
    { half: 128, dx: 11, dy: -12 },
    { half: 108, dx: -9, dy: -8 },
    { half: 88, dx: 8, dy: 7 },
    { half: 68, dx: -5, dy: 5 },
    { half: 48, dx: 0, dy: 0 },
  ];
  const tickLen = 16;
  const tickGap = 6;

  return (
    <svg
      className="pub-graphic"
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", maxWidth: "420px" }}
    >
      {/* offset squares, converging toward centre registration */}
      {squares.map((sq, i) => {
        const cx = c + sq.dx;
        const cy = c + sq.dy;
        const perimeter = sq.half * 8;
        return (
          <rect
            key={`sq${i}`}
            data-draw
            x={cx - sq.half} y={cy - sq.half}
            width={sq.half * 2} height={sq.half * 2}
            fill="none"
            stroke={i % 2 === 0 ? ACCENT : SIGNAL}
            strokeWidth={i === squares.length - 1 ? 1.5 : 1}
            opacity={0.16 + i * 0.11}
            style={{
              ["--pub-dash" as any]: perimeter,
              animationDelay: `${0.1 + i * 0.12}s`,
            }}
          />
        );
      })}

      {/* corner registration ticks — the alignment-mark device */}
      {[
        { x1: c, y1: c - 88 - tickGap - tickLen, x2: c, y2: c - 88 - tickGap },
        { x1: c, y1: c + 88 + tickGap, x2: c, y2: c + 88 + tickGap + tickLen },
        { x1: c - 88 - tickGap - tickLen, y1: c, x2: c - 88 - tickGap, y2: c },
        { x1: c + 88 + tickGap, y1: c, x2: c + 88 + tickGap + tickLen, y2: c },
      ].map((t, i) => (
        <line
          key={`tick${i}`}
          data-node
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={SIGNAL} strokeWidth={1.5} opacity={0.85}
          style={{ animationDelay: `${0.75 + i * 0.06}s` }}
        />
      ))}

      {/* a single centre mark — true registration, the one point of emphasis */}
      <circle
        data-node
        cx={c} cy={c} r={4}
        fill={SIGNAL}
        opacity={0.9}
        style={{ animationDelay: "0.9s" }}
      />
    </svg>
  );
}

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lengdon — Every deal leaves a record that holds" },
      {
        name: "description",
        content:
          "A deal room, a diligence checklist, and a term sheet that all point to the same reference number. Structured process from first contact to close.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Lengdon — Every deal leaves a record that holds" },
      { property: "og:description", content: "A deal room, a diligence checklist, and a term sheet that all point to the same reference number." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lengdon.com" },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com" }],
  }),
  component: Landing,
});

function Landing() {
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

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />

      <main id="main-content">
        {/* ── HERO — treatment A, asymmetric (§4) ─────────────────────────── */}
        <section style={{ background: G_BASE }}>
          <div
            className="pub-hero"
            style={{
              maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 96px",
              display: "grid", alignItems: "center", gap: "48px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <Eyebrow>Lengdon</Eyebrow>
              <h1
                className="pub-display"
                style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "14ch" }}
              >
                Every deal leaves a record that holds.
              </h1>
              <p
                style={{
                  fontFamily: DOC, fontSize: "21px", lineHeight: 1.5, color: INK_2,
                  maxWidth: MEASURE, margin: 0,
                }}
              >
                A deal room, a diligence checklist, and a term sheet that all point
                to the same reference number.
              </p>
              <div style={{ marginTop: "8px" }}>
                <Action to="/sign-up">Create an account</Action>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "28px", alignItems: "flex-start" }}>
              {/* Hero image, founder-directed brand asset, replacing the
                  animated StructuralGraphic (kept below, unused, in case of
                  a future revert — see its own comment for the original
                  design rationale). Confirmed explicitly this is a
                  deliberate departure from the abstract-device register the
                  rest of the site follows, not an oversight.
                  Swapped a second time 25 Aug 2026 (same session) to a
                  different image — the founder replaced the file directly
                  in public/ mid-session; see CLAUDE.md §4a on the
                  concurrent-edit hazard this surfaced. The source image's
                  own background samples as near-pure white (#FEFEFE-#FFFFFF
                  at all four corners, confirmed by direct pixel sampling,
                  not assumed) — placing it directly on the section's warm
                  paper ground (--pub-n-06, #F5F4F1) would show a visible
                  white rectangle seam. Wrapped in an explicit white panel
                  card (--pub-n-00, #FFFFFF — an exact match, not an
                  approximation) with the same border treatment already used
                  for the reference-number specimen block below it, so the
                  image reads as a deliberately bounded card rather than a
                  mismatched background collision. */}
              <div
                style={{
                  width: "100%", maxWidth: "480px", background: "var(--pub-n-00)",
                  border: `1px solid ${RULE}`, padding: "20px",
                }}
              >
                <img
                  src="/marketing/hero-device.jpg"
                  alt="Abstract layered architectural rendering of a stepped structure with connecting data streams, representing the platform's structural precision"
                  width={900}
                  height={604}
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ borderInlineStart: `2px solid ${ACCENT}`, paddingInlineStart: "12px" }}>
                  <div
                    dir="ltr"
                    style={{
                      fontFamily: DATA, fontSize: "13px", lineHeight: 1.7, color: ACCENT,
                      unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    000003-ROM-2026-000001-68
                  </div>
                  <div
                    style={{
                      fontFamily: UI, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
                      letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3,
                    }}
                  >
                    Deal room · Specimen
                  </div>
                </div>
                <Caption>
                  Every object carries a reference number with a check digit. Read one
                  aloud and a mistake shows immediately.
                </Caption>
              </div>
            </div>
          </div>
        </section>

        {/* ── CLOSING PIPELINE — treatment C, recessed ─────────────────────── */}
        <Section ground={G_RECESSED}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <SectionHeader
              eyebrow="Closing / Pipeline"
              title="What holds together"
              lead="Six confirmed steps. Neither party can skip ahead."
            />
            <Prose>
              A close is not a handshake and a wire transfer. It is six confirmed
              steps, and neither party can skip ahead.
            </Prose>
            <Prose>
              Each step needs the last one done first. The platform enforces the
              order — not just in what the screen shows, but in what the server
              will accept, regardless of what either party&rsquo;s browser sends.
            </Prose>
            <Prose>
              Most steps need both parties to act. Signing happens off the
              platform; so does payment. What the platform holds is the record of
              each confirmation — the sequence, the timestamps, and the fact that
              both sides agreed.
            </Prose>
          </div>

          {/* Stat strip — structural device from a design reference reviewed
              23 Aug 2026 (structure only, see MetricGrid's own comment).
              Every cell is a literal, derivable fact, not an invented
              statistic — checked against the table immediately below it,
              which is the source for the first two:
                Gates: 6 — literal row count of the table beneath.
                Parties: 2 — founder, investor; no third-party default path
                  (verified against ClosingPipeline.tsx's role type, which is
                  exactly "founder" | "investor").
                Order: "Server-enforced" — a structural label, not a number,
                  restating the prose claim two lines up (enforced in what
                  the server accepts, not just what the screen shows) rather
                  than inventing a count for something that isn't a count.
                Funds held by platform: 0 — restates the table's own caption
                  below ("it never holds money") as a fact, not a new claim. */}
          <MetricGrid
            cells={[
              { label: "Gates", value: "6" },
              { label: "Parties", value: "2" },
              { label: "Order", value: "Server-enforced" },
              { label: "Funds held by platform", value: "0" },
            ]}
          />

          {/* Verified against app.deal-rooms.$id.close.tsx and ClosingPipeline.tsx
              directly. Six gates render in the live product; a seventh ("terms
              locked") is an internal precondition inside gate 2 with no
              user-facing label, and does not appear here. Renumbered 1-6 — the
              app's own on-screen numbering is an internal bug. CLAUDE.md §20.12. */}
          <Instrument
            label="The closing pipeline"
            head={["Gate", "What happens", "Confirmed by"]}
            rows={[
              [
                <strong style={{ fontWeight: 600 }}>1 · Legal counsel</strong>,
                "Either party may bring counsel in, or both agree to proceed without",
                "Both parties",
              ],
              [
                <strong style={{ fontWeight: 600 }}>2 · Agreement</strong>,
                "The closing agreement is accepted",
                "Both parties, independently",
              ],
              [
                <strong style={{ fontWeight: 600 }}>3 · Platform fee</strong>,
                "The fee for this close is set and confirmed",
                "Founder sets it, the paying party confirms",
              ],
              [
                <strong style={{ fontWeight: 600 }}>4 · Signing</strong>,
                "Each party uploads their own signed copy",
                "Both parties, separately",
              ],
              [
                <strong style={{ fontWeight: 600 }}>5 · Investment payment</strong>,
                "Funds move directly between the parties; the platform records proof and confirmation",
                "Investor uploads proof, founder confirms",
              ],
              [
                <strong style={{ fontWeight: 600 }}>6 · Close</strong>,
                "Both parties confirm delivery. The room becomes a permanent, read-only record",
                "Both parties, independently",
              ],
            ]}
            caption="Funds and signatures move directly between the two parties. The platform records each confirmation — it never holds money or signs on anyone's behalf."
          />
        </Section>

        {/* ── FOUNDER CONTROLS — treatment A, base ─────────────────────────── */}
        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <SectionHeader
              eyebrow="Founder / Control"
              title="For the founder side"
              lead="The founder controls what the room contains."
            />
            <Prose>
              The deploying side opens the room. The founder controls what it
              contains.
            </Prose>
            <Prose>
              One profile, one document vault, built once and reused across every
              room a founder opens. Nothing is shared with an investor before the
              founder grants access, and every grant is logged.
            </Prose>
            <Prose>
              There is no fee until a raise on the Direct tier reaches its first
              close.
            </Prose>
          </div>

          {/*
            Converted from a table to a hairline metric grid, 23 Aug 2026 —
            structural device from the same design reference as the stat
            strip above. Every "Set by / Visible to" pair is preserved, not
            cut — compressed into a single "Set by → Visible to" value per
            cell rather than dropped, since this is approved content and the
            rebuild is a visual pass, not a content edit (matches the
            reference's own → grammar for exactly this shape). Full detail
            (the "after NDA" / "per disclosure" qualifiers) survives in the
            caption immediately below, unchanged from the source table's own
            caption plus the two qualifiers that don't fit an eyebrow-length
            label — nothing here is invented, only re-laid-out.
          */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Eyebrow>What a founder controls</Eyebrow>
            <MetricGrid
              cells={[
                { label: "Document access", value: "Founder → investor, after NDA" },
                { label: "Financial detail", value: "Founder → investor, if granted" },
                { label: "Team records", value: "Founder → investor, in-room only" },
                { label: "Counsel access", value: "Either party → counsel, terms only" },
              ]}
            />
            <Caption>
              A lawyer invited at closing sees the term summary and the agreement. They do not see earlier diligence or negotiation history.
            </Caption>
          </div>
        </Section>

        {/* ── TERM SHEET SCREENSHOT — treatment B, panel (§6.2) ─────────────
            Real screen, captured live from the seeded specimen room, never
            mocked. SPECIMEN corner tag sits on the image itself so it
            registers before the eye reaches the figures. */}
        <section style={{ background: G_PANEL, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
          <div
            className="pub-split"
            style={{
              display: "grid", alignItems: "start", gap: "48px",
              maxWidth: SHELL, margin: "0 auto", padding: "88px 24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <Eyebrow>Product / Term sheet</Eyebrow>
              <Title>Seeing it work</Title>
              <Prose>
                A term doesn&rsquo;t move from proposed to finalized because one
                side declared it so. Each term carries its own status —
                proposed, countered, accepted by one side, or locked once both
                sides agree on the same value.
              </Prose>
              <Prose>
                The room below shows all four states on one screen, mid-negotiation.
              </Prose>
            </div>

            <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ position: "relative", border: `1px solid ${RULE}`, lineHeight: 0 }}>
                <img
                  src="/marketing/term-sheet-specimen.png"
                  alt="Specimen term negotiation screen with reserved placeholder data, showing seven deal terms in various states: finalized, accepted by one side, proposed, and counter-proposed."
                  width={1212}
                  height={720}
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute", top: "12px", right: "12px",
                    background: ACCENT, color: "#FFFFFF",
                    fontFamily: UI, fontSize: "11px", fontWeight: 700,
                    letterSpacing: "0.09em", textTransform: "uppercase",
                    padding: "5px 10px", borderRadius: "2px",
                  }}
                >
                  Specimen
                </div>
              </div>
              <Caption>
                <strong style={{ color: INK, fontWeight: 600 }}>Term negotiation · Specimen.</strong>{" "}
                Company, investor, and figures are placeholder data, reserved
                for this purpose and never a real negotiation.
              </Caption>
            </figure>
          </div>
        </section>

        {/* ── PROVENANCE — treatment B continues on panel ──────────────────── */}
        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <SectionHeader
              eyebrow="Method / Provenance"
              title="Why the mechanisms aren't ours"
              lead="Each piece is adapted from a practice tested for decades elsewhere in finance."
            />
            <Prose>
              None of this is a new invention. Each piece is adapted from a
              practice that has been tested for decades in a different part of
              finance.
            </Prose>
            <Prose>
              We are naming the source deliberately. A mechanism with a checkable
              origin does not ask to be trusted — it asks to be checked.
            </Prose>
          </div>

          <Instrument
            label="Where the mechanisms come from"
            head={["Mechanism", "Origin"]}
            rows={[
              ["The conditions register", "Secured lending practice"],
              ["The evidence ladder", "Insurance underwriting practice"],
              ["Soft-circle tracking", "Syndicate practice"],
              ["The check digit", <><span style={{ fontFamily: DATA, fontSize: "12px" }}>ISO 7064 MOD 97-10</span> — the IBAN algorithm</>],
            ]}
            caption="We adopt established process and name its source. Each of these is checkable against its own standard."
          />
        </Section>

        {/* ── REFUSALS — treatment D, THE ONE DARK SECTION (§5.5) ───────────
            Punctuation, not a theme. This is the page's conviction moment:
            refusals read as conviction precisely because they cost features,
            and this is the one place weight is earned. Signal-blue top rule
            marks the transition. Ink inverts; contrast measured, not assumed
            (§10) — the "Why" column was checked in-browser against this exact
            ground before shipping. */}
        <section style={{ background: G_DEEP, borderTop: `2px solid ${SIGNAL}` }}>
          <div
            style={{
              maxWidth: SHELL, margin: "0 auto", padding: "88px 24px",
              display: "flex", flexDirection: "column", gap: "56px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <SectionHeader
                onDark
                eyebrow="Position / Exclusions"
                title="What we refuse to build"
                lead="Some features are the standard shape for this category. We will not build them."
              />
              <Prose onDark>
                Some features are the standard shape for this category and we will
                not build them.
              </Prose>
              <Prose onDark>
                We do not score, rank, or match. We do not tell you who to fund or
                who should fund you — that judgment belongs to the two parties in
                the room, not to us.
              </Prose>
            </div>

            <Instrument
              onDark
              mutedFrom={1}
              label="What we do not build"
              head={["We do not build", "Why"]}
              rows={[
                [<strong style={{ fontWeight: 600 }}>Matching or recommendation</strong>, "The judgment belongs to the parties, not to an algorithm"],
                [<strong style={{ fontWeight: 600 }}>Readiness scores</strong>, "An invented number is not evidence"],
                [<strong style={{ fontWeight: 600 }}>Verification badges</strong>, "We record what a party asserts; we do not certify it"],
                [<strong style={{ fontWeight: 600 }}>Escrow or custody</strong>, "We are not a bank, broker, or custodian"],
                [<strong style={{ fontWeight: 600 }}>A social feed</strong>, "Nothing here is content"],
              ]}
              caption="Each of these is a deliberate decision, not a missing feature."
            />
          </div>
        </section>

        {/* ── CLOSE — treatment A, base ─────────────────────────────────────── */}
        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Start / Direct tier</Eyebrow>
            <Title>Start on the Direct tier</Title>
            <Prose>No card, no trial clock.</Prose>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
              <Action to="/sign-up">Create an account</Action>
              <Action to="/pricing" variant="secondary">See pricing</Action>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
