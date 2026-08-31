import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/AcceptableUse.tsx.

export const Route = createFileRoute("/legal/acceptable-use")({
  component: AcceptableUse,
});

const ALLOWED = [
  "Closing legitimate private capital transactions between consenting, identified parties",
  "Raising equity financing for operating businesses through structured transaction rooms",
  "Conducting M&A, secondary, or transfer transactions with proper legal counsel",
  "Managing SPV and syndicate closes where all participants are properly identified",
  "Using Lengdon's API and webhooks to integrate closing infrastructure into compliant platforms",
  "Generating and retaining sealed close records for legitimate audit, regulatory, and legal purposes",
];

const PROHIBITED = [
  {
    category: "Fraudulent transactions",
    items: [
      "Creating transaction rooms for non-existent companies or fictitious transactions",
      "Using Lengdon to manufacture false audit records or to simulate a close that did not occur",
      "Impersonating legal entities, individuals, or counsel in transaction rooms",
    ],
  },
  {
    category: "Regulatory violations",
    items: [
      "Conducting transactions that violate applicable securities laws, including unregistered offerings to non-accredited investors where prohibited",
      "Using Lengdon for transactions involving sanctioned parties or jurisdictions",
      "Structuring transactions through Lengdon to evade tax reporting obligations",
    ],
  },
  {
    category: "Platform misuse",
    items: [
      "Attempting to modify, tamper with, or circumvent the immutability of audit logs or sealed records",
      "Using the platform to harass, coerce, or misrepresent terms to counterparties",
      "Automated creation of transaction rooms at scale without legitimate underlying transactions",
      "Attempting to access transaction rooms, records, or accounts that you are not authorized to access",
    ],
  },
  {
    category: "Content restrictions",
    items: [
      "Uploading malware, spyware, or malicious code to transaction rooms",
      "Uploading content that violates applicable laws, including child safety laws",
      "Using transaction room document storage to host unrelated content",
    ],
  },
];

function AcceptableUse() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Legal · Platform policy</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              ACCEPTABLE<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>USE POLICY.</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/40 text-[14px]">Effective date: 1 January 2025 · Last updated: 1 August 2025</p>
          </div>
        </div>

        <section className="max-w-[860px] mx-auto px-8 lg:px-0 py-16">
          <div className="mb-12">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.8]">
              Lengdon provides closing infrastructure for private capital transactions. This Acceptable Use Policy defines permitted and prohibited uses of the platform. By using Lengdon, you agree to comply with this policy. Violations may result in account suspension or termination.
            </p>
          </div>

          <div className="mb-12 border-l-2 border-emerald-400/40 pl-8">
            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-6">Permitted uses</h2>
            <div className="flex flex-col gap-3">
              {ALLOWED.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-500 mt-1.5 shrink-0" />
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-10">
            <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px]">Prohibited uses</h2>
            {PROHIBITED.map((section) => (
              <div key={section.category} className="border-l-2 border-red-300/50 pl-8">
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-4">{section.category}</h3>
                <div className="flex flex-col gap-2.5">
                  {section.items.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-red-400/60 mt-1.5 shrink-0" />
                      <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 border border-[#e6e9ef] p-8">
            <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-3">Enforcement</h3>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.75]">
              Lengdon reserves the right to investigate suspected violations of this policy and to suspend or terminate accounts found to be in violation. We may report violations to applicable regulatory or law enforcement authorities where required. The immutability of sealed close records is preserved even upon account termination — both parties' exports remain valid and accessible.
            </p>
          </div>

          <div className="mt-8 border-t border-[#e6e9ef] pt-8">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] leading-[1.7]">
              Report suspected policy violations or abuse to trust@lengdon.com.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
