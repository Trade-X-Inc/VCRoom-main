import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection, PrPill,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED,
  PrStageStrip, PrCard, PrCardGrid, PrIconLayers, PrIconCheck, PrIconFile, PrIconShield,
} from "@/components/site/PublicRegisterPrimitives";

// SEO-006 — full structural rework, PUBLIC-REGISTER.md v2.0 tokens.
// Replaces the prior custom PageHero-based build entirely. "Acquisition-
// grade" language dropped per PUBLIC-REGISTER.md §9.
//
// Content corrections from the original task brief, per direct
// instruction: no data-residency selection and no service-level tier
// exist — verified false against a live production query (single
// region, no per-room override) and already corrected out of 6 other
// files; this page's own body copy was fixed 8 Sep 2026 but its meta
// description still said "sealed export" until this rewrite, which
// removes both stale claims. No export capability of any kind exists.
//
// EARLY ACCESS: no PE-specific mechanic (multi-party rooms, the enhanced
// conditions register) is built beyond the generic investor deal-room
// flow yet.

export const Route = createFileRoute("/for/private-equity")({
  head: () => ({
    meta: [
      { title: "For private equity — the conditions register, one region — Lengdon" },
      { name: "description", content: "Multi-party rooms and a full conditions register, each item timestamped and attributed. No published data residency claim — one region, honestly." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/private-equity" }],
  }),
  component: PrivateEquity,
});

// SEO-010 (AEO pass): BreadcrumbList JSON-LD. 2-level (Home > Page) —
// no /for hub page exists to link an intermediate segment to.
const PRIVATE_EQUITY_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Private equity" },
]);

function PrivateEquity() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: PRIVATE_EQUITY_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <PrEyebrow>Who it's for / Private equity</PrEyebrow>
              <PrPill>Early access</PrPill>
            </div>
            <PrDisplay>Complex deals. A quote that matches the invoice.</PrDisplay>
            <PrLead>Enterprise data room vendors quote a number, then bill something else. Multi-party rooms shouldn't be a configuration project.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/company/contact">Request early access</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Where you enter" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconLayers />} title="Multi-party rooms" body="Counsel, the principal, and the counterparty in one room — set up once, not reconfigured every deal." />
            <PrCard icon={<PrIconCheck />} title="Conditions register" body="Every condition tracked to satisfaction, timestamped and attributed to the confirming party — not just agreed terms." />
            <PrCard icon={<PrIconFile />} title="One record per deal" body="Every document, term, and condition referenced to a single deal ID — a clean close, not a disputed one later." />
            <PrCard icon={<PrIconShield />} title="One region, stated honestly" body="We run one region today. No per-room data residency selection exists, and we don't claim one." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>No published number, and the invoice never matches.</PrTitle>
          <PrProse>The enterprise data room vendors price at enterprise scale with no published number, and the invoice rarely matches the quote you were given. Setting up a room for counsel, the principal, and the counterparty at once is its own configuration project every time.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for private equity</PrEyebrow>
          <PrTitle>Multi-party rooms, one conditions register.</PrTitle>
          <PrProse>
            PE runs on the same six-gate spine — counsel, agreement, conditions, signing, payment, close — extended for multiple parties in one room, with a full conditions register tracking every item to satisfaction, each with a timestamp and the confirming party's identity. Counsel is scoped in from the terms stage forward.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Model the post-close cap table →</Link>
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>PE closes on conditions, not just terms.</PrTitle>
          <PrProse>The structural difference is the conditions register. PE closes on conditions, not just agreed terms. A record of each condition and exactly when it was satisfied — referenced, timestamped — is the difference between a clean close and a disputed one later.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>One region. No legal opinions.</PrTitle>
          <PrProse>We do not advise on deal structure, provide legal opinions, or act as counsel. We run one region today — there is no per-room data residency selection, and we don't claim one.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <PrCommercialLine tier="Institutional" cadence="Scoped individually. Published on request, not negotiated afterward." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Bring your next acquisition onto a record.</PrTitle>
            <div>
              <PrAction to="/company/contact">Request early access</PrAction>
            </div>
            <PrCrossLinks />
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
