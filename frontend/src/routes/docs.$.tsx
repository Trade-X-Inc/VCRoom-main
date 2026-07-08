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
      <div className="max-w-3xl">
        <h1 className="mb-3 text-3xl font-bold text-gray-900" style={{ fontFamily: "Syne, sans-serif" }}>
          Page not found
        </h1>
        <p className="text-[15px] leading-7 text-gray-700">
          There is no documentation page at this address. Start from the{" "}
          <Link to={"/docs" as any} className="text-purple-700 underline underline-offset-2">
            documentation overview
          </Link>
          .
        </p>
      </div>
    );
  }

  return <DocArticle page={page} />;
}
