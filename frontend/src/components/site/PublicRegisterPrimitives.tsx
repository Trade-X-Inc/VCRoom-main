import { Link } from "@tanstack/react-router";

// SEO-006 — purely-presentational primitives for the PUBLIC-REGISTER.md
// v2.0 token system, extracted for the 8 investor-audience page rewrite.
// Modeled directly on SolutionAudiencePage.tsx's already-correct,
// already-verified token usage (that component was built for the same 8
// audiences under the prior /solutions/* effort — its routes are gone,
// but its token plumbing was right and is reused here rather than
// re-derived). This is NOT SimpleAudiencePage — no page shell, no props
// contract, no shared layout. Each of the 8 route files assembles its own
// section order and writes its own copy; only this low-level typography
// and layout plumbing is shared, the same pattern PageHero already
// establishes for the rest of the public site.

export const PR_UI = "var(--font-v2-ui)";
export const PR_DOC = "var(--font-v2-doc)";
export const PR_DATA = "var(--font-v2-data)";

export const PR_INK = "var(--v2-ink)";
export const PR_INK_2 = "var(--v2-ink-secondary)";
export const PR_INK_3 = "var(--v2-ink-muted)";
export const PR_RULE = "var(--v2-rule)";
export const PR_ACCENT = "var(--v2-accent)";
export const PR_ACCENT_WASH = "var(--v2-accent-wash)";

export const PR_BASE = "var(--pub-n-06)";
export const PR_PANEL = "var(--pub-n-00)";
export const PR_RECESSED = "var(--pub-n-09)";

const SHELL = "72rem";
const MEASURE = "34rem";

export function PrEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: PR_DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
        letterSpacing: "0.09em", textTransform: "uppercase", color: PR_INK_3, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

export function PrPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block", padding: "4px 8px", background: PR_ACCENT_WASH,
        color: PR_ACCENT, fontFamily: PR_DATA, fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

export function PrDisplay({ children, maxWidth = "18ch" }: { children: React.ReactNode; maxWidth?: string }) {
  return (
    <h1 className="pub-display" style={{ fontFamily: PR_UI, color: PR_INK, margin: 0, maxWidth }}>
      {children}
    </h1>
  );
}

export function PrTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pub-title" style={{ fontFamily: PR_UI, color: PR_INK, margin: 0 }}>
      {children}
    </h2>
  );
}

export function PrLead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: PR_DOC, fontSize: "21px", lineHeight: 1.5, color: PR_INK_2, maxWidth: MEASURE, margin: 0 }}>
      {children}
    </p>
  );
}

export function PrProse({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: PR_DOC, fontSize: "17px", lineHeight: 1.65, color: PR_INK_2, maxWidth: MEASURE, margin: 0 }}>
      {children}
    </p>
  );
}

export function PrAction({ to, search, children, variant = "primary" }: {
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
        fontFamily: PR_UI, fontSize: "14px", fontWeight: 500,
        background: primary ? PR_ACCENT : "transparent",
        color: primary ? "#FFFFFF" : PR_INK,
        border: primary ? `1px solid ${PR_ACCENT}` : `1px solid ${PR_RULE}`,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export function PrQuietLink({ to, search, children }: { to: string; search?: Record<string, unknown>; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      search={search as any}
      style={{
        fontFamily: PR_UI, fontSize: "13px", color: PR_INK_2,
        textDecoration: "underline", textUnderlineOffset: "3px",
      }}
    >
      {children}
    </Link>
  );
}

export function PrSection({ ground, children }: { ground: string; children: React.ReactNode }) {
  return (
    <section style={{ background: ground }}>
      <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        {children}
      </div>
    </section>
  );
}

// The commercial line — tier name plus real billing cadence, never a
// dollar figure. Every pricing tier currently shows "—" on the live
// /product/pricing page during beta (verified live, 27 Sep 2026); citing
// either of two previously-superseded number sets would be a fabricated
// figure not on the actual published page. Renders as a single labeled
// fact, matching the evidence-indicator convention (DESIGN.md §6.4) —
// a plain statement, never framed as a KPI or a stat tile.
export function PrCommercialLine({ tier, cadence }: { tier: string; cadence: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderInlineStart: `2px solid ${PR_ACCENT}`, paddingInlineStart: "16px" }}>
      <span style={{ fontFamily: PR_DATA, fontSize: "13px", color: PR_ACCENT, letterSpacing: "0.02em" }}>{tier}</span>
      <span style={{ fontFamily: PR_UI, fontSize: "14px", color: PR_INK_2 }}>{cadence}</span>
    </div>
  );
}

// Cross-link row — how-it-works / pricing / the other side of the deal,
// present on every page per the task spec. A relevant tool link is
// embedded inline in each page's own Mechanism prose instead of repeated
// here, matching this codebase's established inline-link convention for
// tool cross-references (see for.founders.tsx, resources.index.tsx, etc.)
// rather than a second, separate link list.
export function PrCrossLinks({ founderTo }: { founderTo?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
      {/* SEO-011: "six-gate" -> "seven-stage", matching product.how-it-works.tsx's rewritten vocabulary. */}
      <PrQuietLink to="/product/how-it-works">The seven-stage sequence</PrQuietLink>
      <PrQuietLink to="/product/pricing">Pricing</PrQuietLink>
      <PrQuietLink to={founderTo ?? "/for/founders"}>The founder side</PrQuietLink>
    </div>
  );
}
