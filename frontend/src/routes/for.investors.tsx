import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrProse, PrAction, PrSection,
  PrCommercialLine, PrCrossLinks, PR_BASE, PR_PANEL, PR_RECESSED, PR_INK, PR_INK_3, PR_RULE,
} from "@/components/site/PublicRegisterPrimitives";

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

function Investors() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
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
          <PrEyebrow>The problem we solve</PrEyebrow>
          <PrTitle>Diligence rarely leaves a record worth keeping.</PrTitle>
          <PrProse>Founders send materials over email and a shared folder, with no enforced order and no signed confirmation of what was actually disclosed under what terms. Six months on, if a number in the deck ever becomes disputed, there's nothing to point to that shows what you saw and when.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>How it works for investors</PrEyebrow>
          <PrTitle>A structured room, from invitation to close.</PrTitle>
          <PrProse>
            Founders invite you into a sequenced deal room. Every gate is enforced — you see exactly what stage the deal is at and what remains before close.{" "}
            <Link to="/tools/cap-table" style={{ color: "var(--v2-accent)" }}>Run the cap table before you commit →</Link>
            {" "}You sign your own NDA, not a catch-all company-level agreement — your access is individually logged and keyed to your identity. Every outstanding condition is tracked in real time: regulatory approvals, board consents, third-party sign-offs, all mapped against the close sequence.
          </PrProse>
        </PrSection>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>Why the record matters</PrEyebrow>
          <PrTitle>A permanent audit record.</PrTitle>
          <PrProse>At close, the full deal record locks in place — append-only, nothing further can be edited or removed by either party. It's the same record the founder sees, not a summary reconstructed afterward, and it survives long after the wire clears.</PrProse>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>What we don't do</PrEyebrow>
          <PrTitle>We don't recommend deals.</PrTitle>
          <PrProse>There is no matching, no scoring, no deal-flow feed to browse. You decide who to fund; the room runs what happens after that decision, not before it.</PrProse>
        </PrSection>

        <PrSection ground={PR_BASE}>
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
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
