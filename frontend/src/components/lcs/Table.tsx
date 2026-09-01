import { type ReactNode, useState } from "react";

/** Component 04 — Table / list row. Text or status-pill columns, mono
 * reference codes right where the eye scans first, hover state, expandable
 * row. Row height 34px, hairline dividers between rows, no divider under the
 * header (header sits on a tinted band). Hover is a subtle tint only — no
 * border or shadow change. RTL: uses logical text-align (start), not
 * hardcoded left/right; a numeric column stays end-aligned in both
 * directions (tabular figures, not mirrored). */

export function LcsTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full border-collapse" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      {children}
    </table>
  );
}

export function LcsTableHead({ children }: { children: ReactNode }) {
  return (
    <thead style={{ background: "var(--lcs-surface)" }}>
      <tr>{children}</tr>
    </thead>
  );
}

export function LcsTh({
  children,
  numeric = false,
}: {
  children: ReactNode;
  numeric?: boolean;
}) {
  return (
    <th
      className={`h-[34px] px-3 text-[11px] font-medium uppercase tracking-wide ${
        numeric ? "text-end" : "text-start"
      }`}
      style={{ color: "var(--lcs-ink-muted)", letterSpacing: "0.04em" }}
    >
      {children}
    </th>
  );
}

export function LcsTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function LcsTr({
  children,
  onClick,
  expandable = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  expandable?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={onClick || expandable ? "cursor-pointer" : ""}
      style={{
        borderBottom: "1px solid var(--lcs-line)",
        transition: "background-color 120ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "var(--lcs-surface)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
      }}
    >
      {children}
    </tr>
  );
}

export function LcsTd({
  children,
  numeric = false,
  mono = false,
}: {
  children: ReactNode;
  numeric?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={`h-[34px] px-3 text-[13px] ${numeric ? "text-end" : "text-start"}`}
      style={{
        color: "var(--lcs-ink)",
        fontFamily: mono || numeric ? "var(--font-lcs-data)" : "var(--font-lcs-ui)",
      }}
    >
      {children}
    </td>
  );
}

/** Expandable row pair: a clickable summary row plus a detail strip that
 * shows only when expanded, indented to align under the second column. */
export function LcsExpandableRow({
  summary,
  detail,
  colSpan,
}: {
  summary: ReactNode;
  detail: ReactNode;
  colSpan: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LcsTr onClick={() => setOpen((o) => !o)} expandable>
        {summary}
      </LcsTr>
      {open && (
        <tr style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
          <td colSpan={colSpan} className="ps-8 pe-3 py-2.5">
            <div
              className="text-[13px] flex flex-wrap gap-x-6 gap-y-1"
              style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)" }}
            >
              {detail}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
