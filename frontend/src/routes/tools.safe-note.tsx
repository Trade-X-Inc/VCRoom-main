import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/SafeNote.tsx. Standalone: unique
// toggle (capped/uncapped) + conditional-field shape.

export const Route = createFileRoute("/tools/safe-note")({
  component: SafeNote,
});

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${(n * 100).toFixed(2)}%`; }

function SafeNote() {
  const [safeAmount, setSafeAmount] = useState(500_000);
  const [capType, setCapType] = useState<"capped" | "uncapped">("capped");
  const [valuationCap, setValuationCap] = useState(10_000_000);
  const [discount, setDiscount] = useState(20);
  const [priceRoundValuation, setPriceRoundValuation] = useState(18_000_000);
  const [priceRoundRaise, setPriceRoundRaise] = useState(3_000_000);

  const postMoney = priceRoundValuation + priceRoundRaise;
  const pricePerShare = 1;
  const capPrice = capType === "capped" ? (valuationCap / priceRoundValuation) * pricePerShare : Infinity;
  const discountPrice = pricePerShare * (1 - discount / 100);
  const conversionPrice = Math.min(capPrice, discountPrice);
  const ownershipPct = safeAmount / (postMoney + safeAmount);

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
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · SAFE Note</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              SAFE NOTE<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>CALCULATOR</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">Model how a SAFE converts to equity at a priced round — with cap and discount scenarios.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">SAFE investment amount</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                  <input type="number" value={safeAmount} onChange={(e) => setSafeAmount(Math.max(0, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">SAFE type</label>
                <div className="flex gap-0 border border-[#e6e9ef]">
                  {(["capped", "uncapped"] as const).map((t) => (
                    <button key={t} onClick={() => setCapType(t)} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`flex-1 py-3 text-[13px] transition-colors ${capType === t ? "bg-[#0a2540] text-white" : "text-[#425466] hover:bg-[#f8f9fb]"} ${t === "capped" ? "border-r border-[#e6e9ef]" : ""}`}>
                      {t === "capped" ? "Valuation cap" : "Uncapped"}
                    </button>
                  ))}
                </div>
              </div>

              {capType === "capped" && (
                <div className="flex flex-col gap-2">
                  <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Valuation cap</label>
                  <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                    <input type="number" value={valuationCap} onChange={(e) => setValuationCap(Math.max(0, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Discount rate (%)</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <input type="number" min={0} max={50} value={discount} onChange={(e) => setDiscount(Math.max(0, Math.min(50, Number(e.target.value))))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none" />
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-l border-[#e6e9ef]">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Priced round pre-money valuation</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                  <input type="number" value={priceRoundValuation} onChange={(e) => setPriceRoundValuation(Math.max(1, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px] tracking-[0.3px]">Priced round raise amount</label>
                <div className="flex items-center border border-[#e6e9ef] focus-within:border-[#0a2540] transition-colors">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-4 text-[#94a3b8] text-[14px] border-r border-[#e6e9ef]">$</span>
                  <input type="number" value={priceRoundRaise} onChange={(e) => setPriceRoundRaise(Math.max(0, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex-1 px-4 py-3.5 text-[14px] text-[#0a2540] focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef] h-fit">
              {[
                { label: "Conversion price (relative)", value: capType === "capped" ? `Cap: ${(capPrice * 100).toFixed(1)}% · Disc: ${pct(1 - discount / 100)}` : `Discount only: ${pct(1 - discount / 100)}`, accent: false },
                { label: "Effective conversion price", value: `${(conversionPrice * 100).toFixed(1)}% of round price`, accent: true },
                { label: "Estimated ownership post-close", value: pct(ownershipPct), accent: false },
                { label: "Priced round post-money", value: fmt(postMoney), accent: false },
                { label: "SAFE amount invested", value: fmt(safeAmount), accent: false },
              ].map((r) => (
                <div key={r.label} className={`flex items-start justify-between px-6 py-5 gap-4 ${r.accent ? "bg-[#0a2540]" : ""}`}>
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className={`text-[13px] leading-[1.4] ${r.accent ? "text-white/60" : "text-[#425466]"}`}>{r.label}</span>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className={`font-semibold text-[14px] tracking-[-0.3px] text-right shrink-0 ${r.accent ? "text-white" : "text-[#0a2540]"}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">SAFE terms agreed. Now use Lengdon to close the priced round with a permanent record.</p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Open a closing room</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
