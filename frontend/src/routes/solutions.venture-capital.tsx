import { createFileRoute } from "@tanstack/react-router";
import { SolutionAudiencePage } from "@/components/site/SolutionAudiencePage";

// ─────────────────────────────────────────────────────────────────────────────
// /solutions/venture-capital — Group 2 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. EARLY ACCESS: confirmed PARTIAL only — the
// database structurally tolerates >1 investor row per deal_room (no unique
// constraint on deal_room_members(deal_room_id, user_id)), but there is no
// invite UI for a second fund seat and no seat-pricing mechanism, so "seats"
// in this copy describes something not yet buildable by a real user. The
// generic per-room diligence checklist (dd_checklist_items) exists but is
// flat and not layered on a sector schedule as described.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/solutions/venture-capital")({
  head: () => ({
    meta: [
      { title: "For venture capital — Lengdon" },
      {
        name: "description",
        content: "For funds doing four to eight deals a year. Seat pricing, lifecycle deal view, full closing record.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/solutions/venture-capital" }],
  }),
  component: () => (
    <SolutionAudiencePage
      eyebrow="For venture funds"
      hedge="EARLY ACCESS"
      title="Too small for the enterprise vendors. Too serious for the toys."
      sub="For the fund doing four to eight deals a year that wants a disciplined room and a defensible record, at a seat price it approves without procurement."
      pain="Mechanism"
      painBody="Deploying seats. Deals by lifecycle state, not a CRM. Diligence, terms, closing, record. House diligence items layered on the sector schedule."
      mechanism="Boundary"
      mechanismBody="We do not source or rank deals. Your pipeline stays yours. We run the transaction and hold the record."
      ctaTo="/sign-up"
      ctaSearch={{ role: "investor" }}
      ctaLabel="Request early access"
    />
  ),
});
