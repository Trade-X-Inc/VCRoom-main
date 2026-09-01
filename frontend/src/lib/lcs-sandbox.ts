// Lengdon Component System — sandbox demo data, 1 Sep 2026.
//
// Client-side ONLY. No Supabase client is imported or called anywhere in
// this file — confirmed by grep before this comment was written, not
// assumed (`grep -n "supabase\|@supabase" src/lib/lcs-sandbox.ts` returns
// nothing). This is the deliberate architecture decision for every LCS
// preview screen needing list/table content: a real Supabase table (even
// isolated) would be schema/migration/RLS work this build has been
// explicitly deferring throughout ("no backend wiring, no schema, no auth
// changes"). localStorage needs none of that, supports a genuine reset,
// and cannot touch deal_rooms/startups/any real table even by accident
// since no network call exists in this code path.
//
// The real, live deal_rooms table has exactly 4 rows, all test/adversarial
// fixtures (Playwright Test Co x2, Atlas Robotics — CLAUDE.md §13's
// permanent adversarial account) — none are displayed here. This sandbox
// is entirely fictional content, same implausible-not-realistic standard
// as the Advisor Dashboard preview (CLAUDE.md §20.15's §7.4 lesson: a
// plausible placeholder is how invented content quietly ships as real).

export type LcsDealStage =
  | "initiation"
  | "nda_gate"
  | "company_profile"
  | "document_vault"
  | "due_diligence"
  | "negotiation"
  | "closing";

export type LcsDealListStatus = "active" | "closed" | "in-progress" | "pending-action";

export interface LcsSandboxDeal {
  id: string;
  ref: string;
  companyName: string;
  sector: "technology";
  owner: string;
  stage: LcsDealStage;
  listStatus: LcsDealListStatus;
  createdAt: string;
}

const STORAGE_KEY = "lcs-sandbox-v1";

function seedDeals(): LcsSandboxDeal[] {
  return [
    { id: "sbx-1", ref: "DL-3001", companyName: "Nimbus Analytics", sector: "technology", owner: "R. Mehta", stage: "negotiation", listStatus: "active", createdAt: "2026-08-20T10:00:00Z" },
    { id: "sbx-2", ref: "DL-3002", companyName: "Havenlight Systems", sector: "technology", owner: "S. Cole", stage: "due_diligence", listStatus: "in-progress", createdAt: "2026-08-18T10:00:00Z" },
    { id: "sbx-3", ref: "DL-3003", companyName: "Redstone Cloud", sector: "technology", owner: "S. Cole", stage: "document_vault", listStatus: "pending-action", createdAt: "2026-08-15T10:00:00Z" },
    { id: "sbx-4", ref: "DL-3004", companyName: "Vantage Robotics Software", sector: "technology", owner: "R. Mehta", stage: "closing", listStatus: "closed", createdAt: "2026-07-30T10:00:00Z" },
    { id: "sbx-5", ref: "DL-3005", companyName: "Fieldstone Data", sector: "technology", owner: "R. Mehta", stage: "company_profile", listStatus: "pending-action", createdAt: "2026-08-22T10:00:00Z" },
    { id: "sbx-6", ref: "DL-3006", companyName: "Anchorpoint AI", sector: "technology", owner: "S. Cole", stage: "nda_gate", listStatus: "active", createdAt: "2026-08-25T10:00:00Z" },
  ];
}

function readAll(): LcsSandboxDeal[] {
  if (typeof window === "undefined") return seedDeals();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDeals();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as LcsSandboxDeal[];
  } catch {
    // Private window, storage blocked, or corrupt JSON — fall back to a
    // fresh in-memory seed rather than throwing.
    return seedDeals();
  }
}

export function getSandboxDeals(): LcsSandboxDeal[] {
  return readAll();
}

export function getSandboxDeal(id: string): LcsSandboxDeal | undefined {
  return readAll().find((d) => d.id === id);
}

/** Clears and reseeds the sandbox. Returns the fresh seed set. */
export function resetSandboxDeals(): LcsSandboxDeal[] {
  const seeded = seedDeals();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    } catch {
      /* private window / storage blocked — nothing to persist, seed still
         returned for in-memory use this session */
    }
  }
  return seeded;
}
