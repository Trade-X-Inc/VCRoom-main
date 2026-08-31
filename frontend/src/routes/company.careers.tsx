import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/company/Careers.tsx.
//
// Role cards have "Apply →" text but no real link/handler in the source
// (each card is a cursor-pointer div, not a real click target) —
// reproduced as-is, not wired to anything invented. The "Get in touch"
// bare button at the bottom is pointed at /company/contact, same fix
// rationale as the About page's CTA button.

export const Route = createFileRoute("/company/careers")({
  component: Careers,
});

const ROLES = [
  {
    title: "Senior Backend Engineer",
    team: "Engineering",
    location: "London / Remote",
    type: "Full-time",
    desc: "Own the core closing sequence engine — the system that enforces gate transitions, records audit events, and manages the append-only record.",
  },
  {
    title: "Product Security Engineer",
    team: "Security",
    location: "London / Remote",
    type: "Full-time",
    desc: "Responsible for encryption architecture, key management, and the security controls that make Lengdon's zero-trust model work in practice.",
  },
  {
    title: "Compliance & Legal Specialist",
    team: "Compliance",
    location: "London",
    type: "Full-time",
    desc: "Lead our compliance posture across UK, EU, and US jurisdictions. Work directly with institutional clients on due diligence and documentation.",
  },
  {
    title: "Product Designer",
    team: "Product",
    location: "London / Remote",
    type: "Full-time",
    desc: "Design the interfaces that parties use during one of the most consequential moments in their commercial relationship. Rigour and clarity over decoration.",
  },
  {
    title: "Enterprise Account Executive",
    team: "Commercial",
    location: "London",
    type: "Full-time",
    desc: "Work with institutional clients — family offices, PE firms, VC firms — to deploy Lengdon at scale. This is a consultative sale, not a volume role.",
  },
];

const VALUES = [
  { title: "We build infrastructure, not features", body: "Every decision starts with 'is this correct?' not 'is this convenient?' Infrastructure that fails under pressure is not infrastructure." },
  { title: "The record is sacred", body: "Everything we build must be defensible in a room full of lawyers and accountants. If it can't be, it doesn't ship." },
  { title: "Both parties, always", body: "We represent neither the founder nor the investor. The infrastructure must be equally fair, equally rigorous, and equally useful to both." },
];

function Careers() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Company · Careers"
          title="BUILD THE"
          titleOutline="INFRASTRUCTURE."
          subtitle="We're a small team building the closing layer that private capital transactions have always needed and never had. We hire for rigour, not polish."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">How we work</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            WHAT WE VALUE
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {VALUES.map((v, i) => (
              <div key={i} className={`p-8 bg-white ${i < VALUES.length - 1 ? "lg:border-r border-b lg:border-b-0 border-[#e6e9ef]" : ""}`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">{v.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Open roles</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            CURRENT OPENINGS
          </h2>
          <div className="flex flex-col gap-0 border border-[#e6e9ef]">
            {ROLES.map((role, i) => (
              <div
                key={role.title}
                className={`flex flex-col md:flex-row items-start gap-6 p-8 hover:bg-[#f8f9fb] transition-colors group cursor-pointer ${i < ROLES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="md:w-[200px] shrink-0">
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[10px] tracking-[1px] uppercase border border-[#e6e9ef] text-[#425466] px-2.5 py-1 inline-block mb-2">{role.team}</span>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{role.location}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] group-hover:opacity-75 transition-opacity">
                      {role.title}
                    </h3>
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] border border-[#e6e9ef] px-2 py-0.5">{role.type}</span>
                  </div>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">{role.desc}</p>
                </div>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="shrink-0 text-[#0a2540] text-[13px] group-hover:underline pt-1">
                  Apply →
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[28px] tracking-[-0.8px] mb-2">
                Don't see a fit?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px]">
                We hire for the right people, not just open roles. Send us a note if you think you belong here.
              </p>
            </div>
            <Link to="/company/contact" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              Get in touch
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
