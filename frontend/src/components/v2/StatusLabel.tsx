// StatusLabel — semantic status as a text label + colour, NEVER colour alone
// (DESIGN.md §2.5 / §7.2 / §11). Readable in greyscale, by a colour-blind user,
// and on a printed page. Semantic colour never fills a large area (§2.4): this
// is small text with an optional inline dot, not a banner.
//
// The word set is closed (§7.2) — these are the ONLY status words in the app.
// A genuinely new state is a decision about which of the four groups it joins,
// not a new word. The `tone` prop picks the group; the label text is passed by
// the caller but should come from the §7.2 vocabulary.
//
//   satisfied  Satisfied · Accepted · Closed · Signed · Preferred · Complete
//   attention  Awaiting · Outstanding · Expiring · Minimum · Held · Unwarranted
//   adverse    Declined · Overdue · Discrepancy · Withdrawn · Not provided
//   neutral    Draft · Circled · Presented · Archived   (uses the accent/ink-muted)

import { cn } from "@/lib/utils";

export type StatusTone = "satisfied" | "attention" | "adverse" | "neutral";

const TONE: Record<StatusTone, { color: string; dot: string }> = {
  satisfied: { color: "var(--v2-satisfied)", dot: "var(--v2-satisfied)" },
  attention: { color: "var(--v2-attention)", dot: "var(--v2-attention)" },
  adverse: { color: "var(--v2-adverse)", dot: "var(--v2-adverse)" },
  neutral: { color: "var(--v2-ink-muted)", dot: "var(--v2-ink-muted)" },
};

export interface StatusLabelProps {
  tone: StatusTone;
  children: React.ReactNode;
  /** Show the small leading dot. Off for print-critical dense columns if desired. */
  dot?: boolean;
  className?: string;
}

export function StatusLabel({ tone, children, dot = true, className }: StatusLabelProps) {
  const t = TONE[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-v2-ui font-medium", className)}
      style={{ color: t.color, fontSize: "12.5px" }}
    >
      {dot && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "var(--v2-radius)", background: t.dot, flex: "0 0 auto" }}
        />
      )}
      {children}
    </span>
  );
}
