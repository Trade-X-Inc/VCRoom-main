import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /pricing — rebuilt under PUBLIC-REGISTER.md v2.0 (19 Aug 2026).
//
// VISUAL PASS ONLY. Every word of copy, every figure, and the fee schedule
// itself are carried verbatim from the prior build — approved separately,
// not re-litigated here. What changed is type scale, section grounds, and
// the primitives, brought into line with the pattern set on / (index.tsx).
//
// GROUND ASSIGNMENT — three of the four treatments, reported and approved
// before building:
//   A  base      --pub-n-06   fold, triggering events, close
//   C  recessed  --pub-n-09   fee schedule (this page's one load-bearing
//                              instrument — same role the closing pipeline
//                              plays on /)
//   B  panel     --pub-n-00   mechanism provenance (identical content to
//                              the homepage's provenance table; same ground,
//                              for cross-page consistency)
// No dark section: nothing here is a conviction/refusal moment, and forcing
// one would be decorative rather than motivated (§5.5 — punctuation, not a
// theme). Three treatments, never two adjacent alike, under §5.3.1's ceiling
// of four.
//
// The published fee schedule is a PRODUCT DECISION recorded in the Foundation
// Document (§20.3 as amended 17 Aug 2026, superseded the same day — ranges
// withdrawn in favour of firm prices), not database state. This page states
// the figures directly and does not read plan_limits.
//
// plan_limits still holds the older six-tier subscription model and drives
// the in-app billing screen. The two disagree, and reconciling them is a
// product decision plus a migration, not a copy fix. Logged in CLAUDE.md
// §20.2 as BLOCKING: it must be closed before any paid signup is enabled.
//
// Institutional publishes NO number, on purpose (§20.3 as re-amended): a
// published five-figure price would imply delivery against a compliance
// standard (SOC 2 Type II, SSO/SAML, SCIM, a signed DPA, and similar) that
// isn't held yet. Publishing a number against requirements we can't
// currently deliver is the same §3.8 fabricated-signal pattern as an
// invented statistic — so the row states the engagement route instead, with
// a stated reason, not a bare "contact sales" (register §5 prohibits that
// phrase outright).
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

// Section grounds (§5.2) — same tokens as index.tsx.
const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
const G_RECESSED = "var(--pub-n-09)";

/** Measure cap for prose — 66–72 characters (§3.2). Applies to PROSE only. */
const MEASURE = "34rem";
const SHELL = "72rem";

// ── Primitives (ported from index.tsx; align added for numeric columns,
// which the homepage's tables didn't need but the fee schedule does) ────────

/** §5.6 eyebrow — TOPIC / SUBTOPIC, monospace, factual. Never theatrical. */
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

/**
 * Instrument block — a real table, roomier than application density (§6.2).
 * 13.5px, ~49px rows (14/20px cell padding, not a fixed height), 1.5px
 * header rule, no zebra, tabular figures. Sits on panel white inside
 * whichever section ground surrounds it. Density raised 19 Aug 2026 — the
 * prior 36px fixed-height rows read as cramped against the generous type
 * scale around them.
 */
function Instrument({
  label, head, rows, caption, align,
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

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lengdon" },
      {
        name: "description",
        content:
          "A fixed fee tied to one event. Direct is USD 499 on first close. Institutional pricing is scoped individually.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  // Public pages are light — same force-light pattern the other public routes use.
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
        {/* ── FOLD — treatment A, base (§4) ─────────────────────────────────
            Two columns from 900px, same asymmetric split class as the
            homepage hero: the promise reads at its capped measure on the
            left, the reference-line specimen sits beside it. */}
        <section style={{ background: G_BASE }}>
          <div
            className="pub-hero"
            style={{
              maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 96px",
              display: "grid", alignItems: "center", gap: "48px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <Eyebrow>Pricing</Eyebrow>
              <h1
                className="pub-display"
                style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "16ch" }}
              >
                A fixed fee, tied to one event.
              </h1>
              <p
                style={{
                  fontFamily: DOC, fontSize: "21px", lineHeight: 1.5, color: INK_2,
                  maxWidth: MEASURE, margin: 0,
                }}
              >
                Fees never scale with round size, page count, or storage volume.
              </p>
              <Prose>
                You use the product free until your first close. That raise carries
                a fee of USD 499. Nothing else is metered.
              </Prose>
              <div style={{ marginTop: "8px" }}>
                <Action to="/sign-up" search={{ role: "founder" }}>Start free</Action>
              </div>
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
        </section>

        {/* ── FEE SCHEDULE — treatment C, recessed ───────────────────────────
            This page's one load-bearing instrument — same role the closing
            pipeline plays on /. */}
        <Section ground={G_RECESSED}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Fee / Schedule</Eyebrow>
            <Title>One fee, one event</Title>
            <Prose>
              Most platforms in this category bill by consumption. Pages examined,
              documents stored, seats occupied, a percentage of the round. Each of
              those meters grows when your deal gets harder, which is exactly when
              you can least afford it.
            </Prose>
            <Prose>
              We charge a flat fee tied to a triggering event — the same
              whether your round is USD 500,000 or USD 5,000,000.
            </Prose>
            <Prose>
              <strong style={{ color: INK, fontWeight: 600 }}>
                Rule 20.1 — fees never scale with round size, page count, or
                storage volume.
              </strong>{" "}
              This is written into the document that governs what we build, not
              into a pricing page we can quietly revise.
            </Prose>
          </div>

          <Instrument
            label="Fee schedule · Effective 17 August 2026"
            head={["Tier", "Who it is for", "Fee", "Basis"]}
            align={[2]}
            rows={[
              [
                <strong style={{ fontWeight: 600 }}>Direct</strong>,
                "A founder raising up to USD 250,000",
                "USD 499",
                "Once, on first close",
              ],
              [
                <strong style={{ fontWeight: 600 }}>Standard</strong>,
                "A founder raising USD 250,000 – 5,000,000",
                "USD 799",
                "Per month, active raise only",
              ],
              [
                <strong style={{ fontWeight: 600 }}>Deploying seat</strong>,
                "An investor deploying capital",
                "USD 3,999",
                "Per seat, per year",
              ],
              [
                <strong style={{ fontWeight: 600 }}>Institutional</strong>,
                "A fund or family office",
                "Scoped individually",
                "hello@lengdon.com",
              ],
            ]}
            caption={
              <>
                Direct is free until your first close. The first 100 organisations
                pay nothing on that first close — the fee is waived once, and does
                not transfer if the organisation changes hands.
              </>
            }
          />
        </Section>

        {/* ── TRIGGERING EVENTS — treatment A, base ──────────────────────────
            Second supporting instrument; alternates off recessed, same
            pattern as the homepage's founder-controls section. */}
        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Institutional / Scope</Eyebrow>
            <Title>Why institutional pricing isn&rsquo;t published</Title>
            <Prose>
              An institutional buyer&rsquo;s requirements vary by fund size, seat
              count, and how many raises they run at once. A single published
              number would be wrong for most of them.
            </Prose>
            <Prose>
              So we scope it in a conversation instead of guessing at a price that
              fits everyone. That conversation covers what you need confirmed
              before you sign, and what determines where you land.
            </Prose>
            <Prose>Write to hello@lengdon.com to start it.</Prose>
          </div>

          <Instrument
            label="Triggering events"
            head={["Event", "Fee", "Not charged"]}
            align={[1]}
            rows={[
              ["First close, Direct tier", "USD 499", "Rounds that do not close"],
              ["Active raise, Standard tier", "USD 799 monthly", "Months with no active raise"],
              ["Seat, deploying tier", "USD 3,999 yearly", "Seats left unassigned"],
              ["Institutional agreement", "Scoped individually", "Documents, storage, pages, AI calls"],
            ]}
            caption="Nothing in the right-hand column is ever billed."
          />
        </Section>

        {/* ── PROVENANCE — treatment B, panel ─────────────────────────────────
            Identical content to the homepage's provenance table; same
            ground, deliberately, for cross-page consistency. */}
        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Method / Provenance</Eyebrow>
            <Title>Why the founder pays</Title>
            <Prose>
              Fundraising infrastructure should answer to the founder using it. If
              investors paid for this product, it would slowly become a product
              that serves investors.
            </Prose>
            <Prose>
              So the founder pays, and we sell nothing else. We do not sell your
              data. We do not take a percentage of your round. We do not
              introduce you to anyone for a fee.
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

        {/* ── CLOSE — treatment A, base ────────────────────────────────────── */}
        <Section ground={G_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Start / Direct tier</Eyebrow>
            <Title>Start on the Direct tier</Title>
            <Prose>No card, no trial clock.</Prose>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
              <Action to="/sign-up" search={{ role: "founder" }}>Start free</Action>
              <Action to="/contact" variant="secondary">Book a 30-minute scoping call</Action>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
