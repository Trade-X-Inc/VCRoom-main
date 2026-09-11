// ─────────────────────────────────────────────────────────────────────────
// ADVISOR DASHBOARD — DESIGN PREVIEW DATA. NOT REAL. NOT WIRED TO ANYTHING.
// ─────────────────────────────────────────────────────────────────────────
//
// This module exists ONLY to populate the advisor design-preview screens
// (app.advisor-preview.*). Every value below is invented placeholder
// content for visual review. Nothing here reads from, writes to, or
// corresponds to any production table.
//
// WHY THIS IS LABELLED SO HEAVILY (CLAUDE.md §7.4, §19b): this repository
// has twice shipped invented figures into user-facing surfaces because a
// placeholder was written to look plausible and a comment promising to
// replace it later was treated as sufficient mitigation. It was not. The
// rule this project settled on is that an admitted placeholder is evidence
// the author knew, not a mitigation — so these values are deliberately
// NOT plausible. Company names are transparently fake ("Placeholder
// Robotics"), the numbers are round, and every screen rendering them
// carries a visible in-app banner. If any of this ever starts looking
// like real data, that is the bug.
//
// THE ADVISOR ROLE DOES NOT EXIST YET. As of this file's creation:
//   • deal_room_members.role is founder | investor | lawyer — there is NO
//     advisor value, and this pass deliberately did not add one.
//   • There is no advisor↔client-company linking table.
//   • There is no portfolio-rollup query, and no RLS or authorization
//     for an advisor principal anywhere.
// Building that is its own scoped effort (schema design → RLS → an
// adversarial authorization trace, per CLAUDE.md §20.1's sequence) and is
// explicitly NOT what these screens are. They are frontend only.

export type AdvisorStageKey =
  | "information_vault"
  | "meetings"
  | "qa"
  | "due_diligence"
  | "term_sheet"
  | "closing";

/**
 * Real deal-room stage vocabulary (src/lib/deal-room-stages.ts), used
 * verbatim. The Figma frame this screen came from (35:5043) used an
 * M&A/PE banker-process vocabulary instead — "Teaser Distribution",
 * "CIM Access", "VDR Phase I", "Management Presentation" — which is not
 * this product's workflow. Per the standing rule (real workflow is
 * authoritative, Figma supplies visual grammar only) that vocabulary was
 * dropped, not translated.
 */
export const ADVISOR_STAGE_LABEL: Record<AdvisorStageKey, string> = {
  information_vault: "Information Vault",
  meetings: "Interviews",
  qa: "Q&A",
  due_diligence: "Due Diligence",
  term_sheet: "Term Sheet",
  closing: "Closing",
};

export const ADVISOR_STAGE_ORDER: AdvisorStageKey[] = [
  "information_vault", "meetings", "qa", "due_diligence", "term_sheet", "closing",
];

export type PreviewClient = {
  /** Real §8.4 format: {ORG}-{TYP}-{YYYY}-{SEQ}-{CD}. See note in advisor-preview-record.tsx. */
  reference: string;
  company: string;
  sector: string;
  raiseTarget: string;
  stage: AdvisorStageKey;
  daysInStage: number;
  lastActivity: string;
  /** What this advisor owes the client next. Null = nothing outstanding. */
  nextAction: string | null;
};

export const PREVIEW_CLIENTS: PreviewClient[] = [
  {
    reference: "ATLS01-ROM-2026-000042-16",
    company: "Placeholder Robotics",
    sector: "Technology",
    raiseTarget: "$4,000,000",
    stage: "due_diligence",
    daysInStage: 14,
    lastActivity: "2 hours ago",
    nextAction: "Answer 3 open diligence questions",
  },
  {
    reference: "MERD02-ROM-2026-000003-93",
    company: "Example Health Co",
    sector: "Healthcare",
    raiseTarget: "$2,500,000",
    stage: "term_sheet",
    daysInStage: 6,
    lastActivity: "Yesterday",
    nextAction: "Founder review of proposed terms",
  },
  {
    reference: "SMPL03-ROM-2026-000011-18",
    company: "Sample Industrial Ltd",
    sector: "Manufacturing",
    raiseTarget: "$8,000,000",
    stage: "qa",
    daysInStage: 22,
    lastActivity: "Today",
    nextAction: null,
  },
  {
    reference: "TSTX04-ROM-2026-000007-36",
    company: "Test Energy Group",
    sector: "Energy",
    raiseTarget: "$12,000,000",
    stage: "information_vault",
    daysInStage: 3,
    lastActivity: "3 days ago",
    nextAction: "Complete company profile",
  },
  {
    reference: "DEMO05-ROM-2026-000019-58",
    company: "Demo Logistics Inc",
    sector: "Supply Chain",
    raiseTarget: "$1,500,000",
    stage: "closing",
    daysInStage: 9,
    lastActivity: "5 hours ago",
    nextAction: "Upload signed agreement",
  },
];

/** Outstanding items across the whole book — the frame's "Urgent Actions" panel. */
export const PREVIEW_OUTSTANDING = [
  {
    company: "Placeholder Robotics",
    label: "3 diligence questions unanswered",
    detail: "Oldest opened 6 days ago.",
    tone: "attention" as const,
  },
  {
    company: "Demo Logistics Inc",
    label: "Signed agreement not uploaded",
    detail: "Both parties confirmed the fee; signing is the open step.",
    tone: "attention" as const,
  },
  {
    company: "Example Health Co",
    label: "Term sheet awaiting founder response",
    detail: "Investor proposed terms 6 days ago.",
    tone: "neutral" as const,
  },
];

/** Per-client detail, for the drill-in preview (frame 35:5043). */
export const PREVIEW_CLIENT_DETAIL = {
  reference: "ATLS01-ROM-2026-000042-16",
  company: "Placeholder Robotics",
  sector: "Technology",
  raiseTarget: "$4,000,000",
  currentStage: "due_diligence" as AdvisorStageKey,
  stageEntered: "14 days ago",
  documents: { total: 18, released: 12, requested: 3 },
  openQuestions: 3,
  participants: [
    { name: "Placeholder Capital", role: "Investor", stage: "Due Diligence", ndaStatus: "Signed" },
    { name: "Example Ventures", role: "Investor", stage: "Q&A", ndaStatus: "Signed" },
    { name: "Sample Partners LLP", role: "Counsel", stage: "Closing only", ndaStatus: "Signed" },
  ],
};

/**
 * Sealed close record (frame 35:3313). Depicts a REAL spec'd capability
 * (Foundation §9.1 reference numbering + CLAUDE.md §8.3 hash-chained
 * record_entry) that is NOT yet available to any user — see the header
 * comment in app.advisor-preview.record.tsx for the full caveat.
 */
export const PREVIEW_CLOSE_RECORD = {
  reference: "ATLS01-CLS-2026-000017-07",
  company: "Placeholder Robotics",
  closedOn: "24 October 2026",
  closeValue: "$4,000,000",
  confirmations: { received: 2, required: 2 },
  entries: [
    {
      reference: "ATLS01-CLS-2026-000017-07",
      at: "2026-10-24 14:32:01 UTC",
      action: "Close confirmed by founder",
      actor: "Placeholder Founder",
      actorType: "human" as const,
    },
    {
      reference: "ATLS01-CLS-2026-000016-10",
      at: "2026-10-24 15:10:44 UTC",
      action: "Close confirmed by investor",
      actor: "Placeholder Capital",
      actorType: "human" as const,
    },
    {
      reference: "ATLS01-CLS-2026-000015-13",
      at: "2026-10-24 16:45:12 UTC",
      action: "Deal closed; invoices generated",
      actor: "System",
      actorType: "system" as const,
    },
  ],
  gates: [
    { label: "Legal counsel", state: "satisfied" as const },
    { label: "Agreement accepted", state: "satisfied" as const },
    { label: "Platform fee", state: "satisfied" as const },
    { label: "Signed copies", state: "satisfied" as const },
    { label: "Investment payment", state: "satisfied" as const },
    { label: "Mutual close", state: "satisfied" as const },
  ],
};
