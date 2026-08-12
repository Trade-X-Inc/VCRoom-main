// V2PageHeader — the title/breadcrumb/actions block from DESIGN.md §4.4's
// layout frame, in v2 typography (Archivo, --text-lg 19px page titles).
// This is the v2-native replacement for v1's PageFrame (Syne 28px) — do not
// reuse PageFrame on a v2 surface, it repaints nothing on its own but pulls
// in the v1 type/color token module.

import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface V2Crumb {
  label: string;
  to?: string;
}

export function V2PageHeader({
  breadcrumb,
  title,
  description,
  actions,
}: {
  breadcrumb?: V2Crumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "24px" }}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div
          className="font-v2-ui text-v2-ink-muted"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", marginBottom: "8px" }}
        >
          {breadcrumb.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {i > 0 && <ChevronRight style={{ width: 11, height: 11 }} />}
              {crumb.to ? (
                <Link to={crumb.to as any} className="hover:underline text-v2-ink-muted">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="font-v2-ui text-v2-ink" style={{ fontSize: "19px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.35, margin: 0 }}>
            {title}
          </h1>
          {description && (
            <div className="font-v2-ui text-v2-ink-secondary" style={{ fontSize: "12.5px", marginTop: "4px" }}>
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
