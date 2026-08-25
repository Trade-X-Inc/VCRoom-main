import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare/ideals — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. See ComparePage.tsx's header comment and
// compare.datasite.tsx's for the content discipline and verified-claims
// list this follows.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare/ideals")({
  head: () => ({
    meta: [
      { title: "iDeals alternative — Lengdon" },
      { name: "description", content: "An honest iDeals comparison. Where it leads on usability, and where a closing pipeline and term negotiation differ." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare/ideals" }],
  }),
  component: () => (
    <ComparePage
      competitor="iDeals"
      doesWell={[
        ["A usable virtual data room", "A familiar, well-regarded sharing workflow for document-centric due diligence."],
        ["Broad customer base", "Used across a range of transaction sizes, not limited to the largest deals."],
      ]}
      structuralDiff={[
        ["Primary object", "Documents and sharing", "The closing pipeline and the deal record"],
        ["Closing mechanism", "Outside the room", "Six mutual-confirmation gates, drawn on how-it-works"],
        ["Term negotiation", "Not a built-in workflow", "A real propose/accept/counter state machine, per term"],
        ["Reference numbers", "Not a feature of the product", "Every deal room mints a real, check-digit reference on creation"],
        ["Pricing", "Quoted per engagement", "Four tiers, published on /pricing"],
      ]}
      whenToChoose="If you need a familiar document-sharing workflow for one deal, iDeals is a reasonable choice. If you want the closing sequence and term negotiation run on the same record as the documents, choose Lengdon."
    />
  ),
});
