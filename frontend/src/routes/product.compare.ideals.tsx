import { createFileRoute } from "@tanstack/react-router";
import { CompetitorComparePage } from "@/components/site/CompetitorComparePage";

// Content pass, 31 Aug 2026 — "Sealed dual-party export at close" row
// and "sealed" prose claims removed/reworded (not a live capability,
// same standard as CLAUDE.md §12 Group 4). Crypto vocabulary removed:
// "immutable"/"cryptographically sealed" -> "append-only".

export const Route = createFileRoute("/product/compare/ideals")({
  component: CompareIdeals,
});

const ROWS = [
  { feature: "Enforced six-gate closing sequence", lengdon: true, them: false, note: "iDeals provides a virtual data room for document sharing — no enforced transaction sequence." },
  { feature: "Per-person NDA enforcement", lengdon: true, them: false, note: "iDeals NDA workflow is document-based, not identity-bound to each participant." },
  { feature: "Dual-party confirmation at every gate", lengdon: true, them: false, note: "iDeals has no concept of bilateral confirmation per gate." },
  { feature: "Append-only audit trail", lengdon: true, them: false, note: "iDeals activity logs are standard — not append-only or tamper-evident." },
  { feature: "Payment confirmation gate", lengdon: true, them: false, note: "" },
  { feature: "Document storage", lengdon: true, them: true, note: "" },
  { feature: "Bulk upload and folder structure", lengdon: false, them: true, note: "Lengdon is not a general document repository. Documents are tied to gates." },
  { feature: "Q&A module", lengdon: false, them: true, note: "" },
  { feature: "Watermarking", lengdon: false, them: true, note: "" },
];

function CompareIdeals() {
  return (
    <CompetitorComparePage
      eyebrow="Lengdon vs iDeals"
      title="MORE THAN"
      titleOutline="A VDR."
      subtitle="iDeals is a virtual data room — a secure place to share documents during M&A due diligence. Lengdon is a closing infrastructure platform. They're not alternatives; they serve different phases of a transaction."
      competitorName="iDeals"
      competitorBlurbTitle="Virtual data room for M&A due diligence"
      competitorBlurb="iDeals manages document sharing, Q&A, and access permissions during the diligence phase. It's designed for the exploration and negotiation stages of a transaction, not the closing sequence."
      lengdonBlurbTitle="Closing infrastructure for private capital transactions"
      lengdonBlurb="Lengdon begins after terms are agreed. Six gates, two parties, one append-only record. No general document storage, no Q&A module — just the close, done properly."
      rows={ROWS}
      ctaTitle="Diligence done. Now close."
      ctaSubtitle="After iDeals, use Lengdon to close with a permanent record."
    />
  );
}
