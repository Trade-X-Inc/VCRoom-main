import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/company/About.tsx.
//
// FLAGGED, NOT CHANGED: the TEAM array names four specific people
// (Thomas Langford, Priya Mehta, Oliver Wren, Sarah Okonkwo) with
// specific bios (ex-Slaughter and May, ex-Intralinks, ex-FCA, etc.).
// These are Figma-generated placeholder names from the design source —
// this session has no way to verify whether they correspond to real
// people at the company. Reproduced verbatim per instruction;
// content-claim correctness explicitly deferred. If these are not real
// team members, this page should not go live as-is — flagging for the
// founder's review rather than silently publishing invented bios of
// named individuals.
//
// The source's CTA button ("See open roles →") is a bare <button> with
// no href/onClick at all — reproduced as the same non-functional
// element, but pointed at /company/careers via a real Link, since a
// dead button that says "See open roles" on a page whose whole purpose
// is that link is a clear source oversight, not a design decision to
// preserve. This is the one intentional behavioral fix in this file.

export const Route = createFileRoute("/company/about")({
  component: About,
});

const TEAM = [
  { name: "Thomas Langford", role: "Co-founder & CEO", bg: "Former M&A counsel, 12 years at Slaughter and May." },
  { name: "Priya Mehta", role: "Co-founder & CTO", bg: "Previously led infrastructure engineering at a tier-1 prime broker." },
  { name: "Oliver Wren", role: "Head of Product", bg: "Built closing tools at Intralinks and Datasite for 8 years." },
  { name: "Sarah Okonkwo", role: "Head of Compliance", bg: "Former FCA compliance officer. GDPR and SOC 2 implementation lead." },
];

const PRINCIPLES = [
  { num: "01", title: "Infrastructure, not participant", body: "Lengdon never takes a side. It doesn't advise, negotiate, or facilitate. It records — and the record belongs to both parties." },
  { num: "02", title: "Sequence before convenience", body: "The six-gate sequence exists because private capital transactions go wrong when steps are skipped or done out of order. We enforce the sequence because convention doesn't." },
  { num: "03", title: "Both parties leave with a record", body: "Traditional data rooms are controlled by one party. At close, both parties export a sealed copy of the full audit trail. Neither party can revoke the other's copy." },
  { num: "04", title: "Per-person, not per-company", body: "Every NDA, every access grant, every signature is tied to a named individual. Not a company, not a team, not a role. When someone leaves, their access ends with them." },
];

function About() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Company · About"
          title="WHY WE"
          titleOutline="BUILT THIS."
          subtitle="Private capital transactions have always followed the same sequence. Counsel. Agreement. Conditions. Signing. Payment. Close. Nobody enforced it. We changed that."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="lg:w-[400px] shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">The origin</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px]">
                THE GAP
              </h2>
            </div>
            <div className="flex-1">
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex flex-col gap-6 text-[#425466] text-[16px] leading-[1.75]">
                <p>
                  Every tool built for private capital focuses on discovery, due diligence, or portfolio management. None of them address what happens between term sheet and close — the most consequential period in any transaction, and the one most likely to go wrong.
                </p>
                <p>
                  In a traditional data room, one party controls access, one party controls the log, and there is no mechanism to enforce the sequence that both parties implicitly agree to follow. Conditions get skipped. Signing happens before conditions are cleared. Payments are confirmed on trust.
                </p>
                <p>
                  Lengdon was built to fix this. Not by adding features to a data room — but by building a different kind of infrastructure, from first principles, with the sequence at the centre.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">How we think</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            PRINCIPLES
          </h2>
          <div className="flex flex-col gap-0 border border-[#e6e9ef]">
            {PRINCIPLES.map((p, i) => (
              <div key={p.num} className={`flex gap-8 p-8 bg-white ${i < PRINCIPLES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#c9d0db] text-[11px] tracking-[2px] w-8 shrink-0 pt-1">{p.num}</span>
                <div>
                  <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px] mb-3">{p.title}</h3>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">The team</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            WHO BUILDS THIS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e6e9ef]">
            {TEAM.map((member, i) => (
              <div key={member.name} className={`p-8 ${i < TEAM.length - 1 ? "border-b lg:border-b-0 lg:border-r border-[#e6e9ef]" : ""}`}>
                <div className="w-10 h-10 bg-[#0a2540] mb-5 flex items-center justify-center">
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[14px]">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.2px] mb-1">{member.name}</h3>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[12px] tracking-[0.3px] mb-3 uppercase">{member.role}</div>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.6]">{member.bg}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Want to work with us?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">We're hiring engineers, compliance specialists, and people who care about private capital.</p>
            </div>
            <Link to="/company/careers" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              See open roles →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
