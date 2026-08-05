// LedgerTable — the primary component (DESIGN.md §6.1).
//
// Real <table> semantics (§11 accessibility floor). Composable parts so screens
// build their own columns while the geometry stays canonical:
//   LedgerTable      the <table> wrapper (font-v2-ui, tabular-nums)
//   LedgerHead       <thead> — header row is --text-xs uppercase muted,
//                    1.5px bottom rule in --v2-ink
//   Th               a header cell; `numeric` right-aligns (§6.1)
//   LedgerBody       <tbody>
//   Tr               a body row — 36px, 1px --v2-rule-light separator, no zebra.
//                    hover → --v2-accent-wash. `selected` adds a 2px accent left
//                    rule + wash. `status` adds a 3px semantic left rule (§6.1/§7)
//                    — status colour is NEVER the only signal, so the row must
//                    also carry a text label in its status column (caller's job).
//   Td               a body cell; `numeric` right-aligns with tabular figures.
//
// No shadows, 2px radius only where a container needs it (the table itself is
// ruled, not boxed). Motion on row insert/remove/status is the caller's via the
// §9 tokens; this component does not animate on its own.

import { cn } from "@/lib/utils";

type Semantic = "satisfied" | "attention" | "adverse";

const STATUS_RULE: Record<Semantic, string> = {
  satisfied: "var(--v2-satisfied)",
  attention: "var(--v2-attention)",
  adverse: "var(--v2-adverse)",
};

export function LedgerTable({ className, ...rest }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse font-v2-ui text-v2-ink", className)}
      style={{ fontVariantNumeric: "tabular-nums", fontSize: "13.5px" }}
      {...rest}
    />
  );
}

export function LedgerHead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function Th({
  numeric, className, style, children, ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn("font-v2-ui font-medium uppercase text-v2-ink-muted", className)}
      style={{
        textAlign: numeric ? "end" : "start",
        fontSize: "11px",
        letterSpacing: "0.09em",
        lineHeight: 1.45,
        padding: "0 16px 8px 0",
        borderBottom: "1.5px solid var(--v2-ink)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </th>
  );
}

export function LedgerBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  status?: Semantic;
}

export function Tr({ selected, status, className, style, children, ...rest }: TrProps) {
  const leftRule = status
    ? `3px solid ${STATUS_RULE[status]}`
    : selected
    ? "2px solid var(--v2-accent)"
    : "2px solid transparent"; // reserve the space so rows don't shift on select

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-v2-accent-wash",
        selected && "bg-v2-accent-wash",
        className,
      )}
      style={{
        borderBottom: "1px solid var(--v2-rule-light)",
        borderInlineStart: leftRule,
        ...style,
      }}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function Td({
  numeric, className, style, children, ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(numeric && "font-v2-data", className)}
      style={{
        height: "36px",
        textAlign: numeric ? "end" : "start",
        padding: "8px 16px",
        color: "var(--v2-ink-secondary)",
        ...(numeric ? { fontVariantNumeric: "tabular-nums", fontSize: "12px" } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </td>
  );
}
