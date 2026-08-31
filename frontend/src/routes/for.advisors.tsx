import { createFileRoute } from "@tanstack/react-router";
import { SimpleAudiencePage } from "@/components/site/SimpleAudiencePage";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Advisors.tsx.

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
        { title: "Observer access", desc: "Join a transaction room with read-only visibility at any gate. See what's been confirmed, what conditions remain, and what's been signed." },
        { title: "Multi-party coordination", desc: "Manage transactions where you're coordinating across multiple principals, counsel teams, and investors — all within a single, structured room." },
        { title: "Full audit trail", desc: "At close, you and both parties all receive the sealed export. The record of your coordination is permanent and verifiable." },
      ]}
      quote={{
        text: "\"As an advisor, I need to see everything without owning anything. Lengdon gives me full visibility into the transaction without putting me in the chain of custody.\"",
        attribution: "Corporate Finance Advisor, 2026",
      }}
      ctaTitle="Work with us."
      ctaSubtitle="We work with advisors and agents directly. Get in touch to discuss your workflow."
      ctaSecondaryLabel="Contact us →"
      ctaSecondaryTo="/company/contact"
    />
  );
}
