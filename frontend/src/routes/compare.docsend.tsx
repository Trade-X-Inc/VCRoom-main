import { createFileRoute } from "@tanstack/react-router";
import { ComparePage } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare/docsend — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. See ComparePage.tsx's header comment and
// compare.datasite.tsx's for the content discipline and verified-claims
// list this follows.
//
// DocSend is a narrower category than the other four (document tracking
// and sharing, not a full data room) — the "does well" and "differs" rows
// reflect that category difference rather than forcing a like-for-like
// comparison.
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare/docsend")({
  head: () => ({
    meta: [
      { title: "DocSend alternative — Lengdon" },
      { name: "description", content: "An honest DocSend comparison. Where it leads on page-level tracking, and where a closing pipeline and term negotiation differ." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare/docsend" }],
  }),
  component: () => (
    <ComparePage
      competitor="DocSend"
      doesWell={[
        ["Page-level engagement tracking", "Shows exactly which pages a recipient viewed and for how long — a real, useful signal for pitch decks."],
        ["Lightweight sharing", "Fast to set up for a single document link, with no full data-room overhead."],
      ]}
      structuralDiff={[
        ["Primary object", "Document tracking and sharing", "The closing pipeline and the deal record"],
        ["Scope", "One document at a time", "A full multi-document deal room per raise"],
        ["Closing mechanism", "Not applicable — tracking only", "Six mutual-confirmation gates, drawn on how-it-works"],
        ["Term negotiation", "Not applicable — tracking only", "A real propose/accept/counter state machine, per term"],
        ["Pricing", "Per-seat subscription", "Four tiers, published on /pricing"],
      ]}
      whenToChoose="If you want to know whether an investor opened your deck and which page they stopped on, DocSend does that well. If you want the diligence, terms, and close for the raise itself run on one record, choose Lengdon."
    />
  ),
});
