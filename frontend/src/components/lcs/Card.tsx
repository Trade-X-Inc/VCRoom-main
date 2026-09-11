import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/** Component 06 — Card / section container. Header (title + optional count +
 * optional "View all") · body holds a table or list directly, no inner
 * padding, hairline dividers. Chrome — 1px border, flat, no shadow, no
 * rounding beyond a hairline. */

const viewAllLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontWeight: 500,
  color: "var(--lcs-accent)",
  fontSize: 13,
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

export function LcsCard({
  title,
  count,
  viewAllHref,
  onViewAll,
  children,
}: {
  title: ReactNode;
  count?: number;
  viewAllHref?: string;
  onViewAll?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border" style={{ borderColor: "var(--lcs-line)" }}>
      <div
        className="h-[42px] flex items-center justify-between gap-3 px-3"
        style={{ borderBottom: "1px solid var(--lcs-line)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[14px] font-semibold truncate"
            style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
          >
            {title}
          </span>
          {typeof count === "number" && (
            <span
              className="text-[12px] px-1.5 border shrink-0"
              style={{
                fontFamily: "var(--font-lcs-data)",
                color: "var(--lcs-ink-muted)",
                borderColor: "var(--lcs-line)",
              }}
            >
              {count}
            </span>
          )}
        </div>
        {viewAllHref ? (
          <Link to={viewAllHref as never} style={viewAllLinkStyle} className="shrink-0">
            View all
          </Link>
        ) : onViewAll ? (
          <button type="button" onClick={onViewAll} style={viewAllLinkStyle} className="shrink-0">
            View all
          </button>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}
