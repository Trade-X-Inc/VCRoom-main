import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/SPVs.tsx.
//
// Corrected 8 Sep 2026: "Jurisdiction-aware records" claimed per-room
// UK/EU/US data-residency selection at room creation — no such feature
// exists anywhere in the deal-room code (verified against a live query
// of the real production Supabase project: single region, no per-room
// override). Replaced with a real capability.

export const Route = createFileRoute("/for/spvs")({
  component: SPVs,
});

function SPVs() {
  return (
    <SimpleAudiencePage
      eyebrow="Who it's for · SPVs"
      title="STRUCTURED"
      titleOutline="CLOSING."
      subtitle="Special purpose vehicles add complexity — multiple parties, multiple jurisdictions, multiple signatories. Lengdon handles the sequence regardless of structure."
      heroCta="Talk to us"
      sectionLabel="SPV infrastructure"
      sectionTitle={<>ANY STRUCTURE.<br />ONE SEQUENCE.</>}
      features={[
        { title: "Purpose-built vehicle closing", desc: "SPV transactions involve multiple parties across multiple jurisdictions. Lengdon's room architecture handles the full sequence without requiring all parties to be co-located." },
        { title: "One room, every signatory", desc: "Every LP and signatory in the vehicle is added to the same room, individually NDA-gated and individually confirmed — no side channels, no aggregated GP-level access." },
        { title: "Multi-signatory coordination", desc: "SPV signatories execute documents in their own time, with their own counsel, in their own jurisdiction. No joint session required." },
        { title: "Compliance-grade audit trail", desc: "Every action, every confirmation, and every signature is recorded individually with full timestamps. The audit trail meets institutional compliance standards." },
      ]}
      ctaTitle="Complex structure?"
      ctaSubtitle="Talk to us about your SPV structure. We'll show you how Lengdon fits."
      ctaSecondaryLabel="Contact us →"
      ctaSecondaryTo="/company/contact"
    />
  );
}
