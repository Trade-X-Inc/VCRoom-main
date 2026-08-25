import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/advisors — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS, confirmed against the spec itself:
// public-site-spec.html marks this WAIT explicitly ("new: introducer/
// mediator dashboard") — no advisor/introducer role, dashboard route, or
// disclosed-representation tracking exists in the app today.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/advisors")({
  head: () => ({
    meta: [
      { title: "For advisors and introducers — Lengdon" },
      {
        name: "description",
        content: "A portfolio dashboard for advisory firms and warm-introducers to mediate raises on the record, with disclosed representation. Early access.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/advisors" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For advisors and introducers"
      hedge="EARLY ACCESS"
      title="Run every founder you represent from one desk."
      sub="The operating system for the people who assemble founders and mediate raises — a portfolio dashboard, disclosed representation, and a record for every deal you touch."
      pain="What the dashboard will do"
      painBody="A portfolio view of every founder you represent, every active raise, on one worklist. Your role recorded on each deal — the introducer stakes reputation, and the record shows it. Mediated diligence, requests and answers routed with the single-notice discipline."
      mechanism="Boundary"
      mechanismBody="Advisors mediate and record. We do not pay referral fees, take a percentage of the round, or act as a broker. The advisor's economics are theirs and off-platform."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
