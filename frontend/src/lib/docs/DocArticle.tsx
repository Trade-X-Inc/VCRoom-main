import type { DocPage } from "./primitives";
import { docFaqJsonLd, docJsonLd } from "./seo";

export function DocArticle({ page }: { page: DocPage }) {
  const { meta, Body } = page;
  const jsonLd = docJsonLd(meta.slug);
  const faqLd = docFaqJsonLd(meta.slug);
  return (
    <article className="max-w-3xl">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      )}
      <h1 className="mb-2 text-3xl font-bold text-gray-900" style={{ fontFamily: "Syne, sans-serif" }}>
        {meta.title}
      </h1>
      <div className="mb-8 text-xs text-gray-500">
        Last updated{" "}
        <time dateTime={meta.updated}>
          {new Date(meta.updated + "T00:00:00Z").toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </time>
      </div>
      <Body />
    </article>
  );
}
