import { Illustration, type IllustrationName } from "./Illustration";
import { HsButton } from "./Button";

/**
 * The one way to render an empty / loading / error / no-results state.
 * Copy rule: `title` max 1 short sentence. No apology, no explanation.
 *
 *   <EmptyState kind="empty" title="No deal rooms yet"
 *               action={{ label: "Create", onClick: ... }} />
 */
export function EmptyState({
  kind,
  title,
  action,
  className,
}: {
  kind: IllustrationName;
  title: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <Illustration name={kind} />
      <div
        style={{
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: "rgba(0,0,0,0.35)",
        }}
      >
        {title}
      </div>
      {action &&
        (action.href ? (
          <a href={action.href}>
            <HsButton variant="ghost">{action.label}</HsButton>
          </a>
        ) : (
          <HsButton variant="ghost" onClick={action.onClick}>
            {action.label}
          </HsButton>
        ))}
    </div>
  );
}
