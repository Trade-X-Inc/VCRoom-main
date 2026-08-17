import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /pricing — the first page built under PUBLIC-REGISTER.md.
//
// The published fee schedule is a PRODUCT DECISION recorded in the Foundation
// Document (§20.3/§20.4 as amended 17 Aug 2026), not database state. This page
// therefore states the figures directly and no longer reads plan_limits.
//
// plan_limits still holds the older six-tier subscription model and drives the
// in-app billing screen. The two disagree, and reconciling them is a product
// decision plus a migration, not a copy fix. Logged in CLAUDE.md §20.2 as
// BLOCKING: it must be closed before any paid signup is enabled.
//
// Deleted in this rebuild, deliberately: the founder/investor toggle (the
// amended tiers are not split by audience), CostComparisonTable (an unsourced
// comparative claim about third-party costs — Foundation §3.8), the 1.5%
// success fee (§20.4 as amended prohibits percentages outright), "Most
// popular" badges, "Contact us", Roast-badge pricing, and the feature-
// checkmark grid.
// ─────────────────────────────────────────────────────────────────────────────

// Public register type scale (PUBLIC-REGISTER.md §3.2). Kept local rather than
// promoted to global CSS vars: the public scale governs public pages only, and
// global tokens would risk leaking 16px prose into the 13.5px application.
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

/** Section separator — the register's primary structural device (§3.5.1). */
function Rule() {
  return <hr style={{ border: 0, borderTop: `1px solid ${RULE}`, margin: 0 }} />;
}

/**
 * Instrument block — a real table at APPLICATION density (§3.4).
 * 13.5px, 36px rows, 1.5px ink header rule, no zebra, tabular figures.
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

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hockystick" },
      {
        name: "description",
        content:
          "A fixed fee tied to one event. Direct is USD 499 on first close. Institutional runs USD 25,000–120,000 annually, scoped in a call.",
      },
    ],
    links: [{ rel: "canonical", href: "https://hockystick.app/pricing" }],
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
        {/* ── FOLD — one promise, one action, one specimen (§4.1) ───────────
            Two columns from 900px: the promise reads at its capped measure on
            the left, the specimen sits beside it rather than beneath. Below
            that width they stack, promise first. */}
        <section
          className="pub-fold"
          style={{ display: "grid", gap: "40px", alignItems: "start" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <Label>Pricing</Label>
            <h1
              style={{
                fontFamily: UI, fontSize: "40px", lineHeight: 1.15, fontWeight: 700,
                letterSpacing: "-0.02em", color: INK, margin: 0, maxWidth: "18ch",
              }}
            >
              A fixed fee, tied to one event.
            </h1>
            <p
              style={{
                fontFamily: DOC, fontSize: "19px", lineHeight: 1.5, color: INK_2,
                maxWidth: MEASURE, margin: 0,
              }}
            >
              Fees never scale with round size, page count, or storage volume.
            </p>
            <Prose>
              You use the product free until your first close. That raise carries a fee
              of USD 499. Nothing else is metered.
            </Prose>
            <div style={{ marginTop: "4px" }}>
              <Action to="/sign-up" search={{ role: "founder" }}>Start free</Action>
            </div>
          </div>

          {/* Reference-line specimen — the proof-of-artifact device (§3.3). */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ borderInlineStart: `2px solid ${ACCENT}`, paddingInlineStart: "12px" }}>
              <div
                dir="ltr"
                style={{
                  fontFamily: DATA, fontSize: "13px", lineHeight: 1.7, color: ACCENT,
                  unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums",
                }}
              >
                ATLS01-ROM-2026-000042-31
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
              Every object carries a reference number with a check digit. Read one aloud
              and a mistake shows immediately.
            </Caption>
          </div>
        </section>

        <Rule />

        {/* ── PROSE 1 — the principle ──────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>One fee, one event</Title>
          <Prose>
            Most platforms in this category bill by consumption. Pages examined,
            documents stored, seats occupied, a percentage of the round. Each of those
            meters grows when your deal gets harder, which is exactly when you can least
            afford it.
          </Prose>
          <Prose>
            We charge a flat fee tied to a triggering event. The fee is the same whether
            your round is USD 500,000 or USD 5,000,000. It is the same whether your data
            room holds forty documents or four hundred.
          </Prose>
          <Prose>
            <strong style={{ color: INK, fontWeight: 600 }}>
              Rule 20.1 — fees never scale with round size, page count, or storage
              volume.
            </strong>{" "}
            This is written into the document that governs what we build, not into a
            pricing page we can quietly revise.
          </Prose>
        </section>

        {/* ── INSTRUMENT 1 — the fee schedule ──────────────────────────────── */}
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
              "USD 400 – 800",
              "Per month, active raise only",
            ],
            [
              <strong style={{ fontWeight: 600 }}>Deploying seat</strong>,
              "An investor deploying capital",
              "USD 2,500 – 6,000",
              "Per seat, per year",
            ],
            [
              <strong style={{ fontWeight: 600 }}>Institutional</strong>,
              "A fund or family office",
              "USD 25,000 – 120,000",
              "Annually, scoped in a 30-minute call",
            ],
          ]}
          caption={
            <>
              Direct is free until your first close. The first 100 organisations pay
              nothing on that first close — the fee is waived once, and does not transfer
              if the organisation changes hands.
            </>
          }
        />

        <Rule />

        {/* ── PROSE 2 — why the institutional tier is a range ──────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Why the institutional tier is a range</Title>
          <Prose>
            A fixed institutional number would be wrong in one of two directions. It
            would overcharge a two-partner family office, or undercharge a fund deploying
            across forty positions a year. Both mistakes are worse than a conversation.
          </Prose>
          <Prose>
            So we publish the band and tell you what determines your position in it: how
            many seats you need, how many concurrent raises you run, and whether you want
            the schedule adapted to your own diligence process.
          </Prose>
          <Prose>
            That conversation takes thirty minutes. We do not require it before showing
            you the price, which is the part most of this category gets backwards.
          </Prose>
        </section>

        {/* ── INSTRUMENT 2 — triggering events ─────────────────────────────── */}
        <Instrument
          label="Triggering events"
          head={["Event", "Fee", "Not charged"]}
          align={[1]}
          rows={[
            ["First close, Direct tier", "USD 499", "Rounds that do not close"],
            ["Active raise, Standard tier", "USD 400 – 800 monthly", "Months with no active raise"],
            ["Seat, deploying tier", "USD 2,500 – 6,000 yearly", "Seats left unassigned"],
            ["Institutional agreement", "USD 25,000 – 120,000 yearly", "Documents, storage, pages, AI calls"],
          ]}
          caption="Nothing in the right-hand column is ever billed."
        />

        <Rule />

        {/* ── PROSE 3 — why the founder pays ───────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Why the founder pays</Title>
          <Prose>
            Fundraising infrastructure should answer to the founder using it. If
            investors paid for this product, it would slowly become a product that serves
            investors.
          </Prose>
          <Prose>
            So the founder pays, and we sell nothing else. We do not sell your data. We
            do not take a percentage of your round. We do not introduce you to anyone for
            a fee.
          </Prose>
        </section>

        {/* ── INSTRUMENT 3 — mechanism provenance ──────────────────────────────
            FLAGGED FOR RECONSIDERATION: once /how-it-works exists, provenance may
            belong there rather than competing with the fee schedule for attention
            on this page. Kept here for now because it answers "why trust you with a
            five-figure commitment", which is a pricing-page question. */}
        <Instrument
          label="Where the mechanisms come from"
          head={["Mechanism", "Origin"]}
          rows={[
            ["Single-notice diligence", <>Documentary credit examination — <span style={{ fontFamily: DATA, fontSize: "12px" }}>UCP 600</span></>],
            ["The conditions register", "Secured lending practice"],
            ["The evidence ladder", "Insurance underwriting practice"],
            ["Soft-circle tracking", "Syndicate practice"],
            ["The check digit", <><span style={{ fontFamily: DATA, fontSize: "12px" }}>ISO 7064 MOD 97-10</span> — the IBAN algorithm</>],
          ]}
          caption="We adopt established process and name its source. Each of these is checkable against its own standard."
        />

        <Rule />

        {/* ── CLOSE ────────────────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Title>Start on the Direct tier</Title>
          <Prose>No card, no trial clock.</Prose>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
            <Action to="/sign-up" search={{ role: "founder" }}>Start free</Action>
            <Action to="/contact" variant="secondary">Book a 30-minute scoping call</Action>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
