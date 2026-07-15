import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { color, font, space } from "@/lib/design-tokens";

/**
 * The page pattern (CLAUDE.md §9, Layout):
 * [Breadcrumb 12px] → [H1 Syne 28px + one-line description] →
 * [actions top-right] → [content]. Full-width to 1360px, 32px padding,
 * never a narrow centered column.
 */
export interface PageFrameCrumb {
  label: string;
  to?: string;
}

/**
 * Breadcrumb strip alone — for pages with their own header/scroll
 * architecture that can't adopt the full PageFrame wrapper. Drop this
 * above the page's existing header instead.
 */
export function PageBreadcrumb({ items }: { items: PageFrameCrumb[] }) {
  if (!items.length) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: font.body,
        fontSize: 12,
        fontWeight: 500,
        color: color.inkTertiary,
        marginBottom: 12,
      }}
    >
      {items.map((crumb, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <ChevronRight style={{ width: 12, height: 12 }} />}
          {crumb.to ? (
            <Link to={crumb.to as any} style={{ color: color.inkTertiary }} className="hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function PageFrame({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: {
  breadcrumb?: PageFrameCrumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        maxWidth: space.contentMaxWidth,
        margin: "0 auto",
        width: "100%",
        padding: space.page,
      }}
    >
      {breadcrumb && <PageBreadcrumb items={breadcrumb} />}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: space.block,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: font.display,
              fontSize: 28,
              fontWeight: 700,
              color: color.ink,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {description && (
            <div
              style={{
                fontFamily: font.body,
                fontSize: 13,
                fontWeight: 400,
                color: color.inkSecondary,
                marginTop: 4,
              }}
            >
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
