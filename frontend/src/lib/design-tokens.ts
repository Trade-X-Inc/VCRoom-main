/**
 * Hockystick design tokens — the single source of truth.
 *
 * Design law (see CLAUDE.md §9): pure white, one theme, purple only as a
 * gradient, whitespace as the design, minimal text, small institutional type.
 * If a value isn't in this file, it isn't in the design system.
 */

// ── Color ─────────────────────────────────────────────────────────────────────

export const color = {
  /** Page background. The only background inside /app/*. */
  white: "#FFFFFF",
  /** Primary text. Near-black ink. */
  ink: "#0A0A0B",
  /** Secondary text — labels, muted copy. */
  ink35: "rgba(0,0,0,0.35)",
  /** Tertiary text — placeholders, disabled. */
  ink25: "rgba(0,0,0,0.25)",
  /** Hairline dividers. The only allowed border color. */
  hairline: "rgba(0,0,0,0.06)",
  /** Ghost-button border. */
  inkBorder: "rgba(0,0,0,0.08)",
  /** Hover wash for interactive rows. */
  wash: "rgba(0,0,0,0.02)",
} as const;

/**
 * THE Hockystick purple. Never flat — always this gradient.
 * Flat #7C3AED is banned everywhere except the gradient stops themselves.
 */
export const gradient = {
  brand: "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
  /** Hover state: same hue, slightly deepened. */
  brandHover: "linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)",
  /** Stops, for SVG defs and canvas contexts that can't take CSS gradients. */
  from: "#7C3AED",
  to: "#6366F1",
} as const;

/**
 * Status is never a colored pill background — it is a 6px dot next to an
 * 11px uppercase ink label (the dot system). These are the only semantic
 * colors in the app. Buttons never use them.
 */
export const status = {
  positive: "#10B981", // verified, complete, live
  warning: "#F59E0B", // pending, flagged, expiring
  negative: "#EF4444", // failed, declined, expired
  neutral: "rgba(0,0,0,0.25)", // inactive, draft, empty
} as const;

// ── Typography — small, precise, quiet ───────────────────────────────────────

export const font = {
  display: "'Syne', sans-serif",
  body: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;

export const type = {
  /** Page/section headings. Everything is smaller than you think. */
  heading: {
    fontFamily: font.display,
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: color.ink,
  },
  /** Section labels — 11px uppercase, wide tracking, muted. */
  label: {
    fontFamily: font.body,
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: color.ink35,
  },
  body: {
    fontFamily: font.body,
    fontSize: "13px",
    fontWeight: 400,
    color: color.ink,
  },
  /** Data values — same size as body, heavier. */
  value: {
    fontFamily: font.body,
    fontSize: "13px",
    fontWeight: 600,
    color: color.ink,
  },
  muted: {
    fontFamily: font.body,
    fontSize: "12px",
    fontWeight: 400,
    color: color.ink35,
  },
} as const;

// ── Space — ma (間). The whitespace IS the aesthetic. ────────────────────────

export const space = {
  /** Page padding: 48 desktop / 24 mobile. */
  page: 48,
  pageMobile: 24,
  /** Between major sections. */
  section: 48,
  /** Card internal padding. */
  card: 24,
  /** Between cards. */
  gap: 16,
} as const;

// ── Shape ─────────────────────────────────────────────────────────────────────

export const radius = {
  /** Buttons and inputs only. */
  control: 8,
  /** Cards have no radius, no border, no shadow — whitespace defines them. */
  card: 0,
} as const;

// ── Copy rules (enforced by review, encoded here for reference) ──────────────
// Label: max 2 words · Description: max 1 sentence · Button: max 3 words ·
// Error: max 1 sentence. If you need more words, you need a better design.
