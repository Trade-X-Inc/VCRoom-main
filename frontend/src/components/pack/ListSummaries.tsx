import { teamSummaryRows } from "@/lib/pack/team-form";

// Read views of saved Team and Cap table values: labelled text, never JSON. Every value is rendered as React text.
const cell: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 14,
  color: "var(--lcs-ink)",
  overflowWrap: "anywhere",
};
const head: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--lcs-ink-muted)",
  textAlign: "left",
};

export function TeamSummary({ value }: { value: unknown }) {
  const rows = teamSummaryRows(value);
  if (rows.length === 0) return null;
  return (
    <ol
      className="m-0 p-0 list-none flex flex-col gap-3"
      aria-label="Saved team"
    >
      {rows.map((r, i) => (
        <li
          key={i}
          className="flex flex-col gap-0.5 p-3"
          style={{ border: "1px solid var(--lcs-line)" }}
        >
          <span style={{ ...cell, fontWeight: 600 }}>{r.name}</span>
          <span style={cell}>{r.role}</span>
          <span
            style={{ ...cell, color: "var(--lcs-ink-muted)", fontSize: 13 }}
          >
            {r.flags}
          </span>
          {r.linkedin && (
            <span style={{ ...cell, fontSize: 13 }}>
              LinkedIn: {r.linkedin}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
