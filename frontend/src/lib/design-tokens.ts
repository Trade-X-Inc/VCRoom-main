/**
 * Hockystick design tokens — the single source of truth.
 *
 * Design law (see CLAUDE.md §9, "the Design Constitution"): flat brand violet
 * used sparingly, 0px radius on structural elements, borders over shadows,
 * dense institutional layout (Cloudflare/Stripe/Linear reference).
 * If a value isn't in this file, it isn't in the design system.
 */

// ── Color ─────────────────────────────────────────────────────────────────────

export const color = {
  /** App canvas background. */
  canvas: "#FAFAFA",
  /** Card/panel background. */
  white: "#FFFFFF",
  /** Primary text. Near-black ink. */
  ink: "#0A0A0B",
  /** Secondary text — never lighter than this for body copy. */
  inkSecondary: "#52525B",
  /** Tertiary text — labels, captions. WCAG AA floor; never go lighter on white. */
  inkTertiary: "#71717A",
  /** The ONLY divider style. 1px solid. */
  border: "#E4E4E7",
} as const;

/**
 * THE Hockystick brand color. Flat, not a gradient.
 * Used ONLY for: primary buttons, active nav indicator, links, focus rings,
 * key data accents. Never as a section background inside the app.
 */
export const brand = {
  flat: "#7C3AED",
  /** Hover state. */
  hover: "#6D28D9",
} as const;

/**
 * Status chips: 2px radius, 12px text, AA-compliant contrast.
 * Replaces the old dot-only system — chips are the sanctioned pattern now.
 */
export const status = {
  positive: "#10B981", // verified, complete, live
  warning: "#F59E0B", // pending, flagged, expiring
  negative: "#EF4444", // failed, declined, expired
  neutral: "#71717A", // inactive, draft, empty
} as const;

// ── Typography — Syne display, DM Sans UI/body ────────────────────────────────

export const font = {
  display: "'Syne', sans-serif",
  body: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
} as const;

export const type = {
  /** Page H1. */
  heading: {
    fontFamily: font.display,
    fontSize: "28px",
    fontWeight: 700,
    color: color.ink,
  },
  /** Section labels. */
  label: {
    fontFamily: font.body,
    fontSize: "12px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: color.inkTertiary,
  },
  body: {
    fontFamily: font.body,
    fontSize: "14px",
    fontWeight: 400,
    color: color.ink,
  },
  /** Data values — same size as body, heavier. */
  value: {
    fontFamily: font.body,
    fontSize: "14px",
    fontWeight: 600,
    color: color.ink,
  },
  /** Secondary/description copy — never lighter than this. */
  secondary: {
    fontFamily: font.body,
    fontSize: "13px",
    fontWeight: 400,
    color: color.inkSecondary,
  },
  /** Table cell text — 13px floor per §9.1. */
  tableCell: {
    fontFamily: font.body,
    fontSize: "13px",
    fontWeight: 400,
    color: color.ink,
  },
} as const;

// ── Space ─────────────────────────────────────────────────────────────────────

export const space = {
  /** App content padding, minimum. */
  page: 32,
  /** Between blocks. */
  block: 24,
  /** Between sections. */
  section: 48,
  /** Content area max-width. */
  contentMaxWidth: 1360,
} as const;

// ── Shape ─────────────────────────────────────────────────────────────────────

export const radius = {
  /** 0px on all structural elements — cards, panels, containers. */
  structural: 0,
  /** Buttons, inputs, chips. Max 2px. */
  control: 2,
} as const;

// ── Elevation — borders define hierarchy, not shadows ─────────────────────────

export const elevation = {
  none: "none",
  /** Max allowed shadow, for floating elements only (dropdowns/popovers). */
  max: "0 1px 2px rgba(0,0,0,0.04)",
} as const;

// ── Table ─────────────────────────────────────────────────────────────────────

export const table = {
  rowHeight: 44,
  rowBorder: `1px solid ${color.border}`,
} as const;

// ── Button ────────────────────────────────────────────────────────────────────

export const button = {
  height: 36,
} as const;

// ── Copy rules (enforced by review, encoded here for reference) ──────────────
// Label: short and specific · Description: one sentence · Button: max 3 words ·
// Error: one sentence stating what happened and how to fix it.
