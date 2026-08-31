import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/LimitedPartners.tsx. Own distinct
// two-column-lists + record-value-prop structure.

export const Route = createFileRoute("/for/limited-partners")({
  component: LimitedPartners,
});

function LimitedPartners() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Limited Partners"
          title="YOUR CAPITAL."
          titleOutline="YOUR RECORD."
          subtitle="As an LP, you commit capital to funds and co-investments. Lengdon ensures that every transaction you participate in produces a permanent, sealed record that belongs to you — independent of any GP system."
          cta={{ label: "Create LP account", to: "/sign-up" }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">For limited partners</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            VISIBILITY<br />AT EVERY GATE.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#e6e9ef] divide-y lg:divide-y-0 lg:divide-x divide-[#e6e9ef]">
            <div className="p-10">
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-5">For co-investments</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.75] mb-6">
                When you co-invest alongside a GP, you're invited into the transaction room as a principal. You sign your own NDA, review conditions, and receive your own sealed export at close.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Individual NDA — not GP-aggregated",
                  "Per-gate visibility into conditions",
                  "Your own sealed close export",
                  "Independently verifiable record",
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#d4af37] mt-1.5 shrink-0" />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px]">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-10">
              <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-5">For fund commitments</h3>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.75] mb-6">
                When committing to a new fund close or making a subscription agreement, the room records your commitment confirmation, subscription execution, and payment confirmation as separate gate events.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Subscription room per LP commitment",
                  "Payment confirmation gate",
                  "Counsel review gate for complex LPAs",
                  "Permanent fund close record",
                ].map((pt) => (
                  <li key={pt} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-[#0a2540] mt-1.5 shrink-0" />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px]">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-start">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Why it matters</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.95] tracking-[-2px] mb-6">
                THE RECORD<br />OUTLASTS THE<br />RELATIONSHIP.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
                GPs change platforms. Portals get shut down. Deal documents get migrated, lost, or consolidated by fund administrators. The Lengdon sealed export is a standalone file — it doesn't depend on any platform remaining operational to be readable.
              </p>
            </div>
            <div className="bg-[#f8f9fb] border border-[#e6e9ef] p-8">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase mb-6">At every close, you receive</div>
              <div className="flex flex-col gap-4">
                {[
                  { label: "Complete gate log", detail: "Every action by every party, timestamped and attributed" },
                  { label: "All signed agreements", detail: "NDA, term sheet, subscription docs — full set" },
                  { label: "Condition record", detail: "Each condition, who confirmed it, when" },
                  { label: "Sealed reference", detail: "Reference number for the complete record at time of close" },
                ].map((r) => (
                  <div key={r.label} className="flex gap-4 pb-4 border-b border-[#e6e9ef] last:border-b-0 last:pb-0">
                    <div className="w-2 h-2 bg-[#0a2540] mt-1 shrink-0" />
                    <div>
                      <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[14px] tracking-[-0.2px] mb-0.5">{r.label}</div>
                      <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{r.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Join as an LP.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Accept co-investment invitations or request that your GPs send rooms through Lengdon.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Create account
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
