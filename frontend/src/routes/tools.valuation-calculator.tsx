import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/ValuationCalculator.tsx.
// Standalone (not built from ToolCalculatorPage): this is the only tool
// with slider min/max range labels beneath each field.

export const Route = createFileRoute("/tools/valuation-calculator")({
  component: ValuationCalculator,
});

function fmt(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function ValuationCalculator() {
  const [preMoney, setPreMoney] = useState(8_000_000);
  const [raise, setRaise] = useState(2_000_000);

  const postMoney = preMoney + raise;
  const investorPct = raise / postMoney;
  const founderPct = 1 - investorPct;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <Link to="/tools" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="inline-flex items-center gap-2 text-white/40 text-[13px] hover:text-white/70 transition-colors mb-8">
              ← All tools
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · Valuation</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              VALUATION<br />
              <span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">
              Model pre-money and post-money valuation based on round size and investor ownership.
            </p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Pre-money valuation</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                  <input
                    type="number"
                    value={preMoney}
                    onChange={(e) => setPreMoney(Math.max(0, Number(e.target.value)))}
                    style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                    className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none"
                  />
                </div>
                <input type="range" min={500_000} max={100_000_000} step={500_000} value={preMoney} onChange={(e) => setPreMoney(Number(e.target.value))} className="w-full accent-[#0a2540]" />
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex justify-between text-[#c9d0db] text-[11px]">
                  <span>$500K</span><span>$100M</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Round size (investment amount)</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                  <input
                    type="number"
                    value={raise}
                    onChange={(e) => setRaise(Math.max(0, Number(e.target.value)))}
                    style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                    className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none"
                  />
                </div>
                <input type="range" min={100_000} max={20_000_000} step={100_000} value={raise} onChange={(e) => setRaise(Number(e.target.value))} className="w-full accent-[#0a2540]" />
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex justify-between text-[#c9d0db] text-[11px]">
                  <span>$100K</span><span>$20M</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef] h-fit">
              {[
                { label: "Pre-money valuation", value: fmt(preMoney), accent: false },
                { label: "Round size", value: fmt(raise), accent: false },
                { label: "Post-money valuation", value: fmt(postMoney), accent: true },
                { label: "Investor ownership", value: pct(investorPct), accent: false },
                { label: "Founder/existing ownership", value: pct(founderPct), accent: false },
              ].map((r) => (
                <div key={r.label} className={`flex items-center justify-between px-6 py-5 ${r.accent ? "bg-[#0a2540]" : ""}`}>
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[14px] ${r.accent ? "text-white/60" : "text-[#425466]"}`}>{r.label}</span>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[18px] tracking-[-0.5px] ${r.accent ? "text-white" : "text-[#0a2540]"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">
              Once your round terms are set, use Lengdon to close the transaction — sequenced, documented, and permanently recorded.
            </p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">
              Start closing with Lengdon
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
