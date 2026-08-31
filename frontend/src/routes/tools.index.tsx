import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/index.tsx.

export const Route = createFileRoute("/tools/")({
  component: ToolsIndex,
});

const TOOLS = [
  { slug: "valuation-calculator", label: "Valuation Calculator", desc: "Pre-money / post-money valuation based on round size and ownership." },
  { slug: "burn-rate", label: "Burn Rate Calculator", desc: "Monthly and runway analysis based on cash position and spend." },
  { slug: "runway", label: "Runway Calculator", desc: "Months of runway at current or projected burn rate." },
  { slug: "cap-table", label: "Cap Table Builder", desc: "Model ownership and dilution across funding rounds." },
  { slug: "safe-note", label: "SAFE Note Calculator", desc: "Convert SAFE terms to equity at a priced round." },
  { slug: "dilution", label: "Dilution Modeler", desc: "Visualize founder, employee, and investor dilution across rounds." },
  { slug: "cogs", label: "COGS Calculator", desc: "Cost of goods sold and gross margin analysis for SaaS and product businesses." },
];

function ToolsIndex() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Free tools · Private capital</span>
            </div>
            <h1
              style={{ fontFamily: "'Geist:SemiBold', sans-serif", fontSize: "clamp(48px, 6vw, 88px)" }}
              className="font-semibold text-white leading-[0.88] tracking-[-3px] mb-8"
            >
              TOOLS FOR<br />
              <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>
                FOUNDERS.
              </span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[16px] leading-[1.7] max-w-[520px]">
              Free calculators and models for founders and investors navigating private capital transactions. No signup required.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}` as any}
                className={`group flex flex-col gap-4 p-8 hover:bg-[#f8f9fb] transition-colors border-b border-[#e6e9ef] ${
                  (i + 1) % 3 !== 0 ? "lg:border-r" : ""
                } ${i < TOOLS.length - (TOOLS.length % 3 || 3) ? "" : "last:border-b-0"}`}
              >
                <div className="w-2 h-2 bg-[#0a2540]/15 group-hover:bg-[#d4af37] transition-colors" />
                <div>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px] mb-2 group-hover:text-[#0a2540]">
                    {tool.label}
                  </h2>
                  <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.65]">{tool.desc}</p>
                </div>
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[12px] group-hover:text-[#0a2540] transition-colors mt-auto">
                  Open tool →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-20 border-t border-[#e6e9ef] pt-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] leading-[1.0] tracking-[-1.5px] mb-2">
                Ready to close?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">
                Once the numbers work, Lengdon closes the transaction.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
                Create account
              </Link>
              <Link to="/product/how-it-works" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] text-[13px] px-8 py-3.5 transition-all duration-200">
                See how it works →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
