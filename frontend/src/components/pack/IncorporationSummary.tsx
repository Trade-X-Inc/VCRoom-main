import { incorporationSummaryLines } from "@/lib/pack/incorporation-form";

// Read view of a saved incorporation value: labelled lines, never JSON. Every value is rendered as React text.
export function IncorporationSummary({ value }: { value: unknown }) {
  const lines = incorporationSummaryLines(value);
  if (lines.length === 0) return null;
  return (
    <dl
      className="grid gap-x-6 gap-y-2 m-0 grid-cols-1 sm:grid-cols-[minmax(0,14rem)_1fr]"
      aria-label="Saved incorporation details"
    >
      {lines.map((l) => (
        <div key={l.label} className="contents">
          <dt
            style={{
              fontFamily: "var(--font-lcs-ui)",
              fontSize: 12,
              color: "var(--lcs-ink-muted)",
            }}
          >
            {l.label}
          </dt>
          <dd
            className="m-0"
            style={{
              fontFamily: "var(--font-lcs-ui)",
              fontSize: 14,
              color: "var(--lcs-ink)",
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
            }}
          >
            {l.text}
          </dd>
        </div>
      ))}
    </dl>
  );
}
