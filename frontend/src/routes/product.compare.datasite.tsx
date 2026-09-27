import { createFileRoute } from "@tanstack/react-router";
import { CompetitorComparePage } from "@/components/site/CompetitorComparePage";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Content pass, 31 Aug 2026 — "sealed dual-copy export at close" row
// removed (not a live capability — CLAUDE.md §12/§20.6, the append-only
// record mechanism is real but unpromoted, 0 real rows). Crypto
// vocabulary removed sitewide: "immutable"/"cryptographically" ->
// "append-only"/"tamper-evident".

export const Route = createFileRoute("/product/compare/datasite")({
  // SEO-004: this file had no head() at all before this pass — found while
  // building the sitemap (the user's own approved page set includes this
  // route). Title/description drawn from this file's own ROWS content
  // below, not invented.
  head: () => ({
    meta: [
      { title: "Lengdon vs Datasite — closing infrastructure vs a document repository — Lengdon" },
      { name: "description", content: "Datasite is a document repository with no enforced closing sequence. See how Lengdon's six-gate process and per-person NDAs compare." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/product/compare/datasite" }],
  }),
  component: CompareDatasite,
});

const ROWS = [
  { feature: "Enforced six-gate closing sequence", lengdon: true, them: false, note: "Datasite is a document repository with no enforced transaction sequence." },
  { feature: "Per-person NDA — individual, not company-level", lengdon: true, them: false, note: "Datasite access is typically granted at group/company level. Lengdon binds access to the individual." },
  { feature: "Dual-party confirmation at every gate", lengdon: true, them: false, note: "Datasite is built around single-party document upload, not dual confirmation. Lengdon requires both parties to confirm at each gate." },
  { feature: "Append-only audit log", lengdon: true, them: false, note: "Datasite logs, like most data room logs, are admin-editable. Lengdon's log is append-only." },
  { feature: "Payment confirmation gate", lengdon: true, them: false, note: "No data room product includes a payment confirmation gate." },
  { feature: "Document storage and sharing", lengdon: true, them: true, note: "" },
  { feature: "Q&A and redline workflow", lengdon: false, them: true, note: "Lengdon is closing infrastructure, not a diligence platform. It begins after terms are agreed." },
  { feature: "Enterprise AI and search", lengdon: false, them: true, note: "" },
  { feature: "Activity analytics", lengdon: true, them: true, note: "Datasite's analytics serve the seller. Lengdon's record serves both parties equally." },
];

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 3-level — /product/compare
// (product.compare.index.tsx) is a real hub page.
const DATASITE_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Compare", url: "https://lengdon.com/product/compare" },
  { name: "Lengdon vs Datasite" },
]);

function CompareDatasite() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DATASITE_BREADCRUMB_JSON_LD }} />
    <CompetitorComparePage
      eyebrow="Lengdon vs Datasite"
      title="NOT DILIGENCE."
      titleOutline="CLOSING."
      subtitle="Datasite is built for the diligence phase — sharing documents with potential buyers. Lengdon begins where Datasite ends: when both parties have agreed and need to close."
      competitorName="Datasite"
      competitorBlurbTitle="Document access control for M&A diligence"
      competitorBlurb="Datasite manages who can view which documents during the exploration and diligence phases. It's a repository with permissions. It doesn't know what phase of a deal you're in, doesn't enforce sequence, and doesn't produce a closing record."
      lengdonBlurbTitle="Sequenced closing infrastructure for private capital"
      lengdonBlurb="Lengdon begins after diligence is complete and terms are agreed. It enforces the six-gate sequence that takes two parties from agreement to close — producing an append-only record that both parties own permanently."
      rows={ROWS}
      ctaTitle="Use both. Sequence matters."
      ctaSubtitle="Datasite for diligence. Lengdon for close. They serve different phases."
    />
    </>
  );
}
