import { createFileRoute } from "@tanstack/react-router";
import { DocArticle } from "@/lib/docs/DocArticle";
import { getDocPage } from "@/lib/docs/registry";
import { docHead } from "@/lib/docs/seo";

export const Route = createFileRoute("/docs/")({
  head: () => docHead(""),
  component: DocsIndex,
});

function DocsIndex() {
  const page = getDocPage("");
  if (!page) {
    return <p className="text-sm text-gray-500">Documentation is being written. Check back soon.</p>;
  }
  return <DocArticle page={page} />;
}
