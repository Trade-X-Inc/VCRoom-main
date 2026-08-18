import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// RETIRED 18 August 2026 — Foundation Document §15/§25.
//
// This function generated a "fundraising readiness" assessment: it read the
// founder's profile, documents, verification state and claims, sent them to
// GPT-4o, and stored a 0-100 `readiness_score` plus an `overall_readiness`
// label ("not_ready" / "early" / "approaching" / "investor_ready") in
// public.profile_checklists. The result rendered on the deal-room overview
// tab to BOTH parties — including the investor counterparty, deliberately,
// per the original migration's own comment.
//
// That is scoring / assessment, prohibited outright by §15/§25, and it is
// the same class as the readiness scores retired in CLAUDE.md §19a. It was
// missed by that sweep because the table (profile_checklists) was created
// after §19's vocabulary list was drawn and its column names never entered
// the ~25-column triage.
//
// Retired as an inert stub rather than deleted so that any caller reached by
// a stale bundle fails closed with a clear error instead of a missing-export
// crash. Both live trigger sites (app.profile.tsx on profile save,
// app.documents.tsx on document upload) and the single render site
// (app.deal-rooms.$id.overview.tsx) were removed in the same commit.
//
// The type exports below are preserved because ProfileChecklist.tsx still
// imports ChecklistGap; that component is now orphaned (zero importers) and
// is a candidate for deletion in a dedicated dead-code pass, not this one.
//
// DO NOT REACTIVATE. If a readiness or completeness feature returns, it must
// report absence against a published schedule ("12 of 14 fields complete"),
// never a computed score or an assessment label — see Foundation §10's rule
// that completeness checking reports absence, never judgment.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChecklistGap {
  gap_id: string;
  title: string;
  why_it_matters: string;
  how_to_fix: string;
  urgency: "critical" | "important" | "nice_to_have";
  category: "financials" | "legal" | "team" | "product" | "market" | "traction" | "documents";
}

export interface ChecklistResult {
  ok: boolean;
  error?: string;
  readiness_score?: number;
  overall_readiness?: "not_ready" | "early" | "approaching" | "investor_ready";
  summary?: string;
  gaps?: ChecklistGap[];
  strengths?: string[];
  generated_at?: string;
}

type Input = { userAccessToken: string; startupId: string };

export const generateFounderChecklist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as Input)
  .handler(async (): Promise<ChecklistResult> => {
    // Inert. No database read, no OpenAI call, no write to profile_checklists.
    return { ok: false, error: "gone" };
  });
