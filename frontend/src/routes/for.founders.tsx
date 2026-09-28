import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection,
  PrCommercialLine, PrQuietLink, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconLock, PrIconCheck, PrIconFile, PrIconTimer,
} from "@/components/site/PublicRegisterPrimitives";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// SEO-009 Phase 3 — bespoke rebuild on PUBLIC-REGISTER.md v2.0 tokens,
// same pattern as the 8 SEO-006 /for/* pages (PublicRegisterPrimitives,
// not a shared wrapper). Correction to the SEO-009 Step-0 audit: this
// file was reported as a SimpleAudiencePage consumer; it never was —
// the only "SimpleAudiencePage" hit was a comment stating the opposite
// ("not built from SimpleAudiencePage"). The real starting point was a
// PageHero-based bespoke build, now replaced with this one.
//
// Content preserved/adapted from the prior v1 build, not reinvented —
// including its two prior corrections: no "export" language (no export
// capability exists, CLAUDE.md §12/§20.15) and no fabricated testimonial
// (removed 13 Sep 2026, never restored). No EARLY ACCESS pill: same
// reasoning as for.angels.tsx — this is the generic founder-side flow,
// which genuinely is the product, nothing audience-specific is unbuilt.

export const Route = createFileRoute("/for/founders")({
  head: () => ({
    meta: [
      { title: "For founders — close the round, keep the record clean — Lengdon" },
      { name: "description", content: "A fixed raise spine, conditions you can enforce, and a permanent record that carries to the next round. No sequence you have to police yourself." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/founders" }],
  }),
  component: Founders,
});

// SEO-010 (AEO pass): FAQPage + BreadcrumbList JSON-LD. Answers are
// direct and factual — written to the standard of "would this be the
// answer you'd want Lengdon cited for," per the content rules for this
// pass. No verification/scoring/matching/introduction-brokering claims.
const FOUNDERS_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I share my pitch deck safely?",
      acceptedAnswer: { "@type": "Answer", text: "Require the investor to sign an individual, per-person NDA before the deck goes out — not a company-wide agreement, and not after the fact. In a Lengdon room, that signature gates the deck: nothing sensitive unlocks until it exists, so there's a permanent record of who agreed to confidentiality and when, rather than a deck circulating with no agreement attached to it at all." },
    },
    {
      "@type": "Question",
      name: "What happens after an investor signs an NDA?",
      acceptedAnswer: { "@type": "Answer", text: "The deal room's next tier of documents unlocks for that specific investor — the pitch deck and early materials become visible, and the relationship enters the diligence and terms stages of the process. The signature is tied to that individual, not their firm, so their access ends if they leave it." },
    },
    {
      "@type": "Question",
      name: "What is a deal room?",
      acceptedAnswer: { "@type": "Answer", text: "A deal room is a structured, permissioned space where a founder and an investor exchange the documents, terms, and confirmations a fundraising round requires, with every action recorded. It differs from a shared folder or DocSend link in three ways: it gates sensitive documents behind a signed NDA, it scopes each investor's access to what's actually been agreed with them, and it tracks which stage the relationship has reached — brief, NDA, diligence, terms, conditions, close." },
    },
    {
      "@type": "Question",
      name: "How do I track which investors have seen my deck?",
      acceptedAnswer: { "@type": "Answer", text: "Each investor's access happens inside their own room, tied to their individual NDA and identity — so a founder can see exactly which investor has reached which stage, rather than reconstructing it from a DocSend view count or an email thread. Access and stage progression are recorded per person, not per link." },
    },
    {
      "@type": "Question",
      name: "When should I start a data room?",
      acceptedAnswer: { "@type": "Answer", text: "Before the first pitch deck goes out, not after an investor asks for one. Setting up the room's tiers upfront — what's visible pre-NDA, what unlocks after signature, what's reserved for active diligence — means every subsequent investor conversation reuses the same structure instead of being decided fresh each time, and the NDA gate is already in place before anything sensitive is shared." },
    },
  ],
});

const FOUNDERS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "For founders" },
]);

function Founders() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FOUNDERS_FAQ_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FOUNDERS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <PrEyebrow>Who it's for / Founders</PrEyebrow>
            <PrDisplay maxWidth="16ch">Raise with structure.</PrDisplay>
            <PrLead>Lengdon gives founders a structured deal room for closing a private raise — a fixed sequence from NDA to close, conditions you can enforce, and a permanent record you keep. It protects you as much as the investor.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "founder" }}>Initialize a room</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Your raise spine" activeFrom="Brief" />
          <PrCardGrid>
            <PrCard icon={<PrIconLock />} title="Counsel confirmed first" body="Neither side gets access to shared data until both legal teams are confirmed in the room — no gate can be skipped." />
            <PrCard icon={<PrIconCheck />} title="Conditions you can enforce" body="Add your own conditions precedent and assign each to a named owner. The room won't advance to signing until every one is marked satisfied." />
            <PrCard icon={<PrIconFile />} title="One record per raise" body="Every document, term, and confirmation is referenced to a single deal ID — not scattered across email threads and shared folders." />
            <PrCard icon={<PrIconTimer />} title="Billed on the raise" body="No cost to founders for a Standard room. Billing is monthly and tied to an active raise, not a flat annual license." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Every commitment needs to be in the record.</PrTitle>
          <PrProse>A raise runs on verbal commitments and scattered email threads. Nothing forces the sequence both sides implicitly agree to — conditions get skipped, signing happens before conditions clear, payments are confirmed on trust. Lengdon captures every action taken by both parties from the moment counsel is confirmed to the moment the room closes.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for founders</PrEyebrow>
          <PrTitle>From first call to sealed close.</PrTitle>
          <PrProse>
            Initialize a room and invite your counsel. At the start of closing, either party may engage legal counsel — or both may agree to proceed without. Either way, the decision is recorded.{" "}
            <Link to="/tools/safe-note" style={{ color: "var(--v2-accent)" }}>Model your SAFE conversion before your next round →</Link>
            {" "}From there the room guides both parties through NDA, Diligence, Terms, and Conditions in strict sequence, then Close. Add your own conditions precedent and assign each to a named owner — neither side can advance to Close until every condition is marked satisfied.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>Protected. Documented. Yours.</PrTitle>
          <PrProse>Every participant on the investor side signs their own NDA — not a company-level agreement, a named individual one. If someone leaves the firm, their access ends with them. At close, the full audit trail seals: append-only, unchanged from that point on. It belongs to you and the investor jointly, not the platform, and it stays permanent for the life of the room — the document the next round's counsel actually wants to see.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't draft your documents.</PrTitle>
          <PrProse>Your counsel drafts and negotiates the term sheet and the NDA. Lengdon enforces the sequence they agree to and keeps the record of what was agreed and when — it is not a substitute for legal advice.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Standard" cadence="Billed monthly, active raise only." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Initialize a room and begin the seven-stage process.</PrTitle>
            <div>
              <PrAction to="/sign-up" search={{ role: "founder" }}>Initialize a room</PrAction>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              <PrQuietLink to="/product/how-it-works">The seven-stage sequence</PrQuietLink>
              <PrQuietLink to="/product/pricing">Pricing</PrQuietLink>
              <PrQuietLink to="/for/investors">The investor side</PrQuietLink>
              <PrQuietLink to="/tools">Free tools</PrQuietLink>
              <PrQuietLink to="/templates">Templates</PrQuietLink>
            </div>
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
