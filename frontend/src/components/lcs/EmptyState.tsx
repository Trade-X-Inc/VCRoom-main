import type { ReactNode } from "react";

/** Component 07 — Empty state. One plain sentence naming what would appear.
 * No illustration, no mascot, no filler graphic. A single optional link or
 * button, only if there's somewhere useful to send the user. */

export function LcsEmptyState({
  title,
  text,
  action,
}: {
  title?: ReactNode;
  text: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="border p-8 flex flex-col items-start gap-2"
      style={{ borderColor: "var(--lcs-line)" }}
    >
      {title && (
        <div
          className="text-[14px] font-semibold"
          style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
        >
          {title}
        </div>
      )}
      <p
        className="text-[14px]"
        style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)" }}
      >
        {text}
      </p>
      {action}
    </div>
  );
}
