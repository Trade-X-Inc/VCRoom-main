// Docs information architecture — single source of truth.
// Drives the sidebar tree, breadcrumbs, prev/next links, and the page registry.

export interface DocsNavItem {
  slug: string; // path under /docs, "" = /docs itself
  title: string;
}

export interface DocsNavSection {
  slug: string; // section prefix, e.g. "founders"
  title: string;
  items: DocsNavItem[];
}

export const DOCS_NAV: DocsNavSection[] = [
  {
    slug: "",
    title: "Getting started",
    items: [{ slug: "", title: "Overview" }],
  },
  {
    slug: "founders",
    title: "For founders",
    items: [
      { slug: "founders", title: "Founder features" },
      { slug: "founders/profile", title: "Company profile" },
      { slug: "founders/deal-rooms", title: "Deal rooms" },
      { slug: "founders/vault", title: "Document vault" },
      { slug: "founders/qa", title: "Q&A" },
      { slug: "founders/nda", title: "NDA" },
      { slug: "founders/verification", title: "Verification tiers" },
      { slug: "founders/team", title: "Team management" },
      { slug: "founders/ai", title: "AI for founders" },
    ],
  },
  {
    slug: "investors",
    title: "For investors",
    items: [
      { slug: "investors", title: "Investor features" },
      { slug: "investors/intake", title: "Deal intake parser" },
      { slug: "investors/deal-flow", title: "Deal flow inbox" },
      { slug: "investors/pipeline", title: "Pipeline" },
      { slug: "investors/decisions", title: "Decisions" },
      { slug: "investors/due-diligence", title: "Due diligence" },
      { slug: "investors/analysis", title: "Investment memos" },
      { slug: "investors/team", title: "Fund team" },
    ],
  },
  {
    slug: "deal-rooms",
    title: "Deal rooms",
    items: [
      { slug: "deal-rooms", title: "How deal rooms work" },
      { slug: "deal-rooms/stages", title: "The six stages" },
      { slug: "deal-rooms/overview", title: "Overview panel" },
      { slug: "deal-rooms/information-vault", title: "Information Vault" },
      { slug: "deal-rooms/qa", title: "Q&A panel" },
      { slug: "deal-rooms/due-diligence", title: "Due diligence panel" },
      { slug: "deal-rooms/term-sheet", title: "Term sheet" },
      { slug: "deal-rooms/closing", title: "Closing" },
    ],
  },
  {
    slug: "ai",
    title: "AI",
    items: [
      { slug: "ai", title: "AI on Hockystick" },
      { slug: "ai/operator-panel", title: "AI panel" },
      { slug: "ai/deal-brief", title: "Deal briefs" },
      { slug: "ai/verification", title: "AI verification" },
      { slug: "ai/data-handling", title: "Data handling" },
    ],
  },
  {
    slug: "security",
    title: "Security",
    items: [
      { slug: "security", title: "Security & compliance" },
      { slug: "security/overview", title: "Security posture" },
      { slug: "security/data", title: "Data storage" },
      { slug: "security/rls", title: "Row Level Security" },
      { slug: "security/nda", title: "NDA legal framework" },
      { slug: "security/disclosure", title: "Responsible disclosure" },
    ],
  },
  {
    slug: "tools",
    title: "Tools",
    items: [{ slug: "tools", title: "Financial calculators" }],
  },
  {
    slug: "changelog",
    title: "Changelog",
    items: [{ slug: "changelog", title: "Changelog" }],
  },
];

// Flat ordered list for prev/next navigation
export const DOCS_FLAT: DocsNavItem[] = DOCS_NAV.flatMap((s) => s.items);

export function findSection(slug: string): DocsNavSection | undefined {
  return DOCS_NAV.find((s) => s.items.some((i) => i.slug === slug));
}

export function prevNext(slug: string): { prev?: DocsNavItem; next?: DocsNavItem } {
  const idx = DOCS_FLAT.findIndex((i) => i.slug === slug);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? DOCS_FLAT[idx - 1] : undefined,
    next: idx < DOCS_FLAT.length - 1 ? DOCS_FLAT[idx + 1] : undefined,
  };
}
