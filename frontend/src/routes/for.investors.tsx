import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/for/Investors.tsx. Own distinct
// features+investor-type-nav+quote structure — not built from
// SimpleAudiencePage.

export const Route = createFileRoute("/for/investors")({
  component: Investors,
});

const FEATURES = [
  { title: "Receive structured rooms", desc: "Founders invite you into a sequenced transaction room. Every gate is enforced — you see exactly what stage the deal is at and what remains before close." },
  { title: "Per-investor NDA", desc: "You sign your own NDA — not a catch-all company-level agreement. Your access is individually logged and keyed to your identity." },
  { title: "Condition visibility", desc: "Track every outstanding condition in real time. Regulatory approvals, board consents, third-party sign-offs — all mapped against the close sequence." },
  { title: "Sealed audit export", desc: "At close, you receive a permanent, sealed export of the full transaction record. It cannot be edited or revoked by the other party." },
];

const INVESTOR_TYPES = [
  { label: "Angel", path: "/for/angels" },
  { label: "Venture Capital", path: "/for/venture-capital" },
  { label: "Private Equity", path: "/for/private-equity" },
  { label: "Syndicates", path: "/for/syndicates" },
  { label: "Family Offices", path: "/for/family-offices" },
  { label: "Limited Partners", path: "/for/limited-partners" },
];

function Investors() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Who it's for · Investors"
          title="INVEST."
          titleOutline="WITH RECORD."
          subtitle="Every deal you participate in through Lengdon is structured, sequenced, and permanently recorded — so the record of your diligence and the terms you agreed to is yours forever."
          cta={{ label: "Create investor account", to: "/sign-up" }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`p-8 ${i % 2 === 0 ? "border-r border-[#e6e9ef]" : ""} ${i < 2 ? "border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="w-2 h-2 bg-[#d4af37] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px] mb-3">{f.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">By investor type</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.95] tracking-[-2px] mb-12">
            FIND YOUR<br />PROFILE.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border border-[#e6e9ef]">
            {INVESTOR_TYPES.map((t, i) => (
              <Link
                key={t.label}
                to={t.path as any}
                className={`flex flex-col justify-between p-6 hover:bg-[#f8f9fb] transition-colors group ${i < 5 ? "border-r border-[#e6e9ef]" : ""}`}
              >
                <div className="w-1.5 h-1.5 bg-[#0a2540]/20 group-hover:bg-[#d4af37] transition-colors mb-8" />
                <div>
                  <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[15px] tracking-[-0.3px] mb-1">{t.label}</div>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] group-hover:text-[#0a2540] transition-colors">View →</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[700px]">
            <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
            <blockquote style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[24px] leading-[1.4] tracking-[-0.5px] mb-6">
              "The first time I used Lengdon on a deal, I realized I'd never had a proper record of any of my prior transactions. Now every close generates a sealed export I keep in my files permanently."
            </blockquote>
            <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[13px]">Angel investor, Series A round, 2026</div>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Your next deal.<br />Properly closed.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Join as an investor. Accept room invitations and close with a permanent record.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Create account
              </Link>
              <Link to="/sign-in" search={{ redirect: "/app" } as any} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
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
