import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — rewrite of the pixel-exact port of
// LENGDONPUBLIC-NEW's About.tsx. Per direct instruction: removed the
// fabricated TEAM section (four named people with unverifiable bios)
// entirely — no invented people, no photo placeholders, no "meet the
// team" section with nobody in it. Replaced with a real entity detail
// section (Venture Tech LLC, under incorporation, DIFC FinTech Hive),
// matching the same section/grid visual pattern already used
// elsewhere on the site (border-divided panel, same as the security
// controls grid) rather than introducing a new layout. The origin and
// principles sections are unchanged — they describe the product and
// thesis, not people, and were not flagged.

export const Route = createFileRoute("/company/about")({
  component: About,
});

const PRINCIPLES = [
  { num: "01", title: "Infrastructure, not participant", body: "Lengdon never takes a side. It doesn't advise, negotiate, or facilitate. It records — and the record belongs to both parties." },
  { num: "02", title: "Sequence before convenience", body: "The six-gate sequence exists because private capital transactions go wrong when steps are skipped or done out of order. We enforce the sequence because convention doesn't." },
  { num: "03", title: "Both parties leave with a record", body: "Traditional data rooms are controlled by one party. At close, both parties export a sealed copy of the full audit trail. Neither party can revoke the other's copy." },
  { num: "04", title: "Per-person, not per-company", body: "Every NDA, every access grant, every signature is tied to a named individual. Not a company, not a team, not a role. When someone leaves, their access ends with them." },
];

const ENTITY = [
  { label: "Legal entity", value: "Venture Tech LLC" },
  { label: "Status", value: "Under incorporation" },
  { label: "Jurisdiction", value: "DIFC FinTech Hive" },
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
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">The company</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            ENTITY DETAIL
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {ENTITY.map((e, i) => (
              <div key={e.label} className={`p-8 ${i < ENTITY.length - 1 ? "border-b md:border-b-0 md:border-r border-[#e6e9ef]" : ""}`}>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-3">{e.label}</div>
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px]">{e.value}</div>
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
