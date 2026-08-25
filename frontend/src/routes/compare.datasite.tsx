import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare/datasite — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. See ComparePage.tsx's header comment for the
// content discipline this and the other four comparison pages follow.
//
// Datasite's category strength (large-scale M&A document hosting) is
// public, verifiable positioning — not a claim about their internals. The
// "Lengdon" column states only capabilities confirmed live in this app:
// the six-gate closing pipeline (how-it-works.tsx), term negotiation state
// machine (same), live auto-minted reference numbers on deal_rooms
// (public schema, migration 20260809060000 — NOT pack_v1), NDA-gated
// disclosure, and published four-tier pricing. Does NOT claim single-
// notice diligence, watermarked releases, or a sealed export artifact —
// all three confirmed unbuilt in the live product.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare/datasite")({
  head: () => ({
    meta: [
      { title: "Datasite alternative — Lengdon" },
      { name: "description", content: "An honest Datasite comparison. Where it leads on M&A-scale document hosting, and where a closing pipeline and term negotiation differ." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare/datasite" }],
  }),
  component: () => (
    <ComparePage
      competitor="Datasite"
      doesWell={[
        ["Enterprise M&A scale", "A mature, widely used virtual data room for large-scale M&A document hosting and sharing."],
        ["Document review tooling", "Redaction, Q&A workflows, and permissioned document review are established parts of the product."],
      ]}
      structuralDiff={[
        ["Primary object", "Documents and sharing", "The closing pipeline and the deal record"],
        ["Closing mechanism", "Outside the room", "Six mutual-confirmation gates, drawn on how-it-works"],
        ["Term negotiation", "Not a built-in workflow", "A real propose/accept/counter state machine, per term"],
        ["Reference numbers", "Not a feature of the product", "Every deal room mints a real, check-digit reference on creation"],
        ["Pricing", "Quoted, enterprise-oriented", "Four tiers, published on /pricing"],
      ]}
      whenToChoose="If you only need to host and share documents for one large M&A process, Datasite may fit. If you want the closing sequence and term negotiation run alongside the documents, on one record, choose Lengdon."
    />
  ),
});
