import { type ReactNode } from "react";

/** Component 13 — Page container. Fixes the scattered width problem found in
 * the Step A dashboard IA recon: ~50 route files each independently
 * hardcoded their own max-w-* + mx-auto on their page root, with no shared
 * convention and no institutional-density reasoning — values ranged from
 * max-w-sm (384px) to max-w-[1600px], most commonly max-w-[1360px]. This is
 * NOT a fix at the shell level: LcsPageShell's own content wrapper
 * (<main><div className="p-6">{children}</div></main>) already has no cap —
 * a prior fix already found and removed a hardcoded 1120px cap there. The
 * narrowness was never structural; it was ~50 independent per-page choices.
 *
 * Four width tiers, not one value — a single number would either starve
 * data-dense screens or leave form-shaped screens looking broken on a wide
 * desktop:
 *   - "wide"     1600px — table/data-dense screens (deal-room documents,
 *                 investor deal-flow lists). Institutional density, not a
 *                 blog column. Matches the one pre-existing outlier
 *                 (app.investor.deal-flow.tsx) that had already reached
 *                 this value independently.
 *   - "standard" 1360px — the DEFAULT. The emergent consensus value: ~25 of
 *                 the ~50 pre-existing per-page widths were already at or
 *                 near this number before this primitive existed. Most
 *                 dashboard pages belong here.
 *   - "narrow"   960px  — genuinely single-column form/confirm shapes (a
 *                 settings tab, a modal-adjacent page) where wide-open
 *                 whitespace either side would look unfinished, not
 *                 spacious.
 *   - "full"     none   — single-purpose utility screens that intentionally
 *                 fill the shell (library.tsx's own standalone layout is
 *                 the reference case).
 *
 * Migration note for existing pages: map each page's CURRENT max-w-* value
 * to the nearest tier as a literal value-preserving swap first (zero visual
 * regression) — do not re-tune values to "what they should probably be" in
 * the same pass. Unifying the actual widths within a tier (so every
 * "standard" page is genuinely 1360px, not 1024/896/672 relabelled) is a
 * second, separate, explicitly-reviewed pass. See PAGE_PATTERNS.md.
 */

const WIDTHS: Record<"wide" | "standard" | "narrow" | "full", string | undefined> = {
  wide: "1600px",
  standard: "1360px",
  narrow: "960px",
  full: undefined,
};

export function LcsPageContainer({
  width = "standard",
  children,
}: {
  width?: "wide" | "standard" | "narrow" | "full";
  children: ReactNode;
}) {
  const maxWidth = WIDTHS[width];
  return (
    <div className="mx-auto w-full" style={maxWidth ? { maxWidth } : undefined}>
      {children}
    </div>
  );
}
