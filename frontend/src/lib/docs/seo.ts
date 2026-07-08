import { getDocPage } from "./registry";

const BASE = "https://hockystick.app";

export function docCanonicalUrl(slug: string): string {
  return slug ? `${BASE}/docs/${slug}` : `${BASE}/docs`;
}

/** head() payload for a docs page: title, description, canonical, and Open Graph. */
export function docHead(slug: string) {
  const page = getDocPage(slug);
  if (!page) {
    return { meta: [{ title: "Not found — Hockystick Documentation" }] };
  }
  const url = docCanonicalUrl(slug);
  const title = `${page.meta.title} — Hockystick Documentation`;
  return {
    meta: [
      { title },
      { name: "description", content: page.meta.description },
      { property: "og:title", content: title },
      { property: "og:description", content: page.meta.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Hockystick" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: page.meta.description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Article JSON-LD for a docs page, rendered by DocArticle. */
export function docJsonLd(slug: string): string | null {
  const page = getDocPage(slug);
  if (!page) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.meta.title,
    description: page.meta.description,
    dateModified: page.meta.updated,
    url: docCanonicalUrl(slug),
    author: { "@type": "Organization", name: "Hockystick", url: BASE },
    publisher: { "@type": "Organization", name: "Hockystick", url: BASE },
    isPartOf: { "@type": "WebSite", name: "Hockystick Documentation", url: `${BASE}/docs` },
  });
}
