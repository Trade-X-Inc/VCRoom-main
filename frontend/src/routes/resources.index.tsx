import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/resources/index.tsx.

export const Route = createFileRoute("/resources/")({
  component: ResourcesIndex,
});

const HUBS = [
  {
    label: "Documentation",
    path: "/docs",
    tag: "Platform",
    desc: "Getting started guides, gate sequence reference, API docs, and security controls. Everything needed to deploy and build on Lengdon.",
    items: ["Getting started", "Gate sequence reference", "Audit & records", "API & webhooks"],
  },
  {
    label: "Blog",
    path: "/resources/blog",
    tag: "Insights",
    desc: "Articles on private capital markets, closing infrastructure, institutional finance trends, and product thinking from the Lengdon team.",
    items: ["Market analysis", "Product updates", "Founder interviews", "Transaction insights"],
  },
  {
    label: "Changelog",
    path: "/resources/changelog",
    tag: "Updates",
    desc: "What's new in Lengdon — feature releases, improvements, and deprecations. Presented in reverse chronological order.",
    items: ["New features", "Improvements", "API changes", "Platform reliability"],
  },
  {
    label: "Glossary",
    path: "/glossary",
    tag: "Reference",
    desc: "Definitions of key terms in private capital transactions, closing infrastructure, and Lengdon's platform. Updated as the platform evolves.",
    items: ["Transaction terms", "Gate definitions", "Investor categories", "Platform concepts"],
  },
  {
    label: "Tools",
    path: "/tools",
    tag: "Free",
    desc: "Interactive calculators for founders and investors — valuation, burn rate, runway, cap table, SAFE conversion, dilution modeling, and COGS.",
    items: ["Valuation calculator", "Burn rate & runway", "Cap table builder", "SAFE note calculator"],
  },
  {
    label: "Sectors",
    path: "/sectors",
    tag: "Reference",
    desc: "How Lengdon applies across technology, life sciences, PE buyouts, SPVs, family offices, and emerging markets.",
    items: ["Technology & SaaS", "Life sciences", "Private equity", "SPV & syndicates"],
  },
];

function ResourcesIndex() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Lengdon · Resources</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[72px] leading-[0.88] tracking-[-3px] mb-6">
              RESOURCES.
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[520px]">
              Documentation, market insights, reference material, and free tools for founders and investors navigating private capital.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {HUBS.map((hub, i) => (
              <Link
                key={hub.path}
                to={hub.path as any}
                className={`group flex flex-col p-8 hover:bg-[#f8f9fb] transition-colors ${
                  [0,1,3,4].includes(i) ? "border-r border-[#e6e9ef]" : ""
                } ${i < 3 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-2 h-2 bg-[#0a2540]/10 group-hover:bg-[#d4af37] transition-colors" />
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] border border-[#e6e9ef] px-2 py-0.5">
                    {hub.tag}
                  </span>
                </div>
                <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.6px] mb-3">
                  {hub.label}
                </h2>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.65] mb-6 flex-1">
                  {hub.desc}
                </p>
                <div className="flex flex-col gap-1.5 mb-6">
                  {hub.items.map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-[#94a3b8] shrink-0" />
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[12px] group-hover:text-[#0a2540] transition-colors">
                  Explore {hub.label.toLowerCase()} →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] leading-[1.0] tracking-[-1px] mb-1">
                Ready to close your first transaction?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">
                No credit card. No setup call. Open a room and start the sequence.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
                Create account
              </Link>
              <Link to="/sign-in" search={{ redirect: "/app" } as any} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] text-[13px] px-8 py-3.5 transition-all duration-200">
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
