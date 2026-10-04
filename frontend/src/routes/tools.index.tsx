import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/index.tsx.

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "Free tools for founders — calculators and modellers — Lengdon" },
      { name: "description", content: "SAFE note calculator, burn rate, runway, dilution, cap table, COGS and valuation tools. Free, no account required." },
      ...socialMeta({ title: "Free tools for founders — calculators and modellers — Lengdon", description: "SAFE note calculator, burn rate, runway, dilution, cap table, COGS and valuation tools. Free, no account required.", path: "/tools" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/tools" }],
  }),
  component: ToolsIndex,
});

const TOOLS = [
  { slug: "valuation-calculator", label: "Valuation Calculator", desc: "Pre-money / post-money valuation based on round size and ownership." },
  { slug: "burn-rate", label: "Burn Rate Calculator", desc: "Monthly and runway analysis based on cash position and spend." },
  { slug: "runway", label: "Runway Calculator", desc: "Months of runway at current or projected burn rate." },
  { slug: "cap-table", label: "Cap Table Builder", desc: "Model ownership and dilution across funding rounds." },
  { slug: "safe-note", label: "SAFE Note Calculator", desc: "Convert SAFE terms to equity at a priced round." },
  { slug: "dilution", label: "Dilution Modeler", desc: "Visualize founder, employee, and investor dilution across rounds." },
  { slug: "cogs", label: "COGS Calculator", desc: "Cost of goods sold and gross margin analysis for SaaS and product businesses." },
];

// SEO-010 (AEO pass): FAQPage + BreadcrumbList JSON-LD.
const TOOLS_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I calculate startup runway?",
      acceptedAnswer: { "@type": "Answer", text: "Divide your current cash balance by your net monthly burn rate (monthly expenses minus monthly revenue). The result is how many months of operation remain at the current spending rate if nothing changes — a starting estimate, not a forecast that accounts for revenue growth or new funding." },
    },
    {
      "@type": "Question",
      name: "What is a cap table?",
      acceptedAnswer: { "@type": "Answer", text: "A capitalization table (cap table) lists everyone who owns equity in a company — founders, employees, and investors — along with the number and type of shares each holds and the resulting ownership percentage. It's updated at every funding round, option grant, or share transfer to reflect current ownership." },
    },
    {
      "@type": "Question",
      name: "How do I model a SAFE note?",
      acceptedAnswer: { "@type": "Answer", text: "Model a SAFE's conversion using its valuation cap and/or discount rate against the priced round's actual terms: the SAFE converts at whichever price is more favorable to the investor — the cap price or the discounted round price — determining how many shares the SAFE amount buys at conversion." },
    },
    {
      "@type": "Question",
      name: "What is a good burn rate for a seed startup?",
      acceptedAnswer: { "@type": "Answer", text: "There's no single correct figure — a sustainable burn rate depends on runway, revenue growth, and how much capital has been raised. A common reference point is maintaining 18-24 months of runway at the current burn rate, but the right number for a specific company depends on its stage, sector, and fundraising timeline." },
    },
    {
      "@type": "Question",
      name: "How do I calculate post-money valuation?",
      acceptedAnswer: { "@type": "Answer", text: "Post-money valuation equals pre-money valuation plus the amount of new capital raised in the round. If a company is valued at $8M pre-money and raises $2M, the post-money valuation is $10M, and the new investors own 20% of the company (the $2M raised divided by the $10M post-money value)." },
    },
  ],
});

const TOOLS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Tools" },
]);

function ToolsIndex() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: TOOLS_FAQ_JSON_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: TOOLS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Free tools · Private capital</span>
            </div>
            <h1
              style={{ fontFamily: "var(--font-v2-ui)", fontSize: "clamp(48px, 6vw, 88px)" }}
              className="font-semibold text-white leading-[0.88] tracking-[-3px] mb-8"
            >
              TOOLS FOR<br />
              <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>
                FOUNDERS.
              </span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[16px] leading-[1.7] max-w-[520px]">
              Free calculators and models for founders and investors navigating private capital transactions. No signup required.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[var(--v2-rule)]">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}` as any}
                className={`group flex flex-col gap-4 p-8 hover:bg-[var(--v2-surface)] transition-colors border-b border-[var(--v2-rule)] ${
                  (i + 1) % 3 !== 0 ? "lg:border-r" : ""
                } ${i < TOOLS.length - (TOOLS.length % 3 || 3) ? "" : "last:border-b-0"}`}
              >
                <div className="w-2 h-2 bg-[var(--v2-accent)]/15 group-hover:bg-[var(--v2-accent)] transition-colors" />
                <div>
                  <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[18px] tracking-[-0.4px] mb-2 group-hover:text-[var(--v2-accent)]">
                    {tool.label}
                  </h2>
                  <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[13px] leading-[1.65]">{tool.desc}</p>
                </div>
                <div style={{ fontFamily: "var(--font-v2-data)" }} className="text-[var(--v2-ink-muted)] text-[12px] group-hover:text-[var(--v2-accent)] transition-colors mt-auto">
                  Open tool →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-20 border-t border-[var(--v2-rule)] pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[32px] leading-[1.0] tracking-[-1.5px] mb-2">
                Ready to close?
              </h2>
              <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px]">
                Once the numbers work, Lengdon closes the transaction.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "var(--font-v2-ui)" }} className="bg-[var(--v2-accent)] hover:bg-[var(--v2-accent)]/90 text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
                Join the waitlist
              </Link>
              <Link to="/product/how-it-works" style={{ fontFamily: "var(--font-v2-ui)" }} className="border border-[var(--v2-rule)] hover:border-[var(--v2-accent)]/30 text-[var(--v2-ink-secondary)] text-[13px] px-8 py-3.5 transition-all duration-200">
                See how it works →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
