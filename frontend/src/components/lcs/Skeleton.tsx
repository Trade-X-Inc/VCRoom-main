// Component 12 — Skeleton. Static muted block matching real content
// geometry, per the same standard as the retired components/v2/Skeleton
// (DESIGN.md §7.3 lineage: skeleton rows matching real table geometry, no
// spinners on anything under 400ms, no shimmer sweep).

import { cn } from "@/lib/utils";

export function LcsSkeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(className)}
      style={{ background: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)", ...style }}
    />
  );
}

/** A block of skeleton rows matching LcsTable's row geometry. */
export function LcsSkeletonRows({ rows = 4, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4"
          style={{ height: "36px", borderBottom: "1px solid var(--lcs-line)", padding: "0 16px" }}
        >
          {Array.from({ length: columns }).map((_, j) => (
            <LcsSkeleton key={j} style={{ height: "12px", width: j === 0 ? "40%" : "20%" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
