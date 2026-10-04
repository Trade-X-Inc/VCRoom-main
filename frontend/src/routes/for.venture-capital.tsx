import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconLayers, PrIconFile, PrIconEye, PrIconShield,
} from "@/components/site/PublicRegisterPrimitives";
import { socialMeta } from "@/lib/social-meta";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// Replaces the prior custom PageHero-based build entirely. "Firm-grade"
// language dropped throughout per PUBLIC-REGISTER.md §9 (unsubstantiated
// certification framing).
//
// EARLY ACCESS: no VC-specific mechanic (lifecycle deal view, house
// diligence layered on a sector schedule) is built beyond the generic
// investor deal-room flow yet.

export const Route = createFileRoute("/for/venture-capital")({
  head: () => ({
    meta: [
      { title: "For venture capital — a lifecycle view, not a CRM — Lengdon" },
      { name: "description", content: "Deploying seats. Deals organized by lifecycle state, house diligence on the sector schedule, one record per close." },
      ...socialMeta({ title: "For venture capital — a lifecycle view, not a CRM — Lengdon", description: "Deploying seats. Deals organized by lifecycle state, house diligence on the sector schedule, one record per close.", path: "/for/venture-capital" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/venture-capital" }],
  }),
  component: VentureCapital,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const VENTURE_CAPITAL_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Venture capital" },
]);

function VentureCapital() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: VENTURE_CAPITAL_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Venture capital</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>Too small for enterprise. Too many deals for a CRM.</PrDisplay>
            <PrLead>A fund doing four to eight deals a year doesn't fit a generic data room or a pipeline tracker built for sales.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Where you enter" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconLayers />} title="Lifecycle, not pipeline" body="Deals organized by diligence-and-terms state, not a sales pipeline stage a CRM was never built to track." />
            <PrCard icon={<PrIconFile />} title="One record per close" body="The record produced at close stays attached to the deal, visible across your active portfolio — not scattered across email." />
            <PrCard icon={<PrIconEye />} title="House diligence, on schedule" body="House diligence items sit alongside whatever a sector's own schedule already asks for — nothing rebuilt per deal." />
            <PrCard icon={<PrIconShield />} title="Your pipeline stays yours" body="We do not source or rank deals. We run the transaction once you've found it, and hold the record after." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Nothing tracks a deal the way you need.</PrTitle>
          <PrProse>You're too small a customer for the enterprise vendors and too active a shop for a generic virtual data room. A CRM was never built to track a deal by diligence-and-terms state. House diligence items don't fit anyone's generic template, and once a deal closes, the record lives wherever the last email landed.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for venture capital</PrEyebrow>
          <PrTitle>Deals by lifecycle state, not pipeline stage.</PrTitle>
          <PrProse>
            Each seat sees deals organized by lifecycle state, not a sales pipeline stage. House diligence items sit alongside whatever a sector's own schedule already asks for. Diligence, terms, and closing run through the same room, and the record produced at close stays attached to the deal, visible across your active portfolio.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Model a deal's cap table before term sheet →</Link>
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>You need the record three times over.</PrTitle>
          <PrProse>A fund doing four to eight deals a year needs the record again at the next round, at LP reporting, and at exit. Rebuilding it from email each time costs real weeks. Having it already costs one seat.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>Your pipeline stays yours.</PrTitle>
          <PrProse>We do not source or rank deals — your pipeline is your own. We run the transaction once you've found it, and we hold the record after.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, annually." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Run your next four deals on one record.</PrTitle>
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
