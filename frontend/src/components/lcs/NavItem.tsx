import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/** Component 02 — Sidebar nav item. Default / hover / active, plus a
 * nested/grouped variant. Icon 14px square, outline only, no fill —
 * placeholder until a real icon set is supplied, monochrome, consistent
 * stroke weight. Active = filled background + 2px inline-start rule in
 * accent + accent-stroked icon + medium-weight label. Only one item active
 * at a time. Nested: sub-items indent under a parent, connected by a
 * hairline rule, no icon; the parent is a group label when it has
 * children, not a clickable page. RTL: the active rule uses
 * border-inline-start (mirrors automatically), icons render via the
 * caller-supplied glyph, never inferred left/right positioning. */

export function LcsNavItem({
  to,
  label,
  icon,
  children,
  active = false,
  collapsed = false,
}: {
  to: string;
  /** Plain-text label. Always required, even when `icon` is set — used as
   * the visible text when expanded (unless `children` overrides it) AND as
   * the accessible name when collapsed. A collapsed rail showing only a
   * bare icon glyph with no `aria-label` is a real accessibility defect,
   * not a cosmetic one — found live on first build (7 unlabeled links in
   * the accessibility tree once the sidebar collapsed to icon-only). */
  label: string;
  icon?: ReactNode;
  children?: ReactNode;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      to={to as never}
      aria-label={collapsed ? label : undefined}
      className="flex items-center gap-2.5 h-8 px-2 text-[13px] transition-colors"
      style={{
        fontFamily: "var(--font-lcs-ui)",
        fontWeight: active ? 500 : 400,
        color: active ? "var(--lcs-accent)" : "var(--lcs-ink)",
        background: active ? "var(--lcs-progress-wash)" : "transparent",
        borderInlineStart: active ? "2px solid var(--lcs-accent)" : "2px solid transparent",
        justifyContent: collapsed ? "center" : "flex-start",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--lcs-surface)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
      }}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="shrink-0 size-3.5 flex items-center justify-center"
          style={{ color: active ? "var(--lcs-accent)" : "var(--lcs-ink-muted)" }}
        >
          {icon}
        </span>
      )}
      {!collapsed && <span className="truncate">{children ?? label}</span>}
    </Link>
  );
}

/** Grouped/nested variant: a non-clickable parent label with indented
 * children connected by a hairline start-border. */
export function LcsNavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        className="h-8 flex items-center px-2 text-[13px]"
        style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
      >
        {label}
      </div>
      <div className="flex flex-col ps-4" style={{ borderInlineStart: "1px solid var(--lcs-line)" }}>
        {children}
      </div>
    </div>
  );
}

export function LcsNavSubItem({
  to,
  children,
  active = false,
}: {
  to: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to as never}
      className="h-7 flex items-center px-2 text-[13px] transition-colors"
      style={{
        fontFamily: "var(--font-lcs-ui)",
        fontWeight: active ? 500 : 400,
        color: active ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
        background: active ? "var(--lcs-progress-wash)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}
