import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
} from "@/components/site/PublicRegisterPrimitives";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
//
// Content correction from the original task brief, per direct instruction:
// the brief's mechanism note described a "portfolio dashboard... every
// founder you represent, every active raise" and a "sealed export at
// close carries your involvement." Neither is real. The portfolio
// dashboard describes CLAUDE.md §20.15's Advisor Dashboard, an explicit
// frontend-only design preview with no backend and no advisor role — not
// a feature. No export capability of any kind exists anywhere in the
// product. The real, live mechanism for this audience is the `external`
// role (lib/roles.ts) — scoped, read-only, per-room — which is what this
// page describes instead, and what the pre-rewrite version of this exact
// file already correctly described.
//
// EARLY ACCESS: the underlying `external` role exists and is real (not
// unbuilt), but the audience page itself and its framing are new — kept
// consistent with the other 6 non-angels pages per direct instruction.

export const Route = createFileRoute("/for/advisors")({
  head: () => ({
    meta: [
      { title: "For advisors — mediate the raise, stay on the record — Lengdon" },
      { name: "description", content: "Join a founder's room with scoped, read-only access. See every gate, every condition, every signature — without holding the data." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/advisors" }],
  }),
  component: Advisors,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const ADVISORS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Advisors" },
]);

function Advisors() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ADVISORS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Advisors</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>You mediate the deal. The record proves it.</PrDisplay>
            <PrLead>A warm introduction is reputational collateral with nothing behind it. Put your involvement on the record instead.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up" search={{ role: "investor" }}>Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Your involvement lives in an inbox.</PrTitle>
          <PrProse>You're running several founder raises out of one inbox. There's no way to sit between founder and investor with any real visibility into the deal, and no way to show, afterward, exactly what you disclosed and to whom.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>How it works for advisors</PrEyebrow>
          <PrTitle>Read-only access, scoped to your rooms.</PrTitle>
          <PrProse>
            Advisors join a deal room with the read-only role — access scoped to the specific rooms you're added to. You see what's been confirmed, which conditions remain outstanding, and what's been signed, at every gate, without the ability to change anything.{" "}
            <Link to="/tools/burn-rate" style={{ color: "var(--v2-accent)" }}>Check burn rate before advising on runway →</Link>
            {" "}Your involvement is recorded the same way every other party's is.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>Reputational collateral, written down.</PrTitle>
          <PrProse>A warm introduction is reputational collateral with nothing written down. A record that shows you were in the room, at which gates, changes what your involvement is worth the next time you make one.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't broker the deal.</PrTitle>
          <PrProse>Advisors mediate and are recorded. We do not pay referral fees, take a percentage of the round, or act as a broker of record.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, annually, per advisor." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Mediate your next raise on a record.</PrTitle>
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
