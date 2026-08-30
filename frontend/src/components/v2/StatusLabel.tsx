// StatusLabel — semantic status as a text label + colour, NEVER colour alone
// (DESIGN.md §2.5 / §7.2 / §11). Readable in greyscale, by a colour-blind user,
// and on a printed page. Semantic colour never fills a large area (§2.4) — the
// pill background stays at 10% tone opacity for exactly this reason, never a
// solid fill.
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
//
// Pill treatment (bg at 10% tone opacity, 6px dot, 2px radius, 4px/8px
// padding, JetBrains Mono 12px/0.6px tracking) extracted verbatim from Figma
// frame 55:1722 ("Canvas", "Pack Builder — Institutional Disclosure Desk")
// during the term-sheets.tsx pass, 30 Aug 2026, per CLAUDE.md §0a — applied
// here rather than locally since StatusLabel is the one shared primitive
// every status indicator in the app already goes through; overview.tsx and
// close.tsx (both already reviewed) inherit it automatically. Color values
// use the real v2 tone tokens, not the frame's literal hex, same
// substitution rule as every other extraction this session.

import { cn } from "@/lib/utils";

export type StatusTone = "satisfied" | "attention" | "adverse" | "neutral";

const TONE: Record<StatusTone, { color: string; bg: string; dot: string }> = {
  satisfied: { color: "var(--v2-satisfied)", bg: "var(--v2-satisfied-wash)", dot: "var(--v2-satisfied)" },
  attention: { color: "var(--v2-attention)", bg: "var(--v2-attention-wash)", dot: "var(--v2-attention)" },
  adverse: { color: "var(--v2-adverse)", bg: "var(--v2-adverse-wash)", dot: "var(--v2-adverse)" },
  neutral: { color: "var(--v2-ink-muted)", bg: "var(--v2-rule-light)", dot: "var(--v2-ink-muted)" },
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
      className={cn("inline-flex items-center font-v2-data font-medium", className)}
      style={{
        color: t.color,
        background: t.bg,
        fontSize: "12px",
        letterSpacing: "0.06em",
        borderRadius: "var(--v2-radius)",
        padding: "4px 8px",
        gap: "6px",
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, flex: "0 0 auto" }}
        />
      )}
      {children}
    </span>
  );
}
