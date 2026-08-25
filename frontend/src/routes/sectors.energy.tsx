import { createFileRoute } from "@tanstack/react-router";
import { SectorPage } from "@/components/site/SectorPage";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors/energy — Group 3 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. PLANNED: same treatment as sectors.property.tsx
// — see that file's header comment.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/sectors/energy")({
  head: () => ({
    meta: [
      { title: "Energy and resources — Lengdon" },
      { name: "description", content: "A schedule for energy transactions. Planned." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors/energy" }],
  }),
  component: () => (
    <SectorPage
      eyebrow="Energy and resources"
      hedge="PLANNED"
      title="A schedule for energy transactions."
      sub="This sector page is reserved for a published energy schedule. No unsupported fields are presented here."
      blockLabel="Status"
      blockBody="No energy schedule exists today. When one is published, it will carry the specific fields an energy transaction turns on — not a relabelled version of the technology schedule."
    />
  ),
});
