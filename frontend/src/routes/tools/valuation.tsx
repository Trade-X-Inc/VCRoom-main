import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/tools/valuation")({
  head: () => ({
    meta: [
      { title: "Startup Valuation Calculator — Free Tool for Founders | Hockystick" },
      {
        name: "description",
        content:
          "Calculate your startup's valuation using VC Method, Revenue Multiples, and Berkus Method. Built for pre-seed to Series A founders. Free, no signup required.",
      },
      { name: "canonical", content: "https://hockystick.app/tools/valuation" },
    ],
  }),
  component: ValuationPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "pre-revenue" | "pre-seed" | "seed" | "series-a";
type Method = "berkus" | "scorecard" | "vc" | "revenue";
type Industry = "SaaS" | "Marketplace" | "Deep Tech" | "FinTech" | "HealthTech" | "Consumer" | "Hardware";
type Region = "GCC/MENA" | "US" | "EU" | "SEA";

interface ValuationResult {
  conservative: number;
  realistic: number;
  optimistic: number;
  methodName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_METHODS: Record<Stage, Method[]> = {
  "pre-revenue": ["berkus", "scorecard"],
  "pre-seed": ["vc", "revenue", "berkus"],
  "seed": ["vc", "revenue", "berkus"],
  "series-a": ["revenue", "vc"],
};

const STAGE_DEFAULT_METHOD: Record<Stage, Method> = {
  "pre-revenue": "berkus",
  "pre-seed": "vc",
  "seed": "vc",
  "series-a": "revenue",
};

const METHOD_LABELS: Record<Method, string> = {
  berkus: "Berkus Method",
  scorecard: "Scorecard Method",
  vc: "VC Method",
  revenue: "Revenue Multiple",
};

const SCORECARD_REGION_MEDIANS: Record<string, number> = {
  "GCC/MENA": 1_500_000,
  "US": 2_500_000,
  "EU": 2_000_000,
  "SEA": 1_800_000,
};

const REVENUE_MULTIPLES: Record<Industry, Record<Region, [number, number, number]>> = {
  SaaS:       { "GCC/MENA": [4, 6, 9],   US: [6, 10, 15], EU: [5, 8, 12],  SEA: [4, 7, 11] },
  Marketplace: { "GCC/MENA": [2, 4, 6],   US: [3, 6, 10],  EU: [2, 5, 8],   SEA: [2, 4, 7]  },
  "Deep Tech": { "GCC/MENA": [3, 6, 10],  US: [5, 9, 15],  EU: [4, 7, 12],  SEA: [3, 6, 10] },
  FinTech:    { "GCC/MENA": [3, 5, 8],   US: [5, 8, 12],  EU: [4, 6, 10],  SEA: [3, 5, 9]  },
  HealthTech: { "GCC/MENA": [3, 5, 8],   US: [5, 8, 12],  EU: [4, 6, 10],  SEA: [3, 5, 8]  },
  Consumer:   { "GCC/MENA": [1, 3, 5],   US: [2, 4, 7],   EU: [1, 3, 6],   SEA: [1, 3, 5]  },
  Hardware:   { "GCC/MENA": [1, 2, 4],   US: [2, 3, 6],   EU: [1, 3, 5],   SEA: [1, 2, 4]  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Slider({
  label, value, min, max, step = 1, unit = "", onChange, hint,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{label}</label>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
      />
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{hint}</p>}
    </div>
  );
}

function NumberInput({
  label, value, onChange, prefix = "$", hint,
}: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        <span style={{ padding: "10px 12px", fontSize: "13px", color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>{prefix}</span>
        <input
          type="number" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 12px", fontSize: "14px", color: "#fff" }}
        />
      </div>
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>{hint}</p>}
    </div>
  );
}

function Select({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#fff",
          outline: "none", cursor: "pointer",
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Berkus Calculator ────────────────────────────────────────────────────────

const BERKUS_FACTORS = [
  "Sound idea / core value proposition",
  "Prototype exists (reduces technology risk)",
  "Quality management team",
  "Strategic relationships (partnerships, channels)",
  "Product rollout or sales",
];

function BerkusCalculator({ onChange }: { onChange: (r: ValuationResult) => void }) {
  const [factors, setFactors] = useState([50, 50, 50, 50, 50]);

  const update = useCallback((i: number, v: number) => {
    const next = [...factors];
    next[i] = v;
    setFactors(next);
    const values = next.map((f) => (f / 100) * 500_000);
    const total = values.reduce((a, b) => a + b, 0);
    onChange({ conservative: total * 0.7, realistic: total, optimistic: Math.min(total * 1.3, 2_500_000), methodName: "Berkus Method" });
  }, [factors, onChange]);

  const values = factors.map((f) => (f / 100) * 500_000);
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "24px" }}>
        Rate each factor 0–100. Each factor is worth up to $500K. Max total: $2.5M.
      </p>
      {BERKUS_FACTORS.map((label, i) => (
        <div key={label} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{label}</label>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{fmt(values[i])}</span>
          </div>
          <input
            type="range" min={0} max={100} value={factors[i]}
            onChange={(e) => update(i, Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
          />
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Running total</span>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#7C3AED" }}>{fmt(total)}</span>
      </div>
    </div>
  );
}

// ─── Scorecard Calculator ─────────────────────────────────────────────────────

const SCORECARD_FACTORS: { label: string; defaultWeight: number }[] = [
  { label: "Management team quality", defaultWeight: 30 },
  { label: "Size of opportunity", defaultWeight: 25 },
  { label: "Product / technology", defaultWeight: 15 },
  { label: "Sales / traction", defaultWeight: 10 },
  { label: "Competition environment", defaultWeight: 10 },
  { label: "Need for additional funding", defaultWeight: 5 },
  { label: "Other", defaultWeight: 5 },
];

function ScorecardCalculator({ onChange }: { onChange: (r: ValuationResult) => void }) {
  const [region, setRegion] = useState("GCC/MENA");
  const [comparisons, setComparisons] = useState(SCORECARD_FACTORS.map(() => 0));

  const median = SCORECARD_REGION_MEDIANS[region] ?? 1_500_000;

  const compute = useCallback((reg: string, comps: number[]) => {
    const med = SCORECARD_REGION_MEDIANS[reg] ?? 1_500_000;
    let multiplier = 1;
    SCORECARD_FACTORS.forEach((f, i) => {
      multiplier *= (1 + (f.defaultWeight / 100) * (comps[i] / 2));
    });
    const realistic = med * multiplier;
    onChange({ conservative: realistic * 0.75, realistic, optimistic: realistic * 1.35, methodName: "Scorecard Method" });
  }, [onChange]);

  const updateRegion = (r: string) => { setRegion(r); compute(r, comparisons); };
  const updateComp = (i: number, v: number) => {
    const next = [...comparisons];
    next[i] = v;
    setComparisons(next);
    compute(region, next);
  };

  let multiplier = 1;
  SCORECARD_FACTORS.forEach((f, i) => {
    multiplier *= (1 + (f.defaultWeight / 100) * (comparisons[i] / 2));
  });

  const COMP_LABELS: Record<number, string> = { "-2": "Much worse", "-1": "Worse", "0": "Average", "1": "Better", "2": "Much better" };

  return (
    <div>
      <Select
        label="Regional median pre-money"
        value={region}
        options={Object.entries(SCORECARD_REGION_MEDIANS).map(([k, v]) => ({ label: `${k}: ${fmt(v)}`, value: k }))}
        onChange={updateRegion}
      />
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "20px" }}>
        Rate your startup vs. the average startup at your stage in each category.
      </p>
      {SCORECARD_FACTORS.map((f, i) => (
        <div key={f.label} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
              {f.label} <span style={{ color: "rgba(255,255,255,0.3)" }}>({f.defaultWeight}%)</span>
            </label>
            <span style={{ fontSize: "12px", color: comparisons[i] > 0 ? "#10B981" : comparisons[i] < 0 ? "#ef4444" : "rgba(255,255,255,0.5)" }}>
              {COMP_LABELS[comparisons[i]] ?? comparisons[i]}
            </span>
          </div>
          <input
            type="range" min={-2} max={2} step={1} value={comparisons[i]}
            onChange={(e) => updateComp(i, Number(e.target.value))}
            style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
          />
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Score multiplier × regional median</span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#7C3AED" }}>{multiplier.toFixed(2)}x × {fmt(median)}</span>
      </div>
    </div>
  );
}

// ─── VC Method Calculator ─────────────────────────────────────────────────────

function VCCalculator({ onChange }: { onChange: (r: ValuationResult) => void }) {
  const [exitValue, setExitValue] = useState(50);
  const [years, setYears] = useState(5);
  const [irr, setIrr] = useState("40");
  const [investment, setInvestment] = useState(1);
  const [dilution, setDilution] = useState(20);

  const { postMoney, preMoney, ownership } = useMemo(() => {
    const rate = Number(irr) / 100;
    const post = (exitValue * 1_000_000) / Math.pow(1 + rate, years);
    const pre = post - investment * 1_000_000;
    return { postMoney: post, preMoney: pre, ownership: (investment * 1_000_000) / post };
  }, [exitValue, years, irr, investment, dilution]);

  useEffect(() => {
    onChange({
      conservative: Math.max(preMoney * 0.75, 0),
      realistic: Math.max(preMoney, 0),
      optimistic: Math.max(preMoney * 1.3, 0),
      methodName: "VC Method",
    });
  }, [preMoney, onChange]);

  return (
    <div>
      <NumberInput label="Expected exit value ($M)" value={exitValue} onChange={setExitValue} prefix="$M" hint="Target acquisition or IPO value in millions" />
      <Slider label="Years to exit" value={years} min={1} max={10} onChange={setYears} unit=" yrs" />
      <Select
        label="Target investor IRR"
        value={irr}
        options={[
          { label: "30% — Later-stage VC", value: "30" },
          { label: "40% — Seed VC (typical)", value: "40" },
          { label: "50% — Early-stage / angel", value: "50" },
          { label: "60% — Pre-seed / high-risk", value: "60" },
        ]}
        onChange={setIrr}
      />
      <NumberInput label="Investment amount ($M)" value={investment} onChange={setInvestment} prefix="$M" />
      <Slider label="Dilution from this round" value={dilution} min={10} max={40} onChange={setDilution} unit="%" />
      <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "16px", marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        {[
          { label: "Pre-money", value: fmt(Math.max(preMoney, 0)) },
          { label: "Post-money", value: fmt(Math.max(postMoney, 0)) },
          { label: "Implied ownership", value: `${(ownership * 100).toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue Multiple Calculator ──────────────────────────────────────────────

function RevenueCalculator({ onChange }: { onChange: (r: ValuationResult) => void }) {
  const [mrr, setMrr] = useState(50_000);
  const [growth, setGrowth] = useState(10);
  const [industry, setIndustry] = useState<Industry>("SaaS");
  const [region, setRegion] = useState<Region>("GCC/MENA");

  const arr = mrr * 12;
  const [low, mid, high] = REVENUE_MULTIPLES[industry][region] ?? [4, 6, 9];
  const growthBonus = 1 + (growth / 100) * 0.5;

  const compute = useCallback((m: number, g: number, ind: Industry, reg: Region) => {
    const a = m * 12;
    const [l, mi, h] = REVENUE_MULTIPLES[ind][reg] ?? [4, 6, 9];
    const bonus = 1 + (g / 100) * 0.5;
    onChange({
      conservative: a * l * bonus,
      realistic: a * mi * bonus,
      optimistic: a * h * bonus,
      methodName: "Revenue Multiple",
    });
  }, [onChange]);

  return (
    <div>
      <NumberInput label="Monthly Recurring Revenue (MRR)" value={mrr} onChange={(v) => { setMrr(v); compute(v, growth, industry, region); }} hint={`ARR: ${fmt(mrr * 12)}`} />
      <Slider label="Monthly growth rate (MoM)" value={growth} min={0} max={30} onChange={(v) => { setGrowth(v); compute(mrr, v, industry, region); }} unit="%" hint="Higher growth adds a momentum premium to your multiple" />
      <Select
        label="Industry"
        value={industry}
        options={(["SaaS", "Marketplace", "Deep Tech", "FinTech", "HealthTech", "Consumer", "Hardware"] as Industry[]).map((i) => ({ label: i, value: i }))}
        onChange={(v) => { setIndustry(v as Industry); compute(mrr, growth, v as Industry, region); }}
      />
      <Select
        label="Region"
        value={region}
        options={(["GCC/MENA", "US", "EU", "SEA"] as Region[]).map((r) => ({ label: r, value: r }))}
        onChange={(v) => { setRegion(v as Region); compute(mrr, growth, industry, v as Region); }}
      />
      <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "16px", marginTop: "8px" }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
          {industry} · {region} · ARR {fmt(arr)} · {low}x / {mid}x / {high}x multiples
          {growth > 0 && <span> · {growth}% MoM growth bonus</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {[
            { label: "Conservative", value: fmt(arr * low * growthBonus) },
            { label: "Realistic", value: fmt(arr * mid * growthBonus) },
            { label: "Optimistic", value: fmt(arr * high * growthBonus) },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Valuation Output ─────────────────────────────────────────────────────────

function ValuationOutput({ result, stage, method }: { result: ValuationResult; stage: Stage; method: Method }) {
  const [copied, setCopied] = useState(false);

  const copyText = `My startup valuation estimate (Hockystick Calculator):
Conservative: ${fmt(result.conservative)} | Realistic: ${fmt(result.realistic)} | Optimistic: ${fmt(result.optimistic)}
Method: ${result.methodName} | Stage: ${stage}
Calculate yours at hockystick.app/tools/valuation`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const range = result.optimistic - result.conservative;
  const realisticPct = range > 0 ? ((result.realistic - result.conservative) / range) * 100 : 50;

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "28px" }}>
      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "20px" }}>
        Your estimated valuation range
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>Conservative</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(20px, 3vw, 28px)", color: "rgba(255,255,255,0.6)" }}>
            {fmt(result.conservative)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>Realistic</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px, 4vw, 36px)", color: "#ffffff" }}>
            {fmt(result.realistic)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>Optimistic</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(20px, 3vw, 28px)", color: "#10B981" }}>
            {fmt(result.optimistic)}
          </div>
        </div>
      </div>

      {/* Range bar */}
      <div style={{ position: "relative", height: "6px", borderRadius: "99px", background: "linear-gradient(90deg, #7C3AED, #10B981)", marginBottom: "24px" }}>
        <div style={{
          position: "absolute", top: "50%", left: `${realisticPct}%`,
          transform: "translate(-50%, -50%)",
          width: "14px", height: "14px", borderRadius: "50%",
          background: "#fff", border: "2px solid #7C3AED",
        }} />
      </div>

      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
        Range based on {result.methodName}. Actual investor offers will vary based on deal terms, market conditions, and investor thesis.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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
        <Link
          to="/sign-up"
          search={{ role: "founder" } as any}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "#7C3AED", borderRadius: "8px", padding: "10px 16px",
            fontSize: "13px", fontWeight: 600, color: "#fff", textDecoration: "none",
          }}
        >
          Build your Hockystick profile →
        </Link>
      </div>
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{title}</span>
        {open
          ? <ChevronUp size={16} style={{ color: "#7C3AED", flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div style={{ paddingBottom: "20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_RESULT: ValuationResult = { conservative: 1_000_000, realistic: 2_000_000, optimistic: 3_500_000, methodName: "VC Method" };

function ValuationPage() {
  const [stage, setStage] = useState<Stage>("pre-seed");
  const [method, setMethod] = useState<Method>("vc");
  const [result, setResult] = useState<ValuationResult>(DEFAULT_RESULT);

  const handleStageChange = (s: Stage) => {
    setStage(s);
    const defaultMethod = STAGE_DEFAULT_METHOD[s];
    setMethod(defaultMethod);
    setResult(DEFAULT_RESULT);
  };

  const availableMethods = STAGE_METHODS[stage];

  const s: React.CSSProperties = { background: "#0A0A0B", minHeight: "100vh", color: "#fff" };
  const maxW = { maxWidth: "860px", margin: "0 auto", padding: "0 24px" };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a startup valuation?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A startup valuation is the agreed dollar value of your company at the time of a funding round. Pre-money valuation is the value before new investment. Post-money valuation includes the new capital."
        }
      },
      {
        "@type": "Question",
        "name": "What is a good valuation for a pre-seed startup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "In GCC and MENA markets, pre-seed valuations typically range from $1M to $3M pre-money. US pre-seed valuations run higher at $2M to $6M. What matters more is the justification — investors need to see the logic, not just the ask."
        }
      },
      {
        "@type": "Question",
        "name": "How do I know which valuation method to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use Berkus or Scorecard if you have no revenue. Use Revenue Multiple if you have MRR or ARR. Use the VC Method if targeting institutional VCs with a specific IRR target."
        }
      },
      {
        "@type": "Question",
        "name": "Why does my valuation matter before meeting investors?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Walking into an investor conversation without a defended valuation signals you have not done the financial work. Investors who suggest your valuation will suggest a number that works for them, not you."
        }
      },
      {
        "@type": "Question",
        "name": "Is this valuation calculator accurate?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This calculator uses standard venture methodology and gives a defensible starting range, not a precise number. No calculator replaces the market. Use this as preparation, not as a term sheet."
        }
      }
    ]
  };

  return (
    <div style={s}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteHeader />

      {/* ── S1: Hero ──────────────────────────────────────────────── */}
      <section style={{ ...maxW, padding: "56px 24px 48px" }}>
        <nav style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
          <Link to="/tools" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Startup Valuation Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          Startup Valuation Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          Get a realistic valuation range using the same methods investors use at your funding stage. No signup required.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
          Used by founders raising pre-seed to Series A
        </p>
      </section>

      {/* ── S2: Calculator ────────────────────────────────────────── */}
      <section style={{ ...maxW, paddingBottom: "80px" }}>

        {/* Stage selector */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            Step 1 — Funding stage
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["pre-revenue", "pre-seed", "seed", "series-a"] as Stage[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: stage === s ? "#7C3AED" : "transparent",
                  border: `1px solid ${stage === s ? "#7C3AED" : "rgba(255,255,255,0.15)"}`,
                  color: stage === s ? "#fff" : "rgba(255,255,255,0.5)",
                }}
              >
                {s === "pre-revenue" ? "Pre-revenue" : s === "pre-seed" ? "Pre-seed" : s === "seed" ? "Seed" : "Series A"}
              </button>
            ))}
          </div>
        </div>

        {/* Method tabs */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
            Step 2 — Valuation method
          </p>
          <div style={{ display: "flex", gap: "0", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "0" }}>
            {availableMethods.map((m) => {
              const isDefault = m === STAGE_DEFAULT_METHOD[stage];
              const isActive = m === method;
              return (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  style={{
                    padding: "10px 16px", background: "none", border: "none",
                    borderBottom: `2px solid ${isActive ? "#7C3AED" : "transparent"}`,
                    cursor: "pointer", fontSize: "13px", fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    marginBottom: "-1px", transition: "all 0.15s",
                  }}
                >
                  {METHOD_LABELS[m]}
                  {isDefault && (
                    <span style={{ fontSize: "10px", background: "rgba(124,58,237,0.2)", color: "#a78bfa", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      Recommended
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-column layout: inputs + output */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "24px" }} className="calc-grid">
          <style>{`@media (max-width: 640px) { .calc-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* Inputs */}
          <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
            {method === "berkus" && <BerkusCalculator onChange={setResult} />}
            {method === "scorecard" && <ScorecardCalculator onChange={setResult} />}
            {method === "vc" && <VCCalculator onChange={setResult} />}
            {method === "revenue" && <RevenueCalculator onChange={setResult} />}
          </div>

          {/* Output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <ValuationOutput result={result} stage={stage} method={method} />
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: "rgba(255,255,255,0.6)" }}>Tip:</strong> Run all methods available for your stage. The realistic value across methods gives you a defensible range to bring into investor conversations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── S3: How to use ────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How to use this calculator
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              {
                n: "01",
                title: "Select your funding stage",
                body: "Pre-revenue, pre-seed, seed, and Series A each need different valuation approaches. The calculator shows only the methods that apply.",
              },
              {
                n: "02",
                title: "Choose a valuation method",
                body: "No single method is correct. Use the VC Method if you're raising from institutional VCs. Use Revenue Multiple if you have MRR. Use Berkus if you're pre-revenue.",
              },
              {
                n: "03",
                title: "Read the range, not the number",
                body: "A valuation range is more honest than a single number. The realistic figure is your anchor. The optimistic figure is your ceiling in a competitive raise.",
              },
            ].map((step) => (
              <div key={step.n}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "32px", color: "rgba(124,58,237,0.3)", marginBottom: "12px" }}>
                  {step.n}
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S4: Methodology ───────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How each method works
          </h2>
          <Accordion title="VC Method">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
              The VC Method works backwards from your exit. An investor buying in today expects a specific return in 5–7 years. The calculator finds the entry price that makes that return possible.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "#a78bfa" }}>
              Pre-money = Exit Value ÷ (1 + IRR)^Years − Investment
            </div>
          </Accordion>
          <Accordion title="Revenue Multiple">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "12px" }}>
              Public SaaS companies trade at 6–12x ARR. Early-stage startups get a discount for risk. The multiple your startup commands depends on growth rate, sector, and geography.
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, fontStyle: "italic" }}>
              GCC/MENA multiples run 30–40% below US benchmarks due to smaller exit markets and fewer institutional buyers. This changes as the ecosystem matures.
            </p>
          </Accordion>
          <Accordion title="Berkus Method">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              Developed for pre-revenue startups where there's no financial data to model. Five factors, each worth up to $500K, cap at $2.5M total. Used by angel investors, not institutional VCs.
            </p>
          </Accordion>
          <Accordion title="Scorecard Method">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              Adjusts a regional median pre-money valuation based on how your startup compares to the average at your stage. Management team carries the most weight at 30% — the oldest rule in venture.
            </p>
          </Accordion>
        </div>
      </section>

      {/* ── S5: FAQ ───────────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            Frequently asked questions
          </h2>
          {[
            {
              q: "What is a startup valuation?",
              a: "A startup valuation is the agreed dollar value of your company at the time of a funding round. Pre-money valuation is the value before new investment. Post-money valuation includes the new capital. Investors use it to determine how much equity they receive for their check.",
            },
            {
              q: "What is a good valuation for a pre-seed startup?",
              a: "In GCC and MENA markets, pre-seed valuations typically range from $1M to $3M pre-money. US pre-seed valuations run higher at $2M–$6M. What matters more than the number is the justification — investors need to see the logic, not just the ask.",
            },
            {
              q: "How do I know which method to use?",
              a: "Use the Berkus or Scorecard method if you have no revenue. Use the Revenue Multiple method if you have MRR or ARR. Use the VC Method if you're targeting institutional VCs who have a specific IRR target. Many founders calculate all three and use the range as their negotiation anchor.",
            },
            {
              q: "Why does my valuation matter before meeting investors?",
              a: "Walking into an investor conversation without a defended valuation signals that you haven't done the financial work. Investors who have to suggest your valuation to you will suggest a number that works for them, not you.",
            },
            {
              q: "Is this calculator accurate?",
              a: "This calculator uses standard venture methodology. It gives you a defensible starting range, not a precise number. No calculator replaces the market — the market is what investors actually offer you. Use this as preparation, not as a term sheet.",
            },
          ].map(({ q, a }) => (
            <Accordion key={q} title={q}>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{a}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* ── S6: Related tools ─────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>
            Related tools
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="related-grid">
            <style>{`@media (max-width: 480px) { .related-grid { grid-template-columns: 1fr !important; } }`}</style>
            {[
              { to: "/tools/burn-rate", title: "Burn Rate Calculator", desc: "Calculate monthly gross and net burn plus runway." },
              { to: "/tools/cap-table", title: "Cap Table Calculator", desc: "Model equity distribution across founders and rounds." },
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

      {/* ── S7: Hockystick CTA ────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111114", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Knowing your valuation is step one.
          </h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "28px" }}>
            Step two is getting it in front of investors who are actively looking. Hockystick puts your verified profile in front of verified investors — no cold email required.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              style={{
                display: "inline-flex", alignItems: "center",
                background: "#7C3AED", color: "#fff", borderRadius: "10px",
                padding: "12px 24px", fontSize: "14px", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Create your profile
            </Link>
            <Link
              to="/trust"
              style={{
                display: "inline-flex", alignItems: "center",
                background: "transparent", color: "rgba(255,255,255,0.5)",
                borderRadius: "10px", padding: "12px 24px", fontSize: "14px",
                fontWeight: 500, textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
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
