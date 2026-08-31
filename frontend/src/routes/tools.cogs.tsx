import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Cogs.tsx. Standalone: this tool's
// fields have no sliders and include a benchmark note in the results
// panel, unlike the slider-based tools.

export const Route = createFileRoute("/tools/cogs")({
  component: CogsCalculator,
});

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function CogsCalculator() {
  const [revenue, setRevenue] = useState(1_200_000);
  const [hosting, setHosting] = useState(80_000);
  const [supportStaff, setSupportStaff] = useState(120_000);
  const [thirdPartyLicenses, setThirdPartyLicenses] = useState(30_000);
  const [paymentProcessing, setPaymentProcessing] = useState(24_000);
  const [other, setOther] = useState(10_000);

  const totalCogs = hosting + supportStaff + thirdPartyLicenses + paymentProcessing + other;
  const grossProfit = revenue - totalCogs;
  const grossMargin = revenue > 0 ? grossProfit / revenue : 0;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="inline-flex items-center gap-2 text-white/40 text-[13px] hover:text-white/70 transition-colors mb-8">← All tools</Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · COGS</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              COGS<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">Cost of goods sold and gross margin analysis for SaaS and technology companies.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-6">
              {[
                { label: "Annual recurring revenue (ARR)", value: revenue, set: setRevenue, note: "" },
                { label: "Hosting & infrastructure", value: hosting, set: setHosting, note: "Cloud, CDN, databases" },
                { label: "Customer support staff (COGS-attributed)", value: supportStaff, set: setSupportStaff, note: "Portion of support team costs in COGS" },
                { label: "Third-party licenses & APIs", value: thirdPartyLicenses, set: setThirdPartyLicenses, note: "" },
                { label: "Payment processing fees", value: paymentProcessing, set: setPaymentProcessing, note: "" },
                { label: "Other direct costs", value: other, set: setOther, note: "" },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">{field.label}</label>
                    {field.note && <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px]">{field.note}</span>}
                  </div>
                  <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                    <input type="number" value={field.value} onChange={(e) => field.set(Math.max(0, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3 text-[14px] text-[#0a2540] focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef] h-fit">
              {[
                { label: "Total COGS", value: fmt(totalCogs), accent: false },
                { label: "Gross profit", value: fmt(grossProfit), accent: true },
                { label: "Gross margin", value: pct(grossMargin), accent: false },
                { label: "COGS as % of revenue", value: pct(totalCogs / (revenue || 1)), accent: false },
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-[#0a2540]" : ""}`}>
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[14px] ${r.accent ? "text-white/60" : "text-[#425466]"}`}>{r.label}</span>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : grossProfit < 0 && r.label === "Gross profit" ? "text-red-600" : "text-[#0a2540]"}`}>{r.value}</span>
                </div>
              ))}
              <div className="px-6 py-5">
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] leading-[1.6]">
                  SaaS benchmarks: Strong &gt;70% gross margin, average 60–70%, below 50% indicates infrastructure cost issues.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">Metrics ready for investor review? Lengdon closes the round — sequenced, recorded, sealed.</p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Start your room</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
