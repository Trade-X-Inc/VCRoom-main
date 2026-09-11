import { type ReactNode, useState } from "react";

/** Component 04 — Table / list row. Text or status-pill columns, mono
 * reference codes right where the eye scans first, hover state, expandable
 * row. Row height 34px, hairline dividers between rows, no divider under the
 * header (header sits on a tinted band). Hover is a subtle tint only — no
 * border or shadow change. RTL: uses logical text-align (start), not
 * hardcoded left/right; a numeric column stays end-aligned in both
 * directions (tabular figures, not mirrored).
 *
 * Responsive, added 1 Sep 2026 (see PRIMITIVES.md's "Responsive" section
 * for the full rationale): below `md` (768px), LcsTable's wrapper scrolls
 * horizontally instead of reflowing into stacked cards — every table in
 * this build has a small, independently-scannable, directly-comparable
 * column set, and stacking would destroy that. LcsTh/LcsTd's first-column
 * variant (`sticky`) stays visible during that scroll, so row identity is
 * never lost. Callers mark their first column with `sticky` on both the
 * LcsTh and every LcsTd in that position — the primitive can't infer which
 * column is "first" from inside a plain `<tr>` composition. */

export function LcsTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontFamily: "var(--font-lcs-ui)" }}>
        {children}
      </table>
    </div>
  );
}

export function LcsTableHead({ children }: { children: ReactNode }) {
  return (
    <thead style={{ background: "var(--lcs-surface)" }}>
      <tr>{children}</tr>
    </thead>
  );
}

export function LcsTh({
  children,
  numeric = false,
  sticky = false,
}: {
  children: ReactNode;
  numeric?: boolean;
  /** Marks this as the table's frozen first column below `md` (768px) —
   * see this file's header comment. Only meaningful below md; above it,
   * the table doesn't scroll horizontally, so sticky positioning has no
   * visible effect and is left on unconditionally rather than gated on a
   * media query in JS (a CSS-only concern, cheaper and SSR-safe). */
  sticky?: boolean;
}) {
  return (
    <th
      className={`h-[34px] px-3 text-[11px] font-medium uppercase tracking-wide ${
        numeric ? "text-end" : "text-start"
      } ${sticky ? "sticky z-10" : ""}`}
      style={{
        color: "var(--lcs-ink-muted)",
        letterSpacing: "0.04em",
        background: sticky ? "var(--lcs-surface)" : undefined,
        // Logical property via inline style, matching this codebase's
        // existing convention (PageShell's borderInlineEnd, NavItem's
        // borderInlineStart) rather than a Tailwind utility class.
        ...(sticky ? { insetInlineStart: 0 } : {}),
      }}
    >
      {children}
    </th>
  );
}

export function LcsTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function LcsTr({
  children,
  onClick,
  expandable = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  expandable?: boolean;
}) {
  const interactive = !!onClick || expandable;
  return (
    <tr
      onClick={onClick}
      // A clickable <tr> with only a mouse handler is invisible to
      // keyboard/screen-reader users — found live on first build (the row
      // rendered as plain, non-interactive StaticText in the accessibility
      // tree, same class of defect as the earlier collapsed-nav-link
      // missing-aria-label bug). role="button" + tabIndex + Enter/Space
      // handling makes the row a real interactive control when it has a
      // click handler, matching the "no meaning conveyed by icon/mouse-only
      // interaction alone" rule this build is held to.
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={interactive ? "cursor-pointer" : ""}
      style={{
        borderBottom: "1px solid var(--lcs-line)",
        transition: "background-color 120ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--lcs-surface)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
      }}
    >
      {children}
    </tr>
  );
}

export function LcsTd({
  children,
  numeric = false,
  mono = false,
  sticky = false,
}: {
  children: ReactNode;
  numeric?: boolean;
  mono?: boolean;
  /** Marks this as the table's frozen first column below `md` — see
   * LcsTable's header comment. Needs its own opaque background to occlude
   * scrolling content behind it; this means a sticky cell doesn't pick up
   * LcsTr's own hover tint (which is set directly on the <tr>, invisible
   * behind an opaque sticky <td>) — a known, accepted cosmetic gap rather
   * than plumbing hover state through props for a purely visual polish
   * item. */
  sticky?: boolean;
}) {
  return (
    <td
      className={`h-[34px] px-3 text-[13px] ${numeric ? "text-end" : "text-start"} ${sticky ? "sticky z-10" : ""}`}
      style={{
        color: "var(--lcs-ink)",
        fontFamily: mono || numeric ? "var(--font-lcs-data)" : "var(--font-lcs-ui)",
        background: sticky ? "var(--lcs-white)" : undefined,
        ...(sticky ? { insetInlineStart: 0 } : {}),
      }}
    >
      {children}
    </td>
  );
}

/** Expandable row pair: a clickable summary row plus a detail strip that
 * shows only when expanded, indented to align under the second column. */
export function LcsExpandableRow({
  summary,
  detail,
  colSpan,
}: {
  summary: ReactNode;
  detail: ReactNode;
  colSpan: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LcsTr onClick={() => setOpen((o) => !o)} expandable>
        {summary}
      </LcsTr>
      {open && (
        <tr style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
          <td colSpan={colSpan} className="ps-8 pe-3 py-2.5">
            <div
              className="text-[13px] flex flex-wrap gap-x-6 gap-y-1"
              style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)" }}
            >
              {detail}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
