import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/index.tsx.

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Legal — terms, privacy, DPA and sub-processors — Lengdon" },
      { name: "description", content: "The complete legal surface for Lengdon, dated and versioned. Terms of service, privacy policy, data processing agreement." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/legal" }],
  }),
  component: LegalIndex,
});

const DOCS = [
  {
    title: "Privacy Policy",
    path: "/legal/privacy",
    desc: "How Lengdon collects, processes, and protects personal data. Applicable to all users and deal room participants.",
    updated: "1 Aug 2025",
    tag: "",
  },
  {
    title: "Terms of Service",
    path: "/legal/terms",
    desc: "The agreement governing use of the Lengdon platform, including account obligations, deal room rules, and limitation of liability.",
    updated: "1 Aug 2025",
    tag: "",
  },
  {
    title: "Data Processing Agreement",
    path: "/legal/dpa",
    desc: "GDPR-compliant DPA for customers who process personal data of end users through Lengdon. Covers processor obligations, sub-processors, and data subject rights.",
    updated: "1 Aug 2025",
    tag: "GDPR",
  },
  {
    title: "Sub-processors",
    path: "/legal/sub-processors",
    desc: "Current list of third-party sub-processors used by Lengdon. Updated with 30 days notice before additions or changes.",
    updated: "1 Aug 2025",
    tag: "GDPR",
  },
  {
    title: "Acceptable Use Policy",
    path: "/legal/acceptable-use",
    desc: "Permitted and prohibited uses of the Lengdon platform. Covers fraud, regulatory compliance, platform misuse, and content restrictions.",
    updated: "1 Aug 2025",
    tag: "",
  },
];

// SEO-010 (AEO pass): BreadcrumbList JSON-LD.
const LEGAL_INDEX_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Legal" },
]);

function LegalIndex() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LEGAL_INDEX_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Lengdon · Legal</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(44px,7vw,72px)] leading-[0.88] tracking-[-3px] mb-6">
              LEGAL.
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[480px]">
              Platform agreements, privacy documentation, and compliance resources for Lengdon users and enterprise customers.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="flex flex-col gap-0 border border-[var(--v2-rule)] divide-y divide-[var(--v2-rule)]">
            {DOCS.map((doc) => (
              <Link
                key={doc.path}
                to={doc.path as any}
                className="group grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-0 hover:bg-[var(--v2-surface)] transition-colors"
              >
                <div className="px-8 py-7">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[18px] tracking-[-0.4px] group-hover:text-[var(--v2-accent)]">
                      {doc.title}
                    </h2>
                    {doc.tag && (
                      <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-[10px] tracking-[1.5px] uppercase text-[var(--v2-ink-muted)] border border-[var(--v2-rule)] px-2 py-0.5">
                        {doc.tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[14px] leading-[1.65] max-w-[640px]">{doc.desc}</p>
                </div>
                <div className="px-8 py-7 lg:border-l border-t lg:border-t-0 border-[var(--v2-rule)] flex flex-col justify-between">
                  <div style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[12px]">Updated {doc.updated}</div>
                  <div style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-accent)] text-[13px] group-hover:underline mt-4">
                    Read document →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 border border-[var(--v2-rule)] p-8 bg-[var(--v2-surface)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[16px] tracking-[-0.3px] mb-1">
                  Enterprise legal requests
                </h3>
                <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[14px]">
                  For DPA countersignature, SCCs, or institutional due diligence documentation, contact us directly.
                </p>
              </div>
              <Link to="/company/contact" style={{ fontFamily: "var(--font-v2-ui)" }} className="shrink-0 border border-[var(--v2-accent)]/20 hover:border-[var(--v2-accent)]/40 text-[var(--v2-accent)] font-semibold text-[13px] px-8 py-3 transition-all duration-200">
                Contact legal team →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
