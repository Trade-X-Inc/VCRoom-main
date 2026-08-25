import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/limited-partners — Group 2 of the lengdon-public-site/
// migration (25 Aug 2026). New page. EARLY ACCESS: confirmed zero LP role,
// beneficial-ownership schedule, or evidence-tier concept exists anywhere
// (repo grep + live information_schema query both return zero).
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/limited-partners")({
  head: () => ({
    meta: [
      { title: "For limited partners — Lengdon" },
      {
        name: "description",
        content: "Read the same fields the deal was built on, permissioned by the vehicle you back. Early access.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/limited-partners" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For LPs"
      hedge="EARLY ACCESS"
      title="See the same fields the deal was built on."
      sub="When a vehicle you back runs on the record, you read structured, referenced disclosure — not a repackaged summary."
      pain="What it will do"
      painBody="Permissioned read against the beneficial-ownership schedule and the closing record. The same structured fields, in your language, with the evidence tier shown."
      mechanism="Boundary"
      mechanismBody="Read-side, permissioned by the vehicle. We do not solicit LPs or offer securities. Access is granted by the party you back."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Register interest"
    />
  ),
});
