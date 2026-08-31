import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Angels.tsx.

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
        { title: "Sealed record at close", desc: "You receive a sealed, signed export of the full audit trail. Your investment, your record — independent of any platform." },
      ]}
      ctaTitle="Start with one room."
      ctaSubtitle="One transaction. One room. Flat fee. No subscription."
      ctaSecondaryLabel="See pricing →"
      ctaSecondaryTo="/product/pricing"
    />
  );
}
