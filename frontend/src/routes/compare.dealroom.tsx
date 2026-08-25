import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare/dealroom — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. See ComparePage.tsx's header comment and
// compare.datasite.tsx's for the content discipline and verified-claims
// list this follows.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare/dealroom")({
  head: () => ({
    meta: [
      { title: "DealRoom alternative — Lengdon" },
      { name: "description", content: "An honest DealRoom comparison. Where it leads on pipeline tooling, and where a mutual-confirmation closing pipeline differs." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare/dealroom" }],
  }),
  component: () => (
    <ComparePage
      competitor="DealRoom"
      doesWell={[
        ["Pipeline and project tooling", "An operating view for deal teams tracking multiple opportunities alongside document sharing."],
        ["Task and workflow management", "Purpose-built for the internal deal-team process, not just document storage."],
      ]}
      structuralDiff={[
        ["Primary object", "Pipeline tracking and documents", "The closing pipeline and the deal record"],
        ["Closing mechanism", "Not a built-in mutual-confirmation gate", "Six gates, both parties confirm independently — drawn on how-it-works"],
        ["Term negotiation", "Not a built-in workflow", "A real propose/accept/counter state machine, per term"],
        ["Reference numbers", "Not a feature of the product", "Every deal room mints a real, check-digit reference on creation"],
        ["Pricing", "Quoted per engagement", "Four tiers, published on /pricing"],
      ]}
      whenToChoose="If your team needs an internal pipeline view across many opportunities, DealRoom addresses that directly. If you want the two-sided closing sequence and term negotiation for a specific deal run on one record, choose Lengdon."
    />
  ),
});
