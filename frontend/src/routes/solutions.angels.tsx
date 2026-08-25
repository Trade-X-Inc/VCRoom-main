import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/angels — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. Content per public-site-spec.html section B.
// LIVE per spec (not early-access): angels use the exact generic investor
// deal-room flow every other role uses (deal_room_members role='investor'),
// confirmed no angel-specific mechanic exists or is claimed here — the
// generic flow genuinely IS what this page describes, so no hedge is
// applied. See SolutionAudiencePage for the shared shape.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/angels")({
  head: () => ({
    meta: [
      { title: "For angel investors — Lengdon" },
      {
        name: "description",
        content: "Run a direct angel deal on a short, disciplined spine. NDA to sealed record in days.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/angels" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For angels"
      title="A clean cheque, start to sealed record."
      sub="Run a direct deal in days, not weeks. NDA, a short checklist, one-page terms, close — each step recorded and referenced."
      pain="Mechanism"
      painBody="The Direct spine: brief, present, NDA, an eight-item checklist, one-page terms, sign, close. Built for the small, fast cheque."
      mechanism="Benefit"
      mechanismBody="A record you can point to at the next round, and a decision — invest, hold, decline — captured with a reason."
    />
  ),
});
