import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Founders.tsx. Own distinct
// steps+benefits+quote structure — not built from SimpleAudiencePage.

export const Route = createFileRoute("/for/founders")({
  component: Founders,
});

const BENEFITS = [
  {
    title: "Your process. Documented.",
    body: "Every commitment made — oral or written — needs to be in the record. Lengdon captures every action taken by both parties from the moment counsel is confirmed to the moment the room closes.",
  },
  {
    title: "Conditions you can enforce.",
    body: "Add your conditions precedent to the room and assign each to a named owner. The system tracks completion — and neither party can advance to signing until every condition is satisfied.",
  },
  {
    title: "A record that's yours.",
    body: "At close, you receive a sealed, signed export of the full audit trail. It belongs to you — not the investor, not the platform. It's portable, verifiable, and permanent.",
  },
  {
    title: "Per-person confidentiality.",
    body: "Every participant on the investor side signs their own NDA. Not a company-level agreement — a named individual agreement. If someone leaves the firm, their access ends with them.",
  },
];

const STEPS = [
  { num: "01", title: "Initialize a room", desc: "Create a transaction room in minutes. Add the transaction details, invite your counsel, and set the parameters." },
  { num: "02", title: "Invite both counsel teams", desc: "Gate 1 requires both legal teams to be confirmed before any data is shared. No one gets access before counsel is in place." },
  { num: "03", title: "Run the six gates", desc: "The system guides both parties through Agreement, Conditions, Signing, Payment, and Close in strict sequence." },
  { num: "04", title: "Export at close", desc: "Both parties receive a sealed, signed copy of the complete audit trail. You own your record." },
];

function Founders() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Founders"
          title="RAISE WITH"
          titleOutline="STRUCTURE."
          subtitle="You're raising from angels, syndicates, or institutional investors. You need a closing process that protects you as much as the investor — and leaves a record you own and can export."
          cta={{ label: "Initialize a room", to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">How it works for you</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            FROM FIRST CALL<br />TO SEALED CLOSE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e6e9ef]">
            {STEPS.map((step, i) => (
              <div key={step.num} className={`p-8 flex flex-col gap-4 ${i < STEPS.length - 1 ? "border-b lg:border-b-0 lg:border-r border-[#e6e9ef]" : ""}`}>
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#c9d0db] text-[11px] tracking-[2px]">{step.num}</span>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px]">{step.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Why Founders use Lengdon</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            PROTECTED.<br />DOCUMENTED.<br />YOURS.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {BENEFITS.map((b, i) => (
              <div key={i} className={`p-8 bg-white ${i % 2 === 0 ? "lg:border-r border-[#e6e9ef]" : ""} ${i < 2 ? "border-b border-[#e6e9ef]" : ""}`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px] mb-3">{b.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="max-w-[780px]">
            <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
            <blockquote style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[26px] leading-[1.4] tracking-[-0.5px] mb-6">
              "We needed a closing process that protected us and our investor equally. Not a data room — a record. Lengdon gave us both."
            </blockquote>
            <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[13px] tracking-[0.5px]">
              Founder, Technology Company — Series A, 2026
            </div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Ready to close?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">
                Initialize a room and begin the six-gate process today.
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Initialize Account
              </Link>
              <Link to="/sign-in" search={{ redirect: "/app" } as any} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 text-white/60 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                Sign in →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
