import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// / — the homepage, rebuilt under PUBLIC-REGISTER.md (17 Aug 2026).
//
// Replaces the entire v1 page (Syne/DM Sans, purple gradient, 11 sections).
// The v1 page carried live content defects independent of the design system —
// this rebuild closes them by construction rather than as individual fixes:
//   - A "Public directory" section with six entirely fabricated company cards.
//   - A FAQ answer describing thesis-matching as a live feature (§15/§25 —
//     the matching engine was found and excluded, see CLAUDE.md §19b).
//   - A comparison band naming "Competitors"/"Traditional" with invented
//     values, including a 1.5% success fee that no longer exists.
//   - "$49/month after launch", "Free at launch" for investors — stale,
//     contradicted by the real fee schedule shipped to /pricing.
//   - A "Roast Survivor badge" claim — CLAUDE.md §19 already retired this.
// None of these needed individual tickets; the whole page is replaced.
//
// Structure per PUBLIC-REGISTER.md §4/§3.4: one fold promise, one action, one
// specimen. Prose → instrument → prose → instrument, four times. No feature
// grid, no logo strip, no statistics, no carousel, no comparison table.
//
// INSTRUMENT 1 is the closing pipeline's SIX gates, not seven. A prior draft
// assumed seven; live verification of app.deal-rooms.$id.close.tsx and
// ClosingPipeline.tsx found only six gates actually render (the app's own
// on-screen numbering is internally inconsistent — a "3-6" heading sits over
// four cards numbered 4,5,6,7 — a live bug, not a spec worth reproducing
// here). Publishing seven would have been a public factual error about our
// own product. See CLAUDE.md §20.12.
//
// The fold CTA is "Create an account", not an action naming a destination a
// logged-out visitor can't reach. /b/:token (Foundation §22's claimed
// unauthenticated deep link) does not exist anywhere in the codebase —
// verified via the route directory, the generated route tree, and a full
// content grep. An investor cannot create a deal room (create_deal_room is
// founder-only in roles.ts, RLS-enforced) and has no unauthenticated entry
// point at all today, so the CTA describes what any visitor can actually do.
// ─────────────────────────────────────────────────────────────────────────────

// Public register type scale (PUBLIC-REGISTER.md §3.2) — same local tokens as
// /pricing, kept local rather than promoted to global CSS vars for the same
// reason: the public scale governs public pages only, and global tokens would
// risk 16px prose leaking into the 13.5px application.
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

/** Measure cap for prose — 66–72 characters (register §3.1). */
const MEASURE = "34rem";

// ── Primitives — identical to /pricing's, reused rather than re-derived, so
// the two pages read as one system rather than two similar ones. ───────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: UI,
        fontSize: "11px",
        lineHeight: 1.45,
        fontWeight: 500,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: INK_3,
        margin: 0,
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
        fontFamily: UI,
        fontSize: "25px",
        lineHeight: 1.25,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: INK,
        margin: 0,
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
        fontFamily: DOC,
        fontSize: "16px",
        lineHeight: 1.65,
        color: INK_2,
        maxWidth: MEASURE,
        margin: 0,
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
        fontFamily: UI,
        fontSize: "12.5px",
        lineHeight: 1.5,
        color: INK_3,
        maxWidth: MEASURE,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

/** Section separator — the register's primary structural device (§3.5.1). */
function Rule() {
  return (
    <hr style={{ border: 0, borderTop: `1px solid ${RULE}`, margin: 0 }} />
  );
}

/**
 * Instrument block — a real table at APPLICATION density (§3.4).
 * 13.5px, 36px rows, 1.5px ink header rule, no zebra, tabular figures.
 */
function Instrument({
  label,
  head,
  rows,
  caption,
  align,
}: {
  label: string;
  head: string[];
  rows: React.ReactNode[][];
  caption: React.ReactNode;
  /** Column indices rendered as right-aligned tabular data. */
  align?: number[];
}) {
  const numeric = new Set(align ?? []);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Label>{label}</Label>
      <div
        style={{
          background: PANEL,
          border: `1px solid ${RULE}`,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: UI,
            fontSize: "13.5px",
            lineHeight: 1.55,
          }}
        >
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: INK_3,
                    textAlign: numeric.has(i) ? "end" : "start",
                    padding: "0 16px 8px",
                    borderBottom: `1.5px solid ${INK}`,
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
              <tr
                key={ri}
                style={{
                  borderBottom:
                    ri === rows.length - 1 ? "none" : `1px solid ${RULE_LIGHT}`,
                }}
              >
                {r.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      height: "36px",
                      padding: "0 16px",
                      color: INK,
                      textAlign: numeric.has(ci) ? "end" : "start",
                      fontFamily: numeric.has(ci) ? DATA : UI,
                      fontSize: numeric.has(ci) ? "12px" : "13.5px",
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

/** Primary action. One per section at most (§3.5.1 — the accent is rationed). */
function Action({
  to,
  search,
  children,
  variant = "primary",
}: {
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
        display: "inline-flex",
        alignItems: "center",
        height: "36px",
        padding: "0 18px",
        borderRadius: "2px",
        fontFamily: UI,
        fontSize: "13.5px",
        fontWeight: 500,
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

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockystick — Every deal leaves a record that holds" },
      {
        name: "description",
        content:
          "A deal room, a diligence checklist, and a term sheet that all point to the same reference number. Structured process from first contact to close.",
      },
      { name: "robots", content: "index, follow" },
      {
        property: "og:title",
        content: "Hockystick — Every deal leaves a record that holds",
      },
      {
        property: "og:description",
        content:
          "A deal room, a diligence checklist, and a term sheet that all point to the same reference number.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hockystick.app" },
    ],
    links: [{ rel: "canonical", href: "https://hockystick.app" }],
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
    <div style={{ background: SURFACE, minHeight: "100vh" }}>
      <SiteHeader />

      <main
        id="main-content"
        style={{
          maxWidth: "62rem",
          margin: "0 auto",
          padding: "72px 24px 96px",
          display: "flex",
          flexDirection: "column",
          gap: "56px",
        }}
      >
        {/* ── FOLD — one promise, one action, one specimen (§4.1) ───────────── */}
        <section
          className="pub-fold"
          style={{ display: "grid", gap: "40px", alignItems: "start" }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <Label>Hockystick</Label>
            <h1
              style={{
                fontFamily: UI,
                fontSize: "40px",
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: INK,
                margin: 0,
                maxWidth: "16ch",
              }}
            >
              Every deal leaves a record that holds.
            </h1>
            <p
              style={{
                fontFamily: DOC,
                fontSize: "19px",
                lineHeight: 1.5,
                color: INK_2,
                maxWidth: MEASURE,
                margin: 0,
              }}
            >
              A deal room, a diligence checklist, and a term sheet that all
              point to the same reference number.
            </p>
            <div style={{ marginTop: "4px" }}>
              <Action to="/sign-up">Create an account</Action>
            </div>
          </div>

          {/* Reference-line specimen — the proof-of-artifact device (§3.3). */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <div
              style={{
                borderInlineStart: `2px solid ${ACCENT}`,
                paddingInlineStart: "12px",
              }}
            >
              <div
                dir="ltr"
                style={{
                  fontFamily: DATA,
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: ACCENT,
                  unicodeBidi: "isolate",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                000003-ROM-2026-000001-68
              </div>
              <div
                style={{
                  fontFamily: UI,
                  fontSize: "11px",
                  lineHeight: 1.45,
                  fontWeight: 500,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: INK_3,
                }}
              >
                Deal room · Specimen
              </div>
            </div>
            <Caption>
              Every object carries a reference number with a check digit. Read
              one aloud and a mistake shows immediately.
            </Caption>
          </div>
        </section>

        <Rule />

        {/* ── PROSE 1 — the closing pipeline, introduced ────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Title>What holds together</Title>
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
        </section>

        {/* ── INSTRUMENT 1 — the closing pipeline, six gates ────────────────────
            Verified against app.deal-rooms.$id.close.tsx and ClosingPipeline.tsx
            directly, not from memory. Six gates render in the live product; a
            seventh ("terms locked") is an internal precondition inside gate 2
            with no heading and no user-facing label, and does not appear here.
            Renumbered 1-6 for public copy — the app's own on-screen numbering
            (a "3-6" heading over cards labelled 4,5,6,7) is an internal bug, not
            a sequence worth reproducing publicly. See CLAUDE.md §20.12. */}
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
              <strong style={{ fontWeight: 600 }}>
                5 · Investment payment
              </strong>,
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

        <Rule />

        {/* ── PROSE 2 — for the founder side ─────────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Title>For the founder side</Title>
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
        </section>

        {/* ── INSTRUMENT 2 — what a founder controls ────────────────────────── */}
        <Instrument
          label="What a founder controls"
          head={["Control", "Set by", "Visible to"]}
          rows={[
            ["Document access", "Founder, per room", "Investor, after NDA"],
            [
              "Financial detail",
              "Founder, per disclosure",
              "Investor, after founder grants it",
            ],
            [
              "Team member records",
              "Founder",
              "Investor, only inside an open room",
            ],
            [
              "Counsel access at closing",
              "Either party",
              "Counsel — term summary and agreement only",
            ],
          ]}
          caption="A lawyer invited at closing sees the term summary and the agreement. They do not see earlier diligence or negotiation history."
        />

        <Rule />

        {/* ── PROSE 3 — why the mechanisms aren't ours ──────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Title>Why the mechanisms aren&rsquo;t ours</Title>
          <Prose>
            None of this is a new invention. Each piece is adapted from a
            practice that has been tested for decades in a different part of
            finance.
          </Prose>
          <Prose>
            We are naming the source deliberately. A mechanism with a checkable
            origin does not ask to be trusted — it asks to be checked.
          </Prose>
        </section>

        {/* ── INSTRUMENT 3 — mechanism provenance ───────────────────────────── */}
        <Instrument
          label="Where the mechanisms come from"
          head={["Mechanism", "Origin"]}
          rows={[
            [
              "Single-notice diligence",
              <>
                Documentary credit examination —{" "}
                <span style={{ fontFamily: DATA, fontSize: "12px" }}>
                  UCP 600
                </span>
              </>,
            ],
            ["The conditions register", "Secured lending practice"],
            ["The evidence ladder", "Insurance underwriting practice"],
            ["Soft-circle tracking", "Syndicate practice"],
            [
              "The check digit",
              <>
                <span style={{ fontFamily: DATA, fontSize: "12px" }}>
                  ISO 7064 MOD 97-10
                </span>{" "}
                — the IBAN algorithm
              </>,
            ],
          ]}
          caption="We adopt established process and name its source. Each of these is checkable against its own standard."
        />

        <Rule />

        {/* ── PROSE 4 — what we refuse to build ──────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Title>What we refuse to build</Title>
          <Prose>
            Some features are the standard shape for this category and we will
            not build them.
          </Prose>
          <Prose>
            We do not score, rank, or match. We do not tell you who to fund or
            who should fund you — that judgment belongs to the two parties in
            the room, not to us.
          </Prose>
        </section>

        {/* ── INSTRUMENT 4 — exclusions ──────────────────────────────────────── */}
        <Instrument
          label="What we do not build"
          head={["We do not build", "Why"]}
          rows={[
            [
              "Matching or recommendation",
              "The judgment belongs to the parties, not to an algorithm",
            ],
            ["Readiness scores", "An invented number is not evidence"],
            [
              "Verification badges",
              "We record what a party asserts; we do not certify it",
            ],
            ["Escrow or custody", "We are not a bank, broker, or custodian"],
            ["A social feed", "Nothing here is content"],
          ]}
          caption="Each of these is a deliberate decision, not a missing feature."
        />

        <Rule />

        {/* ── CLOSE ────────────────────────────────────────────────────────── */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <Title>Start on the Direct tier</Title>
          <Prose>No card, no trial clock.</Prose>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "4px",
            }}
          >
            <Action to="/sign-up">Create an account</Action>
            <Action to="/pricing" variant="secondary">
              See pricing
            </Action>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
