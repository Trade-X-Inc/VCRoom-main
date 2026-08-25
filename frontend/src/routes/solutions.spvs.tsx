import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/spvs — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: confirmed zero beneficial-ownership
// or vehicle/SPV schema exists anywhere (live information_schema query for
// %beneficial%/%vehicle%/%spv% returns zero rows).
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/spvs")({
  head: () => ({
    meta: [
      { title: "For SPVs — Lengdon" },
      {
        name: "description",
        content: "Beneficial ownership, diligence and closing record for a single vehicle. Early access.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/spvs" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For SPVs"
      hedge="EARLY ACCESS"
      title="One vehicle, one clean record of who owns what."
      sub="Keep the vehicle's diligence, beneficial ownership, and closing record in one place — and carry it into the next round without re-onboarding."
      pain="What it will do"
      painBody="Beneficial ownership schedule — vehicle as holder, underlying participants as a permissioned layer. Direct service to cap-table cleanliness. Anchor co-investment record where an institutional anchor exists."
      mechanism="Boundary"
      mechanismBody="We are the record and process layer. Formation, banking, and fund movement stay with your registered provider. We never take custody."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
