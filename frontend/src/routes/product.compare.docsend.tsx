import { createFileRoute } from "@tanstack/react-router";
import { CompetitorComparePage } from "@/components/site/CompetitorComparePage";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Content pass, 31 Aug 2026 — "Sealed dual-party export" row and the
// "seal the record" prose claims removed/reworded (not a live
// capability, same standard as CLAUDE.md §12 Group 4). Crypto
// vocabulary removed: "immutable" -> "append-only".

export const Route = createFileRoute("/product/compare/docsend")({
  // SEO-004: this file had no head() at all before this pass — see the
  // matching note on product.compare.datasite.tsx.
  head: () => ({
    meta: [
      { title: "Lengdon vs DocSend — closing infrastructure vs document sharing — Lengdon" },
      { name: "description", content: "DocSend tracks document views and engagement. Compare it to Lengdon's enforced closing sequence and append-only audit trail." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/product/compare/docsend" }],
  }),
  component: CompareDocsend,
});

const ROWS = [
  { feature: "Enforced closing sequence", lengdon: true, them: false, note: "DocSend is a document analytics and sharing tool. It has no closing infrastructure." },
  { feature: "Per-person NDA enforcement", lengdon: true, them: false, note: "DocSend tracks who viewed a document. It does not enforce individual NDAs in a transaction context." },
  { feature: "Dual-party confirmation logic", lengdon: true, them: false, note: "DocSend is built for one-directional sharing — sender sends, receiver views. Bilateral confirmation isn't its model." },
  { feature: "Append-only audit trail", lengdon: true, them: false, note: "DocSend analytics show views and time spent — not a transaction audit record." },
  { feature: "Payment confirmation step", lengdon: true, them: false, note: "" },
  { feature: "Document sharing with view tracking", lengdon: false, them: true, note: "DocSend excels at controlled document distribution with analytics." },
  { feature: "Pitch deck delivery and tracking", lengdon: false, them: true, note: "Lengdon is post-term-sheet infrastructure — not for early-stage pitching." },
  { feature: "NDA gating on documents", lengdon: true, them: true, note: "DocSend NDA gating is form-based. Lengdon's is identity-bound and sequence-enforced." },
  { feature: "Investor engagement analytics", lengdon: false, them: true, note: "" },
];

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /product/compare
// (product.compare.index.tsx) is a real hub page.
const DOCSEND_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Compare", url: "https://lengdon.com/product/compare" },
  { name: "Lengdon vs DocSend" },
]);

function CompareDocsend() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DOCSEND_BREADCRUMB_JSON_LD }} />
    <CompetitorComparePage
      eyebrow="Lengdon vs DocSend"
      title="VIEWED."
      titleOutline="VS CLOSED."
      subtitle="DocSend tells you who looked at your pitch deck and for how long. Lengdon closes the transaction after they've said yes. Engagement analytics and closing infrastructure are not the same product."
      competitorName="DocSend"
      competitorBlurbTitle={'"They spent 4 minutes on your financials slide."'}
      competitorBlurb="DocSend is optimized for the pre-deal phase — getting your documents in front of investors, understanding engagement, and controlling who can access what before terms are agreed. It's a distribution and analytics tool."
      lengdonBlurbTitle={'"Signing confirmed. Both parties have signed."'}
      lengdonBlurb="Lengdon begins after DocSend's work is done. Once terms are agreed and both parties are committed, Lengdon sequences the close, enforces each step, and keeps an append-only record of every action."
      rows={ROWS}
      ctaTitle="They said yes. Now close it."
      ctaSubtitle="DocSend got you to term sheet. Lengdon closes it, with a record."
    />
    </>
  );
}
