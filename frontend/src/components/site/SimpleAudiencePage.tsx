import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — shared shape for the "Who it's for"
// pages that follow the simple 4-feature-grid + optional quote + CTA
// pattern (confirmed identical across Angels.tsx, SPVs.tsx,
// Syndicates.tsx, and Advisors.tsx by reading all four source files
// first — Founders.tsx, Investors.tsx, VentureCapital.tsx,
// PrivateEquity.tsx and LimitedPartners.tsx each have their own distinct
// extra section and are NOT built from this component).

export interface AudienceFeature { title: string; desc: string; }

export interface SimpleAudiencePageProps {
  eyebrow: string;
  title: string;
  titleOutline: string;
  subtitle: string;
  heroCta: string;
  sectionLabel: string;
  sectionTitle: React.ReactNode;
  features: AudienceFeature[];
  quote?: { text: string; attribution: string };
  ctaTitle: string;
  ctaSubtitle: string;
  ctaSecondaryLabel: string;
  ctaSecondaryTo: string;
}

export function SimpleAudiencePage({
  eyebrow, title, titleOutline, subtitle, heroCta,
  sectionLabel, sectionTitle, features, quote,
  ctaTitle, ctaSubtitle, ctaSecondaryLabel, ctaSecondaryTo,
}: SimpleAudiencePageProps) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow={eyebrow}
          title={title}
          titleOutline={titleOutline}
          subtitle={subtitle}
          cta={{ label: heroCta, to: "/sign-up", search: { role: "founder" } }}
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">{sectionLabel}</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            {sectionTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {features.map((f, i) => (
              <div key={i} className={`p-8 ${i % 2 === 0 ? "border-r border-[#e6e9ef]" : ""} ${i < 2 ? "border-b border-[#e6e9ef]" : ""}`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.4px] mb-3">{f.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {quote && (
          <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
            <div className="max-w-[680px]">
              <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
              <blockquote style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[24px] leading-[1.4] tracking-[-0.5px] mb-6">
                {quote.text}
              </blockquote>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[13px]">{quote.attribution}</div>
            </div>
          </section>
        )}

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">{ctaTitle}</h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">{ctaSubtitle}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">Create account</Link>
              <Link to={ctaSecondaryTo as any} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">{ctaSecondaryLabel}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
