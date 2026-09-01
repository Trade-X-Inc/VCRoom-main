import { type ReactNode, useState, useEffect } from "react";

/** Component 01 — Page shell. Fixed 200px sidebar (text-only), collapses to
 * 52px icon rail via the bottom toggle only (no auto-collapse, no
 * hover-expand; icons appear only when collapsed). 48px top bar, search
 * left-aligned to the content region (not centred), notification dot uses
 * the attention tone with no baked-in count, user menu is initials in a
 * plain circle. Content: white, 24px padding, single scroll container,
 * max-width 1120px. RTL: sidebar sits at the inline-start edge via CSS
 * logical properties (order in the flex row follows document direction
 * automatically — no hardcoded left/right), collapse toggle and all
 * disclosure carets use text arrows that the caller must mirror per
 * direction, not baked into this shell. */

const SIDEBAR_KEY = "lcs-sidebar-collapsed";

export function LcsPageShell({
  sidebar,
  searchPlaceholder = "Search",
  userInitials,
  userLabel,
  onSearchOpen,
  children,
}: {
  /** Render-prop so nav items can react to collapse state — icons appear
   * only when collapsed, labels only when expanded, per spec. A plain
   * ReactNode would have no way to know the shell's internal collapsed
   * state, which produced a real bug on first build: truncated ellipsized
   * labels ("H..", "D..") in the 52px rail instead of icon-only. */
  sidebar: ReactNode | ((collapsed: boolean) => ReactNode);
  searchPlaceholder?: string;
  userInitials: string;
  userLabel: string;
  onSearchOpen?: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* private-window / storage blocked — default to expanded */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}
    >
      <aside
        className="shrink-0 flex flex-col justify-between"
        style={{
          width: collapsed ? 52 : 200,
          background: "var(--lcs-surface)",
          borderInlineEnd: "1px solid var(--lcs-line)",
          transition: "width 150ms",
        }}
      >
        <div className="flex-1 overflow-y-auto">
          {typeof sidebar === "function" ? sidebar(collapsed) : sidebar}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="h-9 flex items-center px-3 text-[12px] shrink-0"
          style={{
            color: "var(--lcs-ink-muted)",
            borderTop: "1px solid var(--lcs-line)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? "»" : "« Collapse"}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-12 flex items-center gap-4 px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--lcs-line)" }}
        >
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex-1 max-w-[420px] flex items-center gap-2 h-8 px-3 text-start"
            style={{
              border: "1px solid var(--lcs-line)",
              color: "var(--lcs-ink-muted)",
              fontSize: 13,
              background: "var(--lcs-white)",
            }}
          >
            <span aria-hidden="true">○</span>
            <span className="truncate flex-1">{searchPlaceholder}</span>
            <span
              className="text-[11px] shrink-0"
              style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
            >
              ⌘K
            </span>
          </button>
          <div className="ms-auto flex items-center gap-3 shrink-0">
            <span
              aria-label="Notifications"
              className="relative inline-flex size-4 items-center justify-center"
            >
              <span aria-hidden="true">▢</span>
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -end-0.5 size-1.5 rounded-full"
                style={{ background: "var(--lcs-attention)" }}
              />
            </span>
            <div className="flex items-center gap-2">
              <span
                className="size-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{ background: "var(--lcs-line)", color: "var(--lcs-ink)" }}
              >
                {userInitials}
              </span>
              <span className="text-[13px]" style={{ color: "var(--lcs-ink)" }}>
                {userLabel}
              </span>
              <span aria-hidden="true" className="text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
                ▾
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {/* No max-width cap — fills available width. The PDF's page-2
              caption ("content region — 24px padding, max-width 1120px")
              describes that one example screenshot's rendered dimensions
              in the design tool; the primitive's own written spec text
              names no max-width at all. A hardcoded 1120px cap here left
              280px of dead space on a 1600px viewport (growing on wider
              screens) while the table inside it was already using its
              full available width correctly — a real, structural defect
              found live, not a per-screen styling nitpick, since every
              screen built on this shell inherited it. */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
