import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — the original pixel-exact port of
// LENGDONPUBLIC-NEW's Status.tsx hardcoded uptime percentages and two
// specific dated incidents that never happened. Per direct instruction,
// removed entirely rather than softened: no invented numbers, and no
// "not yet certified"-style apology either. This page now states plainly
// that live monitoring is not yet connected, using the same section/
// table visual pattern the rest of the site already uses (no new
// pattern introduced), with real, wired service links (status page,
// support) instead of fabricated content.

export const Route = createFileRoute("/status")({
  component: Status,
});

const SERVICES = [
  "Transaction room infrastructure",
  "Audit record service",
  "Authentication & MFA",
  "Document delivery",
  "Sealed export service",
  "Web application",
];

function Status() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="System Status"
          title="MONITORING NOT"
          titleOutline="YET CONNECTED."
          subtitle="This page will report real, live status for every Lengdon service once our monitoring integration is in place. It does not yet."
        />

        <div className="border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#94a3b8]" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[14px] text-[#425466]">
              No live status data is available yet.
            </span>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Services</span>
          </div>
          <div className="border border-[#e6e9ef]">
            <div className="grid grid-cols-[1fr_200px] bg-[#f8f9fb] border-b border-[#e6e9ef] px-6 py-3">
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Service</span>
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Status</span>
            </div>
            {SERVICES.map((name, i) => (
              <div key={name} className={`grid grid-cols-[1fr_200px] px-6 py-4 items-center ${i < SERVICES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <span style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px]">{name}</span>
                <div className="inline-flex items-center gap-1.5 border px-2.5 py-1 w-fit border-[#e6e9ef] bg-white">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c9d0db]" />
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[11px] text-[#94a3b8]">Not monitored yet</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Incident history</span>
          </div>
          <div className="max-w-[820px] border border-[#e6e9ef] p-8">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">
              We have not yet published an incident history. Once live monitoring is connected, real incidents — with real dates and real resolution details — will be recorded here.
            </p>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
          <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65] max-w-[560px]">
            If you're experiencing an issue right now, <a href="mailto:support@lengdon.com" className="text-[#0a2540] underline hover:opacity-60">contact support</a> directly rather than checking this page.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
