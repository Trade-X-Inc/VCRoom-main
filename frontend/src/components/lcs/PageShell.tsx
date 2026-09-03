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
 * direction, not baked into this shell.
 *
 * Responsive, added 1 Sep 2026 (see PRIMITIVES.md's "Responsive" section
 * for the full rationale — a real spec, confirmed before building, not
 * inherited from the PDF): below `md` (768px) the sidebar stops reserving
 * permanent width and becomes an off-canvas drawer, closed by default,
 * opened via a hamburger button that appears in the top bar only at this
 * width. The desktop expand/collapse toggle and its localStorage
 * persistence are untouched above 768px — the drawer is a separate mode,
 * not a third state of the same toggle. */

const SIDEBAR_KEY = "lcs-sidebar-collapsed";

export function LcsPageShell({
  sidebar,
  searchPlaceholder = "Search",
  userInitials,
  userLabel,
  onSearchOpen,
  headerExtra,
  notificationSlot,
  userMenuSlot,
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
  /** Optional slot rendered in the top bar, between search and the user
   * menu. Added 1 Sep 2026 for the sector-layer restructure's role
   * switcher (Founder/Investor/Advisor) — deliberately a generic named
   * slot, not a role-specific prop, since LcsPageShell is a shared
   * Component System primitive used by every LCS screen (including
   * lcs-preview.tsx, which has no concept of a viewer role at all). The
   * shell stays feature-agnostic; callers own what goes in the slot. */
  headerExtra?: ReactNode;
  /** Optional real notification affordance, added for the Group 3 AppShell
   * adoption (3 Sep 2026). The shell's own notification glyph (below) is a
   * static, non-interactive placeholder — every existing LCS screen passes
   * neither prop and gets that placeholder unchanged, so this is additive
   * only. When supplied, replaces the placeholder glyph entirely rather
   * than rendering both (a real NotificationBell next to a decorative fake
   * one would be a visible, confusing duplication, not a composition). */
  notificationSlot?: ReactNode;
  /** Optional real account/user menu, same rationale and same additive
   * guarantee as notificationSlot. */
  userMenuSlot?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* private-window / storage blocked — default to expanded */
    }
  }, []);

  // Escape closes the drawer, same pattern as Modal's own Escape handler
  // — keyboard users have no other way to dismiss an overlay drawer once
  // opened, since the scrim click-to-close only works for a mouse.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

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

  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto">
        {typeof sidebar === "function" ? sidebar(collapsed) : sidebar}
      </div>
      <button
        type="button"
        onClick={toggle}
        className="h-9 hidden md:flex items-center px-3 text-[12px] shrink-0"
        style={{
          color: "var(--lcs-ink-muted)",
          borderTop: "1px solid var(--lcs-line)",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        {collapsed ? "»" : "« Collapse"}
      </button>
    </>
  );

  return (
    <div
      className="flex w-full min-h-screen"
      style={{ background: "var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}
    >
      {/* Desktop sidebar (>= md) — unchanged expand/collapse behavior,
          hidden entirely below md in favor of the drawer rendered further
          down. See PRIMITIVES.md's "Responsive" section: the drawer is a
          separate mode below 768px, not a third state of this toggle. */}
      <aside
        className="shrink-0 hidden md:flex flex-col justify-between"
        style={{
          width: collapsed ? 52 : 200,
          background: "var(--lcs-surface)",
          borderInlineEnd: "1px solid var(--lcs-line)",
          transition: "width 150ms",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer (< md) — off-canvas, closed by default, opened via
          the hamburger button in the top bar. Always rendered at full
          200px width (never the collapsed icon rail — collapse is a
          desktop density optimization that doesn't apply once the sidebar
          isn't permanently occupying screen space). */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(26,26,25,0.4)" }}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="relative flex flex-col justify-between h-full"
            style={{
              width: 200,
              background: "var(--lcs-surface)",
              borderInlineEnd: "1px solid var(--lcs-line)",
            }}
          >
            <div className="flex-1 overflow-y-auto" onClick={() => setDrawerOpen(false)}>
              {typeof sidebar === "function" ? sidebar(false) : sidebar}
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-12 flex items-center gap-4 px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--lcs-line)" }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="md:hidden shrink-0 size-8 flex items-center justify-center text-[16px]"
            style={{ color: "var(--lcs-ink)" }}
          >
            {/* The search button below needs `min-w-0` (not just `flex-1`)
                to actually shrink at narrow widths — a flex item's default
                min-width is its content's intrinsic width, not 0, so
                without it the button refuses to shrink past that and
                overflows the header once headerExtra is populated (found
                live, checkpoint 4, at 375px with the role switcher
                present: hamburger + search + switcher + user block
                together exceeded viewport width). `truncate` on the
                placeholder text only works once the button can actually
                shrink below its content's natural width. */}
            <span aria-hidden="true">☰</span>
          </button>
          <button
            type="button"
            onClick={onSearchOpen}
            className="flex-1 min-w-0 max-w-[420px] flex items-center gap-2 h-8 px-3 text-start"
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
              className="text-[11px] shrink-0 hidden sm:inline"
              style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
            >
              ⌘K
            </span>
          </button>
          {headerExtra && <div className="ms-auto shrink-0">{headerExtra}</div>}
          <div className={headerExtra ? "flex items-center gap-3 shrink-0" : "ms-auto flex items-center gap-3 shrink-0"}>
            {notificationSlot ?? (
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
            )}
            {userMenuSlot ?? (
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
            )}
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
