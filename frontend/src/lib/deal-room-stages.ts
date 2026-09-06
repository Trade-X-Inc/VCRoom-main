import type { DealStage } from "@/lib/deal-room-fn";

export type DealRoomStageKey =
  | "overview"
  | "information_vault"
  | "meetings"
  | "qa"
  | "due_diligence"
  | "term_sheet"
  | "closing";

// Decorative emoji icons (⬛, 🔒) removed 6 Sep 2026 — CLAUDE.md §13 bans
// decorative iconography regardless of colour. The lock's real semantic
// meaning (a locked/inaccessible stage) is now expressed by the shell's
// StageTabBar rendering a real Lucide Lock icon directly, keyed off its own
// existing canAccess() check rather than this data field — no consumer of
// this shape's `icon` field needed the string form once that changed.
export const STAGES: { key: DealRoomStageKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "information_vault", label: "Information Vault" },
  { key: "meetings", label: "Interviews" },
  { key: "qa", label: "Q&A" },
  { key: "due_diligence", label: "Due Diligence" },
  { key: "term_sheet", label: "Term Sheet" },
  { key: "closing", label: "Closing" },
];

export const UI_STAGE_ORDER: DealRoomStageKey[] = [
  "overview",
  "information_vault",
  "meetings",
  "qa",
  "due_diligence",
  "term_sheet",
  "closing",
];

// R14B: meetings is reachable alongside information_vault — it doesn't map
// onto the older DealStage enum (a separate, pre-existing workflow model
// this branch does not touch), so it inherits information_vault's
// unlock rank in stageRank() below rather than adding a new DealStage value.
export const UI_TO_DEAL_STAGE: Record<Exclude<DealRoomStageKey, "overview" | "meetings">, DealStage> = {
  information_vault: "initial_review",
  qa: "initial_review",
  due_diligence: "diligence",
  term_sheet: "term_sheet",
  closing: "closed",
};

export function stageRank(stage?: string | null): number {
  const normalized = stage ?? "";
  if (normalized === "closing" || normalized === "closed") return UI_STAGE_ORDER.indexOf("closing");
  if (normalized === "term_sheet") return UI_STAGE_ORDER.indexOf("term_sheet");
  if (normalized === "due_diligence" || normalized === "diligence") return UI_STAGE_ORDER.indexOf("due_diligence");
  if (normalized === "qa" || normalized === "initial_review") return UI_STAGE_ORDER.indexOf("qa");
  if (normalized === "information_vault" || normalized === "nda_signed") return UI_STAGE_ORDER.indexOf("information_vault");
  return UI_STAGE_ORDER.indexOf("overview");
}

export function workflowStageLabel(stage?: string | null) {
  if (!stage) return "—";
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const STAGE_SHORT: Record<DealStage, string> = {
  nda_signed: "Information Vault",
  initial_review: "Q&A",
  diligence: "Due Diligence",
  term_sheet: "Term Sheet",
  closed: "Closing",
};

/** Route-key ↔ tab-path mapping for the split /deal-rooms/:id/* routes. */
export const STAGE_KEY_TO_PATH: Record<Exclude<DealRoomStageKey, "overview">, string> = {
  information_vault: "information",
  meetings: "meetings",
  qa: "qa",
  due_diligence: "diligence",
  term_sheet: "term-sheets",
  closing: "close",
};
