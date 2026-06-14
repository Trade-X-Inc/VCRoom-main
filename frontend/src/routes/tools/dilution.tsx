import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/tools/dilution")({
  head: () => ({
    meta: [
      { title: "Dilution Calculator — See How Funding Rounds Affect Your Ownership | Hockystick" },
      {
        name: "description",
        content:
          "Calculate exactly how much equity each funding round dilutes your ownership. Model up to 3 rounds with option pool top-ups. Free dilution calculator for startup founders.",
      },
    ],
  }),
  component: DilutionPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Founder {
  id: string;
  name: string;
  pct: number;
}

interface RoundInput {
  enabled: boolean;
  name: string;
  preMoney: number;
  investment: number;
  optionPoolTopUp: number;
  antiDilution: "none" | "broad" | "narrow" | "ratchet";
}

interface Snapshot {
  stageName: string;
  founders: { name: string; pct: number; originalPct: number }[];
  poolPct: number;
  investorPct: number;
  investorName: string;
  postMoney: number;
  pricePerPct: number;
}

// ─── Math ─────────────────────────────────────────────────────────────────────

// Dilution math, pool top-up applied PRE-money BEFORE investor %
// your_pct_final = your_pct_going_in × (1 - investor_pct_of_post)
// investor_pct_of_post = investment / postMoney
// Pool top-up reduces existing holders proportionally BEFORE new investor shares

function applyRound(
  founders: { name: string; pct: number }[],
  currentPoolPct: number,
  round: RoundInput,
): { founders: { name: string; pct: number }[]; poolPct: number; investorPct: number; postMoney: number } {
  const { preMoney, investment, optionPoolTopUp } = round;
  if (!preMoney || !investment) {
    return { founders, poolPct: currentPoolPct, investorPct: 0, postMoney: preMoney };
  }

  // Total existing equity = 100%; after pool top-up, all existing holders dilute
  const poolTopUpPct = optionPoolTopUp; // % of post-money
  // New pool is added at pre-money, diluting existing before investors come in
  // poolTopUpDilution: existing holders lose poolTopUpPct% of their stake
  const postAfterPool = preMoney / (1 - poolTopUpPct / 100);
  const dilutionFromPool = poolTopUpPct / 100;

  // Investors then buy investment / postMoney of post-money shares
  const postMoney = preMoney + investment;
  // After pool top-up is baked in pre-money, investor % = investment / postMoney
  const investorPct = (investment / postMoney) * 100;

  // Apply pool top-up dilution to existing holders
  const afterPoolFounders = founders.map((f) => ({
    ...f,
    pct: f.pct * (1 - dilutionFromPool),
  }));
  const afterPoolPool = currentPoolPct * (1 - dilutionFromPool) + poolTopUpPct;

  // Apply investor dilution
  const investorDilutionFactor = 1 - investorPct / 100;
  const finalFounders = afterPoolFounders.map((f) => ({
    ...f,
    pct: f.pct * investorDilutionFactor,
  }));
  const finalPool = afterPoolPool * investorDilutionFactor;

  return { founders: finalFounders, poolPct: finalPool, investorPct, postMoney };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _uid = 0;
function uid() { return `f${++_uid}`; }

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number, d = 1): string {
  return `${n.toFixed(d)}%`;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const FOUNDER_COLORS = ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE"];
const ROUND_COLORS = ["#10B981", "#34D399", "#6EE7B7"];
const POOL_COLOR = "#F59E0B";

// ─── UI helpers ──────────────────────────────────────────────────────────────

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: "#7C3AED", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ paddingBottom: "20px" }}>{children}</div>}
    </div>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", margin: "18px 0 10px" }}>{children}</p>;
}

function NumInput({ label, value, onChange, prefix = "$", suffix, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.55)", marginBottom: "4px" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        {prefix && <span style={{ padding: "9px 10px", fontSize: "12px", color: "rgba(255,255,255,0.3)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>{prefix}</span>}
        <input type="number" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "9px 10px", fontSize: "13px", color: "#fff" }} />
        {suffix && <span style={{ padding: "9px 10px", fontSize: "12px", color: "rgba(255,255,255,0.3)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>{suffix}</span>}
      </div>
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

// ─── Stacked bar ─────────────────────────────────────────────────────────────

function OwnershipBar({ segments }: { segments: { color: string; pct: number; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.pct, 0);
  return (
    <div style={{ display: "flex", height: "24px", borderRadius: "6px", overflow: "hidden", width: "100%" }}>
      {segments.filter((s) => s.pct > 0.05).map((s) => (
        <div key={s.label}
          title={`${s.label}: ${fmtPct(s.pct)}`}
          style={{ flex: s.pct / total, background: s.color, minWidth: "2px", transition: "flex 0.3s" }} />
      ))}
    </div>
  );
}

// ─── Round section ────────────────────────────────────────────────────────────

function RoundPanel({ round, index, onChange, onToggle }: {
  round: RoundInput; index: number;
  onChange: (r: RoundInput) => void;
  onToggle: () => void;
}) {
  const [showAntiDil, setShowAntiDil] = useState(false);
  const color = ROUND_COLORS[index];

  return (
    <div style={{ background: "#111114", border: `1px solid ${round.enabled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`, borderRadius: "12px", overflow: "hidden", opacity: round.enabled ? 1 : 0.45, transition: "opacity 0.2s, border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", borderBottom: round.enabled ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
        <input type="checkbox" id={`r${index}`} checked={round.enabled} onChange={onToggle}
          style={{ width: "14px", height: "14px", accentColor: color, flexShrink: 0, cursor: "pointer" }} />
        <label htmlFor={`r${index}`} style={{ fontSize: "13px", fontWeight: 600, color: round.enabled ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", flex: 1 }}>
          {round.name}
        </label>
        {round.enabled && (
          <span style={{ fontSize: "11px", background: `${color}22`, color, padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Active</span>
        )}
      </div>
      {round.enabled && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <NumInput label="Pre-money valuation" value={round.preMoney}
              onChange={(v) => onChange({ ...round, preMoney: v })} />
            <NumInput label="Investment size" value={round.investment}
              onChange={(v) => onChange({ ...round, investment: v })} />
          </div>
          <NumInput label="Option pool top-up (% of post-money)" value={round.optionPoolTopUp}
            prefix="" suffix="%" hint="New pool shares are issued BEFORE investor shares, increasing dilution to existing holders."
            onChange={(v) => onChange({ ...round, optionPoolTopUp: v })} />
          {/* Anti-dilution toggle */}
          <button onClick={() => setShowAntiDil((v) => !v)}
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: "0", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
            {showAntiDil ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Anti-dilution protection
          </button>
          {showAntiDil && (
            <div style={{ marginTop: "10px" }}>
              <select value={round.antiDilution}
                onChange={(e) => onChange({ ...round, antiDilution: e.target.value as any })}
                style={{ width: "100%", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: "#fff", outline: "none" }}>
                <option value="none">None</option>
                <option value="broad">Broad-based weighted average</option>
                <option value="narrow">Narrow-based weighted average</option>
                <option value="ratchet">Full ratchet</option>
              </select>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "6px", lineHeight: 1.6 }}>
                {round.antiDilution === "none" && "Investors accept dilution from future rounds on the same terms as common shareholders."}
                {round.antiDilution === "broad" && "Most common. Investor's effective price adjusts down using a formula that includes all dilutive shares. Mild protection."}
                {round.antiDilution === "narrow" && "Formula only counts preferred shares. Stronger protection than broad-based. Uncommon in founder-friendly deals."}
                {round.antiDilution === "ratchet" && "Strongest protection. Investor converts at the lower of their original price and the new round price. Rarely investor-friendly. Can destroy founder economics."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Waterfall table ──────────────────────────────────────────────────────────

function WaterfallTable({ snapshots }: { snapshots: Snapshot[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>Stakeholder</th>
            {snapshots.map((s) => (
              <th key={s.stageName} style={{ textAlign: "right", padding: "8px 10px", color: "rgba(255,255,255,0.4)", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>{s.stageName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Founder rows */}
          {snapshots[0].founders.map((f, fi) => (
            <tr key={f.name} style={{ background: fi % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <td style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: FOUNDER_COLORS[fi] ?? "#fff", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.8)" }}>{f.name}</span>
              </td>
              {snapshots.map((s) => {
                const sf = s.founders[fi];
                return (
                  <td key={s.stageName} style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: sf.pct < sf.originalPct ? "#F87171" : "rgba(255,255,255,0.7)" }}>
                    {fmtPct(sf.pct)}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Option pool */}
          <tr>
            <td style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: POOL_COLOR, flexShrink: 0 }} />
              <span style={{ color: "rgba(255,255,255,0.8)" }}>Option pool</span>
            </td>
            {snapshots.map((s) => (
              <td key={s.stageName} style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.7)" }}>
                {fmtPct(s.poolPct)}
              </td>
            ))}
          </tr>
          {/* Round investors */}
          {snapshots.filter((s) => s.investorPct > 0.01).map((s, i) => (
            <tr key={s.investorName}>
              <td style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: ROUND_COLORS[i] ?? "#10B981", flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.8)" }}>{s.investorName} investors</span>
              </td>
              {snapshots.map((snap) => {
                const isThisRound = snap.stageName === s.stageName;
                const isLaterRound = snapshots.indexOf(snap) > snapshots.indexOf(s);
                // Investors from this round hold their % (diluted by later rounds)
                const baseIdx = snapshots.indexOf(s);
                const snapIdx = snapshots.indexOf(snap);
                let displayPct = 0;
                if (snapIdx >= baseIdx) {
                  displayPct = s.investorPct;
                  // Approximate dilution from later rounds
                  for (let j = baseIdx + 1; j <= snapIdx; j++) {
                    const laterSnap = snapshots[j];
                    if (laterSnap.investorPct > 0) {
                      displayPct = displayPct * (1 - laterSnap.investorPct / 100);
                    }
                    if (laterSnap.poolPct > snapshots[j - 1].poolPct) {
                      const addedPool = laterSnap.poolPct - snapshots[j - 1].poolPct;
                      displayPct = displayPct * (1 - addedPool / 100);
                    }
                  }
                }
                return (
                  <td key={snap.stageName} style={{ textAlign: "right", padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: snapIdx < baseIdx ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" }}>
                    {snapIdx >= baseIdx ? fmtPct(displayPct) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function DilutionPage() {
  // Founders
  const [founders, setFounders] = useState<Founder[]>(() => [
    { id: uid(), name: "Founder 1", pct: 60 },
    { id: uid(), name: "Founder 2", pct: 30 },
  ]);
  const [optionPool, setOptionPool] = useState(10);

  const [rounds, setRounds] = useState<RoundInput[]>([
    { enabled: true, name: "Pre-Seed", preMoney: 3_000_000, investment: 500_000, optionPoolTopUp: 0, antiDilution: "none" },
    { enabled: false, name: "Seed", preMoney: 8_000_000, investment: 2_000_000, optionPoolTopUp: 5, antiDilution: "none" },
    { enabled: false, name: "Series A", preMoney: 25_000_000, investment: 5_000_000, optionPoolTopUp: 5, antiDilution: "broad" },
  ]);

  const [copied, setCopied] = useState(false);

  // Validate total
  const founderTotal = founders.reduce((s, f) => s + f.pct, 0);
  const capTableTotal = founderTotal + optionPool;
  const isValid = Math.abs(capTableTotal - 100) < 0.01;

  const handleFounderChange = (id: string, field: keyof Omit<Founder, "id">, val: string | number) => {
    setFounders((prev) => prev.map((f) => f.id === id ? { ...f, [field]: val } : f));
  };

  const addFounder = () => {
    const remaining = Math.max(0, 100 - capTableTotal);
    setFounders((prev) => [...prev, { id: uid(), name: `Co-founder ${prev.length + 1}`, pct: remaining }]);
  };

  const removeFounder = (id: string) => {
    if (founders.length <= 1) return;
    setFounders((prev) => prev.filter((f) => f.id !== id));
  };

  const updateRound = (index: number, r: RoundInput) => {
    setRounds((prev) => prev.map((old, i) => i === index ? r : old));
  };

  const toggleRound = (index: number) => {
    setRounds((prev) => prev.map((r, i) => i === index ? { ...r, enabled: !r.enabled } : r));
  };

  // Build snapshots for waterfall
  const snapshots = useMemo<Snapshot[]>(() => {
    const founderArr = founders.map((f) => ({ name: f.name, pct: f.pct, originalPct: f.pct }));
    const result: Snapshot[] = [];

    // Founding snapshot
    result.push({
      stageName: "Founding",
      founders: founderArr.map((f) => ({ ...f })),
      poolPct: optionPool,
      investorPct: 0,
      investorName: "",
      postMoney: 0,
      pricePerPct: 0,
    });

    let currentFounders = founderArr.map((f) => ({ name: f.name, pct: f.pct }));
    let currentPool = optionPool;

    rounds.forEach((round) => {
      if (!round.enabled || !round.preMoney || !round.investment) return;
      const { founders: newF, poolPct, investorPct, postMoney } = applyRound(currentFounders, currentPool, round);
      currentFounders = newF;
      currentPool = poolPct;
      result.push({
        stageName: round.name,
        founders: newF.map((f, i) => ({ ...f, originalPct: founderArr[i]?.originalPct ?? f.pct })),
        poolPct,
        investorPct,
        investorName: round.name,
        postMoney,
        pricePerPct: postMoney / 100,
      });
    });

    return result;
  }, [founders, optionPool, rounds]);

  const latest = snapshots[snapshots.length - 1];
  const founderFinal = latest.founders.reduce((s, f) => s + f.pct, 0);
  const founderInitial = founders.reduce((s, f) => s + f.pct, 0);
  const totalDilution = founderInitial - founderFinal;

  // Bar segments for latest snapshot
  const barSegments = [
    ...latest.founders.map((f, i) => ({ color: FOUNDER_COLORS[i] ?? "#7C3AED", pct: f.pct, label: f.name })),
    { color: POOL_COLOR, pct: latest.poolPct, label: "Option pool" },
    ...snapshots.slice(1).map((s, i) => ({ color: ROUND_COLORS[i] ?? "#10B981", pct: s.investorPct, label: `${s.investorName} investors` })),
  ];

  const handleCopy = () => {
    const lines = [
      "Dilution Summary (Hockystick Calculator)",
      "",
      ...snapshots.map((s) => [
        `Stage: ${s.stageName}`,
        ...s.founders.map((f) => `  ${f.name}: ${fmtPct(f.pct)}`),
        `  Option pool: ${fmtPct(s.poolPct)}`,
      ].join("\n")),
      "",
      `Total founder dilution: ${fmtPct(totalDilution)} (${fmtPct(founderInitial)} → ${fmtPct(founderFinal)})`,
      "Model yours at hockystick.app/tools/dilution",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const pw: React.CSSProperties = { maxWidth: "960px", margin: "0 auto", padding: "0 24px" };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much dilution is normal per funding round?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pre-seed: 10 to 20 percent. Seed: 15 to 25 percent. Series A: 20 to 30 percent. A company with strong traction raises at higher valuations and takes less dilution for the same capital."
        }
      },
      {
        "@type": "Question",
        "name": "Is dilution bad?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Not inherently. Dilution with capital and a higher valuation grows the value of your remaining equity. A founder owning 30 percent of a $50M company is wealthier than one owning 90 percent of a $3M company."
        }
      },
      {
        "@type": "Question",
        "name": "How do I minimize equity dilution?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Raise at the highest defensible pre-money valuation. Negotiate option pool size. Raise less capital if you can hit the same milestones. Strong traction is the most effective dilution reducer."
        }
      },
      {
        "@type": "Question",
        "name": "What happens to my equity if the company is acquired?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You receive the value of your shares at the acquisition price. Liquidation preferences held by investors can significantly reduce founder proceeds in a low-multiple acquisition. Always model this before accepting investment terms."
        }
      },
      {
        "@type": "Question",
        "name": "What is the difference between dilution and a down round?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Dilution happens in every round as new shares are issued. A down round values the company lower than the previous round, triggering anti-dilution provisions for preferred investors and further diluting founders."
        }
      }
    ]
  };

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", color: "#fff" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteHeader />

      {/* S1 — Hero */}
      <section style={{ ...pw, padding: "56px 24px 48px" }}>
        <nav style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
          <Link to="/tools" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Dilution Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          Dilution Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          See exactly how much equity each round takes. Model up to 3 funding rounds with option pool top-ups and watch your ownership evolve.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Percentage-based — no share counts required</p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        {!isValid && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#F87171" }}>
            Founders ({fmtPct(founderTotal)}) + Option pool ({fmtPct(optionPool)}) = {fmtPct(capTableTotal)} — must total exactly 100%.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px" }} className="dil-grid">
          <style>{`@media (max-width: 700px) { .dil-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* Left — inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Block A — founders */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <SLabel>Block A — Current cap table</SLabel>
              {founders.map((f, i) => (
                <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 28px", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: FOUNDER_COLORS[i] ?? "#7C3AED", flexShrink: 0 }} />
                    <input value={f.name} onChange={(e) => handleFounderChange(f.id, "name", e.target.value)}
                      style={{ flex: 1, background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "7px 9px", fontSize: "12px", color: "#fff", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", overflow: "hidden" }}>
                    <input type="number" value={f.pct || ""} onChange={(e) => handleFounderChange(f.id, "pct", Number(e.target.value) || 0)}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "7px 7px", fontSize: "12px", color: "#fff", width: "50px" }} />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", padding: "0 6px" }}>%</span>
                  </div>
                  <button onClick={() => removeFounder(f.id)}
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "4px", color: "#F87171", cursor: "pointer", fontSize: "13px", lineHeight: 1, padding: "5px 7px" }}>×</button>
                </div>
              ))}
              {founders.length < 5 && (
                <button onClick={addFounder}
                  style={{ fontSize: "12px", color: "#7C3AED", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", marginTop: "4px" }}>
                  + Add co-founder
                </button>
              )}
              <div style={{ marginTop: "14px" }}>
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: POOL_COLOR, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>Option pool</span>
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{fmtPct(optionPool)}</span>
                </label>
                <input type="range" min={0} max={30} step={0.5} value={optionPool}
                  onChange={(e) => setOptionPool(Number(e.target.value))}
                  style={{ width: "100%", accentColor: POOL_COLOR }} />
              </div>
              <div style={{ marginTop: "12px", padding: "8px 10px", borderRadius: "8px", background: isValid ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${isValid ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                <p style={{ fontSize: "11px", color: isValid ? "#10B981" : "#F87171", margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  Total: {fmtPct(capTableTotal)} {isValid ? "✓" : `(${fmtPct(100 - capTableTotal)} ${capTableTotal < 100 ? "unallocated" : "over 100%"})`}
                </p>
              </div>
            </div>

            {/* Blocks B/C/D — rounds */}
            {rounds.map((round, i) => (
              <RoundPanel key={i} round={round} index={i}
                onChange={(r) => updateRound(i, r)}
                onToggle={() => toggleRound(i)} />
            ))}
          </div>

          {/* Right — output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Summary card */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "14px" }}>Founder ownership summary</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Starting equity (founders)", value: fmtPct(founderInitial), color: "#7C3AED" },
                  { label: `Final equity (after ${snapshots.length - 1} round${snapshots.length - 1 !== 1 ? "s" : ""})`, value: fmtPct(founderFinal), color: "#10B981" },
                  { label: "Total dilution", value: `−${fmtPct(totalDilution)}`, color: "#F87171" },
                  { label: "Latest post-money", value: latest.postMoney > 0 ? fmt$(latest.postMoney) : "—", color: "#F59E0B" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px" }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "5px" }}>{label}</p>
                    <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", color, margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Stacked bar */}
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "8px" }}>Current cap table</p>
              <OwnershipBar segments={barSegments} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                {barSegments.filter((s) => s.pct > 0.05).map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "2px", background: s.color }} />
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{s.label} ({fmtPct(s.pct)})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-founder detail */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "14px" }}>Founder ownership over rounds</p>
              {founders.map((f, fi) => {
                const finalPct = latest.founders[fi]?.pct ?? f.pct;
                const diluted = f.pct - finalPct;
                const barWidth = `${(finalPct / f.pct) * 100}%`;
                return (
                  <div key={f.id} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{f.name}</span>
                      <span style={{ fontSize: "13px", color: "#F87171", fontVariantNumeric: "tabular-nums" }}>
                        {fmtPct(f.pct)} → {fmtPct(finalPct)} (−{fmtPct(diluted)})
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: FOUNDER_COLORS[fi] ?? "#7C3AED", width: barWidth, transition: "width 0.3s", borderRadius: "3px" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Waterfall table */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "14px" }}>Dilution waterfall</p>
              <WaterfallTable snapshots={snapshots} />
            </div>

            {/* Breakeven line */}
            {latest.postMoney > 0 && (
              <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
                <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "14px" }}>Breakeven analysis</p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "8px", lineHeight: 1.6 }}>
                  At the latest post-money valuation of <span style={{ color: "#fff" }}>{fmt$(latest.postMoney)}</span>, each of your ownership percentage points is worth:
                </p>
                <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "28px", color: "#10B981", margin: "0 0 8px" }}>
                  {fmt$(latest.postMoney / 100)} / %
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                  Founders own <span style={{ color: "#fff" }}>{fmtPct(founderFinal)}</span> of the company, valued at <span style={{ color: "#fff" }}>{fmt$(latest.postMoney * founderFinal / 100)}</span> at this valuation.
                </p>

                {/* Majority threshold visual */}
                {(() => {
                  const breakevenSnap = snapshots.slice(1).find((s) =>
                    s.founders.reduce((sum, f) => sum + f.pct, 0) < 50
                  );
                  if (!breakevenSnap) {
                    return (
                      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#10B981', fontSize: 14 }}>
                        You maintain majority ownership through all modeled rounds.
                      </div>
                    );
                  }
                  const snapIdx = snapshots.indexOf(breakevenSnap);
                  const bSegs = [
                    ...breakevenSnap.founders.map((f, i) => ({ color: FOUNDER_COLORS[i] ?? "#7C3AED", pct: f.pct, label: f.name })),
                    { color: POOL_COLOR, pct: breakevenSnap.poolPct, label: "Option pool" },
                    ...snapshots.slice(1, snapIdx + 1).map((s, i) => ({ color: ROUND_COLORS[i] ?? "#10B981", pct: s.investorPct, label: `${s.investorName} investors` })),
                  ];
                  return (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ownership at majority threshold
                      </p>
                      <div style={{ display: 'flex', height: 32, borderRadius: 4, overflow: 'hidden' }}>
                        {bSegs.filter((s) => s.pct > 0).map((s) => (
                          <div key={s.label} title={`${s.label}: ${fmtPct(s.pct)}`}
                            style={{ width: `${s.pct}%`, background: s.color, transition: 'width 0.3s' }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                        Your combined founder ownership crosses below 50% at <span style={{ color: '#fff' }}>{breakevenSnap.stageName}</span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Copy */}
            <button onClick={handleCopy}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#a78bfa", cursor: "pointer" }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy results"}
            </button>
          </div>
        </div>
      </section>

      {/* S3 — How to use */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>How to use this calculator</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              { n: "01", title: "Set up your starting cap table", body: "Enter each founder's name and current equity %, plus your existing option pool size. The total must equal 100% before you can model rounds. Add co-founders with the button." },
              { n: "02", title: "Enable funding rounds", body: "Toggle rounds B, C, and D on and off to model different raise scenarios. Enter pre-money valuation and round size for each. The calculator applies option pool top-ups BEFORE investor shares." },
              { n: "03", title: "Read the waterfall table", body: "The waterfall table shows every stakeholder at every stage. Red values are percentages that decreased from the prior stage. The stacked bar updates live as you change inputs." },
            ].map((step) => (
              <div key={step.n}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "32px", color: "rgba(124,58,237,0.3)", marginBottom: "12px" }}>{step.n}</div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S4 — Methodology */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>Dilution methodology</h2>
          <Accordion title="How dilution is calculated">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              Dilution is calculated percentage-first, not share-count-first. For each round, the investor buys a percentage of the post-money company equal to investment / (pre-money + investment). Existing holders are diluted proportionally by that percentage.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", lineHeight: 1.9, marginTop: "10px" }}>
              post_money = pre_money + investment<br />
              investor_pct = investment / post_money × 100<br />
              your_pct_after = your_pct_before × (1 − investor_pct/100)
            </div>
          </Accordion>
          <Accordion title="Option pool top-up and why it matters">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              Investors often require a refreshed option pool as a condition of investment. The critical detail: the top-up is typically added BEFORE the round closes, which means the founder's pre-money valuation is already diluted by the new pool. This is sometimes called the "option pool shuffle" — it effectively reduces your pre-money by the size of the new pool, benefiting investors more than the raw valuation implies.
            </p>
          </Accordion>
          <Accordion title="Anti-dilution protection">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "10px" }}>
              Anti-dilution protection adjusts the conversion price of preferred shares if the company raises at a lower price (a "down round"). Most MENA VC deals use broad-based weighted average:
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", lineHeight: 1.9, marginTop: "10px" }}>
              new_conversion_price = old_price × (old_shares + new_shares_at_old_price)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/ (old_shares + new_shares_at_new_price)
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginTop: "10px" }}>
              Full ratchet is the most investor-friendly form and is rare in founder-friendly term sheets. It resets the conversion price to the new lower price, which can wipe out founders in severe down rounds.
            </p>
          </Accordion>
        </div>
      </section>

      {/* S5 — FAQ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>Frequently asked questions</h2>
          {[
            { q: "What is dilution?", a: "Dilution is the reduction in your ownership percentage when new shares are issued. It doesn't change the number of shares you own — it changes what percentage of the company those shares represent. A founder who owns 60% before a $2M seed round on an $8M pre-money valuation will own 48% afterward (60% × 80%, since investors get 20%)." },
            { q: "Is dilution always bad?", a: "No. Dilution in exchange for capital that increases the value of the company can make each remaining percentage point worth more in dollar terms. The question isn't how much you own — it's what the company is worth. A founder who owns 10% of a $100M company did better than a founder who owns 60% of a $5M company." },
            { q: "What is the option pool shuffle?", a: "The option pool shuffle is when investors require you to top up the option pool before the round closes, using pre-money valuation to price those shares. This means the new pool dilutes existing shareholders (founders and previous investors), not the incoming investors. Smart founders negotiate for the pool top-up to be carved from the post-money, or minimize the top-up size." },
            { q: "What is a typical seed round dilution?", a: "Seed rounds in MENA typically raise $500K–$2M at $3M–$8M pre-money, resulting in 15–25% investor ownership. Combined with a 5–10% option pool top-up, founders can expect 20–30% total dilution per seed round." },
            { q: "Should I use share count or percentage?", a: "Both work, but percentage-based modeling is simpler for early-stage planning when the exact share count isn't final yet. Share count models (like our Cap Table Calculator) are more precise for legal instruments, SAFE conversions, and investor reporting. Use this dilution calculator for strategy and the cap table calculator for documents." },
          ].map(({ q, a }) => (
            <Accordion key={q} title={q}><p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{a}</p></Accordion>
          ))}
        </div>
      </section>

      {/* S6 — Related tools */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>Related tools</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="rel-grid-d">
            <style>{`@media (max-width: 480px) { .rel-grid-d { grid-template-columns: 1fr !important; } }`}</style>
            {[
              { to: "/tools/cap-table", title: "Cap Table Calculator", desc: "Share-count model with SAFE conversion across rounds." },
              { to: "/tools/safe-note", title: "SAFE Note Calculator", desc: "Model how a SAFE converts at the priced round." },
            ].map((t) => (
              <Link key={t.to} to={t.to as any} style={{ textDecoration: "none" }}>
                <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px" }}>
                  <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "10px 0 6px" }}>{t.title}</h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* S7 — CTA */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111114", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>Dilution is negotiable. Preparation is not.</h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "28px" }}>
            Investors who use Hockystick come in with a full diligence workflow. Meet them with a verified profile and a prepared deal room.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/sign-up" search={{ role: "founder" } as any}
              style={{ display: "inline-flex", alignItems: "center", background: "#7C3AED", color: "#fff", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
              Create your profile
            </Link>
            <Link to="/tools"
              style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 500, textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)" }}>
              All tools
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
