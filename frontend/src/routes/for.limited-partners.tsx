import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconEye, PrIconFile, PrIconLock, PrIconShield,
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

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const LIMITED_PARTNERS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Limited partners" },
]);

function LimitedPartners() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LIMITED_PARTNERS_BREADCRUMB_JSON_LD }} />
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
          <PrStageStrip label="Where you enter" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconEye />} title="Read access to the original" body="The same structured fields the deal was built on — not a summary written for you, where the vehicle you back permissions it." />
            <PrCard icon={<PrIconFile />} title="One record per deal" body="Each disclosed item, with its evidence tier shown — referenced to a single deal ID, not a repackaged quarterly letter." />
            <PrCard icon={<PrIconLock />} title="Permissioned by your GP" body="Access is granted by the vehicle that backs you, not by us — read-side only, scoped to what's been shared with you." />
            <PrCard icon={<PrIconShield />} title="No solicitation, no advice" body="We do not solicit LPs, offer securities, or provide investment advice — this is a record layer, not a placement channel." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>You never see the original.</PrTitle>
          <PrProse>Disclosure from a GP arrives as a repackaged summary — a PDF, a slide, a quarterly letter. There's no way to check what the underlying deal actually disclosed, no structured fields, nothing you can reference back to a specific record.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for limited partners</PrEyebrow>
          <PrTitle>The same fields the deal was built on.</PrTitle>
          <PrProse>
            Where the vehicle you back permissions it, you get read access to the same structured fields the deal was built on — the beneficial-ownership schedule, the closing record, each disclosed item with its evidence tier shown, not summarized away.{" "}
            <Link to="/tools/valuation-calculator" style={{ color: "var(--v2-accent)" }}>Check the valuation the round was priced at →</Link>
            {" "}Access is granted by the party you back, not by us.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>The original, not someone's account of it.</PrTitle>
          <PrProse>LP diligence on a GP has historically meant trusting the summary. A structured, referenced closing record gives you the original the deal actually produced, not someone's account of it.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
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
