import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Calendar } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/tools/runway")({
  head: () => ({
    meta: [
      { title: "Startup Runway Calculator — How Long Until You Run Out of Cash | Hockystick" },
      {
        name: "description",
        content:
          "Calculate exactly how many months of runway your startup has. See your cash-out date, model three scenarios, and know when to start your next fundraise. Free, no signup required.",
      },
    ],
  }),
  component: RunwayPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(months));
  return d;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return MONTH_NAMES[d.getMonth()];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, hint, prefix = "$",
}: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: React.ReactNode; prefix?: string;
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
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function SliderInput({
  label, value, onChange, min, max, step = 1, unit = "%", hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>{label}</label>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{value}{unit}</span>
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

function CollapsibleBlock({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{title}</span>
        {open
          ? <ChevronUp size={14} style={{ color: "#7C3AED", flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function runwayColor(months: number): string {
  if (months >= 18) return "#10B981";
  if (months >= 12) return "#F59E0B";
  if (months >= 6)  return "#F97316";
  return "#EF4444";
}

function runwayBadge(months: number): { label: string; bg: string; color: string } {
  if (months >= 18) return { label: "Safe to grow",          bg: "rgba(16,185,129,0.15)",  color: "#10B981" };
  if (months >= 12) return { label: "Plan your raise",       bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" };
  if (months >= 6)  return { label: "Start raising now",     bg: "rgba(249,115,22,0.15)",  color: "#F97316" };
  return             { label: "Critical — act immediately", bg: "rgba(239,68,68,0.15)",  color: "#EF4444" };
}

// ─── SVG Cash Projection Chart ────────────────────────────────────────────────

function RunwayChart({
  cash, netBurn, raiseAmount, monthsToClose,
}: {
  cash: number; netBurn: number; raiseAmount: number; monthsToClose: number;
}) {
  const MONTHS = 12;
  const W = 700; const H = 180;
  const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const burn = Math.max(netBurn, 1);

  // Series 0: current trajectory
  const s0: number[] = [];
  for (let m = 0; m <= MONTHS; m++) s0.push(Math.max(cash - burn * m, 0));

  // Series 1: 20% cost cut
  const s1: number[] = [];
  const burn1 = burn * 0.8;
  for (let m = 0; m <= MONTHS; m++) s1.push(Math.max(cash - burn1 * m, 0));

  // Series 2: post-raise (only if raise > 0)
  const showRaise = raiseAmount > 0;
  const s2: number[] = [];
  if (showRaise) {
    for (let m = 0; m <= MONTHS; m++) {
      if (m <= monthsToClose) {
        s2.push(Math.max(cash - burn * m, 0));
      } else {
        const cashAtClose = Math.max(cash - burn * monthsToClose, 0) + raiseAmount;
        s2.push(Math.max(cashAtClose - burn * (m - monthsToClose), 0));
      }
    }
  }

  const allSeries = showRaise ? [s0, s1, s2] : [s0, s1];
  const maxVal = Math.max(...allSeries.flat(), 1);

  function x(i: number) { return PAD.left + (i / MONTHS) * cW; }
  function y(v: number) { return PAD.top + cH - (v / maxVal) * cH; }
  function toPath(s: number[]) {
    return s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  }

  // Find first zero crossing (index where value hits 0 and previous was > 0)
  function cashOutIdx(s: number[]): number {
    for (let i = 1; i < s.length; i++) {
      if (s[i] === 0 && s[i - 1] > 0) return i;
    }
    return -1;
  }

  const co0 = cashOutIdx(s0);
  const co1 = cashOutIdx(s1);
  const co2 = showRaise ? cashOutIdx(s2) : -1;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => maxVal * p);
  const anyHitsZero = co0 > 0 || co1 > 0 || co2 > 0;

  const seriesDefs = [
    ...(showRaise ? [{ s: s2, stroke: "rgba(255,255,255,0.3)",   co: co2, label: "Post-raise" }] : []),
    { s: s1, stroke: "rgba(16,185,129,0.65)",  co: co1, label: "20% cost cut" },
    { s: s0, stroke: "#7C3AED",               co: co0, label: "Current trajectory" },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: "320px", display: "block" }}>
        {/* Y grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">{fmt(v)}</text>
          </g>
        ))}

        {/* X axis labels */}
        {Array.from({ length: MONTHS + 1 }, (_, i) => i).filter((i) => i % 2 === 0).map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.3)">{monthLabel(i)}</text>
        ))}

        {/* Cash-out dashed vertical lines */}
        {seriesDefs.map(({ co }, idx) =>
          co > 0 ? (
            <line key={`co${idx}`} x1={x(co)} x2={x(co)} y1={PAD.top} y2={H - PAD.bottom}
              stroke="#EF4444" strokeWidth={1} strokeDasharray="4,3" opacity={idx === seriesDefs.length - 1 ? 0.85 : 0.4} />
          ) : null
        )}

        {/* Series paths */}
        {seriesDefs.map(({ s, stroke }) => (
          <path key={stroke} d={toPath(s)} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
        ))}

        {/* Zero baseline */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap" }}>
        {[
          { color: "#7C3AED",               label: "Current trajectory" },
          { color: "rgba(16,185,129,0.65)", label: "20% cost cut" },
          ...(showRaise ? [{ color: "rgba(255,255,255,0.3)", label: "Post-raise" }] : []),
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "2px", background: color, borderRadius: "2px" }} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
        {anyHitsZero && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "24px", height: "0", borderTop: "1px dashed #EF4444" }} />
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Cash out</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function RunwayPage() {
  const [cash, setCash] = useState(500_000);
  const [netBurn, setNetBurn] = useState(25_000);

  // Growth adjustment (optional)
  const [showGrowth, setShowGrowth] = useState(false);
  const [revGrowth, setRevGrowth] = useState(0);
  const [expGrowth, setExpGrowth] = useState(0);

  // Raise planning (optional)
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [monthsToClose, setMonthsToClose] = useState(4);

  const [copied, setCopied] = useState(false);

  const burn = Math.max(netBurn, 1);

  const scenarios = useMemo(() => {
    const today = new Date();

    // Effective burn for current (with optional growth adjustments — simplified: growth reduces net burn linearly)
    const growthAdjFactor = 1 - (revGrowth - expGrowth) / 100;
    const effectiveBurn = burn * Math.max(growthAdjFactor, 0.1);

    function baseRunway(b: number): { months: number; cashOut: Date | null } {
      const months = b > 0 ? cash / b : 999;
      const cashOut = b > 0 && months < 999 ? addMonths(today, months) : null;
      return { months, cashOut };
    }

    const current = baseRunway(effectiveBurn);
    const cut20    = baseRunway(effectiveBurn * 0.8);

    // Post-raise: deduct burn during raise period, add raise, then re-calculate
    const cashAtClose = Math.max(cash - effectiveBurn * monthsToClose, 0) + raiseAmount;
    const postRaiseMonths = raiseAmount > 0 && effectiveBurn > 0
      ? monthsToClose + cashAtClose / effectiveBurn
      : null;
    const postRaiseCashOut = postRaiseMonths != null
      ? addMonths(today, postRaiseMonths)
      : null;

    return { current, cut20, postRaiseMonths, postRaiseCashOut, effectiveBurn };
  }, [cash, burn, revGrowth, expGrowth, raiseAmount, monthsToClose]);

  const { current, cut20, postRaiseMonths, postRaiseCashOut, effectiveBurn } = scenarios;
  const badge = runwayBadge(current.months);
  const color = runwayColor(current.months);
  const today = new Date();

  // Raise timing advice
  function raiseTimingText(): string {
    const r = current.months;
    const startMonth = formatDateShort(addMonths(today, Math.max(r - 12, 0)));
    if (r > 18) {
      return `You have breathing room. Use this time to build investor relationships, not urgency. Start warm outreach in ${startMonth}.`;
    }
    if (r >= 12) {
      const cushion = Math.round(r - monthsToClose);
      return `Start now. A raise takes ${monthsToClose} months on average. You need to close with ${cushion > 0 ? cushion : 0} months remaining. That window opens in approximately ${Math.round(Math.max(r - 12, 0))} months.`;
    }
    if (r >= 6) {
      return "You should already be raising. Investors can sense desperation below 6 months. Focus on the 3 highest-probability investors first.";
    }
    return "Immediate action required. Consider bridge financing while you run a parallel raise process. Do not spend time on cold outreach — work only existing relationships.";
  }

  const copyText = `Runway Summary (Hockystick Calculator)
Cash: ${fmt(cash)} | Net burn: ${fmt(burn)}/mo
Runway: ${current.months >= 999 ? "∞" : Math.round(current.months)} months | Cash-out: ${current.cashOut ? formatDateLong(current.cashOut) : "N/A"}
After 20% cut: ${cut20.months >= 999 ? "∞" : Math.round(cut20.months)} months
Calculate yours at hockystick.app/tools/runway`;

  const pw: React.CSSProperties = { maxWidth: "960px", margin: "0 auto", padding: "0 24px" };

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", color: "#fff" }}>
      <SiteHeader />

      {/* S1 — Hero */}
      <section style={{ ...pw, padding: "56px 24px 48px" }}>
        <nav style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
          <Link to="/tools" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Runway Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          Startup Runway Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          Enter your cash balance and burn rate. Get your cash-out date, months of runway, and the exact window to start your next raise.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Used by founders tracking cash between funding rounds</p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }} className="rwy-grid">
          <style>{`@media (max-width: 700px) { .rwy-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* LEFT — Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Block A: Cash Position */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", marginBottom: "12px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "16px" }}>
                Block A — Cash position
              </p>
              <NumberInput
                label="Current cash balance ($)"
                value={cash}
                onChange={setCash}
              />
              <NumberInput
                label="Monthly net burn rate ($)"
                value={netBurn}
                onChange={setNetBurn}
                hint={
                  <>
                    Net burn = total expenses − monthly revenue.{" "}
                    <Link to="/tools/burn-rate" style={{ color: "#a78bfa", textDecoration: "none" }}>
                      Need help calculating? →
                    </Link>
                  </>
                }
              />
            </div>

            {/* Block B: Growth Adjustment (collapsed) */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
              <button
                onClick={() => setShowGrowth((v) => !v)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Block B — Adjust for revenue growth</span>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginLeft: "8px" }}>optional</span>
                </div>
                {showGrowth
                  ? <ChevronUp size={14} style={{ color: "#7C3AED", flexShrink: 0 }} />
                  : <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />}
              </button>
              {showGrowth && (
                <div style={{ padding: "0 20px 20px" }}>
                  <SliderInput
                    label="Expected MoM revenue growth (%)"
                    value={revGrowth} onChange={setRevGrowth}
                    min={0} max={20} step={1}
                  />
                  <SliderInput
                    label="Monthly expense growth (%)"
                    value={expGrowth} onChange={setExpGrowth}
                    min={0} max={10} step={1}
                  />
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                    Growth adjustments model a changing burn rate rather than a fixed monthly number.
                  </p>
                </div>
              )}
            </div>

            {/* Block C: Raise Planning */}
            <CollapsibleBlock title="Block C — Raise planning (optional)">
              <NumberInput
                label="Target fundraise amount ($)"
                value={raiseAmount}
                onChange={setRaiseAmount}
                hint="Enter your target raise to see how it extends your runway after close."
              />
              <SliderInput
                label="Expected months to close raise"
                value={monthsToClose} onChange={setMonthsToClose}
                min={1} max={9} step={1} unit=" mo"
                hint="Average institutional raise takes 3–6 months."
              />
            </CollapsibleBlock>
          </div>

          {/* RIGHT — Output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "24px" }}>

            {/* Primary metric */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "28px 24px", textAlign: "center" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "8px" }}>
                Months of runway
              </p>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(56px, 8vw, 80px)", color, lineHeight: 1, marginBottom: "12px" }}>
                {current.months >= 999 ? "∞" : Math.round(current.months)}
              </div>
              <span style={{
                display: "inline-block", fontSize: "12px", fontWeight: 600,
                padding: "4px 12px", borderRadius: "6px",
                background: badge.bg, color: badge.color, marginBottom: "16px",
              }}>
                {badge.label}
              </span>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "16px" }}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>Cash out date</p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                  {current.cashOut ? formatDateLong(current.cashOut) : "No cash-out projected"}
                </p>
              </div>
            </div>

            {/* Three scenarios */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "16px" }}>
                Scenarios
              </p>

              {/* Scenario 1 */}
              <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Current trajectory</span>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", color: runwayColor(current.months) }}>
                    {current.months >= 999 ? "∞" : Math.round(current.months)} mo
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                  Cash-out: {current.cashOut ? formatDateShort(current.cashOut) : "—"}
                </p>
              </div>

              {/* Scenario 2 */}
              <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>If you cut costs 20%</span>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", color: runwayColor(cut20.months) }}>
                    {cut20.months >= 999 ? "∞" : Math.round(cut20.months)} mo
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                  Cash-out: {cut20.cashOut ? formatDateShort(cut20.cashOut) : "—"}
                </p>
              </div>

              {/* Scenario 3 */}
              {raiseAmount > 0 ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                      After {fmt(raiseAmount)} raise closes in {monthsToClose} mo
                    </span>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "20px", color: runwayColor(postRaiseMonths ?? 0) }}>
                      {postRaiseMonths != null ? (postRaiseMonths >= 999 ? "∞" : Math.round(postRaiseMonths)) : "—"} mo
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                    Cash-out: {postRaiseCashOut ? formatDateShort(postRaiseCashOut) : "—"}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                  Enter a target raise above to model post-funding runway
                </p>
              )}
            </div>

            {/* 12-month chart */}
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "16px" }}>
                12-month cash projection
              </p>
              <RunwayChart
                cash={cash}
                netBurn={effectiveBurn}
                raiseAmount={raiseAmount}
                monthsToClose={monthsToClose}
              />
            </div>

            {/* Raise timing card */}
            <div style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.05)", borderRadius: "12px", padding: "20px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <Calendar size={18} style={{ color: "#7C3AED", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                  When should you start raising?
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "12px" }}>
                  {raiseTimingText()}
                </p>
                <Link
                  to="/sign-up"
                  style={{ fontSize: "13px", color: "#a78bfa", textDecoration: "none" }}
                >
                  Build your Hockystick profile to reach investors faster →
                </Link>
              </div>
            </div>

            {/* Copy results */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(copyText).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              style={{
                alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px",
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
                title: "Enter cash balance and net burn",
                body: "Net burn is total expenses minus revenue. It is not gross spend. A startup spending $80K/mo with $30K MRR has $50K net burn — that is the number that matters.",
              },
              {
                n: "02",
                title: "Check all three scenarios",
                body: "The current trajectory shows where you are heading without changes. The 20% cut scenario shows what aggressive cost discipline buys you. The post-raise scenario shows what your target round actually does to your runway.",
              },
              {
                n: "03",
                title: "Read the raise timing signal",
                body: "The raise timing card tells you when to start, not when to close. Starting too late is the most common fundraising mistake — investors take 3–6 months and you need leverage, not desperation.",
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
            How runway is calculated
          </h2>
          <Accordion title="Basic runway calculation">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
              Runway is your current cash divided by your net burn rate per month. It assumes constant burn — no growth, no cuts. This is the conservative baseline. The scenario models adjust for cost cuts and new capital.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", lineHeight: 1.9 }}>
              Runway (months) = Cash Balance ÷ Net Monthly Burn<br />
              Cash-out Date = Today + Runway months
            </div>
          </Accordion>
          <Accordion title="Scenario modeling">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
              The 20% expense reduction scenario reduces your net burn by 20% (net burn × 0.8) and recalculates runway. The post-raise scenario adds the raise amount to your cash balance after accounting for burn during the raise process (cash − burn × months_to_close + raise_amount), then calculates remaining runway at your current burn rate.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", lineHeight: 1.9 }}>
              cut20_runway = Cash ÷ (Net Burn × 0.8)<br />
              cash_at_close = Cash − (Burn × months_to_close) + Raise<br />
              post_raise_runway = months_to_close + (cash_at_close ÷ Burn)
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
              q: "What is startup runway?",
              a: "Runway is the number of months a startup can continue operating at its current spending rate before running out of cash. It is calculated by dividing current cash by net monthly burn rate. Runway is the most time-critical metric for any pre-profitable startup.",
            },
            {
              q: "What is a good amount of runway?",
              a: "18 months post-raise is the standard target for institutional rounds. At 18 months you have time to hit milestones, miss some, course-correct, and still run a non-desperate fundraising process for your next round. 12 months is the minimum to raise comfortably. Below 6 months, your negotiating position collapses.",
            },
            {
              q: "What is the difference between gross burn and net burn?",
              a: "Gross burn is every dollar leaving the company each month — salaries, rent, software, everything. Net burn subtracts revenue. Runway is calculated on net burn, not gross burn, because revenue is real cash reducing your consumption rate. Always quote net burn to investors.",
            },
            {
              q: "When should I start raising my next round?",
              a: "Start raising when you have 12–15 months of runway. This gives you 3–6 months to close and still land with 9+ months remaining. Closing with less than 6 months of runway signals to future investors that the raise was distressed, not strategic.",
            },
            {
              q: "How do I extend my runway quickly?",
              a: "In order of speed and impact: cut non-essential software subscriptions (immediate), reduce contractor hours (immediate), negotiate vendor payment terms (days), defer non-critical hires (weeks), renegotiate office lease (weeks to months). Team salary cuts are the last lever — they extend runway but slow growth and signal problems to the market.",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="rwy-related">
            <style>{`@media (max-width: 480px) { .rwy-related { grid-template-columns: 1fr !important; } }`}</style>
            <Link to="/tools/burn-rate" style={{ textDecoration: "none" }}>
              <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px", cursor: "pointer" }}>
                <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "10px 0 6px" }}>Burn Rate Calculator</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>Calculate monthly gross and net burn broken down by expense category.</p>
              </div>
            </Link>
            <Link to="/tools/valuation" style={{ textDecoration: "none" }}>
              <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "20px", cursor: "pointer" }}>
                <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: "10px 0 6px" }}>Startup Valuation Calculator</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: 0 }}>VC Method, Revenue Multiples, and Berkus for pre-seed to Series A.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* S7 — CTA */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111114", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Runway is how long you have. Hockystick is how fast you move.
          </h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "28px" }}>
            Get your verified profile in front of investors who are actively deploying capital in your sector.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/sign-up"
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
