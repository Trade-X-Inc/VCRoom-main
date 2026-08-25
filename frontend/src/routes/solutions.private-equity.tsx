import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/private-equity — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: same PARTIAL finding as
// venture-capital.tsx — multi-party rooms and a conditions register beyond
// the generic per-room checklist are not built; see that file's header
// comment for the schema evidence.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/private-equity")({
  head: () => ({
    meta: [
      { title: "For private equity — Lengdon" },
      {
        name: "description",
        content: "Multi-party rooms, conditions register, counsel stage, sealed export. Institutional pricing on the page.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/private-equity" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For private equity"
      hedge="EARLY ACCESS"
      title="The enterprise data room, without the enterprise invoice."
      sub="Multi-party rooms, a full conditions register, counsel from the term stage, and a sealed export — at a published price."
      pain="Mechanism"
      painBody="Institutional spine: multi-party rooms, an enhanced schedule, a full conditions register, counsel scoped to closing, data residency and service level."
      mechanism="Commercial line"
      mechanismBody="Institutional pricing is scoped individually rather than negotiated line by line. Write to hello@lengdon.com to start the conversation."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
