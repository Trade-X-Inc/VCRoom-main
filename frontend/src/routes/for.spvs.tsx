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
// EARLY ACCESS: the beneficial-ownership schedule / permissioned
// underlying-participant layer is not built beyond the generic investor
// deal-room flow yet.

export const Route = createFileRoute("/for/spvs")({
  head: () => ({
    meta: [
      { title: "For SPVs — one ownership record that carries forward — Lengdon" },
      { name: "description", content: "A beneficial-ownership schedule for the vehicle and its underlying participants, built once and carried into the next round." },
      ...socialMeta({ title: "For SPVs — one ownership record that carries forward — Lengdon", description: "A beneficial-ownership schedule for the vehicle and its underlying participants, built once and carried into the next round.", path: "/for/spvs" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/spvs" }],
  }),
  component: SPVs,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const SPVS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "SPVs" },
]);

function SPVs() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SPVS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / SPVs</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>One vehicle. One record. It carries forward.</PrDisplay>
            <PrLead>The company sees the vehicle. It rarely sees who's actually inside it, until the next round asks.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Where you enter" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconLayers />} title="Vehicle holds, participants sit beneath" body="The vehicle sits in the room as holder of record; underlying participants sit in a permissioned layer beneath it." />
            <PrCard icon={<PrIconFile />} title="One ownership record" body="A beneficial-ownership schedule built once, referenced to the deal ID — not re-created from a spreadsheet at the next round." />
            <PrCard icon={<PrIconEye />} title="Visible to who needs it" body="Underlying participants are visible to the parties who need to see them, and no one else." />
            <PrCard icon={<PrIconShield />} title="We don't form the vehicle" body="We're the record and process layer for the vehicle's transactions. Formation and banking stay with your administrator." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Ownership lives in a spreadsheet, not the deal.</PrTitle>
          <PrProse>Beneficial ownership across a vehicle is maintained in a spreadsheet somewhere, not in the deal itself. The underlying participants are invisible to the company being invested in. At the next round, re-onboarding the same vehicle costs everyone weeks.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for SPVs</PrEyebrow>
          <PrTitle>The vehicle holds. Participants sit beneath it.</PrTitle>
          <PrProse>
            The vehicle sits in the room as the holder of record; its underlying participants sit in a permissioned layer beneath it, visible to the parties who need to see them and no one else. Where an institutional anchor exists, its co-investment sits on the same record.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Model the vehicle's ownership structure →</Link>
            {" "}None of this needs rebuilding at the next round — it carries forward.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>Later rounds stall on unclear ownership.</PrTitle>
          <PrProse>The single most common cause of a delayed later round is an ownership structure nobody can explain quickly. A beneficial-ownership schedule that already exists, and travels with the deal, removes that delay before it starts.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't form the vehicle.</PrTitle>
          <PrProse>We are the record and process layer for the vehicle's transactions. Formation, banking, and moving the actual funds stay with your registered administrator.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, annually — Institutional, scoped individually for larger vehicles." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Run your next SPV close on a record.</PrTitle>
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
