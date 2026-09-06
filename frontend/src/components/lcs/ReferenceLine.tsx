// Component 11 — Reference line. CLAUDE.md §8.4/DESIGN.md §5: the signature
// element. Monospace, accent colour, 2px left rule in accent, uppercase
// muted caption beneath naming the object type and its key date.
//
// Absent refNo → renders null, never a placeholder or empty-but-occupying
// element (reference numbering does not exist on every table yet — see
// CLAUDE.md §20.6/§8.4). When it ships, call sites light up with zero
// further UI work. Same contract as the retired components/v2/ReferenceLine.

import { cn } from "@/lib/utils";

export interface LcsReferenceLineProps {
  /** The full reference, e.g. "ATLS01-ROM-2026-000042-31". Absent → renders null. */
  refNo?: string | null;
  /** Uppercase caption beneath, e.g. "Deal room · opened 14 March 2026". */
  caption?: string | null;
  className?: string;
}

export function LcsReferenceLine({ refNo, caption, className }: LcsReferenceLineProps) {
  if (!refNo || !refNo.trim()) return null;

  return (
    <div
      className={cn("border-inline-start-2 ps-3 leading-tight", className)}
      style={{ borderInlineStart: "2px solid var(--lcs-accent)", paddingInlineStart: "12px" }}
    >
      <span
        dir="ltr"
        className="block"
        style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-accent)", fontSize: "13px", letterSpacing: "0.04em", lineHeight: 1.7, unicodeBidi: "isolate" }}
      >
        {refNo}
      </span>
      {caption && caption.trim() && (
        <span
          className="block uppercase"
          style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)", fontSize: "11.5px", letterSpacing: "0.09em" }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
