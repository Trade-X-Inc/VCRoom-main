import { createFileRoute } from "@tanstack/react-router";
import { SectorPage } from "@/components/site/SectorPage";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors/healthcare — Group 3 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. PLANNED: same treatment as sectors.property.tsx
// — see that file's header comment.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/sectors/healthcare")({
  head: () => ({
    meta: [
      { title: "Healthcare — Lengdon" },
      { name: "description", content: "A schedule for healthcare transactions. Planned." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors/healthcare" }],
  }),
  component: () => (
    <SectorPage
      eyebrow="Healthcare"
      hedge="PLANNED"
      title="A schedule for healthcare transactions."
      sub="This sector page is reserved for a published healthcare schedule. No unsupported fields are presented here."
      blockLabel="Status"
      blockBody="No healthcare schedule exists today. When one is published, it will carry the specific fields a healthcare transaction turns on — not a relabelled version of the technology schedule."
    />
  ),
});
