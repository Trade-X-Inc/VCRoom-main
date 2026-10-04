import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconLock, PrIconLayers, PrIconFile, PrIconEye,
} from "@/components/site/PublicRegisterPrimitives";
import { socialMeta } from "@/lib/social-meta";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// Replaces the prior custom PageHero-based build entirely.
//
// Content correction from the original task brief, per direct
// instruction: "sealed export" does not exist anywhere in the product
// (no export capability of any kind — CLAUDE.md §12/§20.15, and this
// exact page's own prior version already removed this same claim once,
// 8 Sep 2026). Removed entirely rather than reworded around.
//
// EARLY ACCESS: no family-office-specific mechanic beyond the generic
// investor deal-room flow is built yet.

export const Route = createFileRoute("/for/family-offices")({
  head: () => ({
    meta: [
      { title: "For family offices — real diligence, no procurement — Lengdon" },
      { name: "description", content: "A full room, staged diligence, a conditions register. Seat pricing a principal can approve directly — no enterprise contract." },
      ...socialMeta({ title: "For family offices — real diligence, no procurement — Lengdon", description: "A full room, staged diligence, a conditions register. Seat pricing a principal can approve directly — no enterprise contract.", path: "/for/family-offices" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/family-offices" }],
  }),
  component: FamilyOffices,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const FAMILY_OFFICES_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Family offices" },
]);

function FamilyOffices() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAMILY_OFFICES_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Family offices</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>Diligence discipline, without the procurement cycle.</PrDisplay>
            <PrLead>You run diligence the way an institution does. Your tooling still runs on email and PDF.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Where you enter" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconLock />} title="Nothing before the NDA" body="No data room, no materials — nothing is shown to your side until an NDA is signed and countersigned." />
            <PrCard icon={<PrIconLayers />} title="Diligence, batched by stage" body="Requests arrive batched by stage, not drip-fed one at a time — the same discipline an institution runs, without institutional tooling." />
            <PrCard icon={<PrIconFile />} title="Conditions register" body="Every outstanding condition tracked to satisfaction, timestamped and attributed — a defensible record, not a forwarded-email folder." />
            <PrCard icon={<PrIconEye />} title="Seat pricing, principal-approved" body="A principal can approve access directly — no procurement process, no enterprise sales cycle." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Deep diligence, no dedicated tooling.</PrTitle>
          <PrProse>Family offices bring a deep diligence culture with no dedicated tooling to match it. The enterprise data room vendors require a procurement process; the boutique platforms are too light for what you actually check. Everything ends up back in email and attached PDFs.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for family offices</PrEyebrow>
          <PrTitle>A full room, batched by stage.</PrTitle>
          <PrProse>
            A full deal room, diligence requests batched by stage rather than drip-fed one at a time, a conditions register tracking what's outstanding, and a permanent, inspectable record at close. Nothing is shown to the other side until an NDA is signed.{" "}
            <Link to="/tools/valuation-calculator" style={{ color: "var(--v2-accent)", textDecoration: "underline" }}>Run a valuation check before term sheet →</Link>
            {" "}Seat pricing is something a principal approves directly — no procurement process required.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>Defensible to the next generation.</PrTitle>
          <PrProse>A family office that ran diligence on a structured record can defend every decision to the next generation of principals. A closed folder of forwarded emails cannot.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We're the room, not the advisor.</PrTitle>
          <PrProse>We do not provide investment advice, manage assets, or act as custodian of anything. We are the room the deal closes inside.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, annually." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Run your next diligence process on a record.</PrTitle>
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
