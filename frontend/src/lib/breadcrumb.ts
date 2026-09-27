// SEO-010 (AEO pass) — shared BreadcrumbList JSON-LD helper.
//
// Not a route-path-inferring helper: three of the six target categories
// (/for/*, /product/*, /company/*) have no real index/hub page to link
// an intermediate breadcrumb segment to (confirmed: for.index.tsx,
// product.index.tsx, company.index.tsx do not exist) — a generic
// path-segment labeller would either invent a broken intermediate URL or
// silently point it at "/", which is a different page than the segment
// name implies. Building trails explicitly, per call site, avoids both.
//
// The last item never carries a `url` — per Google's structured-data
// guidance, the final crumb is the current page and its `item` may be
// omitted.
export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  });
}
