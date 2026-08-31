import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/Dilution.tsx. Standalone: unique
// dynamic funding-round editor + waterfall dilution shape.

export const Route = createFileRoute("/tools/dilution")({
  component: Dilution,
});

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

interface Round { name: string; raise: number; preVal: number; }
const DEFAULT_ROUNDS: Round[] = [
  { name: "Pre-Seed (SAFE)", raise: 500_000, preVal: 5_000_000 },
  { name: "Seed", raise: 2_000_000, preVal: 10_000_000 },
  { name: "Series A", raise: 8_000_000, preVal: 25_000_000 },
];

function Dilution() {
  const [founderShares] = useState(10_000_000);
  const [rounds, setRounds] = useState<Round[]>(DEFAULT_ROUNDS);

  let remaining = founderShares;
  const totalShares = founderShares;

  const roundResults = rounds.map((r) => {
    const newShares = (r.raise / r.preVal) * totalShares;
    const investorPct = r.raise / (r.preVal + r.raise);
    remaining = remaining * (1 - investorPct);
    return { ...r, investorPct, founderPctAfter: remaining / (totalShares + newShares) };
  });

  const founderFinal = roundResults.length > 0 ? roundResults[roundResults.length - 1].founderPctAfter : 1;

  const updateRound = (i: number, key: keyof Round, val: number | string) => {
    setRounds((p) => p.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  };

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
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · Dilution</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              DILUTION<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>MODELER</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">See how founder ownership dilutes across successive funding rounds.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px] mb-6">Funding rounds</h2>
              <div className="flex flex-col gap-4">
                {rounds.map((r, i) => (
                  <div key={i} className="border border-[#e6e9ef] p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <input value={r.name} onChange={(e) => updateRound(i, "name", e.target.value)} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[15px] tracking-[-0.3px] focus:outline-none border-b border-transparent focus:border-[#e6e9ef] pb-0.5" />
                      <button onClick={() => setRounds((p) => p.filter((_, idx) => idx !== i))} className="text-[#c9d0db] hover:text-red-400 text-[18px] transition-colors">×</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[0.3px]">Raise amount ($)</label>
                        <input type="number" value={r.raise} onChange={(e) => updateRound(i, "raise", Number(e.target.value))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] px-3 py-2 text-[13px] text-[#0a2540] focus:outline-none focus:border-[#0a2540]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[0.3px]">Pre-money valuation ($)</label>
                        <input type="number" value={r.preVal} onChange={(e) => updateRound(i, "preVal", Math.max(1, Number(e.target.value)))} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] px-3 py-2 text-[13px] text-[#0a2540] focus:outline-none focus:border-[#0a2540]" />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setRounds((p) => [...p, { name: `Round ${p.length + 1}`, raise: 5_000_000, preVal: 20_000_000 }])}
                  style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                  className="border border-dashed border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#94a3b8] hover:text-[#0a2540] text-[13px] py-4 transition-all"
                >
                  + Add round
                </button>
              </div>
            </div>

            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.4px] mb-6">Founder ownership over time</h2>
              <div className="border border-[#e6e9ef] overflow-hidden">
                <div className="bg-[#0a2540] px-6 py-4 flex justify-between">
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/50 text-[11px] tracking-[1px] uppercase">Before any raise</span>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[15px]">100.0%</span>
                </div>
                {roundResults.map((r, i) => (
                  <div key={i} className="px-6 py-5 flex items-center justify-between border-t border-[#e6e9ef]">
                    <div>
                      <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px] mb-0.5">{r.name}</div>
                      <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{pct(r.investorPct)} new investor ownership</div>
                    </div>
                    <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.5px]">
                      {pct(r.founderPctAfter)}
                    </span>
                  </div>
                ))}
                <div className="bg-[#f8f9fb] px-6 py-4 border-t border-[#e6e9ef] flex justify-between">
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px]">Final founder ownership</span>
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.5px]">{pct(founderFinal)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">Model is clear. Close the round with Lengdon — a six-gate process both parties execute and a sealed record both parties keep.</p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Close this round</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
