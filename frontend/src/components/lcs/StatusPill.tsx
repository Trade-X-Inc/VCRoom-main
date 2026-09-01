/** Component 05 — Status pill. Dot + label, never colour alone.
 * Exactly four semantic states: Pending (neutral gray), In progress
 * (accent blue), Satisfied (green), Attention (amber). No other status
 * colour anywhere in the system — CLAUDE.md §0 amendment, 1 Sep 2026. */

export type LcsStatus = "pending" | "in-progress" | "satisfied" | "attention";

const LABEL: Record<LcsStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  satisfied: "Satisfied",
  attention: "Attention",
};

const TONE: Record<LcsStatus, { fg: string; wash: string }> = {
  pending: { fg: "var(--lcs-pending)", wash: "var(--lcs-pending-wash)" },
  "in-progress": { fg: "var(--lcs-progress)", wash: "var(--lcs-progress-wash)" },
  satisfied: { fg: "var(--lcs-satisfied)", wash: "var(--lcs-satisfied-wash)" },
  attention: { fg: "var(--lcs-attention)", wash: "var(--lcs-attention-wash)" },
};

export function StatusPill({ status, label }: { status: LcsStatus; label?: string }) {
  const tone = TONE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] shrink-0"
      style={{
        fontFamily: "var(--font-lcs-ui)",
        color: tone.fg,
        background: tone.wash,
        borderRadius: "var(--radius-lcs-control)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full shrink-0"
        style={{ background: tone.fg }}
      />
      {label ?? LABEL[status]}
    </span>
  );
}
