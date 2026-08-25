import { createFileRoute } from "@tanstack/react-router";
import { SectorPage } from "@/components/site/SectorPage";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors/property — Group 3 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. PLANNED: honest stub, no property schedule
// exists and no specific fields are invented — confirmed pack_v1.schedule
// holds only the technology/seed row.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/sectors/property")({
  head: () => ({
    meta: [
      { title: "Property — Lengdon" },
      { name: "description", content: "A schedule for property transactions. Planned." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors/property" }],
  }),
  component: () => (
    <SectorPage
      eyebrow="Property"
      hedge="PLANNED"
      title="A schedule for property transactions."
      sub="This sector page is reserved for a published property schedule. No unsupported fields are presented here."
      blockLabel="Status"
      blockBody="No property schedule exists today. When one is published, it will carry the specific fields a property transaction turns on — not a relabelled version of the technology schedule."
    />
  ),
});
