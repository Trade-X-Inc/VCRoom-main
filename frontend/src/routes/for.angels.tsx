import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
} from "@/components/site/PublicRegisterPrimitives";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// No EARLY ACCESS pill: the generic investor deal-room flow genuinely IS
// the product for angels — nothing audience-specific is unbuilt, the one
// exception among these 8 pages (see PublicRegisterPrimitives.tsx and the
// prior /solutions/* effort's own SolutionAudiencePage.tsx comment, which
// made the identical call for this exact audience).

export const Route = createFileRoute("/for/angels")({
  head: () => ({
    meta: [
      { title: "For angel investors — the same close, at any size — Lengdon" },
      { name: "description", content: "Run a personal angel investment on the same six-gate sequence funds use. A checklist, one term sheet, a closing record." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/angels" }],
  }),
  component: Angels,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const ANGELS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Angels" },
]);

function Angels() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ANGELS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <PrEyebrow>Who it's for / Angels</PrEyebrow>
            <PrDisplay>Invest personally. Close on a record.</PrDisplay>
            <PrLead>You fund deals out of your own account. The process shouldn't be looser because the cheque is smaller.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Every round starts from zero.</PrTitle>
          <PrProse>A deal you fund personally runs on email threads and a shared drive. Nothing forces a structured sequence, so the next investor down the line asks the same questions the first one did. A messy signing order follows the company onto its cap table.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>How it works for angels</PrEyebrow>
          <PrTitle>One direct spine. No added steps.</PrTitle>
          <PrProse>
            Angels use the same direct spine as any single-cheque investor: a brief, an NDA, a short, fixed checklist rather than an open-ended back-and-forth, one term sheet, signing, a payment confirmation, then close.{" "}
            <Link to="/tools/safe-note" style={{ color: "var(--v2-accent)" }}>Model how your SAFE converts before the next round →</Link>
            {" "}Nothing scales up for size — a modest cheque runs the identical sequence as a large one.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>The next round asks first.</PrTitle>
          <PrProse>At the next priced round, the incoming lead's counsel reviews the cap table. A referenced closing record for your angel round answers most of what they'd otherwise have to ask. A folder of forwarded emails does not.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't find you deals.</PrTitle>
          <PrProse>There is no directory, no matching, no deal-flow feed to browse. You bring the deal; the room runs the close.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Direct" cadence="Billed once, at first close, per room." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Run your next angel deal on a record.</PrTitle>
            <div>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request access</PrAction>
            </div>
            <PrCrossLinks />
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
