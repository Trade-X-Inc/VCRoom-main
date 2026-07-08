import type { DocPage } from "./primitives";

export function DocArticle({ page }: { page: DocPage }) {
  const { meta, Body } = page;
  return (
    <article className="max-w-3xl">
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
