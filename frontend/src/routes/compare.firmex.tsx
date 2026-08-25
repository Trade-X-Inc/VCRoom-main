import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare/firmex — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. See ComparePage.tsx's header comment and
// compare.datasite.tsx's for the content discipline and verified-claims
// list this follows.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare/firmex")({
  head: () => ({
    meta: [
      { title: "Firmex alternative — Lengdon" },
      { name: "description", content: "An honest Firmex comparison. Where it leads on mid-market document hosting, and where a closing pipeline and term negotiation differ." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare/firmex" }],
  }),
  component: () => (
    <ComparePage
      competitor="Firmex"
      doesWell={[
        ["Mid-market document hosting", "A practical, widely used data room for mid-market transactions and general document sharing."],
        ["Straightforward setup", "A lighter-weight workflow than the largest enterprise data rooms."],
      ]}
      structuralDiff={[
        ["Primary object", "Documents and sharing", "The closing pipeline and the deal record"],
        ["Closing mechanism", "Outside the room", "Six mutual-confirmation gates, drawn on how-it-works"],
        ["Term negotiation", "Not a built-in workflow", "A real propose/accept/counter state machine, per term"],
        ["Sector schedules", "One general template", "A published disclosure schedule per sector, technology live"],
        ["Pricing", "Quoted per engagement", "Four tiers, published on /pricing"],
      ]}
      whenToChoose="If a mid-market deal only needs document hosting, Firmex is a reasonable choice. If you want the closing sequence, term negotiation, and a sector-specific schedule on one record, choose Lengdon."
    />
  ),
});
