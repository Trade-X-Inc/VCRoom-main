import { createFileRoute } from "@tanstack/react-router";
import { SectorPage } from "@/components/site/SectorPage";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors/brands-retail — Group 3 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. PLANNED: same treatment as sectors.property.tsx
// — see that file's header comment.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/sectors/brands-retail")({
  head: () => ({
    meta: [
      { title: "Brands and retail — Lengdon" },
      { name: "description", content: "A schedule for brands and retail. Planned." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors/brands-retail" }],
  }),
  component: () => (
    <SectorPage
      eyebrow="Brands and retail"
      hedge="PLANNED"
      title="A schedule for brands and retail."
      sub="This sector page is reserved for a published schedule. No unsupported fields are presented here."
      blockLabel="Status"
      blockBody="No brands-and-retail schedule exists today. When one is published, it will carry the specific fields a retail transaction turns on — not a relabelled version of the technology schedule."
    />
  ),
});
