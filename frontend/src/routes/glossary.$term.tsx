import { createFileRoute, notFound } from "@tanstack/react-router";
import { GlossaryTermPage } from "@/components/site/GlossaryTerm";
import { getGlossaryEntry, relatedGlossaryEntries } from "@/lib/glossary";

// ─────────────────────────────────────────────────────────────────────────────
// /glossary/$term — Group 6 of the lengdon-public-site/ migration
// (25 Aug 2026). New dynamic route, 10 real entries in src/lib/glossary.ts.
// See GlossaryTerm.tsx's header comment for the per-term verification
// discipline against real app state.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/glossary/$term")({
  loader: ({ params }) => {
    const entry = getGlossaryEntry(params.term);
    if (!entry) throw notFound();
    return entry;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return {
      meta: [
        { title: `${loaderData.term} — Lengdon glossary` },
        { name: "description", content: loaderData.definition.slice(0, 150) },
      ],
      links: [{ rel: "canonical", href: `https://lengdon.com/glossary/${loaderData.slug}` }],
    };
  },
  component: GlossaryTermRoute,
});

function GlossaryTermRoute() {
  const entry = Route.useLoaderData();
  const related = relatedGlossaryEntries(entry.slug);
  return <GlossaryTermPage entry={entry} related={related} />;
}
