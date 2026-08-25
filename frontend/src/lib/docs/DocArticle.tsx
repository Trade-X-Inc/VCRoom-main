import type { DocPage } from "./primitives";
import { docFaqJsonLd, docJsonLd } from "./seo";

const UI = "var(--font-v2-ui)";
const DATA = "var(--font-v2-data)";
const INK = "var(--v2-ink)";
const INK_3 = "var(--v2-ink-muted)";

export function DocArticle({ page }: { page: DocPage }) {
  const { meta, Body } = page;
  const jsonLd = docJsonLd(meta.slug);
  const faqLd = docFaqJsonLd(meta.slug);
  return (
    <article style={{ maxWidth: "48rem" }}>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} />
      )}
      <h1 className="pub-title" style={{ fontFamily: UI, color: INK, margin: "0 0 8px" }}>
        {meta.title}
      </h1>
      <div style={{ marginBottom: "32px", fontFamily: DATA, fontSize: "11.5px", color: INK_3 }}>
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
