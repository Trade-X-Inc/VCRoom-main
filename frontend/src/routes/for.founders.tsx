import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection,
  PrCommercialLine, PrQuietLink, PR_BASE, PR_PANEL, PR_RECESSED,
} from "@/components/site/PublicRegisterPrimitives";

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

function Founders() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <PrEyebrow>Who it's for / Founders</PrEyebrow>
            <PrDisplay maxWidth="16ch">Raise with structure.</PrDisplay>
            <PrLead>You're raising from angels, syndicates, or institutional investors. The closing process should protect you as much as the investor — and leave a record you actually own.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "founder" }}>Initialize a room</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Every commitment needs to be in the record.</PrTitle>
          <PrProse>A raise runs on verbal commitments and scattered email threads. Nothing forces the sequence both sides implicitly agree to — conditions get skipped, signing happens before conditions clear, payments are confirmed on trust. Lengdon captures every action taken by both parties from the moment counsel is confirmed to the moment the room closes.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>How it works for founders</PrEyebrow>
          <PrTitle>From first call to sealed close.</PrTitle>
          <PrProse>
            Initialize a room and invite your counsel. Gate 1 requires both legal teams confirmed before any data is shared — nobody gets access before counsel is in place.{" "}
            <Link to="/tools/safe-note" style={{ color: "var(--v2-accent)" }}>Model your SAFE conversion before your next round →</Link>
            {" "}From there the room guides both parties through Agreement, Conditions, Signing, and Payment in strict sequence, then Close. Add your own conditions precedent and assign each to a named owner — neither side can advance to signing until every condition is marked satisfied.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>Protected. Documented. Yours.</PrTitle>
          <PrProse>Every participant on the investor side signs their own NDA — not a company-level agreement, a named individual one. If someone leaves the firm, their access ends with them. At close, the full audit trail seals: append-only, unchanged from that point on. It belongs to you and the investor jointly, not the platform, and it stays permanent for the life of the room — the document the next round's counsel actually wants to see.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't draft your documents.</PrTitle>
          <PrProse>Your counsel drafts and negotiates the term sheet and the NDA. Lengdon enforces the sequence they agree to and keeps the record of what was agreed and when — it is not a substitute for legal advice.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Standard" cadence="Billed monthly, active raise only." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Initialize a room and begin the six-gate process.</PrTitle>
            <div>
              <PrAction to="/sign-up" search={{ role: "founder" }}>Initialize a room</PrAction>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              <PrQuietLink to="/product/how-it-works">The six-gate sequence</PrQuietLink>
              <PrQuietLink to="/product/pricing">Pricing</PrQuietLink>
              <PrQuietLink to="/for/investors">The investor side</PrQuietLink>
            </div>
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
