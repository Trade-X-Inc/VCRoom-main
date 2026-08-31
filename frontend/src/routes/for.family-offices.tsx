import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/FamilyOffices.tsx. Uses a 3-column
// feature grid (vs. the 2-column grid SimpleAudiencePage assumes) — not
// built from that shared component to keep the exact column count.

export const Route = createFileRoute("/for/family-offices")({
  component: FamilyOffices,
});

const FEATURES = [
  { title: "Institutional-grade infrastructure", desc: "Family offices operate at institutional scale with the confidentiality requirements of private individuals. Lengdon separates these concerns by design." },
  { title: "Permanent record retention", desc: "Transactions close — records don't expire. Every deal you run through Lengdon contributes to a permanent, auditable history of your capital deployment." },
  { title: "Compliance-ready audit trail", desc: "Every action is timestamped, encrypted, and appended to a tamper-evident log. The audit trail is ready for compliance review, fund reporting, or legal proceedings without any additional work." },
  { title: "Per-portfolio room architecture", desc: "Each transaction gets its own isolated room. Access is scoped to the individuals named in that room — no cross-contamination between portfolio companies or investment vehicles." },
  { title: "Custom data residency", desc: "Select the jurisdiction for each transaction room. Data stays in the elected jurisdiction. This is configurable per-room, not per-account." },
  { title: "Unlimited rooms on Firm plan", desc: "Run as many concurrent transactions as your deployment schedule requires. The Firm plan gives you unlimited rooms with no per-transaction incremental cost." },
];

function FamilyOffices() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Family Offices"
          title="PRIVATE CAPITAL"
          titleOutline="AT SCALE."
          subtitle="You deploy capital with the confidentiality requirements of private individuals and the compliance standards of institutional investors. Lengdon was built for exactly this."
          cta={{ label: "Book a demo", to: "/sign-up" }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Family Office infrastructure</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            BUILT FOR<br />DISCRETION.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`p-8 ${i % 3 < 2 ? "lg:border-r border-[#e6e9ef]" : ""} ${i % 2 === 0 ? "md:border-r md:lg:border-r-0" : ""} ${i < 3 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">{f.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[680px]">
            <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
            <blockquote style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[24px] leading-[1.4] tracking-[-0.5px] mb-6">
              "We needed closing infrastructure that understood what private meant. Lengdon's per-person confidentiality model is the only one we've found that actually gets it."
            </blockquote>
            <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[13px]">Principal, Multi-family Office — 2026</div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">Let's talk.</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">We work with family offices and multi-family offices directly. No sales process — just a conversation.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">Create account</Link>
              <Link to="/company/contact" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">Book a call →</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
