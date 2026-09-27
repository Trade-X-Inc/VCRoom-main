import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
} from "@/components/site/PublicRegisterPrimitives";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// Replaces the prior custom PageHero-based build entirely.
//
// EARLY ACCESS: no LP-specific permissioned-read mechanic against the
// beneficial-ownership schedule is built beyond the generic investor
// deal-room flow yet.
//
// No direct LP pricing tier exists — access runs through the vehicle
// that backs the LP, not a Lengdon plan the LP buys directly. Stated
// as prose in the commercial line rather than a tier/cadence pair for
// that reason.

export const Route = createFileRoute("/for/limited-partners")({
  head: () => ({
    meta: [
      { title: "For limited partners — the original record, not the repackage — Lengdon" },
      { name: "description", content: "Read the same structured fields the deal was built on, permissioned by the vehicle you back. No repackaged summary." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/limited-partners" }],
  }),
  component: LimitedPartners,
});

function LimitedPartners() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Limited partners</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>Read the record. Not the repackage.</PrDisplay>
            <PrLead>GP disclosure arrives as a summary written for you, not the original.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>You never see the original.</PrTitle>
          <PrProse>Disclosure from a GP arrives as a repackaged summary — a PDF, a slide, a quarterly letter. There's no way to check what the underlying deal actually disclosed, no structured fields, nothing you can reference back to a specific record.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>How it works for limited partners</PrEyebrow>
          <PrTitle>The same fields the deal was built on.</PrTitle>
          <PrProse>
            Where the vehicle you back permissions it, you get read access to the same structured fields the deal was built on — the beneficial-ownership schedule, the closing record, each disclosed item with its evidence tier shown, not summarized away.{" "}
            <Link to="/tools/valuation-calculator" style={{ color: "var(--v2-accent)" }}>Check the valuation the round was priced at →</Link>
            {" "}Access is granted by the party you back, not by us.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>The original, not someone's account of it.</PrTitle>
          <PrProse>LP diligence on a GP has historically meant trusting the summary. A structured, referenced closing record gives you the original the deal actually produced, not someone's account of it.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>Read-side only, through your vehicle.</PrTitle>
          <PrProse>We do not solicit LPs, offer securities, or provide investment advice. Access is read-side only, and only through the vehicle that backs you.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="No direct pricing" cadence="Access is granted through the vehicle that backs you, not a Lengdon plan you buy directly." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Ask your GP to run the room on Lengdon.</PrTitle>
            <div>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
            <PrCrossLinks />
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
