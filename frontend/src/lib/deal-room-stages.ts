import type { DealStage } from "@/lib/deal-room-fn";

export type DealRoomStageKey =
  | "overview"
  | "information_vault"
  | "meetings"
  | "qa"
  | "due_diligence"
  | "term_sheet"
  | "closing";

export const STAGES: { key: DealRoomStageKey; label: string; icon: string | null }[] = [
  { key: "overview", label: "Overview", icon: "⬛" },
  { key: "information_vault", label: "Information Vault", icon: null },
  { key: "meetings", label: "Interviews", icon: null },
  { key: "qa", label: "Q&A", icon: null },
  { key: "due_diligence", label: "Due Diligence", icon: null },
  { key: "term_sheet", label: "Term Sheet", icon: "🔒" },
  { key: "closing", label: "Closing", icon: "🔒" },
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
