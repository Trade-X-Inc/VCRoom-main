import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/family-offices — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: confirmed zero family-office-
// specific role/tier in schema — family offices use the identical generic
// investor flow every other role uses; only messaging differs. Hedged
// because the page's own copy ("seat pricing a principal approves") implies
// a seat-pricing mechanism that does not exist yet (see the confirmed
// finding: plan_limits has no seat/sub-audience axis).
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/family-offices")({
  head: () => ({
    meta: [
      { title: "For family offices — Lengdon" },
      {
        name: "description",
        content: "A private, disciplined deal workspace with a full record. Seat pricing, no enterprise contract.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/family-offices" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For family offices"
      hedge="EARLY ACCESS"
      title="Deep diligence. No procurement. No enterprise contract."
      sub="A private, dense workspace for offices that diligence seriously and want none of the enterprise apparatus around it."
      pain="Why it fits"
      painBody="Deep diligence culture, no dedicated tooling, allergic to enterprise procurement. Seat pricing a principal approves without a committee."
      mechanism="Mechanism"
      mechanismBody="Full room, batched diligence, conditions register, sealed export. Everything recorded, nothing shown to anyone without a signed NDA."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
