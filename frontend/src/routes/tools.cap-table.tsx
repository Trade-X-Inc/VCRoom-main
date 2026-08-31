import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/tools/CapTable.tsx. Standalone: unique
// add/remove shareholder table editor shape.

export const Route = createFileRoute("/tools/cap-table")({
  component: CapTable,
});

interface Holder { name: string; shares: number; }
const DEFAULT: Holder[] = [
  { name: "Founder A", shares: 4_000_000 },
  { name: "Founder B", shares: 3_000_000 },
  { name: "Employee Pool", shares: 1_000_000 },
  { name: "Seed Investor", shares: 2_000_000 },
];

function pct(n: number, total: number) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";
}
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function CapTable() {
  const [holders, setHolders] = useState<Holder[]>(DEFAULT);
  const [newName, setNewName] = useState("");
  const [newShares, setNewShares] = useState("");

  const total = holders.reduce((s, h) => s + h.shares, 0);

  const addHolder = () => {
    if (!newName.trim() || !newShares) return;
    setHolders((p) => [...p, { name: newName.trim(), shares: Number(newShares) }]);
    setNewName("");
    setNewShares("");
  };

  const remove = (i: number) => setHolders((p) => p.filter((_, idx) => idx !== i));

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
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Tool · Cap Table</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              CAP TABLE<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>BUILDER</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[440px]">Model equity ownership and calculate percentages across your shareholder table.</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="border border-[#e6e9ef] overflow-hidden mb-6">
            <div className="grid grid-cols-[1fr_140px_140px_40px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-6 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Shareholder</div>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-6 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase text-right border-l border-[#e6e9ef]">Shares</div>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-6 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase text-right border-l border-[#e6e9ef]">Ownership</div>
              <div className="border-l border-[#e6e9ef]" />
            </div>
            {holders.map((h, i) => (
              <div key={i} className={`grid grid-cols-[1fr_140px_140px_40px] ${i < holders.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="px-6 py-4 text-[#0a2540] text-[14px]">{h.name}</div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-6 py-4 text-[#425466] text-[14px] text-right border-l border-[#e6e9ef]">{fmt(h.shares)}</div>
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-4 font-semibold text-[#0a2540] text-[14px] text-right border-l border-[#e6e9ef]">{pct(h.shares, total)}</div>
                <div className="flex items-center justify-center border-l border-[#e6e9ef]">
                  <button onClick={() => remove(i)} className="w-full h-full flex items-center justify-center text-[#c9d0db] hover:text-red-400 transition-colors text-[16px]">×</button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_140px_140px_40px] bg-[#0a2540] border-t border-[#e6e9ef]">
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-4 font-semibold text-white text-[14px]">Total</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-4 font-semibold text-white text-[14px] text-right border-l border-white/10">{fmt(total)}</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-4 font-semibold text-white text-[14px] text-right border-l border-white/10">100%</div>
              <div className="border-l border-white/10" />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New Series A investor" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
            </div>
            <div className="w-40 flex flex-col gap-1.5">
              <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Shares</label>
              <input type="number" value={newShares} onChange={(e) => setNewShares(e.target.value)} placeholder="1,000,000" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
            </div>
            <button onClick={addHolder} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-6 py-3 transition-colors duration-200">
              Add
            </button>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 pb-16 border-t border-[#e6e9ef] pt-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px] max-w-[480px]">Cap table modeled. Now close the round that creates it — with a permanent record both parties keep.</p>
            <Link to="/sign-up" style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[13px] px-8 py-3.5 transition-colors duration-200">Close with Lengdon</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
