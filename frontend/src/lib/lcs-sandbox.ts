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
  /** The investor/counterparty in this deal — real column added 1 Sep
   * 2026 after the Deals hub §2 review found the table wasn't using its
   * available width; per instruction, filled with real columns already
   * in the workflow spec rather than widening cells or adding decoration. */
  counterparty: string;
  stage: LcsDealStage;
  listStatus: LcsDealListStatus;
  createdAt: string;
  /** When the deal entered its CURRENT stage — distinct from createdAt.
   * "Days in stage" is computed from this at render time, not stored as a
   * stale number, so it stays correct as real time passes. */
  stageEnteredAt: string;
  /** Most recent activity description + timestamp, same shape as the
   * PDF's own "Recent Transaction Log" example content. */
  lastActivity: { text: string; at: string };
}

// Real bug found live, 1 Sep 2026: this module has no schema-version
// check, so widening LcsSandboxDeal's shape (adding counterparty/
// stageEnteredAt/lastActivity for the §2 review's column additions) left
// already-persisted localStorage from the OLD shape in place — reading it
// back and rendering `d.lastActivity.text` crashed the whole route
// (undefined.text) rather than degrading gracefully. The storage key
// itself is bumped whenever the shape changes; an old key's data is
// simply invisible to the new code and gets reseeded, rather than
// partially deserializing into an incompatible shape.
const STORAGE_KEY = "lcs-sandbox-v2";

function seedDeals(): LcsSandboxDeal[] {
  return [
    { id: "sbx-1", ref: "DL-3001", companyName: "Nimbus Analytics", sector: "technology", owner: "R. Mehta", counterparty: "Blue Horizon Ventures", stage: "negotiation", listStatus: "active", createdAt: "2026-08-05T10:00:00Z", stageEnteredAt: "2026-08-20T10:00:00Z", lastActivity: { text: "Term sheet counter-proposed", at: "2026-08-24T14:32:00Z" } },
    { id: "sbx-2", ref: "DL-3002", companyName: "Havenlight Systems", sector: "technology", owner: "S. Cole", counterparty: "Apex Meridian Capital", stage: "due_diligence", listStatus: "in-progress", createdAt: "2026-07-28T10:00:00Z", stageEnteredAt: "2026-08-18T10:00:00Z", lastActivity: { text: "Data room access extended", at: "2026-08-23T09:15:00Z" } },
    { id: "sbx-3", ref: "DL-3003", companyName: "Redstone Cloud", sector: "technology", owner: "S. Cole", counterparty: "Starlight Holdings", stage: "document_vault", listStatus: "pending-action", createdAt: "2026-07-20T10:00:00Z", stageEnteredAt: "2026-08-15T10:00:00Z", lastActivity: { text: "Cap table upload requested", at: "2026-08-21T11:05:00Z" } },
    { id: "sbx-4", ref: "DL-3004", companyName: "Vantage Robotics Software", sector: "technology", owner: "R. Mehta", counterparty: "Vanguard Technologies", stage: "closing", listStatus: "closed", createdAt: "2026-06-10T10:00:00Z", stageEnteredAt: "2026-07-30T10:00:00Z", lastActivity: { text: "Close confirmed by both parties", at: "2026-07-31T16:00:00Z" } },
    { id: "sbx-5", ref: "DL-3005", companyName: "Fieldstone Data", sector: "technology", owner: "R. Mehta", counterparty: "Corvex Special Situations", stage: "company_profile", listStatus: "pending-action", createdAt: "2026-08-22T10:00:00Z", stageEnteredAt: "2026-08-22T10:00:00Z", lastActivity: { text: "Profile submitted for review", at: "2026-08-22T10:05:00Z" } },
    { id: "sbx-6", ref: "DL-3006", companyName: "Anchorpoint AI", sector: "technology", owner: "S. Cole", counterparty: "Northbridge Capital Fund IV", stage: "nda_gate", listStatus: "active", createdAt: "2026-08-25T10:00:00Z", stageEnteredAt: "2026-08-25T10:00:00Z", lastActivity: { text: "NDA sent for signature", at: "2026-08-25T10:10:00Z" } },
  ];
}

/** Defense-in-depth against the exact bug the schema-version bump above
 * fixed: even with a version-bumped key, a stored value could still be
 * shaped wrong (a manual edit, a future shape change that forgets to bump
 * the key again). Checks the fields the crash actually depended on rather
 * than a full shape validator, since this is a sandbox, not production
 * data needing strict validation. */
function looksLikeCurrentShape(value: unknown): value is LcsSandboxDeal[] {
  return (
    Array.isArray(value) &&
    value.every(
      (d) =>
        d &&
        typeof d.counterparty === "string" &&
        typeof d.stageEnteredAt === "string" &&
        d.lastActivity &&
        typeof d.lastActivity.text === "string"
    )
  );
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
    const parsed = JSON.parse(raw);
    if (!looksLikeCurrentShape(parsed)) {
      const seeded = seedDeals();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
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

/** Days elapsed since a deal entered its current stage, computed from the
 * real stored timestamp against a caller-supplied "now" — never Date.now()
 * called internally. This function runs during SSR (this route is server-
 * rendered), and Date.now() differs between the server render and the
 * client hydration render by however many milliseconds elapsed between
 * them — the exact same class of hydration-mismatch bug already found and
 * fixed once this session (deals-preview.$sector.tsx's sandbox-loading
 * state, and this session's earlier /status fix). Callers must compute
 * `now` once, client-side only, after mount — see deals-preview.$sector.tsx
 * for the pattern. */
export function daysInStage(deal: LcsSandboxDeal, now: number): number {
  const ms = now - new Date(deal.stageEnteredAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
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
