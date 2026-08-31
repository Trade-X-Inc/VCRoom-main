import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/index.tsx.

export const Route = createFileRoute("/legal/")({
  component: LegalIndex,
});

const DOCS = [
  {
    title: "Privacy Policy",
    path: "/legal/privacy",
    desc: "How Lengdon collects, processes, and protects personal data. Applicable to all users and transaction room participants.",
    updated: "1 Aug 2025",
    tag: "",
  },
  {
    title: "Terms of Service",
    path: "/legal/terms",
    desc: "The agreement governing use of the Lengdon platform, including account obligations, transaction room rules, and limitation of liability.",
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

function LegalIndex() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Lengdon · Legal</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[72px] leading-[0.88] tracking-[-3px] mb-6">
              LEGAL.
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[480px]">
              Platform agreements, privacy documentation, and compliance resources for Lengdon users and enterprise customers.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef]">
            {DOCS.map((doc) => (
              <Link
                key={doc.path}
                to={doc.path as any}
                className="group grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-0 hover:bg-[#f8f9fb] transition-colors"
              >
                <div className="px-8 py-7">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px] group-hover:text-[#0a2540]">
                      {doc.title}
                    </h2>
                    {doc.tag && (
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[1.5px] uppercase text-[#94a3b8] border border-[#e6e9ef] px-2 py-0.5">
                        {doc.tag}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65] max-w-[640px]">{doc.desc}</p>
                </div>
                <div className="px-8 py-7 lg:border-l border-t lg:border-t-0 border-[#e6e9ef] flex flex-col justify-between">
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">Updated {doc.updated}</div>
                  <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] group-hover:underline mt-4">
                    Read document →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 border border-[#e6e9ef] p-8 bg-[#f8f9fb]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-1">
                  Enterprise legal requests
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px]">
                  For DPA countersignature, SCCs, or institutional due diligence documentation, contact us directly.
                </p>
              </div>
              <Link to="/company/contact" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 border border-[#0a2540]/20 hover:border-[#0a2540]/40 text-[#0a2540] font-semibold text-[13px] px-8 py-3 transition-all duration-200">
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
