// V2EmptyState — DESIGN.md §7.3: a single sentence naming what would appear
// here and one primary action. No illustration, ever (§13 Prohibitions).
//
// This is the v2 replacement for the v1 illustrated EmptyState
// (components/system/EmptyState.tsx). Deliberately narrower props than the
// v1 component — no `kind`/`description`, since §7.3 specifies exactly one
// sentence, not a title+description pair, and no illustration variants to
// select between.

import { V2Button } from "./Button";

export interface V2EmptyStateProps {
  /** The single sentence naming what would appear here. */
  text: string;
  /** One primary action, if any. Omit for a genuinely actionless empty state. */
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function V2EmptyState({ text, action, className }: V2EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <p className="font-v2-ui text-v2-ink-secondary" style={{ fontSize: "13.5px", margin: 0 }}>
        {text}
      </p>
      {action &&
        (action.href ? (
          <a href={action.href}>
            <V2Button variant="secondary">{action.label}</V2Button>
          </a>
        ) : (
          <V2Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </V2Button>
        ))}
    </div>
  );
}
