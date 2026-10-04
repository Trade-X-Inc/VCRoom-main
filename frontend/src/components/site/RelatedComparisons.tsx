import { Link } from "@tanstack/react-router";

// SEO-018 Phase 6 — the 5 competitor detail pages (/product/compare/*)
// were confirmed live (all 200) but completely unlinked from anywhere
// in the app, including the /product/compare hub itself. Shared here
// rather than duplicated per page since 2 of the 5 pages
// (dealroom, firmex) don't use the shared CompetitorComparePage
// component and need this dropped into their own JSX directly.
export const COMPARE_PAGES: { name: string; path: string }[] = [
  { name: "Datasite", path: "/product/compare/datasite" },
  { name: "Dealroom", path: "/product/compare/dealroom" },
  { name: "DocSend", path: "/product/compare/docsend" },
  { name: "Firmex", path: "/product/compare/firmex" },
  { name: "iDeals", path: "/product/compare/ideals" },
];

export function RelatedComparisons({ currentPath }: { currentPath: string }) {
  const related = COMPARE_PAGES.filter((p) => p.path !== currentPath);
  return (
    <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-v2-rule">
      <div className="font-v2-data text-v2-ink-muted text-[11px] tracking-[0.08em] uppercase mb-6">
        Related comparisons
      </div>
      <div className="flex flex-wrap gap-3">
        {related.map((p) => (
          <Link
            key={p.path}
            to={p.path as any}
            className="font-v2-ui text-v2-ink text-[13px] border border-v2-rule hover:border-v2-accent/40 px-5 py-2.5 transition-colors"
          >
            Lengdon vs {p.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
