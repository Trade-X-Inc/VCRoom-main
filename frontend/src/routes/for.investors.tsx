import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection,
  PrCommercialLine, PrCrossLinks, PrQuietLink, PR_BASE, PR_PANEL, PR_RECESSED, PR_INK, PR_INK_3, PR_RULE,
  PrStageStrip, PrCard, PrCardGrid, PrIconLock, PrIconEye, PrIconFile, PrIconCheck,
} from "@/components/site/PublicRegisterPrimitives";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// SEO-009 Phase 3 — bespoke rebuild on PUBLIC-REGISTER.md v2.0 tokens,
// same pattern as for.founders.tsx (see that file's header comment for
// the SimpleAudiencePage correction — identical situation here). Content
// preserved/adapted from the prior v1 build, including its two prior
// corrections: no "sealed export" language (CLAUDE.md §12/§20.15) and
// no fabricated testimonial (removed 13 Sep 2026 — a fabricated quote
// attributed to a named-seeming person, never restored). No EARLY
// ACCESS pill: same reasoning as for.angels.tsx/for.founders.tsx — this
// is the generic investor-side flow, which genuinely is the product.

export const Route = createFileRoute("/for/investors")({
  head: () => ({
    meta: [
      { title: "For investors — diligence and close on a defensible record — Lengdon" },
      { name: "description", content: "Angels to institutions. One disciplined deal spine, condition visibility in real time, and a permanent audit record you keep." },
      ...socialMeta({ title: "For investors — diligence and close on a defensible record — Lengdon", description: "Angels to institutions. One disciplined deal spine, condition visibility in real time, and a permanent audit record you keep.", path: "/for/investors" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/for/investors" }],
  }),
  component: Investors,
});

const INVESTOR_TYPES = [
  { label: "Angels", desc: "Formal process for informal deals", path: "/for/angels" },
  { label: "Venture Capital", desc: "A lifecycle view, not a CRM", path: "/for/venture-capital" },
  { label: "Private Equity", desc: "Complex deals, clean record", path: "/for/private-equity" },
  { label: "Syndicates", desc: "Lead a group into a close", path: "/for/syndicates" },
  { label: "Family Offices", desc: "Real diligence, no procurement", path: "/for/family-offices" },
  { label: "Limited Partners", desc: "Your capital, your record", path: "/for/limited-partners" },
];

// SEO-010 (AEO pass): FAQPage + BreadcrumbList JSON-LD. Same content
// discipline as for.founders.tsx's own FAQ block — no verification,
// scoring, matching, or introduction-brokering claims.
const INVESTORS_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I manage deal flow without a CRM?",
      acceptedAnswer: { "@type": "Answer", text: "A deal room replaces the tracking a CRM would otherwise do for each opportunity: it shows which stage a given deal has reached — brief, NDA, diligence, terms, conditions, close — without you maintaining a separate spreadsheet or pipeline board. Each room is scoped to one company, so status is read from the room itself rather than reconstructed from notes." },
    },
    {
      "@type": "Question",
      name: "What should a deal room include?",
      acceptedAnswer: { "@type": "Answer", text: "At minimum: a signed, individual NDA gating sensitive documents; per-investor permissioning so access matches what's actually been agreed; a visible lifecycle showing which stage the deal has reached; and a permanent, append-only record of terms, conditions, and confirmations that both sides can point back to after close." },
    },
    {
      "@type": "Question",
      name: "How do I share deal documents with my LP?",
      acceptedAnswer: { "@type": "Answer", text: "Lengdon doesn't provide LP reporting or fund-administration tooling — it records the deal-room process itself (documents, terms, conditions, confirmations) so that record exists if you need to produce evidence of process to an LP separately. It is not a substitute for your fund's own LP communication or reporting system." },
    },
    {
      "@type": "Question",
      name: "What is per-room permissioning?",
      acceptedAnswer: { "@type": "Answer", text: "Each deal room scopes document and information access to that specific room's members — a founder and the investors they've individually invited into it. An investor in one room has no visibility into a different founder's room, and access within a room is tied to each signed NDA, not shared broadly across a firm." },
    },
    {
      "@type": "Question",
      name: "How do I run diligence on multiple deals at once?",
      acceptedAnswer: { "@type": "Answer", text: "Each deal you're evaluating lives in its own room, so diligence on one doesn't get mixed into another — documents, conditions, and communication stay scoped per deal. You can see where each individual room stands in its lifecycle without a shared tracker, since the room itself carries that state." },
    },
  ],
});

const INVESTORS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "For investors" },
]);

function Investors() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: INVESTORS_FAQ_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: INVESTORS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <PrEyebrow>Who it's for / Investors</PrEyebrow>
            <PrDisplay maxWidth="16ch">Invest with a record.</PrDisplay>
            <PrLead>Every deal you participate in through Lengdon is structured, sequenced, and permanently recorded — so the record of your diligence and the terms you agreed to is yours to keep.</PrLead>
            <div style={{ marginTop: "8px" }}>
              <PrAction to="/sign-up">Create investor account</PrAction>
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrStageStrip label="Your entry point" activeFrom="NDA" />
          <PrCardGrid>
            <PrCard icon={<PrIconLock />} title="NDA before data" body="Access is gated. You sign your own individual NDA before any sensitive document unlocks — not a company-wide agreement." />
            <PrCard icon={<PrIconEye />} title="Full stage visibility" body="You see exactly which stage a deal has reached — NDA, diligence, terms, conditions, close — without asking the founder for a status update." />
            <PrCard icon={<PrIconFile />} title="One record per deal" body="Every document, term, and confirmation is referenced to a single deal ID — the record you can point back to after close." />
            <PrCard icon={<PrIconCheck />} title="Decision recorded" body="Your decision to proceed, hold, or pass on a deal is timestamped and part of that room's permanent record." />
          </PrCardGrid>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Diligence rarely leaves a record worth keeping.</PrTitle>
          <PrProse>Founders send materials over email and a shared folder, with no enforced order and no signed confirmation of what was actually disclosed under what terms. Six months on, if a number in the deck ever becomes disputed, there's nothing to point to that shows what you saw and when.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>How it works for investors</PrEyebrow>
          <PrTitle>A structured room, from invitation to close.</PrTitle>
          <PrProse>
            Founders invite you into a sequenced deal room. Every step is enforced — you see exactly what stage the deal is at and what remains before close.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Run the cap table before you commit →</Link>
            {" "}You sign your own NDA, not a catch-all company-level agreement — your access is individually logged and keyed to your identity. Every outstanding condition is tracked in real time: regulatory approvals, board consents, third-party sign-offs, all mapped against the close sequence.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>A permanent audit record.</PrTitle>
          <PrProse>At close, the full deal record locks in place — append-only, nothing further can be edited or removed by either party. It's the same record the founder sees, not a summary reconstructed afterward, and it survives long after the wire clears.</PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't recommend deals.</PrTitle>
          <PrProse>There is no matching, no scoring, no deal-flow feed to browse. You decide who to fund; the room runs what happens after that decision, not before it.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>By investor type</PrEyebrow>
          <PrTitle>Find your profile.</PrTitle>
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: "1px", background: PR_RULE, border: `1px solid ${PR_RULE}`, marginTop: "8px" }}>
            {INVESTOR_TYPES.map((t) => (
              <Link
                key={t.label}
                to={t.path as any}
                style={{
                  background: PR_PANEL, padding: "24px", textDecoration: "none",
                  display: "flex", flexDirection: "column", gap: "4px",
                }}
              >
                <span style={{ fontFamily: "var(--font-v2-ui)", fontWeight: 500, color: PR_INK, fontSize: "15px" }}>{t.label}</span>
                <span style={{ fontFamily: "var(--font-v2-ui)", color: PR_INK_3, fontSize: "13px" }}>{t.desc}</span>
              </Link>
            ))}
          </div>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrCommercialLine tier="Deploying seat" cadence="Billed per seat, per year." />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <PrTitle>Your next deal, properly closed.</PrTitle>
            <div>
              <PrAction to="/sign-up">Create investor account</PrAction>
            </div>
            <PrCrossLinks />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              <PrQuietLink to="/templates">Templates</PrQuietLink>
            </div>
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
