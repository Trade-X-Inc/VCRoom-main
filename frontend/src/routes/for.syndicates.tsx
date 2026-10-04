import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconFile, PrIconCheck, PrIconEye, PrIconShield,
} from "@/components/site/PublicRegisterPrimitives";
import { socialMeta } from "@/lib/social-meta";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// EARLY ACCESS: no syndicate-specific mechanic (lead package, disclosed
// commitment, soft-circle tracking) is built beyond the generic
// investor deal-room flow yet.

export const Route = createFileRoute("/for/syndicates")({
  head: () => ({
    meta: [
      { title: "For syndicate leads — a disclosed commitment, a shared record — Lengdon" },
      { name: "description", content: "Publish your commitment, let followers soft-circle and commit individually, and close on one record every member can see." },
      ...socialMeta({ title: "For syndicate leads — a disclosed commitment, a shared record — Lengdon", description: "Publish your commitment, let followers soft-circle and commit individually, and close on one record every member can see.", path: "/for/syndicates" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/syndicates" }],
  }),
  component: Syndicates,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const SYNDICATES_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Syndicates" },
]);

function Syndicates() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SYNDICATES_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Syndicate leads</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>Your commitment is the signal. Make it real.</PrDisplay>
            <PrLead>Followers track soft-circles in spreadsheets today. Put your disclosed cheque, and theirs, on a record instead.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Your lead sequence" activeFrom="Brief" leadStages={["Brief", "Present"]} />
          <PrCardGrid>
            <PrCard icon={<PrIconFile />} title="Publish your commitment" body="Your own committed amount, disclosed formally as lead — not described on a call, published to the room." />
            <PrCard icon={<PrIconEye />} title="Every follower, one record" body="Followers soft-circle and commit individually, each on their own NDA — allocation tracked against the room, not a side spreadsheet." />
            <PrCard icon={<PrIconCheck />} title="Decision recorded" body="Each follower's commitment is timestamped and part of the same deal record every member can see." />
            <PrCard icon={<PrIconShield />} title="We don't form the vehicle" body="We record the syndicate and every commitment inside it. Vehicle formation and moving funds stay with your counsel and bank." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Allocation is a conversation, not a record.</PrTitle>
          <PrProse>The lead's commitment is the strongest signal in the deal, but there's nowhere to publish it formally. Followers track interest in spreadsheets and group chats. Final allocation is a conversation, not something either side can point back to afterward.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for syndicate leads</PrEyebrow>
          <PrTitle>Publish the package. Track every follower.</PrTitle>
          <PrProse>
            As lead, you publish a lead package with your own committed amount disclosed. Followers review it, soft-circle their interest, and commit individually — each on their own NDA, each with their own signature.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Model the cap table across your syndicate →</Link>
            {" "}Allocation is tracked against the room itself, not a side spreadsheet, and every follower keeps a view onto the same record.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>A badge stakes nothing. A cheque does.</PrTitle>
          <PrProse>A badge or a title stakes nothing. A disclosed, committed amount on a record is money a lead could lose — that's why followers weight it the way they do. Publishing it formally, instead of describing it on a call, is the difference.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't form the vehicle.</PrTitle>
          <PrProse>We record the syndicate and every commitment inside it. We do not form the special purpose vehicle and we do not move funds — that stays with your counsel and your bank.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, annually, per lead." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Lead your next syndicate on a record.</PrTitle>
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
