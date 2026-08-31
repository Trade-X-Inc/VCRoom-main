import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/PrivateEquity.tsx. Own distinct
// numbered-differentiators + stats-row + quote structure.

export const Route = createFileRoute("/for/private-equity")({
  component: PrivateEquity,
});

const DIFFERENTIATORS = [
  {
    num: "01",
    title: "Acquisition-grade room structure",
    body: "PE acquisitions involve more parties, longer condition lists, and higher legal stakes than typical venture deals. Lengdon's six-gate sequence handles the full complexity — counsel, agreement, conditions, signing, payment, close.",
  },
  {
    num: "02",
    title: "Multi-party condition management",
    body: "Track every condition precedent across regulatory approvals, financing confirmations, and third-party consents. Each condition is logged when met — with timestamp and confirming party identity.",
  },
  {
    num: "03",
    title: "Fund-to-fund transfer ready",
    body: "Manage secondary sales, LP transfers, and co-investment entries with the same structured room format. Every party signs their own agreement. Every action is individually attributed.",
  },
  {
    num: "04",
    title: "Post-close record integrity",
    body: "The sealed export produced at close is legally defensible. It cannot be modified after sealing. Both parties receive identical copies — no dispute about what was agreed or when.",
  },
];

function PrivateEquity() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Private Equity"
          title="COMPLEX DEALS."
          titleOutline="CLEAN RECORD."
          subtitle="Private equity transactions demand rigorous documentation and multi-party coordination. Lengdon enforces the process and produces an immutable audit trail — from first contact to sealed close."
          cta={{ label: "Talk to us", to: "/company/contact" }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">PE-specific capabilities</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            BUILT FOR<br />THE COMPLEXITY.
          </h2>
          <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef]">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.num} className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-0">
                <div className="p-8 border-r border-[#e6e9ef] flex items-start">
                  <span className="font-mono text-[#e6e9ef] text-[32px] font-bold leading-none">{d.num}</span>
                </div>
                <div className="p-8">
                  <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.5px] mb-3">{d.title}</h3>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.75] max-w-[640px]">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e6e9ef] divide-x divide-[#e6e9ef]">
            {[
              { stat: "6", label: "Gates enforced in sequence", sub: "Non-negotiable close structure" },
              { stat: "100%", label: "Party-attributed actions", sub: "Every click, every confirm, logged" },
              { stat: "∞", label: "Sealed record retention", sub: "Export yours at close, permanently" },
            ].map((s) => (
              <div key={s.stat} className="p-10 flex flex-col gap-2">
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[56px] leading-none tracking-[-3px]">{s.stat}</div>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[14px] tracking-[-0.2px]">{s.label}</div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[680px]">
            <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
            <blockquote style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[22px] leading-[1.45] tracking-[-0.4px] mb-6">
              "We used to manage closing checklists in spreadsheets and hope everyone was looking at the same version. Lengdon replaced that entire workflow with something that actually produces a defensible record."
            </blockquote>
            <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[13px]">Principal, lower middle-market PE fund, 2025</div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Ready to modernize<br />your close process?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">We work with PE firms directly. Get in touch to discuss your transaction volume and workflow.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Get started
              </Link>
              <Link to="/company/contact" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                Contact us →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
