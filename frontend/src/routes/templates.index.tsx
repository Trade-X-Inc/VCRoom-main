import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  PrEyebrow, PrDisplay, PrLead, PrTitle, PrAction, PrSection,
  PR_BASE, PR_PANEL, PR_RECESSED, PR_ACCENT, PR_INK, PR_INK_2, PR_RULE,
} from "@/components/site/PublicRegisterPrimitives";

// SEO-008 — Templates library. PUBLIC-REGISTER.md v2.0 tokens throughout,
// matching the SEO-006 /for/* rewrite. Top-level route (not nested under
// /resources/*), matching the /tools and /glossary precedent — see the
// Step-0 report for the routing-convention trace. These are static,
// generic reference documents (published/annotated market-standard
// instrument templates, not the product generating a bespoke instrument
// per user) — Foundation §10's UPL prohibition governs the latter, not
// this. The disclaimer below is standard practice for this category of
// public document (YC, Cooley GO, Clerky all carry an equivalent one).

export const Route = createFileRoute("/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Working documents for founders and investors | Lengdon" },
      { name: "description", content: "Ten annotated templates for private fundraising — convertible notes, SAFE, due diligence, data room, NDA, investment memo, LP updates, and more." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/templates" }],
  }),
  component: TemplatesIndex,
});

type Template = { slug: string; title: string; tag: string; desc: string };

const FOUNDER_TEMPLATES: Template[] = [
  { slug: "t-f1-convertible-note-term-sheet", title: "Convertible Note — Term Sheet", tag: "Convertible Debt", desc: "A market-standard convertible note, annotated clause by clause with why it matters and the typical range." },
  { slug: "t-f2-safe-post-money-term-sheet", title: "SAFE (Post-Money) — Term Sheet", tag: "Equity-Linked", desc: "YC's post-money SAFE structure, annotated, with a worked example of dilution at three different round sizes." },
  { slug: "t-f3-due-diligence-checklist-founder", title: "Due Diligence Checklist — Seed / Series A", tag: "Due Diligence", desc: "42 items across 6 categories — what a serious investor will ask for, and the gap founders usually have." },
  { slug: "t-f4-data-room-index-series-a", title: "Data Room Index — Series A Ready", tag: "Fundraising Process", desc: "The folder structure for a complete data room, with what “good” looks like versus just checking the box." },
  { slug: "t-f5-mutual-nda-fundraising", title: "Mutual NDA — Fundraising Context", tag: "Confidentiality", desc: "Written specifically for sharing a deck and financial model with an investor, not a repurposed commercial NDA." },
];

const INVESTOR_TEMPLATES: Template[] = [
  { slug: "t-i1-investment-memo-seed", title: "Investment Memo — Seed Stage", tag: "Investment Memo", desc: "The memo structure used ahead of a partner meeting, with a worked fictional example and 1×/3×/10× return scenarios." },
  { slug: "t-i2-lp-update-quarterly", title: "LP Update — Quarterly Template", tag: "LP Reporting", desc: "A direct, no-spin reporting structure, with explicit guidance on what not to write." },
  { slug: "t-i3-due-diligence-checklist-investor", title: "Due Diligence Checklist — Seed (Investor-Facing)", tag: "Due Diligence", desc: "37 items across 5 risk areas — the investor's own checklist for what to verify before signing." },
  { slug: "t-i4-term-sheet-lead-investor-equity", title: "Term Sheet — Lead Investor, Priced Equity Round", tag: "Priced Equity", desc: "A priced-round term sheet from the lead investor's side, annotated for what's negotiable and what isn't." },
  { slug: "t-i5-portfolio-monitoring-monthly", title: "Portfolio Monitoring — Monthly Template", tag: "Portfolio Ops", desc: "A monthly metrics tracker for a 10–20 company portfolio, with a runway RAG flag system." },
];

function TemplateCard({ t }: { t: Template }) {
  return (
    <div
      style={{
        background: PR_PANEL, border: `1px solid ${PR_RULE}`, padding: "24px",
        display: "flex", flexDirection: "column", gap: "12px",
      }}
    >
      <span
        style={{
          alignSelf: "flex-start", fontFamily: "var(--font-v2-data)", fontSize: "10px",
          letterSpacing: "0.06em", textTransform: "uppercase", color: PR_ACCENT,
          background: "var(--v2-accent-wash)", padding: "3px 8px",
        }}
      >
        {t.tag}
      </span>
      <h3 style={{ fontFamily: "var(--font-v2-ui)", fontSize: "17px", fontWeight: 500, color: PR_INK, margin: 0, lineHeight: 1.3 }}>
        {t.title}
      </h3>
      <p style={{ fontFamily: "var(--font-v2-ui)", fontSize: "13.5px", lineHeight: 1.55, color: PR_INK_2, margin: 0, flex: 1 }}>
        {t.desc}
      </p>
      <a
        href={`/templates/${t.slug}.pdf`}
        download
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "4px",
          fontFamily: "var(--font-v2-ui)", fontSize: "13px", fontWeight: 500, color: PR_ACCENT,
          textDecoration: "none",
        }}
      >
        Download PDF ↓
      </a>
    </div>
  );
}

// SEO-010 (AEO pass): FAQPage JSON-LD. No BreadcrumbList — /templates is
// explicitly top-level (not nested under /resources), per the routing
// convention this route already documents in its own header comment.
const TEMPLATES_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a convertible note term sheet?",
      acceptedAnswer: { "@type": "Answer", text: "A convertible note term sheet sets out the terms of a loan that converts into equity at a future priced round, rather than issuing shares immediately. It typically specifies an interest rate, a maturity date, and a valuation cap and/or discount that determines the price the note converts at." },
    },
    {
      "@type": "Question",
      name: "What is the difference between a SAFE and a convertible note?",
      acceptedAnswer: { "@type": "Answer", text: "A SAFE (Simple Agreement for Future Equity) is not debt — it carries no interest rate and no maturity date, and converts to equity only at a future priced round. A convertible note is a debt instrument: it accrues interest and has a maturity date by which it must convert or be repaid. SAFEs are generally simpler and faster to negotiate; notes give investors debt-like protections a SAFE doesn't." },
    },
    {
      "@type": "Question",
      name: "What should be in a Series A data room?",
      acceptedAnswer: { "@type": "Answer", text: "A Series A data room typically covers company formation documents, the cap table, financial statements and projections, material contracts, IP assignments, employment agreements, and prior financing documents. What counts as complete varies by sector and by what each investor's diligence process specifically requires." },
    },
    {
      "@type": "Question",
      name: "What does an LP quarterly update include?",
      acceptedAnswer: { "@type": "Answer", text: "A quarterly LP update typically reports fund performance (NAV, IRR, multiples where meaningful), portfolio company progress and any material events, capital called and distributed in the period, and forward-looking commentary. Direct, specific reporting is generally more useful to LPs than promotional language." },
    },
    {
      "@type": "Question",
      name: "What do investors look for in due diligence?",
      acceptedAnswer: { "@type": "Answer", text: "Investor due diligence typically covers legal structure and cap table cleanliness, financial accuracy and unit economics, the strength and completeness of the team, customer and revenue concentration risk, and any pending legal or regulatory exposure. The specific checklist varies by stage and sector." },
    },
  ],
});

function TemplatesIndex() {
  return (
    <div style={{ background: PR_BASE, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: TEMPLATES_FAQ_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: PR_BASE }}>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "72px 24px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <PrEyebrow>Resources / Templates</PrEyebrow>
            <PrDisplay maxWidth="20ch">Working documents, not blank forms.</PrDisplay>
            <PrLead>Lengdon publishes ten annotated templates — convertible notes, SAFEs, due diligence checklists, data room indexes, NDAs, investment memos, and LP updates — each with market-standard structure and clause-by-clause context, free to download.</PrLead>
          </div>
          <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 24px 56px" }}>
            <div
              style={{
                border: `1px solid var(--v2-attention)`, background: "var(--v2-attention-wash)",
                color: "var(--v2-attention)", fontFamily: "var(--font-v2-ui)", fontSize: "13px",
                lineHeight: 1.55, padding: "14px 18px",
              }}
            >
              <strong>Educational template.</strong> Not legal or financial advice. Consult qualified counsel before use. Market terms vary by jurisdiction and by deal.
            </div>
          </div>
        </section>

        <PrSection ground={PR_RECESSED}>
          <PrEyebrow>For founders</PrEyebrow>
          <PrTitle>Instruments and process documents for raising.</PrTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "8px" }}>
            {FOUNDER_TEMPLATES.map((t) => <TemplateCard key={t.slug} t={t} />)}
          </div>
        </PrSection>

        <PrSection ground={PR_PANEL}>
          <PrEyebrow>For investors</PrEyebrow>
          <PrTitle>Instruments and process documents for running a portfolio.</PrTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "8px" }}>
            {INVESTOR_TEMPLATES.map((t) => <TemplateCard key={t.slug} t={t} />)}
          </div>
        </PrSection>

        <PrSection ground={PR_BASE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <PrTitle>Running a real process needs more than a template.</PrTitle>
            <div>
              <PrAction to="/sign-up">Join the waitlist</PrAction>
            </div>
          </div>
        </PrSection>
      </main>
      <SiteFooter />
    </div>
  );
}
