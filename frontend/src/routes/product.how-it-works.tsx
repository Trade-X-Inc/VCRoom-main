import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/HowItWorks.tsx.

export const Route = createFileRoute("/product/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — the closing lifecycle — Lengdon" },
      { name: "description", content: "Brief, present, NDA, diligence, terms, conditions, close. One recorded spine for every private-capital raise. See the full lifecycle." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/product/how-it-works" }],
  }),
  component: HowItWorks,
});

// SEO-011: rewritten from the stale six-gate vocabulary (Counsel,
// Agreement, Conditions, Signing, Payment, Close) to the real stage
// model already live in this page's own head() description and the
// SEO-007 blog posts (Brief, Present, NDA, Diligence, Terms, Conditions,
// Close) — the two had diverged (flagged in SEO-010) since this array
// was never updated to match. Structure (num/title/party/desc/detail)
// unchanged; content only. Signing and payment confirmation, previously
// their own named gates, are folded into Close — matching how the
// SEO-007 post "The 7 Stages Every Private Deal Goes Through" already
// describes Close ("Signatures happen, funds move, and the record...
// is preserved"), not invented here.
// SEO-016: no gate/stage COUNT stated in rendered copy — named stages
// only. The six closing gates and the seven lifecycle stages are two
// separate real things; a count of either goes stale and invites
// confusion, so public copy never states one.
const GATES = [
  {
    num: "01", title: "Brief",
    party: "Founder",
    desc: "The founder initializes the room and defines the raise — amount, structure, and the story that ties them together — before a single investor is invited in. Nothing is shared with an investor until this stage is complete.",
    detail: "The room's foundation. No investor sees anything until the brief is set.",
  },
  {
    num: "02", title: "Present",
    party: "Founder → Investor",
    desc: "The pitch deck and an overview of the opportunity go out to each invited investor. This is the first material an investor sees, and it stays scoped to what's appropriate to share before any confidentiality agreement is in place.",
    detail: "Only public-tier materials are visible at this stage.",
  },
  {
    num: "03", title: "NDA",
    party: "Investor",
    desc: "The investor signs an individual, per-person NDA before anything sensitive unlocks. This is not a company-wide agreement — it's tied to that specific investor's identity, and their access ends if they leave the firm.",
    detail: "Per-person NDA enforced. No sensitive data shared until this stage is confirmed.",
  },
  {
    num: "04", title: "Diligence",
    party: "Investor",
    desc: "Full data room access is granted once the NDA is signed. The investor reviews financials, legal documents, and the underlying business in depth, working from a consistent, gated set of materials rather than a scattered email thread.",
    detail: "Access unlocks only after NDA confirmation — never before.",
  },
  {
    num: "05", title: "Terms",
    party: "Both parties",
    desc: "The term sheet stage: commercial terms — valuation, instrument, board rights, whatever applies — are proposed and negotiated between the parties, with documents exchanged in the room rather than reconstructed later from memory.",
    detail: "Every proposed term is recorded the moment it's exchanged.",
  },
  {
    num: "06", title: "Conditions",
    party: "Tracked to satisfaction",
    desc: "Every condition precedent — regulatory approval, board consent, financing confirmations, whatever the deal requires — is added to the room and tracked until satisfied. The room cannot advance to Close until every condition is marked complete. Which party clears which condition is a matter both parties agree on directly — Lengdon enforces the boundary, not the internal workflow.",
    detail: "The step is enforced. Condition-by-condition sequencing inside it is not — that's between the parties.",
  },
  {
    num: "07", title: "Close",
    party: "Both parties, independently",
    desc: <>Signatures are executed, funds move directly between the parties outside the platform, and mutual confirmation seals the record permanently. The complete append-only audit trail stops accepting new entries and stays accessible to both parties — nothing in it can be changed, amended, or deleted after this point. <Link to="/tools/cap-table" className="underline hover:opacity-70 transition-opacity">See how cap table state is recorded at close →</Link></>,
    detail: "The complete record is preserved, unchanged, for both parties.",
  },
];

const PRINCIPLES = [
  { label: "Append-only", desc: "No entry in the audit record can be deleted or modified. The system only ever adds to the log." },
  { label: "Tamper-evident", desc: "Each record entry references the previous entry. Altering any earlier entry breaks that reference visibly." },
  { label: "Per-person, not per-company", desc: "Every NDA, every access grant, every signature is tied to a specific individual — not a company, not a role, not a team." },
  { label: "Dual confirmation", desc: "Critical events — the NDA signature, the close — require independent confirmation from both parties before proceeding." },
];

// SEO-011: rewritten from the stale six-gate FAQ (Counsel, Agreement,
// Conditions, Signing, Payment, Close) to match the GATES array above —
// the mismatch SEO-010 flagged (this page's own meta description already
// said "Brief, present, NDA, diligence, terms, conditions, close" while
// the body and this FAQ both said six gates) is now closed on both sides
// at once. SEO-016: stage count dropped from the rendered question text.
const HOW_IT_WORKS_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are the stages in Lengdon's closing process?",
      acceptedAnswer: { "@type": "Answer", text: "Brief, Present, NDA, Diligence, Terms, Conditions, and Close. Each stage must be completed before the next opens — the sequence is enforced by the system, not left to convention." },
    },
    {
      "@type": "Question",
      name: "Can a stage be skipped or reordered?",
      acceptedAnswer: { "@type": "Answer", text: "No. Lengdon requires each stage to be confirmed before the next becomes available — for example, an investor cannot reach Diligence-tier materials until they've signed the NDA at the NDA stage, and the room cannot advance to Close until every condition at the Conditions stage is marked complete." },
    },
    {
      "@type": "Question",
      name: "Who confirms each stage — Lengdon or the parties?",
      acceptedAnswer: { "@type": "Answer", text: "The parties themselves. Lengdon enforces the order and records each confirmation, but the founder and investor are the ones agreeing to proceed at each stage — for example, it's the investor's own NDA signature that unlocks Diligence, not an action Lengdon takes on their behalf." },
    },
    {
      "@type": "Question",
      name: "What happens at the Close stage?",
      acceptedAnswer: { "@type": "Answer", text: "Signatures are executed, funds move directly between the parties outside the platform, and mutual confirmation seals the record permanently. The complete append-only audit trail stops accepting new entries and remains accessible to both parties — nothing in it can be changed, amended, or deleted after that point." },
    },
    {
      "@type": "Question",
      name: "Does Lengdon hold or move the investment funds?",
      acceptedAnswer: { "@type": "Answer", text: "No. Funds move directly between the parties, outside the platform. Lengdon records confirmation of the transfer as part of the Close stage, but it never holds, routes, or has access to the capital itself." },
    },
  ],
});

const HOW_IT_WORKS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "How it works" },
]);

// SPEAKABLE_JSON_LD lives on a WebPage entity, per Google's structured-
// data guidance — separate from the FAQPage/BreadcrumbList blocks above,
// which describe different things about the same page. cssSelector
// targets the one mechanism-explanation paragraph below (#mechanism-
// explanation), added directly to that element.
const SPEAKABLE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://lengdon.com/product/how-it-works",
  url: "https://lengdon.com/product/how-it-works",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["#mechanism-explanation"],
  },
});

function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: HOW_IT_WORKS_FAQ_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: HOW_IT_WORKS_BREADCRUMB_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SPEAKABLE_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Product · How It Works"
          title="THE SEQUENCE."
          titleOutline="ONE CLOSE."
          subtitle="Every private capital transaction follows the same sequence. Lengdon enforces it — not by convention, but by the system itself. No stage can be opened until the one before it is complete."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[320px] shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">The Sequence</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-6">
                THE STAGES
              </h2>
              <p id="mechanism-explanation" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
                Each stage requires the one before it. The system enforces the order — neither party can advance alone.
              </p>
            </div>

            <div className="flex-1 flex flex-col">
              {GATES.map((gate, i) => (
                <div key={gate.num} className={`flex gap-8 py-8 ${i < GATES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                  <div className="flex flex-col items-center gap-0 shrink-0 w-10">
                    <div className="w-8 h-8 bg-[#0a2540] flex items-center justify-center shrink-0">
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white text-[11px] tracking-[1px]">{gate.num}</span>
                    </div>
                    {i < GATES.length - 1 && <div className="w-px flex-1 bg-[#e6e9ef] mt-2" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px]">
                        {gate.title}
                      </h3>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#64748b] text-[12px] border border-[#e6e9ef] px-2.5 py-1">
                        {gate.party}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7] mb-3">
                      {gate.desc}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-px bg-[#d4af37]/60" />
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[12px] italic">{gate.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[10px] tracking-[2px] uppercase">Design Principles</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[clamp(32px,6vw,48px)] leading-[0.9] tracking-[-2px] mb-16">
            BUILT ON THESE<br />GUARANTEES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {PRINCIPLES.map((p, i) => (
              <div key={p.label} className={`p-8 ${i % 3 < 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r md:lg:border-r-0" : ""} ${i < 3 ? "border-b" : ""} border-[#e6e9ef]`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">{p.label}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Ready to run the sequence?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] leading-[1.6]">
                Initialize a room and begin the closing sequence today.
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Join the waitlist
              </Link>
              <Link to="/sign-in" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                Sign in →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
