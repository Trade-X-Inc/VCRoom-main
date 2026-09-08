import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Angels.tsx.
//
// Corrected 8 Sep 2026: "Sealed record at close" claimed a "sealed,
// signed export" — no export capability of any kind exists (CLAUDE.md
// §12, §20.15). Reworded to describe the real permanent record.

export const Route = createFileRoute("/for/angels")({
  component: Angels,
});

function Angels() {
  return (
    <SimpleAudiencePage
      eyebrow="Who it's for · Angels"
      title="INVEST"
      titleOutline="WITH CERTAINTY."
      subtitle="You invest personally. You deserve the same closing infrastructure that institutional investors take for granted — regardless of check size."
      heroCta="Initialize a room"
      sectionLabel="For Angels"
      sectionTitle={<>YOUR CAPITAL.<br />YOUR RECORD.</>}
      features={[
        { title: "Formal structure for informal deals", desc: "Angel investments often lack the process that institutional deals have. Lengdon gives you the same closing infrastructure regardless of deal size." },
        { title: "Independent signing workflow", desc: "Sign documents in your own time, with your own counsel present — not in a shared session where pressure can be applied." },
        { title: "Payment proof confirmation", desc: "Upload your proof of transfer. The founder confirms receipt. Both confirmations are in the record before the room closes." },
        { title: "Permanent record at close", desc: "The full audit trail is sealed and preserved, unchanged, for as long as the deal room exists — your investment, your record, always visible to you." },
      ]}
      ctaTitle="Start with one room."
      ctaSubtitle="One transaction. One room. Flat fee. No subscription."
      ctaSecondaryLabel="See pricing →"
      ctaSecondaryTo="/product/pricing"
    />
  );
}
