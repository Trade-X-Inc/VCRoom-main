import { createFileRoute } from "@tanstack/react-router";
import { DocArticle } from "@/lib/docs/DocArticle";
import { getDocPage } from "@/lib/docs/registry";
import { docHead } from "@/lib/docs/seo";

// Restored 8 Sep 2026 — see docs-v2.tsx's header comment for provenance.

export const Route = createFileRoute("/docs-v2/")({
  head: () => docHead(""),
  component: DocsIndex,
});

function DocsIndex() {
  const page = getDocPage("");
  if (!page) {
    return (
      <p style={{ fontFamily: "var(--font-v2-ui)", fontSize: "13.5px", color: "var(--v2-ink-muted)" }}>
        Documentation is being written. Check back soon.
      </p>
    );
  }
  return <DocArticle page={page} />;
}
