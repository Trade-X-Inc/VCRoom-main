// V2Skeleton — DESIGN.md §7.3: "skeleton rows matching the real table
// geometry. No spinners on anything under 400ms." §9 permits no loading
// animation beyond skeletons themselves, so this is a static muted block,
// not a spinner or shimmer sweep.

import { cn } from "@/lib/utils";

export function V2Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("bg-v2-rule-light", className)}
      style={{ borderRadius: "var(--v2-radius)", ...style }}
    />
  );
}

/** A block of skeleton rows matching LedgerTable's 36px row geometry. */
export function V2SkeletonRows({ rows = 4, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4"
          style={{ height: "36px", borderBottom: "1px solid var(--v2-rule-light)", padding: "0 16px" }}
        >
          {Array.from({ length: columns }).map((_, j) => (
            <V2Skeleton key={j} style={{ height: "12px", width: j === 0 ? "40%" : "20%" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
