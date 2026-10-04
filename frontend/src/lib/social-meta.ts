// SEO-018 Phase 1 — shared og/twitter helper, same pattern as breadcrumb.ts.
//
// Root cause this closes: most public routes set their own `title` and
// `description` in head() but never set og:*/twitter:* — and TanStack's
// head-merge dedupes by `m.name ?? m.property`, leaf-first, first-write-
// wins (verified by reading @tanstack/react-router's headContentUtils.js
// directly, not assumed). A route that never sets og:title has nothing to
// win with, so root's hardcoded fallback stands unchallenged. This isn't
// a router limitation — it's a per-route omission, closed here once per
// route rather than by hand-writing 5 near-identical lines each.
//
// Usage: spread into a route's head() meta array alongside its own
// title/description:
//   meta: [
//     { title: "..." },
//     { name: "description", content: "..." },
//     ...socialMeta({ title: "...", description: "...", path: "/for/founders" }),
//   ]
export function socialMeta({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) {
  const url = `https://lengdon.com${path}`;
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image
      ? [
          { property: "og:image", content: image },
          { name: "twitter:image", content: image },
        ]
      : []),
  ];
}
