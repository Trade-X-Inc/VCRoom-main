import type { ReactNode } from "react";

/** Component 03 — Page header. Title, optional one-line description, optional
 * single primary action. Nothing else: no breadcrumbs, no stat tiles, no tabs
 * baked in. At most one primary button — a second action is secondary or
 * lives elsewhere. First element inside the content region, flush with its
 * padding. RTL: title/description use logical start alignment (default
 * block flow — no explicit left/right positioning to mirror). */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex items-start justify-between gap-6 pb-6 mb-6"
      style={{ borderBottom: "1px solid var(--lcs-line)" }}
    >
      <div className="min-w-0">
        <h1
          className="text-[24px] font-semibold truncate"
          style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-[14px] mt-1"
            style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
