import { useSyncExternalStore } from "react";

type Listener = () => void;
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (u: (s: T) => T) => { state = u(state); listeners.forEach((l) => l()); },
    subscribe: (l: Listener) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

export type ReviewSectionKey = "pitch" | "financial" | "team" | "meeting" | "dd" | "qa";
export type SectionStatus = "Not reviewed" | "In review" | "Done";
export type DecisionStatus =
  | "Under Review"
  | "Request More Info"
  | "Move to Partner Review"
  | "Term Sheet Ready"
  | "Not Proceeding"
  | "Exit";

export interface SectionState {
  rating: number; // 0-5
  notes: string;
  checks: Record<string, boolean>;
  status: SectionStatus;
  updatedAt?: string;
}

export interface DecisionState {
  status: DecisionStatus | null;
  reason?: string;
  message?: string;
  requestInfo?: { what: string; deadline: string };
  updatedAt?: string;
  history: { status: DecisionStatus; at: string; meta?: any }[];
}

export interface ReviewState {
  sections: Record<ReviewSectionKey, SectionState>;
  decision: DecisionState;
  docNotes: Record<string, string>;
  reviewedDocs: Record<string, boolean>;
  activity: { id: string; text: string; at: string }[];
}

const empty = (): ReviewState => ({
  sections: {
    pitch:    { rating: 0, notes: "", checks: {}, status: "Not reviewed" },
    financial:{ rating: 0, notes: "", checks: {}, status: "Not reviewed" },
    team:     { rating: 0, notes: "", checks: {}, status: "Not reviewed" },
    meeting:  { rating: 0, notes: "", checks: {}, status: "Not reviewed" },
    dd:       { rating: 0, notes: "", checks: {}, status: "Not reviewed" },
    qa:       { rating: 0, notes: "", checks: {}, status: "Not reviewed" },
  },
  decision: { status: null, history: [] },
  docNotes: {},
  reviewedDocs: {},
  activity: [],
});

const reviewStore = createStore<Record<string, ReviewState>>({});

function ensure(state: Record<string, ReviewState>, id: string) {
  if (!state[id]) state[id] = empty();
  return state;
}

export function useReview(dealRoomId: string): ReviewState {
  const state = useSyncExternalStore(reviewStore.subscribe, reviewStore.get, reviewStore.get);
  return state[dealRoomId] ?? empty();
}

export const reviewActions = {
  updateSection(id: string, key: ReviewSectionKey, patch: Partial<SectionState>) {
    reviewStore.set((s) => {
      const next = { ...s };
      ensure(next, id);
      next[id] = {
        ...next[id],
        sections: { ...next[id].sections, [key]: { ...next[id].sections[key], ...patch, updatedAt: new Date().toISOString() } },
      };
      return next;
    });
  },
  setDecision(id: string, status: DecisionStatus, meta?: Partial<DecisionState>) {
    reviewStore.set((s) => {
      const next = { ...s };
      ensure(next, id);
      const at = new Date().toISOString();
      next[id] = {
        ...next[id],
        decision: { ...next[id].decision, status, ...(meta || {}), updatedAt: at, history: [{ status, at, meta }, ...next[id].decision.history] },
        activity: [{ id: Math.random().toString(36).slice(2), text: `Investor decision: ${status}`, at }, ...next[id].activity],
      };
      return next;
    });
  },
  logActivity(id: string, text: string) {
    reviewStore.set((s) => {
      const next = { ...s };
      ensure(next, id);
      next[id] = { ...next[id], activity: [{ id: Math.random().toString(36).slice(2), text, at: new Date().toISOString() }, ...next[id].activity] };
      return next;
    });
  },
  setDocNote(id: string, doc: string, note: string) {
    reviewStore.set((s) => {
      const next = { ...s };
      ensure(next, id);
      next[id] = { ...next[id], docNotes: { ...next[id].docNotes, [doc]: note } };
      return next;
    });
  },
  toggleDocReviewed(id: string, doc: string, value: boolean) {
    reviewStore.set((s) => {
      const next = { ...s };
      ensure(next, id);
      next[id] = { ...next[id], reviewedDocs: { ...next[id].reviewedDocs, [doc]: value } };
      return next;
    });
  },
};

export const SECTION_META: { key: ReviewSectionKey; label: string; checks: string[] }[] = [
  { key: "pitch", label: "Pitch Deck Review", checks: ["Concept is clear", "Market opportunity validated", "Business model understood", "Team credentials reviewed"] },
  { key: "financial", label: "Financial Review", checks: ["Revenue model is clear", "Projections are realistic", "Unit economics reviewed", "Burn rate acceptable"] },
  { key: "team", label: "Team Review", checks: ["Founding team evaluated", "Key hires identified", "Advisory board reviewed"] },
  { key: "meeting", label: "Meeting Review", checks: ["Calls held", "Follow-ups documented"] },
  { key: "dd", label: "Due Diligence Review", checks: ["Legal complete", "Financial complete", "Technical complete", "Commercial complete"] },
  { key: "qa", label: "Q&A Review", checks: ["Responses thorough", "No red flags"] },
];

export const STAGES = ["NDA Signed", "Docs Shared", "Review Stage", "Partner Review", "Term Sheet", "Closed"] as const;
export type Stage = (typeof STAGES)[number];

export function decisionToStage(d: DecisionStatus | null): Stage {
  switch (d) {
    case "Term Sheet Ready": return "Term Sheet";
    case "Move to Partner Review": return "Partner Review";
    case "Request More Info":
    case "Under Review": return "Review Stage";
    case "Not Proceeding":
    case "Exit": return "Docs Shared";
    default: return "Docs Shared";
  }
}

export function decisionTone(d: DecisionStatus | null) {
  switch (d) {
    case "Term Sheet Ready": return "success";
    case "Move to Partner Review": return "violet";
    case "Request More Info": return "warning";
    case "Not Proceeding": return "destructive";
    case "Exit": return "muted-foreground";
    default: return "brand";
  }
}
