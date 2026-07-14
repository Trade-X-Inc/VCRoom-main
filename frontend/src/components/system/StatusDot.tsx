import { status as statusColor } from "@/lib/design-tokens";

export type StatusTone = keyof typeof statusColor; // positive | warning | negative | neutral

/**
 * The dot system. Status is never a colored pill background — it is a 6px
 * dot beside an 11px uppercase ink label. The only semantic color in the app.
 *
 *   <StatusDot tone="positive" label="Verified" />
 */
export function StatusDot({
  tone,
  label,
  className = "",
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#0A0A0B",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: statusColor[tone],
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
