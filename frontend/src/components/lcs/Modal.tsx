import { type ReactNode, useEffect } from "react";

/** Component 10 — Modal / slide-over. Header (task name only, no icon, no
 * close-X decoration beyond what's needed) · body (context line + form
 * field(s)) · footer (right-aligned: secondary/cancel, then the task's
 * primary/destructive action, in that order). Slide-over variant: same
 * anatomy, anchored to the inline-end edge, full-height, for longer
 * single-task flows. RTL: slide-over anchors to inline-end (right in LTR,
 * left in RTL), not hardcoded to the physical right edge.
 *
 * Responsive, added 1 Sep 2026 (see PRIMITIVES.md's "Responsive" section
 * for the full rationale): below `sm` (640px), centered and slide-over
 * render identically — full viewport, no margin, no max-width, same
 * header/body/footer anatomy. The two variants' visual distinction only
 * reads at a width where there's room for either affordance to look like
 * what it's named; at full-viewport width a "slide-over" is visually
 * indistinguishable from "centered" full-screen, so collapsing them here
 * is the correct simplification, not a compromise. */

export function LcsModal({
  title,
  children,
  footer,
  onClose,
  variant = "centered",
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  variant?: "centered" | "slide-over";
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isSlideOver = variant === "slide-over";

  return (
    <div
      className={`fixed inset-0 z-50 flex p-0 ${isSlideOver ? "justify-end" : "sm:items-center sm:justify-center sm:p-6"}`}
      style={{ background: "rgba(26,26,25,0.4)" }}
      onClick={onClose}
    >
      {/* Below sm (640px), both variants collapse to an identical
          full-viewport sheet — see this file's header comment. Above sm,
          each variant's own width/height/border behavior is unchanged. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-[var(--lcs-white)] flex flex-col w-full h-full sm:h-auto ${
          isSlideOver ? "sm:w-full sm:max-w-[420px] sm:h-full" : "sm:max-w-[440px] sm:border"
        }`}
        style={{ borderColor: isSlideOver ? undefined : "var(--lcs-line)" }}
      >
        <div
          className="h-11 flex items-center px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--lcs-line)" }}
        >
          <h2
            className="text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
          >
            {title}
          </h2>
        </div>
        <div className="p-4 flex flex-col gap-4 overflow-auto flex-1">{children}</div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--lcs-line)" }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}
