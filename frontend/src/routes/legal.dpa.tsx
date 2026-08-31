import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/Dpa.tsx. This page inlines its own
// hero (not PageHero) in the source — reproduced exactly, not converted
// to the shared component.

export const Route = createFileRoute("/legal/dpa")({
  component: Dpa,
});

const SECTIONS = [
  {
    title: "1. Scope and applicability",
    body: "This Data Processing Agreement (\"DPA\") forms part of the Lengdon Terms of Service and applies to all processing of Personal Data by Lengdon on behalf of Customers in connection with the provision of the closing infrastructure platform. This DPA applies where and to the extent that Lengdon processes Personal Data that is subject to applicable Data Protection Laws on behalf of the Customer.",
  },
  {
    title: "2. Definitions",
    body: "\"Controller\" means the entity that determines the purposes and means of processing Personal Data. \"Processor\" means the entity that processes Personal Data on behalf of the Controller. \"Personal Data\" means any information relating to an identified or identifiable natural person. \"Processing\" means any operation performed on Personal Data. \"Data Protection Laws\" means all applicable laws relating to processing of Personal Data, including GDPR, UK GDPR, and CCPA where applicable.",
  },
  {
    title: "3. Roles of the parties",
    body: "With respect to Personal Data of the Customer's end users (counterparties, investors, founders, and advisors) processed through the Lengdon platform, the Customer acts as Controller and Lengdon acts as Processor. With respect to account data and billing information, Lengdon acts as Controller.",
  },
  {
    title: "4. Lengdon's processing obligations",
    body: "Lengdon will: (a) process Personal Data only on documented instructions from the Customer; (b) ensure that persons authorized to process Personal Data are subject to confidentiality obligations; (c) implement appropriate technical and organizational security measures; (d) assist the Customer in responding to data subject requests; (e) delete or return Personal Data at the end of the service relationship; (f) provide all information necessary to demonstrate compliance.",
  },
  {
    title: "5. Security measures",
    body: "Lengdon implements technical and organizational measures appropriate to the risks, including: encryption of Personal Data at rest using AES-256 and in transit using TLS 1.3; access controls requiring individual authentication for each transaction room participant; immutable audit logging of all access and processing activities; regular penetration testing and vulnerability assessments; employee training on data protection obligations.",
  },
  {
    title: "6. Sub-processors",
    body: "Lengdon uses sub-processors to assist in providing the platform. A current list of sub-processors is maintained at lengdon.com/legal/sub-processors. Lengdon will notify the Customer of any intended additions or replacements of sub-processors, providing at least 30 days notice. The Customer may object to sub-processor changes during this period.",
  },
  {
    title: "7. International data transfers",
    body: "Where Lengdon transfers Personal Data outside the European Economic Area or United Kingdom, it does so pursuant to Standard Contractual Clauses as adopted by the European Commission, or such other legally adequate transfer mechanism as may be applicable. A copy of applicable Standard Contractual Clauses is available upon request.",
  },
  {
    title: "8. Data subject rights",
    body: "Lengdon will assist the Customer in fulfilling obligations to respond to data subject requests, including requests for access, rectification, erasure, restriction of processing, data portability, and objection to processing. Given the nature of the Lengdon platform — which produces sealed, immutable audit records — certain erasure requests may be subject to retention requirements under applicable law.",
  },
  {
    title: "9. Audit rights",
    body: "Upon reasonable notice, Lengdon will make available to the Customer all information necessary to demonstrate compliance with this DPA and allow for audits conducted by the Customer or an auditor mandated by the Customer. Lengdon may satisfy audit requirements through the provision of relevant certifications and third-party audit reports.",
  },
  {
    title: "10. Term and termination",
    body: "This DPA remains in force for the duration of the Lengdon Terms of Service. Upon termination, Lengdon will, at the Customer's election, delete or return all Personal Data, and delete existing copies unless applicable law requires retention. Lengdon's obligation to maintain the immutability and integrity of sealed close records is not affected by termination.",
  },
];

function Dpa() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Legal · Data Processing</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              DATA PROCESSING<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>AGREEMENT</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/40 text-[14px]">Effective date: 1 January 2025 · Last updated: 1 August 2025</p>
          </div>
        </div>

        <section className="max-w-[860px] mx-auto px-8 lg:px-0 py-16">
          <div className="flex flex-col gap-10">
            {SECTIONS.map((s) => (
              <div key={s.title} className="border-l-2 border-[#e6e9ef] pl-8">
                <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px] mb-4">{s.title}</h2>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.8]">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-[#e6e9ef] pt-10">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] leading-[1.7]">
              Questions about this DPA? Contact our data protection team at privacy@lengdon.com. For a copy of applicable Standard Contractual Clauses or for enterprise DPA execution, contact us directly.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
