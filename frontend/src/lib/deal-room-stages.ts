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
//
// Build Step 1 (7 Sep 2026): DealStage's own value set was collapsed to the
// canonical 5-stage sequence (nda_signed/qa/diligence/term_sheet/
// closing_confirmed) — updated here to match. initial_review no longer
// exists as a distinct DealStage value (collapsed into qa); "closed" is
// gone from workflow_stage entirely (renamed closing_confirmed, to stop
// colliding with deal_rooms.status='closed', a different column/event).
export const UI_TO_DEAL_STAGE: Record<Exclude<DealRoomStageKey, "overview" | "meetings">, DealStage> = {
  information_vault: "qa",
  qa: "qa",
  due_diligence: "diligence",
  term_sheet: "term_sheet",
  closing: "closing_confirmed",
};

// stageRank() reconciles this file's 7-key UI vocabulary against the DB's
// canonical 5-value workflow_stage. Post-collapse, "diligence"/"due_diligence"
// and "qa"/"initial_review" are no longer two live DB values each — the DB
// only ever writes the canonical name now — but the extra branches are kept
// harmlessly (a defensive no-op for any pre-migration/cached value that
// hasn't round-tripped yet), not because they're still both live DB values.
export function stageRank(stage?: string | null): number {
  const normalized = stage ?? "";
  if (normalized === "closing" || normalized === "closing_confirmed" || normalized === "closed") return UI_STAGE_ORDER.indexOf("closing");
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
  qa: "Q&A",
  diligence: "Due Diligence",
  term_sheet: "Term Sheet",
  closing_confirmed: "Closing",
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
