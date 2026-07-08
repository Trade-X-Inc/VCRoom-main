import { createFileRoute } from "@tanstack/react-router";
import { DocArticle } from "@/lib/docs/DocArticle";
import { getDocPage } from "@/lib/docs/registry";

export const Route = createFileRoute("/docs/")({
  head: () => {
    const page = getDocPage("");
    return {
      meta: [
        { title: page ? `${page.meta.title} — Hockystick Documentation` : "Hockystick Documentation" },
        ...(page ? [{ name: "description", content: page.meta.description }] : []),
      ],
    };
  },
  component: DocsIndex,
});

function DocsIndex() {
  const page = getDocPage("");
  if (!page) {
    return <p className="text-sm text-gray-500">Documentation is being written. Check back soon.</p>;
  }
  return <DocArticle page={page} />;
}
