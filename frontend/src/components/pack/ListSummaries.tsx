import {
  capSummaryRows,
  capTotal,
  capRowsFromValue,
} from "@/lib/pack/cap-table-form";
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

export function CapTableSummary({ value }: { value: unknown }) {
  const rows = capSummaryRows(value);
  if (rows.length === 0) return null;
  const total = capTotal(capRowsFromValue(value));
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          aria-label="Saved cap table"
          style={{ minWidth: 520 }}
        >
          <thead>
            <tr>
              {[
                "Holder",
                "Holder is a",
                "Holder type",
                "Ownership",
                "Share class",
                "Shares",
              ].map((h) => (
                <th key={h} scope="col" style={{ ...head, padding: "4px 8px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--lcs-line)" }}>
                <th
                  scope="row"
                  style={{
                    ...cell,
                    fontWeight: 600,
                    textAlign: "left",
                    padding: "6px 8px",
                  }}
                >
                  {r.holder}
                </th>
                <td style={{ ...cell, padding: "6px 8px" }}>{r.kind}</td>
                <td style={{ ...cell, padding: "6px 8px" }}>{r.type}</td>
                <td style={{ ...cell, padding: "6px 8px" }}>{r.ownership}</td>
                <td style={{ ...cell, padding: "6px 8px" }}>{r.shareClass}</td>
                <td style={{ ...cell, padding: "6px 8px" }}>{r.shares}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span
        style={{
          fontFamily: "var(--font-lcs-ui)",
          fontSize: 12,
          color:
            total.state === "ok"
              ? "var(--lcs-ink-muted)"
              : "var(--lcs-attention)",
        }}
      >
        {total.text}
      </span>
    </div>
  );
}
