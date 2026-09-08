import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Advisors.tsx.
//
// Corrected 8 Sep 2026: "Observer access" was invented terminology for a
// real underlying capability — the real role is `external` (see
// lib/roles.ts), the investor-team role built for exactly this use case
// ("third-party DD firms and agencies"), scoped read-only to assigned
// deal rooms. Reworded to name the real role rather than an invented
// one. "The sealed export" removed — no export capability exists (see
// CLAUDE.md §12, §20.15) — replaced with the real permanent, in-room
// record. "Transaction room(s)" corrected to "deal room(s)" throughout.

export const Route = createFileRoute("/for/advisors")({
  component: Advisors,
});

function Advisors() {
  return (
    <SimpleAudiencePage
      eyebrow="Who it's for · Advisors & Agents"
      title="COORDINATE."
      titleOutline="DON'T CONTROL."
      subtitle="You facilitate transactions between parties. You need visibility without becoming a custodian of the data — and a record that proves you did your job."
      heroCta="Learn more"
      sectionLabel="Built for advisors"
      sectionTitle={<>YOUR ROLE.<br />YOUR ACCESS.</>}
      features={[
        { title: "Neutral record", desc: "Lengdon records every action by both parties without you controlling the platform. You're in the room — you're not the room owner." },
        { title: "Read-only access, scoped per room", desc: "Join a deal room with read-only visibility at any gate. See what's been confirmed, what conditions remain, and what's been signed — without being able to change anything." },
        { title: "Multi-party coordination", desc: "Manage deals where you're coordinating across multiple principals, counsel teams, and investors — all within a single, structured room." },
        { title: "Full audit trail", desc: "The append-only record of the room — every action, confirmation, and signature — stays in place and inspectable for the life of the deal." },
      ]}
      quote={{
        text: "\"As an advisor, I need to see everything without owning anything. Lengdon gives me full visibility into the deal without putting me in the chain of custody.\"",
        attribution: "Corporate Finance Advisor, 2026",
      }}
      ctaTitle="Work with us."
      ctaSubtitle="We work with advisors and agents directly. Get in touch to discuss your workflow."
      ctaSecondaryLabel="Contact us →"
      ctaSecondaryTo="/company/contact"
    />
  );
}
