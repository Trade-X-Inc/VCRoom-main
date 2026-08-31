import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/Docs.tsx. This is a single flat route
// (not the old docs.tsx/docs.index.tsx/docs.$.tsx catch-all shell) —
// LENGDONPUBLIC-NEW has exactly one docs page, no per-article routing.
// The individual article titles have no real link/handler in the
// source (cursor-pointer text, not anchors) — reproduced as-is.

export const Route = createFileRoute("/docs")({
  component: Docs,
});

const SECTIONS = [
  {
    title: "Getting started",
    slug: "getting-started",
    icon: "01",
    articles: [
      { title: "What is Lengdon?", desc: "The six-gate close infrastructure platform explained." },
      { title: "Creating your account", desc: "Founder vs investor accounts, and what changes." },
      { title: "Your first transaction room", desc: "Step-by-step: room setup, party invitation, and gate 1." },
      { title: "Understanding the six-gate sequence", desc: "What each gate requires and why the order matters." },
    ],
  },
  {
    title: "Transaction rooms",
    slug: "rooms",
    icon: "02",
    articles: [
      { title: "Room types and use cases", desc: "Equity rounds, SAFEs, SPVs, M&A, secondary transfers." },
      { title: "Inviting parties and observers", desc: "Principal vs observer access. How per-person NDAs work." },
      { title: "Document management by gate", desc: "Which documents attach to which gates and why." },
      { title: "Condition management", desc: "Defining and confirming condition precedents within a room." },
    ],
  },
  {
    title: "Gate sequence",
    slug: "gates",
    icon: "03",
    articles: [
      { title: "Gate 1: Counsel", desc: "Legal review confirmation by both parties." },
      { title: "Gate 2: Agreement", desc: "Term acceptance and document execution." },
      { title: "Gate 3: Conditions", desc: "Condition precedent satisfaction and verification." },
      { title: "Gate 4: Signing", desc: "Formal execution of transaction documents." },
      { title: "Gate 5: Payment", desc: "Capital transfer confirmation and verification." },
      { title: "Gate 6: Close", desc: "Final confirmation, seal, and dual export." },
    ],
  },
  {
    title: "Audit & records",
    slug: "audit",
    icon: "04",
    articles: [
      { title: "How the audit log works", desc: "Append-only, tamper-evident. What that means." },
      { title: "The sealed close export", desc: "What's in it, how to read it, how to store it." },
      { title: "Registry verification", desc: "Verifying your export against the registry reference." },
      { title: "Legal defensibility", desc: "How Lengdon records are used in disputes and audits." },
    ],
  },
  {
    title: "Security",
    slug: "security",
    icon: "05",
    articles: [
      { title: "Encryption at rest and in transit", desc: "What is encrypted, how, and with what keys." },
      { title: "Per-person NDA enforcement", desc: "How individual NDAs bind access in practice." },
      { title: "Access control and permissions", desc: "Gate-scoped access. Who can see what and when." },
      { title: "Data residency and retention", desc: "Where your data lives and how long it is retained." },
    ],
  },
  {
    title: "API & integrations",
    slug: "api",
    icon: "06",
    articles: [
      { title: "API overview", desc: "REST API for room creation, gate management, and record retrieval." },
      { title: "Webhooks", desc: "Real-time events for gate confirmations and close events." },
      { title: "Authentication", desc: "API keys, OAuth, and token scoping." },
      { title: "Rate limits and quotas", desc: "Request limits by plan tier." },
    ],
  },
];

function Docs() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Documentation</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[72px] leading-[0.88] tracking-[-3px] mb-6">
              DOCS.
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[480px]">
              Everything you need to understand, configure, and build on Lengdon.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {SECTIONS.map((section, si) => (
              <div
                key={section.slug}
                className={`p-8 ${[0,1,3,4].includes(si) ? "border-r border-[#e6e9ef]" : ""} ${si < 3 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-mono text-[#e6e9ef] text-[20px] font-bold leading-none">{section.icon}</span>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px]">{section.title}</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {section.articles.map((a) => (
                    <div key={a.title} className="group">
                      <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px] tracking-[-0.2px] mb-0.5 group-hover:text-[#425466] transition-colors cursor-pointer">
                        {a.title}
                      </div>
                      <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] leading-[1.5]">{a.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#e6e9ef]">
            <div className="p-10 border-r border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[2px] uppercase mb-4">Quick start</div>
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-3">New to Lengdon?</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65] mb-5">Create an account and open your first transaction room in under 10 minutes.</p>
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="inline-block bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
                Create account →
              </Link>
            </div>
            <div className="p-10">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[2px] uppercase mb-4">For developers</div>
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-3">API integration</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65] mb-5">REST API, webhooks, and SDKs for embedding Lengdon's close infrastructure in your product.</p>
              <Link to="/company/contact" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="inline-block border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] text-[13px] px-8 py-3.5 transition-all duration-200">
                Request API access →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
