import {
  LayoutDashboard, ClipboardCheck, Globe, UserCircle2, Briefcase,
  PieChart, MessageSquare, Gift, Settings, Brain, FileInput,
} from "lucide-react";

/**
 * R9 contextual navigation — the single source of the L1→L4 hierarchy
 * (see R9_AUDIT.md and the target sitemap).
 *
 * Hierarchy rules:
 * - L1 is the app shell itself; its default content is L2 Overview.
 * - L2 items are the main sections. A leaf L2 (`to` set, no children) is a
 *   real page. A group L2 (`children` set) triggers the ONLY sidebar swap
 *   in the system: the L2 list is replaced by that section's L3 list with
 *   "← Back to Dashboard" pinned on top, always resolving to L2 Overview.
 * - L3 leaves (`to` set) are real pages. L3 groups (`children` set) are
 *   pure expand/collapse labels — never clickable pages themselves.
 * - Every L4 item is a real leaf page. There is no L5 and no second swap.
 */

export interface NavLeaf {
  to: string;
  label: string;
}

export interface L3Group {
  label: string;
  children: NavLeaf[]; // L4 leaves
}

export type L3Item = NavLeaf | L3Group;

export function isGroup(item: L3Item): item is L3Group {
  return (item as L3Group).children !== undefined;
}

export interface L2Section {
  key: string;
  label: string;
  icon: any;
  /** Leaf L2: the page it opens. Group L2: unset. */
  to?: string;
  /** Group L2: its L3 items. */
  children?: L3Item[];
  /** Path prefixes that mean "the user is inside this section". */
  matchPrefixes: string[];
}

// ── Founder ────────────────────────────────────────────────────────

export const founderSections: L2Section[] = [
  {
    key: "overview", label: "Overview", icon: LayoutDashboard,
    to: "/app/overview", matchPrefixes: [],
  },
  {
    key: "prepare", label: "Prepare", icon: ClipboardCheck,
    matchPrefixes: ["/app/prepare"],
    children: [
      {
        label: "Profile Builder",
        children: [
          { to: "/app/prepare/profile-builder/quick-setup", label: "Quick Setup" },
          { to: "/app/prepare/profile-builder/full-profile", label: "Full Profile" },
          { to: "/app/prepare/profile-builder/team-cards", label: "Team Cards" },
          { to: "/app/prepare/profile-builder/achievements", label: "Achievements" },
          { to: "/app/prepare/profile-builder/fundraising-thesis", label: "Fundraising Thesis" },
        ],
      },
      {
        label: "IP Vault",
        children: [
          { to: "/app/prepare/ip-vault/document-intake", label: "Document Intake" },
          { to: "/app/prepare/ip-vault/source-files", label: "Source Files" },
          { to: "/app/prepare/ip-vault/digital-document-vault", label: "Digital Document Vault" },
          { to: "/app/prepare/ip-vault/privacy-settings", label: "Document Privacy Settings" },
        ],
      },
      {
        label: "Workstation",
        children: [
          { to: "/app/prepare/workstation/verifications", label: "Verifications" },
          { to: "/app/prepare/workstation/claims", label: "Claims" },
        ],
      },
      {
        label: "Badges",
        children: [
          { to: "/app/prepare/badges/overview", label: "Badge Overview & Guide" },
          { to: "/app/prepare/badges/apply", label: "Apply Badge" },
          { to: "/app/prepare/badges/founder-roast", label: "Founder Roast" },
          { to: "/app/prepare/badges/roast-reports", label: "Founder Roast Reports" },
        ],
      },
      {
        label: "Investment Readiness",
        children: [
          { to: "/app/prepare/investment-readiness/investor-simulation", label: "Investor Simulation" },
          { to: "/app/prepare/investment-readiness/investment-audit", label: "Investment Audit" },
        ],
      },
      {
        label: "Founder Coaching",
        children: [
          { to: "/app/prepare/founder-coaching/profile-documents-check", label: "Full Profile & Documents Check" },
          { to: "/app/prepare/founder-coaching/report-flags", label: "Full Report & Flags" },
        ],
      },
    ],
  },
  {
    key: "go-live", label: "Go Live", icon: Globe,
    matchPrefixes: ["/app/go-live"],
    children: [
      {
        label: "Digital Profile",
        children: [
          { to: "/app/go-live/digital-profile/profile-view", label: "Full Digital Profile View" },
          { to: "/app/go-live/digital-profile/privacy-settings", label: "Profile Privacy Settings" },
        ],
      },
      { to: "/app/go-live/directory", label: "Directory Dashboard" },
      { to: "/app/go-live/profile-analytics", label: "Profile View Analytics" },
    ],
  },
  {
    key: "crm", label: "CRM", icon: UserCircle2,
    matchPrefixes: ["/app/crm"],
    children: [
      { to: "/app/crm/connections", label: "Connections" },
      { to: "/app/crm/pipeline-manager", label: "Pipeline Manager" },
      { to: "/app/crm/meetings", label: "Connection Meetings" },
      { to: "/app/crm/email-outreach", label: "Email Outreach" },
      { to: "/app/crm/analytics", label: "CRM Analytics" },
    ],
  },
  {
    key: "deal-rooms", label: "Deal Rooms", icon: Briefcase,
    matchPrefixes: ["/app/deal-rooms"],
    children: [
      { to: "/app/deal-rooms", label: "Deal Room" },
      { to: "/app/deal-rooms/meetings-calendar", label: "Meetings Calendar" },
      { to: "/app/deal-rooms/prep-notes", label: "Deal Prep Notes" },
      { to: "/app/deal-rooms/team-assignments", label: "Team Assignments" },
      { to: "/app/deal-rooms/reports-vault", label: "Reports Vault" },
    ],
  },
  {
    key: "analytics", label: "Analytics", icon: PieChart,
    to: "/app/analytics", matchPrefixes: [],
  },
  {
    key: "team-chat", label: "Team Chat", icon: MessageSquare,
    to: "/app/team-chat", matchPrefixes: [],
  },
  {
    key: "referrals", label: "Referrals", icon: Gift,
    to: "/app/referrals", matchPrefixes: [],
  },
  {
    key: "settings", label: "Settings", icon: Settings,
    to: "/app/settings", matchPrefixes: [],
  },
];

// ── Investor ───────────────────────────────────────────────────────

export const investorSections: L2Section[] = [
  {
    key: "overview", label: "Overview", icon: LayoutDashboard,
    to: "/app/investor/overview", matchPrefixes: [],
  },
  {
    key: "thesis", label: "Thesis", icon: Brain,
    matchPrefixes: ["/app/investor/thesis"],
    children: [
      {
        label: "Investor Profile Builder",
        children: [
          { to: "/app/investor/thesis/profile-builder/quick-setup", label: "Quick Setup" },
          { to: "/app/investor/thesis/profile-builder/full-profile", label: "Full Profile" },
          { to: "/app/investor/thesis/profile-builder/team-cards", label: "Team Cards" },
          { to: "/app/investor/thesis/profile-builder/track-record", label: "Track Record" },
          { to: "/app/investor/thesis/profile-builder/investment-thesis", label: "Investment Thesis" },
        ],
      },
      {
        label: "Fund Vault",
        children: [
          { to: "/app/investor/thesis/fund-vault/source-files", label: "Source Files" },
          { to: "/app/investor/thesis/fund-vault/digital-document-vault", label: "Digital Document Vault" },
          { to: "/app/investor/thesis/fund-vault/privacy-settings", label: "Document Privacy Settings" },
        ],
      },
      {
        label: "Verification",
        children: [
          { to: "/app/investor/thesis/verification/verifications", label: "Verifications" },
          { to: "/app/investor/thesis/verification/claims", label: "Claims" },
        ],
      },
      {
        label: "Badges",
        children: [
          { to: "/app/investor/thesis/badges/overview", label: "Badge Overview & Guide" },
          { to: "/app/investor/thesis/badges/apply", label: "Apply Badge" },
          { to: "/app/investor/thesis/badges/tier-status", label: "Verification Tier Status" },
        ],
      },
      {
        label: "Capital Readiness",
        children: [
          { to: "/app/investor/thesis/capital-readiness/cheque-size", label: "Cheque Size Confirmation" },
          { to: "/app/investor/thesis/capital-readiness/capacity-audit", label: "Investment Capacity Audit" },
        ],
      },
    ],
  },
  {
    key: "discover", label: "Discover", icon: FileInput,
    matchPrefixes: ["/app/investor/discover"],
    children: [
      {
        label: "Public Investor Profile",
        children: [
          { to: "/app/investor/discover/public-profile/profile-view", label: "Full Digital Profile View" },
          { to: "/app/investor/discover/public-profile/privacy-settings", label: "Profile Privacy Settings" },
        ],
      },
      { to: "/app/investor/discover/deal-flow", label: "Deal Flow" },
      { to: "/app/investor/discover/deal-intake", label: "Deal Intake" },
      { to: "/app/investor/discover/watchlist", label: "Watchlist" },
    ],
  },
  {
    key: "crm", label: "CRM", icon: UserCircle2,
    matchPrefixes: ["/app/investor/crm"],
    children: [
      { to: "/app/investor/crm/connections", label: "Connections" },
      { to: "/app/investor/crm/pipeline-manager", label: "Pipeline Manager" },
      { to: "/app/investor/crm/founder-meetings", label: "Founder Meetings" },
      { to: "/app/investor/crm/deal-analysis", label: "Deal Analysis" },
    ],
  },
  {
    key: "deal-rooms", label: "Deal Rooms", icon: Briefcase,
    // Room detail pages live at the shared /app/deal-rooms/:id — an investor
    // inside a room is still "in" this section even though the path isn't
    // under /app/investor.
    matchPrefixes: ["/app/investor/deal-rooms", "/app/deal-rooms"],
    children: [
      { to: "/app/investor/deal-rooms", label: "Deal Room" },
      { to: "/app/investor/deal-rooms/meetings-calendar", label: "Meetings Calendar" },
      { to: "/app/investor/deal-rooms/diligence-notes", label: "Diligence Notes" },
      { to: "/app/investor/deal-rooms/team-assignments", label: "Team Assignments" },
      { to: "/app/investor/deal-rooms/portfolio", label: "Portfolio" },
      { to: "/app/investor/deal-rooms/reports-vault", label: "Reports Vault" },
    ],
  },
  {
    key: "analytics", label: "Analytics", icon: PieChart,
    to: "/app/investor/analytics", matchPrefixes: [],
  },
  {
    key: "team-chat", label: "Team Chat", icon: MessageSquare,
    to: "/app/team-chat", matchPrefixes: [],
  },
  {
    key: "referrals", label: "Referrals", icon: Gift,
    to: "/app/referrals", matchPrefixes: [],
  },
  {
    key: "settings", label: "Settings", icon: Settings,
    to: "/app/investor/settings", matchPrefixes: [],
  },
];

/** The section the given path is inside, or null when at L2 level. */
export function activeSectionFor(path: string, sections: L2Section[]): L2Section | null {
  for (const s of sections) {
    if (s.matchPrefixes.some((p) => path === p || path.startsWith(p + "/"))) return s;
  }
  return null;
}

/** The Back-to-Dashboard target — always L2 Overview, per the hierarchy rule. */
export function overviewPathFor(isInvestor: boolean): string {
  return isInvestor ? "/app/investor/overview" : "/app/overview";
}

/** First real leaf inside a group section — used as the group L2's click target. */
export function firstLeafOf(section: L2Section): string {
  for (const item of section.children ?? []) {
    if (!isGroup(item)) return item.to;
    if (item.children.length > 0) return item.children[0].to;
  }
  return "/app";
}

/** Every leaf (L3 leaves + all L4s) inside a section, for active-state matching. */
export function allLeavesOf(section: L2Section): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const item of section.children ?? []) {
    if (isGroup(item)) leaves.push(...item.children);
    else leaves.push(item);
  }
  return leaves;
}
