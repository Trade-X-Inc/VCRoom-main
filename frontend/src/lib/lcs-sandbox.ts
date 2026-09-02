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
export type LcsSectorId = "technology" | "real-estate" | "manufacturing" | "spv" | "syndicate-lead";

export const SECTOR_LABEL: Record<LcsSectorId, string> = {
  technology: "Technology",
  "real-estate": "Real Estate",
  manufacturing: "Manufacturing",
  spv: "SPV",
  "syndicate-lead": "Syndicate Lead",
};

/** Every route reading a $sector URL param gets a plain `string` from
 * TanStack Router (a route param can't be narrowed to LcsSectorId at the
 * type level — a malformed/unknown URL is a real possibility, not just a
 * type-checker technicality), so `SECTOR_LABEL[sector]` doesn't type-check
 * once SECTOR_LABEL is properly keyed by LcsSectorId (checkpoint 5).
 * Centralizes the lookup-with-fallback every route was already doing
 * (`SECTOR_LABEL[sector] ?? sector`) rather than repeating an `as` cast at
 * five call sites. */
export function sectorLabel(id: string): string {
  return (SECTOR_LABEL as Record<string, string>)[id] ?? id;
}

/** Sector-config single source of truth, checkpoint 5 (2 Sep 2026) — the
 * multi-sector-support checkpoint. Before this, "is this sector active"
 * was answered three different, disconnected ways: the hub's own local
 * `Sector` type/array (status field, real), and two independent
 * `sector === "technology"` string comparisons in the instrument picker
 * and stage-filtered list (hardcoded to the one sector that happened to
 * be active, not consulting the hub's array at all). Moving the hub's
 * array here and having every screen read `isSectorActive()` instead of
 * re-deriving the answer is the actual "config, not hardcoded branches"
 * change — a sector goes live by editing one array entry's `status`, not
 * by touching per-screen conditionals.
 *
 * Real Estate activated here alongside Technology, 2 Sep 2026, to prove
 * the architecture actually works end-to-end rather than just typing
 * correctly with only one active sector. scheduleCount is deliberately
 * OMITTED for Real Estate, not fabricated: `pack_v1.schedule` was queried
 * live before this was written (`select * from pack_v1.schedule`) and
 * returned exactly one row — technology/seed/published, the same row
 * Technology's own scheduleCount: 1 has always been justified against.
 * No real-estate row exists. Per direct instruction: active status with
 * an honest absence (renders the same "No schedule published yet." line
 * the not-yet-active sectors show) rather than either a fabricated count
 * or a downgrade back to coming-soon. */
export interface LcsSectorConfig {
  id: LcsSectorId;
  name: string;
  status: "active" | "coming-soon";
  /** Only set when a real published pack_v1.schedule row exists for this
   * sector. Never a placeholder or estimated figure. */
  scheduleCount?: number;
}

export const SECTORS: LcsSectorConfig[] = [
  { id: "technology", name: SECTOR_LABEL.technology, status: "active", scheduleCount: 1 },
  { id: "real-estate", name: SECTOR_LABEL["real-estate"], status: "active" },
  { id: "manufacturing", name: SECTOR_LABEL.manufacturing, status: "coming-soon" },
  { id: "spv", name: SECTOR_LABEL.spv, status: "coming-soon" },
  { id: "syndicate-lead", name: SECTOR_LABEL["syndicate-lead"], status: "coming-soon" },
];

export function isSectorActive(id: string): boolean {
  return SECTORS.some((s) => s.id === id && s.status === "active");
}

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

/** Document Vault — checkpoint (2 Sep 2026), built against the corrected
 * architecture report (three corrections from the "Pack Builder" scoping
 * discussion, all grounded in CLAUDE.md's own already-established rules,
 * not re-derived):
 *
 * 1. TWO-WAY ACCESS, not a tiered visibility model. CLAUDE.md §8.2 names
 *    "release a document" as a Commit-class action — "No agent executes a
 *    Commit-class action under any circumstance" — and §11.1 requires an
 *    "immutable hash-chained audit log recording actor, action, object,
 *    timestamp" for exactly this kind of event. The real product's action
 *    layer already has this exact shape (`documentRender`/`docViewInsert`
 *    for view-only, `documents.requestAccess`/`documents.grantRelease`
 *    for release) — this sandbox mirrors it in spirit. **UI-only,
 *    honestly flagged as not enforced**: this is a client-side sandbox
 *    with no backend, no real auth, and no server to refuse an
 *    unauthorized read — same standing disclosure as every other
 *    document/role/visibility concept elsewhere in this build (e.g. the
 *    transaction lifecycle's own DocumentVaultPanel comment: "the scope
 *    is shown explicitly via the status pill rather than hidden — so the
 *    screen documents the real access model instead of silently
 *    simulating enforcement it can't actually perform").
 * 2. PER-FIELD AI extraction, matching CLAUDE.md §10's AI-usage table
 *    verbatim: "Proposes a value with citation to page and location.
 *    Human confirms; the confirmation is the warranty." Confirmation is a
 *    per-field action — there is no batch/bulk-confirm control anywhere
 *    in the UI this data model feeds (see deals-preview.vault.tsx's own
 *    header comment for the concrete UI-level guarantee). Extraction
 *    itself is mocked (`mockExtractFields()`, no real AI call — this
 *    build's standing "no backend wiring" rule) but the interaction
 *    pattern is real, not stubbed to "later."
 * 3. Universal cross-transaction document management (a shared library
 *    spanning deals, versioning, a unified cross-deal audit trail) is
 *    explicitly OUT OF SCOPE for this pass — logged as a distinct future
 *    feature (CLAUDE.md's Amendment log), not folded in here. A vault
 *    holds documents for the deals it's actually been built for or
 *    shared into; no dedup/versioning system tracks a document's
 *    presence across multiple vaults or deals. */
export type LcsDocumentAccess = "view-only" | "release-on-request";

export const DOCUMENT_ACCESS_LABEL: Record<LcsDocumentAccess, string> = {
  "view-only": "View only",
  "release-on-request": "Release on request",
};

/** Every view is logged (docViewInsert's real-product equivalent) —
 * whether the access mode is view-only or release-on-request, viewing in
 * place always writes a log entry. Sandbox-only, in-memory per vault
 * document, not persisted to localStorage (a view log growing forever
 * across every localStorage read/reseed isn't the point being
 * demonstrated here — the confirm/correct and release-request flows are). */
export interface LcsDocumentViewLog {
  viewerRole: LcsViewerRole;
  viewerName: string;
  at: string;
}

/** documents.requestAccess -> documents.grantRelease, matching the real
 * action names in spirit. A request is Prepare-class (produces something
 * a human must act on); granting it is Commit-class (§8.2 — "release a
 * document" is the named example) and is modeled here as a real two-step
 * interaction, not a single toggle, even though nothing server-side is
 * actually enforcing the distinction. */
export interface LcsDocumentReleaseRequest {
  id: string;
  requestedBy: { role: LcsViewerRole; name: string };
  status: "pending" | "granted" | "declined";
  grantedBy?: { role: LcsViewerRole; name: string };
  respondedAt?: string;
  requestedAt: string;
}

export interface LcsVaultDocument {
  id: string;
  name: string;
  category: string;
  /** For the close-time archival privacy filter (deal-room documents
   * feature, not built in this pass — the field exists now so the shape
   * doesn't need another breaking version bump when that lands). A
   * document the counterparty contributed is never archived with its
   * real content past a room's close; only a generated summary persists. */
  contributedBy: "self" | "counterparty";
  access: LcsDocumentAccess;
  viewLog: LcsDocumentViewLog[];
  releaseRequests: LcsDocumentReleaseRequest[];
}

export interface LcsSandboxVault {
  id: string;
  name: string;
  ownerRole: LcsViewerRole;
  documents: LcsVaultDocument[];
  createdAt: string;
}

const VAULT_STORAGE_KEY = "lcs-sandbox-vaults-v1";

function seedVaults(): LcsSandboxVault[] {
  return [
    {
      id: "vault-1",
      name: "Series A materials",
      ownerRole: "founder",
      createdAt: "2026-08-15T10:00:00Z",
      documents: [
        {
          id: "vdoc-1",
          name: "Executive Summary.pdf",
          category: "Overview",
          contributedBy: "self",
          access: "view-only",
          viewLog: [{ viewerRole: "investor", viewerName: "Blue Horizon Ventures", at: "2026-08-24T09:10:00Z" }],
          releaseRequests: [],
        },
        {
          id: "vdoc-2",
          name: "Cap Table (internal).xlsx",
          category: "Legal",
          contributedBy: "self",
          access: "release-on-request",
          viewLog: [],
          releaseRequests: [
            {
              id: "req-1",
              requestedBy: { role: "investor", name: "Blue Horizon Ventures" },
              status: "pending",
              requestedAt: "2026-08-25T11:00:00Z",
            },
          ],
        },
      ],
    },
    {
      id: "vault-2",
      name: "Fund deployment templates",
      ownerRole: "investor",
      createdAt: "2026-08-10T10:00:00Z",
      documents: [
        {
          id: "vdoc-3",
          name: "Standard DD Request.docx",
          category: "Templates",
          contributedBy: "self",
          access: "view-only",
          viewLog: [],
          releaseRequests: [],
        },
      ],
    },
  ];
}

function looksLikeVaultShape(value: unknown): value is LcsSandboxVault[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        v &&
        typeof v.name === "string" &&
        typeof v.ownerRole === "string" &&
        Array.isArray(v.documents) &&
        v.documents.every((d: unknown) => d && typeof (d as { access?: unknown }).access === "string")
    )
  );
}

function readAllVaults(): LcsSandboxVault[] {
  if (typeof window === "undefined") return seedVaults();
  try {
    const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      const seeded = seedVaults();
      window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!looksLikeVaultShape(parsed)) {
      const seeded = seedVaults();
      window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    return seedVaults();
  }
}

function writeAllVaults(vaults: LcsSandboxVault[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaults));
  } catch {
    /* private window / storage blocked — nothing to persist this session */
  }
}

export function getSandboxVaults(): LcsSandboxVault[] {
  return readAllVaults();
}

/** Creates a vault. Defaults name to "New Vault" when the caller doesn't
 * supply one — the auto-create-on-move behavior described for Pack
 * Builder's "move to vault without picking one first" path, even though
 * Pack Builder itself isn't built in this pass. */
export function createSandboxVault(ownerRole: LcsViewerRole, name?: string): LcsSandboxVault {
  const vaults = readAllVaults();
  const vault: LcsSandboxVault = {
    id: `vault-${Date.now()}`,
    name: name?.trim() || "New Vault",
    ownerRole,
    documents: [],
    createdAt: new Date().toISOString(),
  };
  writeAllVaults([...vaults, vault]);
  return vault;
}

export function renameSandboxVault(vaultId: string, name: string): void {
  const vaults = readAllVaults();
  writeAllVaults(vaults.map((v) => (v.id === vaultId ? { ...v, name: name.trim() || v.name } : v)));
}

export function addDocumentToVault(vaultId: string, doc: Omit<LcsVaultDocument, "id" | "viewLog" | "releaseRequests">): void {
  const vaults = readAllVaults();
  const newDoc: LcsVaultDocument = { ...doc, id: `vdoc-${Date.now()}`, viewLog: [], releaseRequests: [] };
  writeAllVaults(vaults.map((v) => (v.id === vaultId ? { ...v, documents: [...v.documents, newDoc] } : v)));
}

export function removeDocumentFromVault(vaultId: string, documentId: string): void {
  const vaults = readAllVaults();
  writeAllVaults(
    vaults.map((v) => (v.id === vaultId ? { ...v, documents: v.documents.filter((d) => d.id !== documentId) } : v))
  );
}

/** Logs a view — called every time a document is opened in place,
 * regardless of access mode (view-only or release-on-request both log
 * views; release-on-request additionally gates a download/full-release
 * behind a request, which viewing in place doesn't need). */
export function logDocumentView(vaultId: string, documentId: string, viewer: LcsDocumentViewLog): void {
  const vaults = readAllVaults();
  writeAllVaults(
    vaults.map((v) =>
      v.id === vaultId
        ? {
            ...v,
            documents: v.documents.map((d) =>
              d.id === documentId ? { ...d, viewLog: [...d.viewLog, viewer] } : d
            ),
          }
        : v
    )
  );
}

export function requestDocumentRelease(vaultId: string, documentId: string, requestedBy: { role: LcsViewerRole; name: string }): void {
  const vaults = readAllVaults();
  const request: LcsDocumentReleaseRequest = {
    id: `req-${Date.now()}`,
    requestedBy,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  writeAllVaults(
    vaults.map((v) =>
      v.id === vaultId
        ? {
            ...v,
            documents: v.documents.map((d) =>
              d.id === documentId ? { ...d, releaseRequests: [...d.releaseRequests, request] } : d
            ),
          }
        : v
    )
  );
}

/** Commit-class per CLAUDE.md §8.2 ("release a document" is the named
 * example — no agent may ever perform this). A human decision, modeled
 * here as an explicit grant/decline action, never automatic. */
export function respondToReleaseRequest(
  vaultId: string,
  documentId: string,
  requestId: string,
  decision: "granted" | "declined",
  grantedBy: { role: LcsViewerRole; name: string }
): void {
  const vaults = readAllVaults();
  writeAllVaults(
    vaults.map((v) =>
      v.id === vaultId
        ? {
            ...v,
            documents: v.documents.map((d) =>
              d.id === documentId
                ? {
                    ...d,
                    releaseRequests: d.releaseRequests.map((r) =>
                      r.id === requestId
                        ? { ...r, status: decision, grantedBy, respondedAt: new Date().toISOString() }
                        : r
                    ),
                  }
                : d
            ),
          }
        : v
    )
  );
}

/** Extraction — mock computation only, no real AI call (this build's
 * standing "no backend wiring" rule). The interaction pattern this feeds
 * (per-field confirm/correct, only confirmed values enter a pack) is
 * real; only the proposal computation is fictional, same
 * implausible-not-realistic discipline as every other sandbox value
 * (CLAUDE.md §7.4's standing lesson on plausible fabrication). */
export interface LcsExtractedField {
  id: string;
  label: string;
  proposedValue: string;
  citation: { documentName: string; page: number; location: string };
  status: "proposed" | "confirmed" | "corrected";
  confirmedValue?: string;
}

export function mockExtractFields(documentName: string): LcsExtractedField[] {
  return [
    {
      id: `ex-${Date.now()}-1`,
      label: "Company legal name",
      proposedValue: "Example Holdings Ltd.",
      citation: { documentName, page: 1, location: "Header block" },
      status: "proposed",
    },
    {
      id: `ex-${Date.now()}-2`,
      label: "Fiscal year revenue",
      proposedValue: "$—,———,———",
      citation: { documentName, page: 4, location: "Table 2, row 3" },
      status: "proposed",
    },
    {
      id: `ex-${Date.now()}-3`,
      label: "Requested closing date",
      proposedValue: "TBD",
      citation: { documentName, page: 2, location: "Section 3.1" },
      status: "proposed",
    },
  ];
}

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
  /** Widened from the literal "technology" to LcsSectorId, checkpoint 5
   * (2 Sep 2026) — the sandbox previously couldn't represent a
   * transaction in any other sector without a type change first. */
  sector: LcsSectorId;
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
//
// v5 (2 Sep 2026): checkpoint 5, multi-sector support. `sector` widened
// from the literal "technology" to LcsSectorId (a real shape/type change,
// not just new seed rows), plus two new Real Estate seed transactions
// (sbx-7, sbx-8). Old v4 localStorage would still deserialize structurally
// (no field added/removed), but its 6 rows would all still read
// sector: "technology" — bumping the key ensures every existing session
// picks up the two new Real Estate rows on next load rather than being
// stuck on a stale 6-row seed indefinitely.
const STORAGE_KEY = "lcs-sandbox-v5";

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
    // Real Estate seeds, checkpoint 5 (2 Sep 2026) — the second sector
    // activated to prove the sector-config architecture end-to-end, not
    // just typed correctly. Deliberately new company names and terms, not
    // the tech seed data relabeled — same "no fabricated realism cheaply
    // reused" standard as everything else in this sandbox.
    {
      id: "sbx-7", ref: "TX-3007", companyName: "Meridian Row Holdings", sector: "real-estate", instrumentType: "equity", owner: "R. Mehta",
      counterparty: "Cascade Property Partners", stage: "due_diligence", listStatus: "in-progress",
      createdAt: "2026-08-10T10:00:00Z", stageEnteredAt: "2026-08-24T10:00:00Z",
      lastActivity: { text: "Appraisal report requested", at: "2026-08-27T13:20:00Z" },
      nda: { founderSignedAt: "2026-08-11T09:00:00Z", investorSignedAt: "2026-08-11T12:45:00Z" },
      profile: { summary: "Mixed-use residential redevelopment, 42-unit portfolio.", sector: "Real Estate", stage: "Acquisition", askAmount: "$9,500,000" },
      documents: [
        { id: "doc-10", name: "Property Appraisal.pdf", category: "Overview", visibleTo: "both" },
        { id: "doc-11", name: "Title Report.pdf", category: "Legal", visibleTo: "both" },
      ],
      diligenceItems: [
        { id: "dd-9", label: "Title and lien search", owner: "Cascade Property Partners", satisfied: true },
        { id: "dd-10", label: "Environmental survey", owner: "R. Mehta", satisfied: false },
      ],
      terms: [
        { id: "term-6", label: "Purchase price", value: "$9,500,000", status: "proposed" },
      ],
      closingGates: NO_GATES_STARTED,
    },
    {
      id: "sbx-8", ref: "TX-3008", companyName: "Harborview Logistics Park", sector: "real-estate", instrumentType: "equity", owner: "S. Cole",
      counterparty: "Sentinel Capital Advisors", stage: "negotiation", listStatus: "active",
      createdAt: "2026-08-01T10:00:00Z", stageEnteredAt: "2026-08-19T10:00:00Z",
      lastActivity: { text: "Cap rate counter-proposed", at: "2026-08-26T11:40:00Z" },
      nda: { founderSignedAt: "2026-08-02T09:15:00Z", investorSignedAt: "2026-08-02T14:00:00Z" },
      profile: { summary: "Industrial warehouse acquisition, three-tenant lease.", sector: "Real Estate", stage: "Acquisition", askAmount: "$14,200,000" },
      documents: [
        { id: "doc-12", name: "Lease Abstracts.pdf", category: "Financials", visibleTo: "both" },
      ],
      diligenceItems: [
        { id: "dd-11", label: "Tenant lease review", owner: "S. Cole", satisfied: true },
        { id: "dd-12", label: "Zoning compliance check", owner: "Sentinel Capital Advisors", satisfied: true },
      ],
      terms: [
        { id: "term-7", label: "Purchase price", value: "$14,200,000", status: "countered" },
        { id: "term-8", label: "Cap rate", value: "6.25%", status: "proposed" },
      ],
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

/** Company entity — Profile Builder (2 Sep 2026), extracted against the
 * REAL product's app.profile-builder.tsx field set (read directly, not
 * guessed at — its FIELD_LABELS constant names company_name, tagline,
 * sector, stage, problem, solution, business_model, market_size,
 * traction, team, funding_target, use_of_funds, competitive_advantage,
 * plus a v3 set). Not every real field is carried into this sandbox —
 * only the ones load-bearing for the screens this build actually has
 * (the profile view, and eventually deal-room company-profile stage
 * content) — but every field that IS here is a real field name from the
 * real form, not invented.
 *
 * Confirmed before building: sector is not a variable Pack Builder
 * branches its own behavior on (checkpoint 5's SECTORS/isSectorActive
 * config still governs reachability everywhere else, unchanged) — it's a
 * field the founder fills in HERE, and that's the actual mechanism by
 * which a company's sector gets determined at all. The real product's
 * own `sector` field is free text with no closed list; this sandbox
 * deliberately constrains it to LcsSectorId (a select, not a text field)
 * to stay consistent with checkpoint 5's own closed sector set — a
 * deliberate divergence from the live product's current looseness, not
 * an oversight.
 *
 * A founder MAY select any of the 5 sectors, including the 3 still
 * coming-soon (Manufacturing, SPV, Syndicate Lead), confirmed directly:
 * "founders can build the profile and from any sector startups. once we
 * open our deal rooms for that particular sectors, can able to close
 * deal, otherwise they remain as first waiting list for that sector
 * (this is more a marketing technique than an infrastructure)." A
 * coming-soon-sector profile is a legitimate pre-registration/waiting-
 * list state, not a broken or blocked one — see WAITING_LIST_COPY below
 * for the honest framing this uses instead of a generic "not active"
 * error tone. */
export type LcsCompanyStage =
  | "Pre-idea"
  | "Pre-revenue"
  | "Pre-seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Growth"
  | "Profitable";

export const COMPANY_STAGES: LcsCompanyStage[] = [
  "Pre-idea",
  "Pre-revenue",
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Growth",
  "Profitable",
];

export interface LcsSandboxCompany {
  id: string;
  founderName: string;
  name: string;
  tagline: string;
  sector: LcsSectorId;
  stage: LcsCompanyStage;
  problem: string;
  solution: string;
  team: string;
  fundingTarget: string;
  published: boolean;
  publishedAt: string | null;
  /** Fictional, local-only counter — never presented as real platform
   * data (this build's standing no-fabricated-metric discipline). A
   * sandbox-side view count, incremented client-side, not a claim about
   * real traffic. */
  viewCount: number;
}

const COMPANY_STORAGE_KEY = "lcs-sandbox-company-v1";

/** Corrected 2 Sep 2026, before this checkpoint's push — the original
 * wording ("you're first in line once it opens") asserted an individual
 * queue position that nothing in this codebase tracks: no ordering
 * field, no per-founder position, no notification mechanism of any
 * kind. Literally true for at most one founder per sector. The real,
 * confirmed operational commitment is narrower and now logged as such in
 * CLAUDE.md's Amendment log, not just carried as UI copy: profiles
 * submitted for a coming-soon sector are retained and the founder will
 * be contacted in real submission order once that sector activates — a
 * promise the product owes, not a position it displays. */
export const WAITING_LIST_COPY =
  "This sector doesn't have open deal rooms yet. Your profile is saved — you'll be notified when it opens.";

function looksLikeCompanyShape(value: unknown): value is LcsSandboxCompany {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { name?: unknown }).name === "string" &&
    typeof (value as { sector?: unknown }).sector === "string" &&
    typeof (value as { published?: unknown }).published === "boolean"
  );
}

function readCompany(): LcsSandboxCompany | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COMPANY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return looksLikeCompanyShape(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCompany(company: LcsSandboxCompany): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(company));
  } catch {
    /* private window / storage blocked — nothing to persist this session */
  }
}

export function getSandboxCompany(): LcsSandboxCompany | null {
  return readCompany();
}

/** Creates or overwrites the one sandbox company — there is exactly one
 * founder identity in this sandbox (R. Mehta, per checkpoint 3's
 * hardcoded-founder decision), so there is exactly one company, not a
 * list. */
export function saveSandboxCompany(fields: Omit<LcsSandboxCompany, "id" | "published" | "publishedAt" | "viewCount">): LcsSandboxCompany {
  const existing = readCompany();
  const company: LcsSandboxCompany = {
    id: existing?.id ?? `company-${Date.now()}`,
    ...fields,
    published: existing?.published ?? false,
    publishedAt: existing?.publishedAt ?? null,
    viewCount: existing?.viewCount ?? 0,
  };
  writeCompany(company);
  return company;
}

export function publishSandboxCompany(): LcsSandboxCompany | null {
  const existing = readCompany();
  if (!existing) return null;
  const company: LcsSandboxCompany = { ...existing, published: true, publishedAt: new Date().toISOString() };
  writeCompany(company);
  return company;
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
