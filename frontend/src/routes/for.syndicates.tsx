import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Syndicates.tsx.

export const Route = createFileRoute("/for/syndicates")({
  component: Syndicates,
});

function Syndicates() {
  return (
    <SimpleAudiencePage
      eyebrow="Who it's for · Syndicates"
      title="LEAD THE"
      titleOutline="SYNDICATE."
      subtitle="You coordinate groups of investors into a single closing. You need a room where everyone follows the same process, and everyone gets the same record."
      heroCta="Talk to us"
      sectionLabel="Syndicate infrastructure"
      sectionTitle={<>EVERYONE IN.<br />ONE RECORD.</>}
      features={[
        { title: "One room, multiple investors", desc: "Invite every syndicate member into a single transaction room. Each investor follows the same six-gate sequence independently." },
        { title: "Collective conditions tracking", desc: "Conditions are tracked across the full syndicate. The system enforces that every condition is satisfied before the group advances to signing." },
        { title: "Per-investor payment confirmation", desc: "Each investor uploads their own payment proof. Each confirmation is recorded individually. The room only closes when all confirmations are in." },
        { title: "Shared record at close", desc: "Every syndicate member receives the same sealed export at close. The record belongs to all parties — not just the lead." },
      ]}
      ctaTitle="Running a syndicate?"
      ctaSubtitle="We work with syndicate leads directly. Book a call to see how Lengdon fits your deal flow."
      ctaSecondaryLabel="Book a demo →"
      ctaSecondaryTo="/company/contact"
    />
  );
}
