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

// SEO-012 Phase 1 — mini stage-strip, a compact horizontal reduction of
// product.how-it-works.tsx's seven-stage timeline for use on /for/* pages.
// Not a duplicate of that page's hero-weight diagram: this is a supporting
// element (60% visual weight), dots-and-rule rather than numbered badges,
// no per-stage prose. `activeFrom` marks the audience's real entry point
// into the sequence (e.g. an investor-side audience enters at "NDA", not
// "Brief" — they never see the founder's pre-NDA brief/present stages).
export const PR_STAGES = ["Brief", "Present", "NDA", "Diligence", "Terms", "Conditions", "Close"] as const;
export type PrStageName = (typeof PR_STAGES)[number];

export function PrStageStrip({
  label,
  activeFrom,
  leadStages,
}: {
  label: string;
  activeFrom: PrStageName;
  leadStages?: PrStageName[];
}) {
  const startIdx = PR_STAGES.indexOf(activeFrom);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <span style={{ fontFamily: PR_DATA, fontSize: "11px", fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: PR_INK_3 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        {PR_STAGES.map((stage, i) => {
          const active = i >= startIdx;
          const isLead = leadStages?.includes(stage);
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", flex: i < PR_STAGES.length - 1 ? "1 1 0%" : "0 0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative" }}>
                <div
                  style={{
                    width: "9px", height: "9px", borderRadius: "50%",
                    background: active ? PR_ACCENT : "transparent",
                    border: `1.5px solid ${active ? PR_ACCENT : PR_RULE}`,
                  }}
                />
                <span style={{ fontFamily: PR_UI, fontSize: "10px", color: active ? PR_INK_2 : PR_INK_3, whiteSpace: "nowrap" }}>
                  {stage}
                </span>
                {isLead && (
                  <span style={{ position: "absolute", top: "-18px", fontFamily: PR_DATA, fontSize: "9px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: PR_ACCENT }}>
                    Lead
                  </span>
                )}
              </div>
              {i < PR_STAGES.length - 1 && (
                <div style={{ flex: 1, height: "1px", background: i >= startIdx ? PR_ACCENT : PR_RULE, margin: "0 4px 18px" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// SEO-012 Phase 1 — supporting benefit-card grid. Same bordered-panel/
// icon-slot/header/body pattern as product.security.tsx's pillar grid,
// generalized into a shared primitive rather than re-derived per page.
// Icons are inline SVG only (no external assets, no emoji, per the task's
// content rules), 20x20, single-color, stroke-based, --v2-ink or --v2-accent.
export function PrCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ background: PR_PANEL, border: `1px solid ${PR_RULE}`, padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ width: "20px", height: "20px", color: PR_ACCENT }}>{icon}</div>
      <span style={{ fontFamily: PR_UI, fontWeight: 500, fontSize: "15px", color: PR_INK }}>{title}</span>
      <span style={{ fontFamily: PR_DOC, fontSize: "14px", lineHeight: 1.55, color: PR_INK_2 }}>{body}</span>
    </div>
  );
}

export function PrCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "1px", background: PR_RULE, border: `1px solid ${PR_RULE}` }}>
      {children}
    </div>
  );
}

// Minimal inline-SVG icon set for PrCard — single-color, 2px stroke,
// 20x20 viewBox, no fills, matching Phase 2's sector-icon convention.
export function PrIconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" />
      <path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

export function PrIconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10.5l3.5 3.5L16 5" />
    </svg>
  );
}

export function PrIconFile() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h6l3 3v11H6z" />
      <path d="M12 3v3h3" />
    </svg>
  );
}

export function PrIconTimer() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" />
      <path d="M10 8v3.5l2.2 1.3" />
      <path d="M8 2.5h4" />
    </svg>
  );
}

export function PrIconLayers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3l7 3.5L10 10 3 6.5z" />
      <path d="M3 10l7 3.5L17 10" />
      <path d="M3 13.5l7 3.5 7-3.5" />
    </svg>
  );
}

export function PrIconEye() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5z" />
      <circle cx="10" cy="10" r="2" />
    </svg>
  );
}

export function PrIconShield() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5l6.5 2.5v4.5c0 4-2.7 6.8-6.5 8-3.8-1.2-6.5-4-6.5-8V5z" />
    </svg>
  );
}

export function PrIconLink() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 12l4-4" />
      <path d="M9 6.5l1-1a3 3 0 0 1 4.2 4.2l-1 1" />
      <path d="M11 13.5l-1 1a3 3 0 0 1-4.2-4.2l1-1" />
    </svg>
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
      {/* SEO-016: no gate/stage count in public copy — qualitative vocabulary only. */}
      <PrQuietLink to="/product/how-it-works">The closing sequence</PrQuietLink>
      <PrQuietLink to="/product/pricing">Pricing</PrQuietLink>
      <PrQuietLink to={founderTo ?? "/for/founders"}>The founder side</PrQuietLink>
    </div>
  );
}
