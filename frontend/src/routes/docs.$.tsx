import { createFileRoute, Link } from "@tanstack/react-router";
import { DocArticle } from "@/lib/docs/DocArticle";
import { getDocPage } from "@/lib/docs/registry";
import { docHead } from "@/lib/docs/seo";

export const Route = createFileRoute("/docs/$")({
  head: ({ params }) => docHead(((params as any)._splat ?? "").replace(/\/$/, "")),
  component: DocsPage,
});

function DocsPage() {
  const { _splat } = Route.useParams() as { _splat?: string };
  const slug = (_splat ?? "").replace(/\/$/, "");
  const page = getDocPage(slug);

  if (!page) {
    return (
      <div style={{ maxWidth: "48rem" }}>
        <h1
          className="pub-title"
          style={{ fontFamily: "var(--font-v2-ui)", color: "var(--v2-ink)", margin: "0 0 12px" }}
        >
          Page not found
        </h1>
        <p style={{ fontFamily: "var(--font-v2-doc)", fontSize: "15.5px", lineHeight: 1.7, color: "var(--v2-ink-secondary)" }}>
          There is no documentation page at this address. Start from the{" "}
          <Link to={"/docs" as any} style={{ color: "var(--v2-accent)", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            documentation overview
          </Link>
          .
        </p>
      </div>
    );
  }

  return <DocArticle page={page} />;
}
