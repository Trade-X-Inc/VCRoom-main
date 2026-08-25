import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/syndicates — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: confirmed zero syndicate-lead
// schema/UI exists (no "lead" role, no soft-circle or follower tracking
// anywhere — repo-wide grep returns only two marketing-copy bullets on
// index.tsx/pricing.tsx). Hedged despite lengdon-public-site/app.js's own
// P[] entry omitting the pill for this audience — content correctness
// wins over carrying forward a prior inconsistency (see CLAUDE.md's Group
// 2 verification note on the "10 vs 12" hedge-count correction).
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/syndicates")({
  head: () => ({
    meta: [
      { title: "For syndicate leads — Lengdon" },
      {
        name: "description",
        content: "Publish a lead package with committed amount, track soft-circles and followers, close on one defensible record.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/syndicates" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For syndicate leads"
      hedge="EARLY ACCESS"
      title="Lead the deal. Show your commitment. Keep the book."
      sub="Publish a lead package with your own committed amount disclosed, track soft-circles and followers, and close on one record."
      pain="Mechanism"
      painBody="Lead runs the deal, publishes a lead package with mandatory commitment disclosure. Followers review and commit individually. Soft-circle tracking, follower rights, allocation, a portfolio view."
      mechanism="Why it works"
      mechanismBody="The lead's own committed amount is the strongest signal in private markets. A badge stakes nothing; a cheque stakes something losable."
      boundary="Boundary"
      boundaryBody="We record the syndicate and its commitments. We do not form the vehicle or move funds. Your provider does the entity; we do the record."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
