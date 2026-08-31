import { createFileRoute } from "@tanstack/react-router";
import { CompetitorComparePage } from "@/components/site/CompetitorComparePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/compare/Datasite.tsx.

export const Route = createFileRoute("/product/compare/datasite")({
  component: CompareDatasite,
});

const ROWS = [
  { feature: "Enforced six-gate closing sequence", lengdon: true, them: false, note: "Datasite is a document repository with no enforced transaction sequence." },
  { feature: "Per-person NDA — individual, not company-level", lengdon: true, them: false, note: "Datasite access is granted at group/company level. Lengdon binds access to the individual." },
  { feature: "Dual-party confirmation at every gate", lengdon: true, them: false, note: "Datasite requires only one party to upload. Lengdon requires both parties to confirm at each gate." },
  { feature: "Immutable, append-only audit log", lengdon: true, them: false, note: "Datasite logs are admin-editable. Lengdon's log is cryptographically append-only." },
  { feature: "Sealed dual-copy export at close", lengdon: true, them: false, note: "Datasite rooms are controlled by the room owner. Only Lengdon gives both parties an identical sealed export." },
  { feature: "Payment confirmation gate", lengdon: true, them: false, note: "No data room product includes a payment confirmation gate." },
  { feature: "Document storage and sharing", lengdon: true, them: true, note: "" },
  { feature: "Q&A and redline workflow", lengdon: false, them: true, note: "Lengdon is closing infrastructure, not a diligence platform. It begins after terms are agreed." },
  { feature: "Enterprise AI and search", lengdon: false, them: true, note: "" },
  { feature: "Activity analytics", lengdon: true, them: true, note: "Datasite's analytics serve the seller. Lengdon's record serves both parties equally." },
];

function CompareDatasite() {
  return (
    <CompetitorComparePage
      eyebrow="Lengdon vs Datasite"
      title="NOT DILIGENCE."
      titleOutline="CLOSING."
      subtitle="Datasite is built for the diligence phase — sharing documents with potential buyers. Lengdon begins where Datasite ends: when both parties have agreed and need to close."
      competitorName="Datasite"
      competitorBlurbTitle="Document access control for M&A diligence"
      competitorBlurb="Datasite manages who can view which documents during the exploration and diligence phases. It's a repository with permissions. It doesn't know what phase of a deal you're in, doesn't enforce sequence, and doesn't produce a closing record."
      lengdonBlurbTitle="Sequenced closing infrastructure for private capital"
      lengdonBlurb="Lengdon begins after diligence is complete and terms are agreed. It enforces the six-gate sequence that takes two parties from agreement to sealed close — producing an immutable record that both parties own permanently."
      rows={ROWS}
      ctaTitle="Use both. Sequence matters."
      ctaSubtitle="Datasite for diligence. Lengdon for close. They serve different phases."
    />
  );
}
