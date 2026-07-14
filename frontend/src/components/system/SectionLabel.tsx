/**
 * Section label — 11px uppercase, wide tracking, muted ink. Max 2 words.
 * Every section on every page starts with one of these.
 */
export function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </div>
  );
}
