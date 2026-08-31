import { createFileRoute } from "@tanstack/react-router";
import { CompetitorComparePage } from "@/components/site/CompetitorComparePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/compare/Docsend.tsx.

export const Route = createFileRoute("/product/compare/docsend")({
  component: CompareDocsend,
});

const ROWS = [
  { feature: "Enforced closing sequence (6 gates)", lengdon: true, them: false, note: "DocSend is a document analytics and sharing tool. It has no closing infrastructure." },
  { feature: "Per-person NDA enforcement", lengdon: true, them: false, note: "DocSend tracks who viewed a document. It does not enforce individual NDAs in a transaction context." },
  { feature: "Dual-party confirmation gate logic", lengdon: true, them: false, note: "DocSend is one-directional — sender pushes, receiver views. No bilateral confirmation." },
  { feature: "Immutable audit trail", lengdon: true, them: false, note: "DocSend analytics show views and time spent — not a transaction audit record." },
  { feature: "Sealed dual-party export", lengdon: true, them: false, note: "DocSend rooms are one-party controlled. Only Lengdon seals a record for both parties at close." },
  { feature: "Payment confirmation gate", lengdon: true, them: false, note: "" },
  { feature: "Document sharing with view tracking", lengdon: false, them: true, note: "DocSend excels at controlled document distribution with analytics." },
  { feature: "Pitch deck delivery and tracking", lengdon: false, them: true, note: "Lengdon is post-term-sheet infrastructure — not for early-stage pitching." },
  { feature: "NDA gating on documents", lengdon: true, them: true, note: "DocSend NDA gating is form-based. Lengdon's is identity-bound and sequence-enforced." },
  { feature: "Investor engagement analytics", lengdon: false, them: true, note: "" },
];

function CompareDocsend() {
  return (
    <CompetitorComparePage
      eyebrow="Lengdon vs DocSend"
      title="VIEWED."
      titleOutline="VS CLOSED."
      subtitle="DocSend tells you who looked at your pitch deck and for how long. Lengdon closes the transaction after they've said yes. Engagement analytics and closing infrastructure are not the same product."
      competitorName="DocSend"
      competitorBlurbTitle={'"They spent 4 minutes on your financials slide."'}
      competitorBlurb="DocSend is optimized for the pre-deal phase — getting your documents in front of investors, understanding engagement, and controlling who can access what before terms are agreed. It's a distribution and analytics tool."
      lengdonBlurbTitle={'"Gate 4 confirmed. Both parties have signed."'}
      lengdonBlurb="Lengdon begins after DocSend's work is done. Once terms are agreed and both parties are committed, Lengdon sequences the close, enforces each gate, and seals the record permanently."
      rows={ROWS}
      ctaTitle="They said yes. Now close it."
      ctaSubtitle="DocSend got you to term sheet. Lengdon seals the close."
    />
  );
}
