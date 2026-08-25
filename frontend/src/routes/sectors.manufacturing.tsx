import { createFileRoute } from "@tanstack/react-router";
import { SectorPage } from "@/components/site/SectorPage";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors/manufacturing — Group 3 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: no manufacturing schedule exists —
// confirmed pack_v1.schedule holds exactly one row (technology/seed, v1,
// CLAUDE.md §20.1 step 2d). Copy names the specific fields a manufacturing
// schedule would carry (per public-site-spec.html section C's own
// manufacturing seed line), not a generic placeholder — this is the one
// sector, besides technology, the spec builds "concretely."
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/sectors/manufacturing")({
  head: () => ({
    meta: [
      { title: "Manufacturing and trade — Lengdon" },
      { name: "description", content: "Structured fields and checklist for manufacturing and trade deals. Early access." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors/manufacturing" }],
  }),
  component: () => (
    <SectorPage
      eyebrow="Manufacturing and trade"
      hedge="EARLY ACCESS"
      title="Diligence manufacturing on fields it actually has."
      sub="The generic data room assumes software metrics. Manufacturing runs on purchase orders, supplier concentration, plant and equipment, and working-capital cycle — this schedule carries them."
      blockLabel="What the schedule will carry"
      blockBody="Purchase orders, supplier concentration, plant and equipment, and working-capital cycle — the fields a trade or manufacturing deal turns on, that no software-shaped schedule holds."
      ctaLabel="Register interest in the manufacturing schedule"
    />
  ),
});
