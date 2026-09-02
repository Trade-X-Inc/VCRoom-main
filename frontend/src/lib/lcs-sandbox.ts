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

/** The five sectors from Transactions hub §1. Matches §1's exact sector
 * names — a raw slug->title-case conversion would be wrong for "spv"
 * (-> "Spv", not "SPV") and "syndicate-lead". Moved here from §2's own
 * local const so §3 (the single-transaction lifecycle) doesn't need a
 * third duplicate copy. */
export const SECTOR_LABEL: Record<string, string> = {
  technology: "Technology",
  "real-estate": "Real Estate",
  manufacturing: "Manufacturing",
  spv: "SPV",
  "syndicate-lead": "Syndicate Lead",
};

/** Instrument-type picker labels, added for the sector-layer restructure
 * (1 Sep 2026) — the level inserted between Sector and the stage-filtered
 * list. */
export const INSTRUMENT_LABEL: Record<LcsInstrumentType, string> = {
  equity: "Equity",
  debt: "Debt",
};

/** Sandbox-only viewer role for the restructure's role-scoped entry
 * points. Deliberately NOT the real auth Role type (src/lib/auth.tsx,
 * "founder" | "investor") — this build has no backend wiring and no real
 * session, so a third sandbox-only value ("advisor") would be a type
 * error against the real type if reused, and conflating the two would
 * misrepresent this as touching real auth when it doesn't. */
export type LcsViewerRole = "founder" | "investor" | "advisor";

export const VIEWER_ROLE_LABEL: Record<LcsViewerRole, string> = {
  founder: "Founder",
  investor: "Investor",
  advisor: "Advisor",
};

/** Advisor team-management screen (checkpoint 4), 2 Sep 2026. A flat
 * roster of an advisory firm's own analysts/counsel/accountants — the one
 * piece of checkpoint 3's role model with no precedent to lean on (the
 * Advisor Dashboard preview, CLAUDE.md §20.15, models a portfolio rollup
 * and a sealed record, not team management). Read-only: no reset, no
 * mutation, so a plain const is sufficient — unlike transactions, there's
 * no "reset demo data" affordance planned for this screen. */
export type LcsTeamMemberRole = "analyst" | "counsel" | "accountant";

export const TEAM_MEMBER_ROLE_LABEL: Record<LcsTeamMemberRole, string> = {
  analyst: "Analyst",
  counsel: "Counsel",
  accountant: "Accountant",
};

export interface LcsSandboxTeamMember {
  id: string;
  name: string;
  role: LcsTeamMemberRole;
  /** Real company names from the seed transactions above (companyName),
   * never invented ones — so "client companies" is a genuine cross-
   * reference against data that already exists, matching this build's
   * standing no-fabricated-count discipline (sector schedule counts,
   * instrument counts). */
  clientCompanies: string[];
}

export const TEAM_MEMBERS: LcsSandboxTeamMember[] = [
  { id: "team-1", name: "J. Okafor", role: "analyst", clientCompanies: ["Nimbus Analytics", "Vantage Robotics Software", "Fieldstone Data"] },
  { id: "team-2", name: "L. Fenwick", role: "counsel", clientCompanies: ["Havenlight Systems", "Redstone Cloud"] },
  { id: "team-3", name: "M. Delacroix", role: "accountant", clientCompanies: ["Anchorpoint AI"] },
];

export type LcsTransactionStage =
  | "initiation"
  | "nda_gate"
  | "company_profile"
  | "document_vault"
  | "due_diligence"
  | "negotiation"
  | "closing";

/** Order matters — drives the stage tab bar / progress indicator on the
 * single-transaction lifecycle screen (Transactions hub §3). */
export const STAGE_ORDER: LcsTransactionStage[] = [
  "initiation",
  "nda_gate",
  "company_profile",
  "document_vault",
  "due_diligence",
  "negotiation",
  "closing",
];

export const STAGE_LABEL: Record<LcsTransactionStage, string> = {
  initiation: "Initiation",
  nda_gate: "NDA gate",
  company_profile: "Company profile",
  document_vault: "Document vault",
  due_diligence: "Due diligence",
  negotiation: "Negotiation",
  closing: "Closing",
};

/** The six closing gates, per the real product vocabulary already
 * established this session (public-site rebuild, CLAUDE.md §8.4) —
 * reused verbatim rather than inventing internal-app-specific names, per
 * direct instruction. Gate 1 (Counsel) does double duty as the "counsel/
 * accountant onboarding" moment named in the original §3 instruction:
 * "either party may bring counsel in, or both agree to proceed without"
 * — not a separate stage or an earlier touchpoint. */
export type LcsClosingGate = "counsel" | "agreement" | "conditions" | "signing" | "payment" | "close";

export const CLOSING_GATE_ORDER: LcsClosingGate[] = [
  "counsel",
  "agreement",
  "conditions",
  "signing",
  "payment",
  "close",
];

export const CLOSING_GATE_LABEL: Record<LcsClosingGate, string> = {
  counsel: "Counsel",
  agreement: "Agreement",
  conditions: "Conditions",
  signing: "Signing",
  payment: "Payment",
  close: "Close",
};

export type LcsTransactionListStatus = "active" | "closed" | "in-progress" | "pending-action";

/** Sector → Instrument type → Stage hierarchy, added 1 Sep 2026 per direct
 * instruction. Debt has zero seeded transactions — every transaction this
 * sandbox already has represents a priced equity round (liquidation
 * preference terms, board seats, valuation), so all 6 get "equity" rather
 * than fabricating debt data to populate the other branch. The debt
 * instrument's own list view renders correctly with zero items via the
 * same empty-state pattern already used everywhere else in this build. */
export type LcsInstrumentType = "debt" | "equity";

export interface LcsSandboxTransaction {
  id: string;
  ref: string;
  companyName: string;
  sector: "technology";
  instrumentType: LcsInstrumentType;
  owner: string;
  /** The investor/counterparty in this transaction — real column added
   * 1 Sep 2026 after the Transactions hub §2 review found the table
   * wasn't using its available width; per instruction, filled with real
   * columns already in the workflow spec rather than widening cells or
   * adding decoration. */
  counterparty: string;
  stage: LcsTransactionStage;
  listStatus: LcsTransactionListStatus;
  createdAt: string;
  /** When the transaction entered its CURRENT stage — distinct from
   * createdAt. "Days in stage" is computed from this at render time, not
   * stored as a stale number, so it stays correct as real time passes. */
  stageEnteredAt: string;
  /** Most recent activity description + timestamp, same shape as the
   * PDF's own "Recent Transaction Log" example content. */
  lastActivity: { text: string; at: string };

  // ── Transactions hub §3 fields — single-transaction lifecycle ────────
  /** NDA gate. `null` = not yet signed by that party. */
  nda: { founderSignedAt: string | null; investorSignedAt: string | null };
  /** Company profile — the minimal shareable-brief-level fields per the
   * workflow spec's Step 3, not the full disclosure pack (that's Pack
   * Builder, §4/§5 of the build order — deliberately not duplicated here). */
  profile: { summary: string; sector: string; stage: string; askAmount: string };
  /** Document vault — per-document permission scope, matching the real
   * product's per-document (not per-gate, not per-role-only) model per
   * CLAUDE.md's own audit of the live deal-room-documents action layer. */
  documents: { id: string; name: string; category: string; visibleTo: "both" | "founder-only" }[];
  /** Due diligence checklist — owner + satisfied, matching the real
   * product's dd_categories/dd_checklist_items shape in spirit (a named
   * item with an owner and a completion state), not a generic list. */
  diligenceItems: { id: string; label: string; owner: string; satisfied: boolean }[];
  /** Negotiation — per-term state, matching the real product's two-sided
   * ratchet (unset/proposed/countered/accepted) CLAUDE.md §20.12 already
   * documents as a genuinely well-built, unproblematic part of the
   * fragmented stage-vocabulary landscape. */
  terms: { id: string; label: string; value: string; status: "proposed" | "countered" | "accepted" }[];
  /** Closing — one status per gate, in CLOSING_GATE_ORDER. Gate 1
   * (Counsel) carries the counsel/accountant onboarding content. */
  closingGates: Record<LcsClosingGate, "not-started" | "in-progress" | "done">;
}

// Real bug found live, 1 Sep 2026: this module has no schema-version
// check, so widening LcsSandboxTransaction's shape (adding counterparty/
// stageEnteredAt/lastActivity for the §2 review's column additions) left
// already-persisted localStorage from the OLD shape in place — reading it
// back and rendering `d.lastActivity.text` crashed the whole route
// (undefined.text) rather than degrading gracefully. The storage key
// itself is bumped whenever the shape changes; an old key's data is
// simply invisible to the new code and gets reseeded, rather than
// partially deserializing into an incompatible shape.
// v3 (1 Sep 2026): added nda/profile/documents/diligenceItems/terms/
// closingGates for Transactions hub §3 (single-transaction lifecycle).
//
// "Deals" renamed to "Transactions" as UI-facing terminology, 1 Sep 2026
// — see deals-preview.index.tsx's header comment for the full scope
// note. Storage key NOT bumped for this rename alone: the on-disk shape
// (field names, JSON structure) is unchanged, only TypeScript-level
// type/function names changed, which localStorage never sees.
//
// v4 (1 Sep 2026): added instrumentType for the sector-layer restructure
// (Sector → Instrument → Stage). This DOES change the on-disk shape, so
// the key bumps — old v3 data is simply invisible to the new code and
// gets reseeded, same as every prior version bump.
const STORAGE_KEY = "lcs-sandbox-v4";

const NO_GATES_STARTED: Record<LcsClosingGate, "not-started" | "in-progress" | "done"> = {
  counsel: "not-started",
  agreement: "not-started",
  conditions: "not-started",
  signing: "not-started",
  payment: "not-started",
  close: "not-started",
};

function seedTransactions(): LcsSandboxTransaction[] {
  return [
    {
      id: "sbx-1", ref: "TX-3001", companyName: "Nimbus Analytics", sector: "technology", instrumentType: "equity", owner: "R. Mehta",
      counterparty: "Blue Horizon Ventures", stage: "negotiation", listStatus: "active",
      createdAt: "2026-08-05T10:00:00Z", stageEnteredAt: "2026-08-20T10:00:00Z",
      lastActivity: { text: "Term sheet counter-proposed", at: "2026-08-24T14:32:00Z" },
      nda: { founderSignedAt: "2026-08-06T09:00:00Z", investorSignedAt: "2026-08-06T15:20:00Z" },
      profile: { summary: "Developer analytics platform for distributed systems.", sector: "Technology", stage: "Series A", askAmount: "$8,000,000" },
      documents: [
        { id: "doc-1", name: "Executive Summary.pdf", category: "Overview", visibleTo: "both" },
        { id: "doc-2", name: "Financial Model.xlsx", category: "Financials", visibleTo: "both" },
        { id: "doc-3", name: "Cap Table (internal).xlsx", category: "Legal", visibleTo: "founder-only" },
      ],
      diligenceItems: [
        { id: "dd-1", label: "Financial statements (last 3 years)", owner: "R. Mehta", satisfied: true },
        { id: "dd-2", label: "Cap table and option pool", owner: "R. Mehta", satisfied: true },
        { id: "dd-3", label: "Customer reference calls", owner: "Blue Horizon Ventures", satisfied: false },
      ],
      terms: [
        { id: "term-1", label: "Valuation", value: "$40,000,000 pre-money", status: "countered" },
        { id: "term-2", label: "Board seat", value: "One observer seat", status: "proposed" },
        { id: "term-3", label: "Liquidation preference", value: "1x non-participating", status: "accepted" },
      ],
      closingGates: NO_GATES_STARTED,
    },
    {
      id: "sbx-2", ref: "TX-3002", companyName: "Havenlight Systems", sector: "technology", instrumentType: "equity", owner: "S. Cole",
      counterparty: "Apex Meridian Capital", stage: "due_diligence", listStatus: "in-progress",
      createdAt: "2026-07-28T10:00:00Z", stageEnteredAt: "2026-08-18T10:00:00Z",
      lastActivity: { text: "Data room access extended", at: "2026-08-23T09:15:00Z" },
      nda: { founderSignedAt: "2026-07-29T11:00:00Z", investorSignedAt: "2026-07-29T16:40:00Z" },
      profile: { summary: "Infrastructure monitoring for regulated industries.", sector: "Technology", stage: "Seed", askAmount: "$3,500,000" },
      documents: [
        { id: "doc-4", name: "Pitch Deck.pdf", category: "Overview", visibleTo: "both" },
        { id: "doc-5", name: "SOC 2 Report.pdf", category: "Compliance", visibleTo: "both" },
      ],
      diligenceItems: [
        { id: "dd-4", label: "Technical architecture review", owner: "Apex Meridian Capital", satisfied: false },
        { id: "dd-5", label: "Customer contracts sample", owner: "S. Cole", satisfied: true },
        { id: "dd-6", label: "IP assignment confirmation", owner: "S. Cole", satisfied: false },
      ],
      terms: [],
      closingGates: NO_GATES_STARTED,
    },
    {
      id: "sbx-3", ref: "TX-3003", companyName: "Redstone Cloud", sector: "technology", instrumentType: "equity", owner: "S. Cole",
      counterparty: "Starlight Holdings", stage: "document_vault", listStatus: "pending-action",
      createdAt: "2026-07-20T10:00:00Z", stageEnteredAt: "2026-08-15T10:00:00Z",
      lastActivity: { text: "Cap table upload requested", at: "2026-08-21T11:05:00Z" },
      nda: { founderSignedAt: "2026-07-21T09:30:00Z", investorSignedAt: "2026-07-21T14:00:00Z" },
      profile: { summary: "Managed cloud cost optimization for mid-market SaaS.", sector: "Technology", stage: "Seed", askAmount: "$2,200,000" },
      documents: [
        { id: "doc-6", name: "Executive Summary.pdf", category: "Overview", visibleTo: "both" },
      ],
      diligenceItems: [],
      terms: [],
      closingGates: NO_GATES_STARTED,
    },
    {
      id: "sbx-4", ref: "TX-3004", companyName: "Vantage Robotics Software", sector: "technology", instrumentType: "equity", owner: "R. Mehta",
      counterparty: "Vanguard Technologies", stage: "closing", listStatus: "closed",
      createdAt: "2026-06-10T10:00:00Z", stageEnteredAt: "2026-07-30T10:00:00Z",
      lastActivity: { text: "Close confirmed by both parties", at: "2026-07-31T16:00:00Z" },
      nda: { founderSignedAt: "2026-06-11T09:00:00Z", investorSignedAt: "2026-06-11T10:15:00Z" },
      profile: { summary: "Fleet software for warehouse robotics operators.", sector: "Technology", stage: "Series A", askAmount: "$12,000,000" },
      documents: [
        { id: "doc-7", name: "Executive Summary.pdf", category: "Overview", visibleTo: "both" },
        { id: "doc-8", name: "Signed Term Sheet.pdf", category: "Legal", visibleTo: "both" },
        { id: "doc-9", name: "Closing Certificate.pdf", category: "Legal", visibleTo: "both" },
      ],
      diligenceItems: [
        { id: "dd-7", label: "Financial statements (last 3 years)", owner: "R. Mehta", satisfied: true },
        { id: "dd-8", label: "Customer reference calls", owner: "Vanguard Technologies", satisfied: true },
      ],
      terms: [
        { id: "term-4", label: "Valuation", value: "$60,000,000 pre-money", status: "accepted" },
        { id: "term-5", label: "Liquidation preference", value: "1x non-participating", status: "accepted" },
      ],
      closingGates: { counsel: "done", agreement: "done", conditions: "done", signing: "done", payment: "done", close: "done" },
    },
    {
      id: "sbx-5", ref: "TX-3005", companyName: "Fieldstone Data", sector: "technology", instrumentType: "equity", owner: "R. Mehta",
      counterparty: "Corvex Special Situations", stage: "company_profile", listStatus: "pending-action",
      createdAt: "2026-08-22T10:00:00Z", stageEnteredAt: "2026-08-22T10:00:00Z",
      lastActivity: { text: "Profile submitted for review", at: "2026-08-22T10:05:00Z" },
      nda: { founderSignedAt: "2026-08-22T09:00:00Z", investorSignedAt: null },
      profile: { summary: "Data pipeline tooling for analytics teams.", sector: "Technology", stage: "Pre-seed", askAmount: "$1,200,000" },
      documents: [],
      diligenceItems: [],
      terms: [],
      closingGates: NO_GATES_STARTED,
    },
    {
      id: "sbx-6", ref: "TX-3006", companyName: "Anchorpoint AI", sector: "technology", instrumentType: "equity", owner: "S. Cole",
      counterparty: "Northbridge Capital Fund IV", stage: "nda_gate", listStatus: "active",
      createdAt: "2026-08-25T10:00:00Z", stageEnteredAt: "2026-08-25T10:00:00Z",
      lastActivity: { text: "NDA sent for signature", at: "2026-08-25T10:10:00Z" },
      nda: { founderSignedAt: null, investorSignedAt: null },
      profile: { summary: "", sector: "Technology", stage: "", askAmount: "" },
      documents: [],
      diligenceItems: [],
      terms: [],
      closingGates: NO_GATES_STARTED,
    },
  ];
}

/** Defense-in-depth against the exact bug the schema-version bump above
 * fixed: even with a version-bumped key, a stored value could still be
 * shaped wrong (a manual edit, a future shape change that forgets to bump
 * the key again). Checks the fields the crash actually depended on rather
 * than a full shape validator, since this is a sandbox, not production
 * data needing strict validation. */
function looksLikeCurrentShape(value: unknown): value is LcsSandboxTransaction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (d) =>
        d &&
        typeof d.counterparty === "string" &&
        typeof d.stageEnteredAt === "string" &&
        d.lastActivity &&
        typeof d.lastActivity.text === "string" &&
        d.nda &&
        d.profile &&
        Array.isArray(d.documents) &&
        Array.isArray(d.diligenceItems) &&
        Array.isArray(d.terms) &&
        d.closingGates &&
        typeof d.closingGates.counsel === "string" &&
        typeof d.instrumentType === "string"
    )
  );
}

function readAll(): LcsSandboxTransaction[] {
  if (typeof window === "undefined") return seedTransactions();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedTransactions();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!looksLikeCurrentShape(parsed)) {
      const seeded = seedTransactions();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    // Private window, storage blocked, or corrupt JSON — fall back to a
    // fresh in-memory seed rather than throwing.
    return seedTransactions();
  }
}

export function getSandboxTransactions(): LcsSandboxTransaction[] {
  return readAll();
}

export function getSandboxTransaction(id: string): LcsSandboxTransaction | undefined {
  return readAll().find((d) => d.id === id);
}

/** Days elapsed since a transaction entered its current stage, computed
 * from the real stored timestamp against a caller-supplied "now" — never
 * Date.now() called internally. This function runs during SSR (this route
 * is server-rendered), and Date.now() differs between the server render
 * and the client hydration render by however many milliseconds elapsed
 * between them — the exact same class of hydration-mismatch bug already
 * found and fixed once this session (deals-preview.$sector.tsx's
 * sandbox-loading state, and this session's earlier /status fix). Callers
 * must compute `now` once, client-side only, after mount — see
 * deals-preview.$sector.tsx for the pattern. */
export function daysInStage(transaction: LcsSandboxTransaction, now: number): number {
  const ms = now - new Date(transaction.stageEnteredAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Clears and reseeds the sandbox. Returns the fresh seed set. */
export function resetSandboxTransactions(): LcsSandboxTransaction[] {
  const seeded = seedTransactions();
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
