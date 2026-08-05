// ReferenceLine — the signature element (DESIGN.md §5).
//
// Monospace, accent colour, 2px left rule in accent, with an uppercase muted
// caption beneath naming the object type and its key date. This composition is
// the one thing a user remembers about the interface and what a partner cites
// in an email — it must look identical everywhere it appears.
//
// CRITICAL (confirmed against the DB, 5 Aug 2026): reference numbering does not
// yet exist on deal_rooms / documents / document_requests (0 reference columns).
// So on the documents group TODAY this component renders NOTHING. That is by
// design: when refNo is absent it returns null — never a placeholder, never a
// "—", never an empty-but-occupying element. When reference numbering ships, the
// same call sites light up with zero further UI work.
//
// Canonical forms stay LTR under RTL (§10.2): the number is wrapped dir="ltr"
// with unicode-bidi isolate. The check digit is shown, never hidden (§5).

import { cn } from "@/lib/utils";

export interface ReferenceLineProps {
  /** The full reference, e.g. "ATLS01-ROM-2026-000042-31". Absent → renders null. */
  refNo?: string | null;
  /** Uppercase caption beneath, e.g. "Deal room · opened 14 March 2026". */
  caption?: string | null;
  className?: string;
}

export function ReferenceLine({ refNo, caption, className }: ReferenceLineProps) {
  // Absent reference number → render nothing at all (see header note).
  if (!refNo || !refNo.trim()) return null;

  return (
    <div
      className={cn(
        "border-inline-start-2 ps-3 leading-tight",
        className,
      )}
      style={{ borderInlineStart: "2px solid var(--v2-accent)", paddingInlineStart: "12px" }}
    >
      <span
        dir="ltr"
        className="block font-v2-data text-v2-accent"
        style={{ fontSize: "13px", letterSpacing: "0.04em", lineHeight: 1.7, unicodeBidi: "isolate" }}
      >
        {refNo}
      </span>
      {caption && caption.trim() && (
        <span
          className="block font-v2-ui text-v2-ink-muted uppercase"
          style={{ fontSize: "11.5px", letterSpacing: "0.09em" }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
