import { getDocPage } from "./registry";

const BASE = "https://lengdon.com";

export function docCanonicalUrl(slug: string): string {
  return slug ? `${BASE}/docs/${slug}` : `${BASE}/docs`;
}

/** head() payload for a docs page: title, description, canonical, and Open Graph. */
export function docHead(slug: string) {
  const page = getDocPage(slug);
  if (!page) {
    return { meta: [{ title: "Not found — Lengdon Documentation" }] };
  }
  const url = docCanonicalUrl(slug);
  const title = `${page.meta.title} — Lengdon Documentation`;
  return {
    meta: [
      { title },
      { name: "description", content: page.meta.description },
      { property: "og:title", content: title },
      { property: "og:description", content: page.meta.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Lengdon" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: page.meta.description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Article JSON-LD for a docs page, rendered by DocArticle. */
export function docJsonLd(slug: string): string | null {
  const page = getDocPage(slug);
  if (!page) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.meta.title,
    description: page.meta.description,
    dateModified: page.meta.updated,
    url: docCanonicalUrl(slug),
    author: { "@type": "Organization", name: "Lengdon", url: BASE },
    publisher: { "@type": "Organization", name: "Lengdon", url: BASE },
    isPartOf: { "@type": "WebSite", name: "Lengdon Documentation", url: `${BASE}/docs` },
  });
}

// ── FAQ structured data ───────────────────────────────────────────────────
// Rendered as a second JSON-LD block on the pages listed here. This is what
// AI crawlers (ChatGPT, Perplexity, Claude) read when asked about Lengdon.

const DOC_FAQS: Record<string, Array<{ q: string; a: string }>> = {
  "": [
    {
      q: "What is Lengdon?",
      a: "Lengdon is a global fundraising platform for founders and investors. Founders build a structured profile, run NDA-gated deal rooms with a six-stage workflow, and receive recorded investment decisions. Investors get thesis-matched deal flow, an AI due-diligence engine that cross-examines documents against claims, and a decision pipeline. It is headquartered at DIFC, Dubai.",
    },
    {
      q: "How does founder verification work?",
      a: "There's no automated verification tier today. You can build a Founder Roast — a live, public Q&A with investors and other founders — which earns a Roast Survivor badge on your profile once completed.",
    },
    {
      q: "Is Lengdon suitable for family offices?",
      a: "Yes — family offices managing 5–50 active deals are a core audience. Investor registration is open during beta. Founders see each fund's profile — thesis, sectors, stages, and cheque size — before sharing. Deal rooms are NDA-gated (DIFC governing law, DIAC arbitration), documents are access-logged, and the AI deep-analysis engine produces analyst-grade findings without an analyst team.",
    },
    {
      q: "What countries does Lengdon support?",
      a: "Lengdon is a global platform: founders and investors from any jurisdiction can use it, wherever they are based. Registry verification covers 140+ jurisdictions including the UAE, Saudi Arabia, Qatar, Bahrain, the UK, and the US.",
    },
    {
      q: "How does the success fee work?",
      a: "When a round closes through a Lengdon deal room, the fee is 1.5% of the closed amount, with a minimum of $500 and a maximum of $15,000. Founder subscriptions start at $19/month; investor plans at $99/month.",
    },
  ],
  "security": [
    {
      q: "Is Lengdon SOC 2 certified?",
      a: "Not yet — Lengdon is in beta and does not claim certifications it does not hold. The platform runs on SOC 2-compliant infrastructure (Supabase, Cloudflare) with TLS in transit, AES-256 at rest, and database-level Row Level Security on every table.",
    },
    {
      q: "Who can access my documents?",
      a: "Only deal-room members who have signed the room's NDA. Access is enforced at the database level with Row Level Security, documents are watermarked and access-logged, and founders control three visibility tiers: public profile, initial data pack, and full deal room.",
    },
    {
      q: "What encryption does Lengdon use?",
      a: "TLS 1.2+ for data in transit and AES-256 for data at rest. Deal room documents live in access-controlled storage with signed, expiring URLs.",
    },
  ],
};

/** FAQ JSON-LD for slugs listed in DOC_FAQS; null otherwise. */
export function docFaqJsonLd(slug: string): string | null {
  const faqs = DOC_FAQS[slug];
  if (!faqs) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  });
}
