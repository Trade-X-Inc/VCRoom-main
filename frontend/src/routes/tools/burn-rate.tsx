import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Calendar } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/tools/burn-rate")({
  head: () => ({
    meta: [
      { title: "Burn Rate & Runway Calculator — Free Tool for Startups | Hockystick" },
      {
        name: "description",
        content:
          "Calculate your startup's monthly burn rate and runway in seconds. Model three scenarios, see your cash-out date, and know exactly when to start your next raise. Free, no signup required.",
      },
    ],
  }),
  component: BurnRatePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpenseState {
  team: number;
  office: number;
  marketing: number;
  tech: number;
  legal: number;
  other: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(decimals > 0 ? decimals : 0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtMonth(n: number): string {
  return `${Math.round(n)} mo`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(months));
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return MONTH_LABELS[d.getMonth()];
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, hint, prefix = "$",
}: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; prefix?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        <span style={{ padding: "10px 12px", fontSize: "13px", color: "rgba(255,255,255,0.35)", borderRight: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>{prefix}</span>
        <input
          type="number" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 12px", fontSize: "14px", color: "#fff" }}
        />
      </div>
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{hint}</p>}
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{title}</span>
        {open
          ? <ChevronUp size={16} style={{ color: "#7C3AED", flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ paddingBottom: "20px" }}>{children}</div>}
    </div>
  );
}

// ─── Expense category colours ─────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  team:      "#7C3AED",
  office:    "#6366F1",
  marketing: "#10B981",
  tech:      "#F59E0B",
  legal:     "#3B82F6",
  other:     "#EC4899",
};

const CAT_LABELS: Record<string, string> = {
  team: "Team & Salaries", office: "Office & Rent",
  marketing: "Marketing & Ads", tech: "Tech & Software",
  legal: "Legal & Admin", other: "Other",
};

// ─── Status badge helpers ─────────────────────────────────────────────────────

function statusForMonths(months: number): { label: string; bg: string; color: string } {
  if (months >= 18) return { label: "Safe", bg: "rgba(16,185,129,0.18)", color: "#10B981" };
  if (months >= 12) return { label: "Plan your raise", bg: "rgba(245,158,11,0.18)", color: "#F59E0B" };
  if (months >= 6)  return { label: "Start raising now", bg: "rgba(249,115,22,0.18)", color: "#F97316" };
  return { label: "Critical", bg: "rgba(239,68,68,0.18)", color: "#EF4444" };
}

function raiseAdvice(months: number): string {
  if (months >= 18) return "You have time. Start building investor relationships now, not urgency.";
  if (months >= 12) return "Start in the next 30–60 days. A raise takes 3–6 months and you want to close with 9+ months left.";
  if (months >= 6)  return "You should be raising right now. Investors can sense desperation below 6 months.";
  return "Immediate action required. Focus only on the highest-probability investors. Consider bridge financing while you raise.";
}

// ─── SVG Cash Projection Chart ────────────────────────────────────────────────

function CashChart({ cash, netBurn, growthRate }: { cash: number; netBurn: number; growthRate: number }) {
  const MONTHS = 12;
  const W = 700; const H = 180;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  // Build 3 series: current, optimistic (20% cut), aggressive (35% cut)
  function series(burnMultiplier: number): number[] {
    const pts: number[] = [cash];
    let rev = 0; // simplified: growth reduces net burn month-over-month
    for (let m = 1; m <= MONTHS; m++) {
      const prevBurn = netBurn * burnMultiplier;
      const revGain = rev + (cash * growthRate / 100 / 12); // incremental rev offset
      rev = Math.min(revGain, prevBurn); // can't exceed burn
      const balance = Math.max(pts[m - 1] - prevBurn + rev, 0);
      pts.push(balance);
    }
    return pts;
  }

  const s0 = series(1);
  const s1 = series(0.8);
  const s2 = series(0.65);

  const maxVal = Math.max(...s0, ...s1, ...s2, 1);

  function x(i: number) { return PAD.left + (i / MONTHS) * cW; }
  function y(v: number) { return PAD.top + cH - (v / maxVal) * cH; }
  function toPath(s: number[]) {
    return s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  }

  // Find first cash-out index for each series
  function cashOutIdx(s: number[]) { return s.findIndex((v) => v === 0 && s[s.indexOf(v) - 1] > 0); }
  const co0 = cashOutIdx(s0); const co1 = cashOutIdx(s1); const co2 = cashOutIdx(s2);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => maxVal * p);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: "320px", display: "block" }}>
        {/* Y grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {Array.from({ length: MONTHS + 1 }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">
            {monthLabel(i)}
          </text>
        ))}

        {/* Cash-out vertical markers */}
        {[co0, co1, co2].map((ci, idx) =>
          ci > 0 ? (
            <line key={idx} x1={x(ci)} x2={x(ci)} y1={PAD.top} y2={H - PAD.bottom}
              stroke="#EF4444" strokeWidth={1} strokeDasharray="4,3" opacity={idx === 0 ? 0.8 : 0.4} />
          ) : null
        )}

        {/* Series lines */}
        {[
          { d: toPath(s2), stroke: "rgba(255,255,255,0.25)", label: "Aggressive" },
          { d: toPath(s1), stroke: "rgba(16,185,129,0.7)", label: "Optimistic" },
          { d: toPath(s0), stroke: "rgba(124,58,237,0.85)", label: "Current" },
        ].map(({ d, stroke }) => (
          <path key={stroke} d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
        ))}

        {/* Zero line */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap" }}>
        {[
          { color: "rgba(124,58,237,0.85)", label: "Current trajectory" },
          { color: "rgba(16,185,129,0.7)", label: "Optimistic (−20%)" },
          { color: "rgba(255,255,255,0.25)", label: "Aggressive (−35%)" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "2px", background: color, borderRadius: "2px" }} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
        {co0 > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "0", borderTop: "1px dashed #EF4444" }} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Cash out</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Burn Rate Tab ────────────────────────────────────────────────────────────

function BurnTab({
  expenses, setExpenses, mrr, setMrr, nonRecurring, setNonRecurring,
}: {
  expenses: ExpenseState; setExpenses: (e: ExpenseState) => void;
  mrr: number; setMrr: (v: number) => void;
  nonRecurring: number; setNonRecurring: (v: number) => void;
}) {
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const totalRevenue = mrr + nonRecurring;
  const grossBurn = totalExpenses;
  const netBurn = Math.max(grossBurn - totalRevenue, 0);

  const topCat = Object.entries(expenses).reduce((a, b) => b[1] > a[1] ? b : a, ["", 0]);
  const topPct = grossBurn > 0 ? ((topCat[1] as number) / grossBurn * 100).toFixed(0) : "0";

  function setExp(key: keyof ExpenseState, val: number) {
    setExpenses({ ...expenses, [key]: val });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="calc-grid">
      <style>{`@media (max-width: 640px) { .calc-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* Left — Inputs */}
      <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "16px" }}>
          Revenue
        </p>
        <NumberInput label="Monthly Recurring Revenue (MRR)" value={mrr} onChange={setMrr} />
        <NumberInput label="Non-recurring revenue this month" value={nonRecurring} onChange={setNonRecurring} />

        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", margin: "20px 0 16px" }}>
          Monthly expenses by category
        </p>
        {(Object.keys(expenses) as (keyof ExpenseState)[]).map((key) => (
          <NumberInput
            key={key}
            label={`${CAT_LABELS[key]} ($)`}
            value={expenses[key]}
            onChange={(v) => setExp(key, v)}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Total monthly expenses</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{fmt(totalExpenses)}</span>
        </div>
      </div>

      {/* Right — Output */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Metric blocks */}
        {[
          {
            label: "Gross Burn Rate",
            value: fmt(grossBurn),
            sub: "Total spent per month before revenue",
            color: "#fff",
          },
          {
            label: "Net Burn Rate",
            value: fmt(netBurn),
            sub: "Cash leaving your account each month",
            color: netBurn === 0 ? "#10B981" : totalRevenue >= grossBurn ? "#10B981" : "#F87171",
          },
          {
            label: "Largest cost driver",
            value: grossBurn > 0 ? CAT_LABELS[topCat[0]] : "—",
            sub: grossBurn > 0 ? `${topPct}% of total expenses` : "Enter expenses above",
            color: grossBurn > 0 ? CAT_COLORS[topCat[0]] : "rgba(255,255,255,0.4)",
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</p>
            <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3vw, 30px)", color, margin: "0 0 6px" }}>{value}</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>{sub}</p>
          </div>
        ))}

        {/* Stacked bar breakdown */}
        {grossBurn > 0 && (
          <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "12px" }}>
              Expense breakdown
            </p>
            {/* Stacked bar */}
            <div style={{ display: "flex", height: "10px", borderRadius: "6px", overflow: "hidden", marginBottom: "14px" }}>
              {(Object.keys(expenses) as (keyof ExpenseState)[])
                .filter((k) => expenses[k] > 0)
                .map((k) => (
                  <div key={k} style={{ flex: expenses[k] / grossBurn, background: CAT_COLORS[k], transition: "flex 0.3s" }} />
                ))}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {(Object.keys(expenses) as (keyof ExpenseState)[])
                .filter((k) => expenses[k] > 0)
                .sort((a, b) => expenses[b] - expenses[a])
                .map((k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: CAT_COLORS[k], flexShrink: 0 }} />
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{CAT_LABELS[k]}</span>
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>{(expenses[k] / grossBurn * 100).toFixed(0)}%</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.6)", minWidth: "56px", textAlign: "right" }}>{fmt(expenses[k])}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Runway Tab ───────────────────────────────────────────────────────────────

function RunwayTab({ prefillNetBurn, prefillGrossBurn, prefillMrr }: { prefillNetBurn: number; prefillGrossBurn: number; prefillMrr: number }) {
  const [cash, setCash] = useState(500_000);
  const [netBurn, setNetBurn] = useState(prefillNetBurn || 25_000);
  const [growthRate, setGrowthRate] = useState(0);
  const [copied, setCopied] = useState(false);

  const effectiveBurn = netBurn > 0 ? netBurn : 1;

  const scenarios = useMemo(() => {
    const today = new Date();
    function calc(burnMult: number) {
      const burn = effectiveBurn * burnMult;
      const months = burn > 0 ? cash / burn : 999;
      const cashOut = burn > 0 ? addMonths(today, months) : null;
      return { months, cashOut, burn };
    }
    return [
      { label: "Current trajectory", mult: 1, highlight: true },
      { label: "Optimistic", sub: "20% expense reduction", mult: 0.8, highlight: false },
      { label: "Aggressive", sub: "35% expense reduction", mult: 0.65, highlight: false },
    ].map((s) => ({ ...s, ...calc(s.mult) }));
  }, [cash, effectiveBurn]);

  const currentRunway = scenarios[0].months;

  const copyText = `Burn Rate & Runway Summary (Hockystick Calculator)
Gross burn: ${fmt(prefillGrossBurn)}/mo | Net burn: ${fmt(prefillNetBurn > 0 ? prefillNetBurn : netBurn)}/mo
Current runway: ${Math.round(currentRunway)} months (cash out: ${scenarios[0].cashOut ? formatDate(scenarios[0].cashOut) : "N/A"})
Calculate yours at hockystick.app/tools/burn-rate`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {prefillNetBurn > 0 && (
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: "8px", padding: "10px 14px" }}>
          Using your burn rate from the Burn Rate tab. You can also enter values manually below.
        </p>
      )}

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }} className="runway-inputs">
        <style>{`@media (max-width: 640px) { .runway-inputs { grid-template-columns: 1fr !important; } }`}</style>
        <div>
          <NumberInput label="Current cash balance ($)" value={cash} onChange={setCash} />
        </div>
        <div>
          <NumberInput
            label={prefillNetBurn > 0 ? "Net burn rate (auto-filled)" : "Net burn rate ($/month)"}
            value={prefillNetBurn > 0 ? prefillNetBurn : netBurn}
            onChange={setNetBurn}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
            Expected MoM revenue growth
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Growth offset</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{growthRate}%</span>
          </div>
          <input
            type="range" min={0} max={20} step={1} value={growthRate}
            onChange={(e) => setGrowthRate(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
          />
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            Revenue growth that offsets burn
          </p>
        </div>
      </div>

      {/* Three scenario cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }} className="scenario-grid">
        <style>{`@media (max-width: 640px) { .scenario-grid { grid-template-columns: 1fr !important; } }`}</style>
        {scenarios.map((sc) => {
          const badge = statusForMonths(sc.months);
          return (
            <div
              key={sc.label}
              style={{
                background: "#111114",
                border: `1px solid ${sc.highlight ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                {sc.label}
              </p>
              {sc.sub && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "12px" }}>{sc.sub}</p>}
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "36px", color: "#fff", lineHeight: 1, marginBottom: "8px" }}>
                {sc.months >= 99 ? "∞" : Math.round(sc.months)}
                <span style={{ fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.5)", marginLeft: "4px" }}>months</span>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>
                {sc.cashOut ? `Cash out: ${formatDate(sc.cashOut)}` : "No cash-out projected"}
              </p>
              <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "5px", background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* SVG Cash Projection Chart */}
      <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "16px" }}>
          12-month cash projection
        </p>
        <CashChart cash={cash} netBurn={effectiveBurn} growthRate={growthRate} />
      </div>

      {/* Raise timing card */}
      <div style={{ border: "1px solid rgba(124,58,237,0.3)", borderRadius: "12px", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <Calendar size={18} style={{ color: "#7C3AED", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>When should you start your raise?</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "12px" }}>
            {raiseAdvice(currentRunway)}
          </p>
          <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontSize: "13px", color: "#a78bfa", textDecoration: "none" }}>
            Build your Hockystick profile to reach investors faster →
          </Link>
        </div>
      </div>

      {/* Copy results */}
      <div>
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "8px", padding: "10px 16px", fontSize: "13px",
            fontWeight: 600, color: "#a78bfa", cursor: "pointer",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy results"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function BurnRatePage() {
  const [tab, setTab] = useState<"burn" | "runway">("burn");
  const [mrr, setMrr] = useState(0);
  const [nonRecurring, setNonRecurring] = useState(0);
  const [expenses, setExpenses] = useState<ExpenseState>({
    team: 0, office: 0, marketing: 0, tech: 0, legal: 0, other: 0,
  });

  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const totalRevenue = mrr + nonRecurring;
  const grossBurn = totalExpenses;
  const netBurn = Math.max(grossBurn - totalRevenue, 0);

  const pw = { maxWidth: "860px", margin: "0 auto", padding: "0 24px" };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a good burn rate for a startup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "There is no universal good burn rate. Most VCs want to see 18 or more months of runway post-raise at Series A. At pre-seed and seed, 12 to 18 months is acceptable. Below 9 months post-raise signals poor planning."
        }
      },
      {
        "@type": "Question",
        "name": "What is the difference between gross burn and net burn?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gross burn is all outgoing cash. Net burn is gross burn minus revenue. A startup with $60K expenses and $20K MRR has $40K net burn. That is the number investors use to calculate runway."
        }
      },
      {
        "@type": "Question",
        "name": "How much runway should I have before raising?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Raise when you have 12 to 15 months of runway. Institutional fundraising takes 3 to 6 months. You want to close with 9 or more months still in the bank. Raising on 6 months puts you in a weak negotiating position."
        }
      },
      {
        "@type": "Question",
        "name": "How do I extend my runway without cutting team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cut non-essential software subscriptions, reduce contractor hours, and negotiate vendor payment terms first. Most pre-seed startups find 15 to 25 percent savings in software and marketing without losing velocity."
        }
      },
      {
        "@type": "Question",
        "name": "When should I be worried about my burn rate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Worry when net burn grows faster than revenue. That pattern kills startups — not a high burn rate itself, but high burn with flat or declining revenue. Monthly burn reviews should be a standing founder ritual."
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
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Burn Rate &amp; Runway Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          Burn Rate &amp; Runway Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          Know your monthly burn, your runway in months, and the exact date your cash runs out — before your investor asks.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          Used by founders tracking financial health between rounds
        </p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        {/* Tabs */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "28px", display: "flex" }}>
          {(["burn", "runway"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 20px", background: "none", border: "none",
                borderBottom: `2px solid ${tab === t ? "#7C3AED" : "transparent"}`,
                marginBottom: "-1px", cursor: "pointer",
                fontSize: "14px", fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "#fff" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s",
              }}
            >
              {t === "burn" ? "Burn Rate" : "Runway"}
            </button>
          ))}
        </div>

        {tab === "burn" && (
          <BurnTab
            expenses={expenses} setExpenses={setExpenses}
            mrr={mrr} setMrr={setMrr}
            nonRecurring={nonRecurring} setNonRecurring={setNonRecurring}
          />
        )}
        {tab === "runway" && (
          <RunwayTab prefillNetBurn={netBurn} prefillGrossBurn={grossBurn} prefillMrr={mrr} />
        )}
      </section>

      {/* S3 — How to use */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How to use this calculator
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              {
                n: "01",
                title: "Enter your monthly expenses by category",
                body: "Breaking down costs by category tells you where to cut first if you need to extend runway. Aggregate numbers hide the problem.",
              },
              {
                n: "02",
                title: "Check your three scenarios",
                body: "The current trajectory tells you where you're heading. The optimistic and aggressive scenarios show what's possible if you act now.",
              },
              {
                n: "03",
                title: "Use the raise timing signal",
                body: "The rule of thumb: start raising when you have 12 months of runway left. Close before you drop below 6. No investor wants to save a dying company.",
              },
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
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How these calculations work
          </h2>
          <Accordion title="Burn Rate">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
              Gross burn rate is every dollar leaving your account each month — salaries, rent, software, everything. Net burn rate subtracts revenue. Investors care about net burn because it shows how much of your cash the business actually consumes. A startup with $50K gross burn and $30K MRR has a $20K net burn — that's the number that matters.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "#a78bfa", lineHeight: 1.9 }}>
              Gross Burn = Σ all monthly expenses<br />
              Net Burn = Gross Burn − Monthly Revenue
            </div>
          </Accordion>
          <Accordion title="Runway">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
              Runway is how many months you can operate at your current net burn before you run out of cash. It doesn't account for revenue growth — that's why the optimistic scenarios add a growth factor. The cash-out date is calculated from today, assuming constant burn.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "#a78bfa", lineHeight: 1.9 }}>
              Runway (months) = Cash Balance ÷ Net Burn Rate<br />
              Cash-out Date = Today + Runway months
            </div>
          </Accordion>
        </div>
      </section>

      {/* S5 — FAQ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            Frequently asked questions
          </h2>
          {[
            {
              q: "What is a good burn rate for a startup?",
              a: "There is no universal good burn rate. What matters is the relationship between your burn and your runway. Most VCs want to see 18+ months of runway post-raise at Series A. At pre-seed and seed, 12–18 months is acceptable. Below 9 months post-raise signals poor planning.",
            },
            {
              q: "What is the difference between gross burn and net burn?",
              a: "Gross burn is all outgoing cash. Net burn is gross burn minus revenue. A startup generating $20K MRR with $60K in expenses has $40K net burn — that's the number investors use to calculate your runway. Gross burn is useful for understanding your cost structure.",
            },
            {
              q: "How much runway should I have before raising?",
              a: "Raise when you have 12–15 months of runway. Institutional fundraising takes 3–6 months. You want to close a round with 9+ months still in the bank. Raising on 6 months of runway puts you in a weak negotiating position — investors know you're running out.",
            },
            {
              q: "How do I extend my runway without cutting team?",
              a: "The highest-leverage categories to cut first are marketing spend (if pre-product-market fit), software tools with overlap, and non-essential contractors. Team cuts are a last resort — they slow growth. Most pre-seed startups find 15–25% savings in software and marketing without losing velocity.",
            },
            {
              q: "When should I be worried about my burn rate?",
              a: "Worry when your net burn is growing faster than your revenue. That's the pattern that kills startups — not a high burn rate itself, but a high burn rate with flat or declining revenue. Monthly burn rate reviews should be a standing founder ritual, not a quarterly surprise.",
            },
          ].map(({ q, a }) => (
            <Accordion key={q} title={q}>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{a}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* S6 — Related tools */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>
            Related tools
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="related-grid">
            <style>{`@media (max-width: 480px) { .related-grid { grid-template-columns: 1fr !important; } }`}</style>
            <Link to="/tools/valuation" style={{ textDecoration: "none" }}>
              <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px", cursor: "pointer" }}>
                <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "10px 0 6px" }}>Startup Valuation Calculator</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>VC Method, Revenue Multiples, and Berkus for pre-seed to Series A.</p>
              </div>
            </Link>
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "20px", opacity: 0.5 }}>
              <span style={{ fontSize: "10px", background: "rgba(124,58,237,0.15)", color: "#7C3AED", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Coming soon</span>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "10px 0 6px" }}>COGS Calculator</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>Break down cost of goods sold and calculate gross margin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* S7 — CTA */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111114", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Runway tells investors how serious you are.
          </h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "28px" }}>
            Investors review your financials before they take a first meeting. A Hockystick profile shows investors your financial readiness before you're in the room.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              style={{ display: "inline-flex", alignItems: "center", background: "#7C3AED", color: "#fff", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
            >
              Create your profile
            </Link>
            <Link
              to="/trust"
              style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 500, textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              See how verification works
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
