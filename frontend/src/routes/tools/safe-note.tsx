import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Download } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const PRINT_CSS = `
@media print {
  .tool-no-print { display: none !important; }
  body { background: #fff !important; color: #111 !important; }
  .tool-print-section { background: #fff !important; color: #111 !important; border: 1px solid #e5e7eb !important; }
  .tool-print-section * { color: #111 !important; }
  @page { margin: 1.5cm; }
}
`;

export const Route = createFileRoute("/tools/safe-note")({
  head: () => ({
    meta: [
      { title: "SAFE Note Calculator — Model Conversion & Ownership | Hockystick" },
      {
        name: "description",
        content:
          "Calculate how your SAFE note converts at the next priced round. Compare valuation cap vs discount rate scenarios. See exact share count and ownership before you sign. Free, no signup required.",
      },
    ],
  }),
  component: SafeNotePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveScenario = "cap" | "discount" | "round";

interface ConversionResult {
  roundPrice: number;
  capPrice: number;
  discountedPrice: number;
  conversionPrice: number;
  activeScenario: ActiveScenario;
  safeShares: number;
  newRoundShares: number;
  totalPostShares: number;
  ownership: number;
  postMoney: number;
  effectiveValuation: number;
  savings: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtShares(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtPct(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`;
}

function fmtPrice(n: number): string {
  return `$${n.toFixed(4)}`;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

function computeSafe(
  safeInvestment: number,
  valuationCap: number,
  discountRate: number,
  preMoneyValuation: number,
  totalSharesPre: number,
  roundSize: number,
): ConversionResult {
  const roundPrice = totalSharesPre > 0 ? preMoneyValuation / totalSharesPre : 0;
  const capPrice = totalSharesPre > 0 ? valuationCap / totalSharesPre : 0;
  const discountedPrice = roundPrice * (1 - discountRate / 100);
  const conversionPrice = Math.min(
    capPrice > 0 ? capPrice : Infinity,
    discountedPrice > 0 ? discountedPrice : Infinity,
    roundPrice > 0 ? roundPrice : Infinity,
  ) || roundPrice;

  const activeScenario: ActiveScenario =
    conversionPrice === capPrice && capPrice <= discountedPrice ? "cap"
    : conversionPrice === discountedPrice ? "discount"
    : "round";

  const safeShares = conversionPrice > 0 ? Math.round(safeInvestment / conversionPrice) : 0;
  const newRoundShares = roundPrice > 0 ? Math.round(roundSize / roundPrice) : 0;
  const totalPostShares = totalSharesPre + safeShares + newRoundShares;
  const ownership = totalPostShares > 0 ? (safeShares / totalPostShares) * 100 : 0;
  const postMoney = preMoneyValuation + roundSize;
  const effectiveValuation = ownership > 0 ? (safeInvestment / ownership) * 100 : 0;
  const savings = Math.max((roundPrice - conversionPrice) * safeShares, 0);

  return {
    roundPrice, capPrice, discountedPrice, conversionPrice,
    activeScenario, safeShares, newRoundShares, totalPostShares,
    ownership, postMoney, effectiveValuation, savings,
  };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, hint, prefix = "$", suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "5px" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        {prefix && <span style={{ padding: "9px 10px", fontSize: "12px", color: "rgba(255,255,255,0.35)", borderRight: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>{prefix}</span>}
        <input type="number" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "9px 10px", fontSize: "13px", color: "#fff" }} />
        {suffix && <span style={{ padding: "9px 10px", fontSize: "12px", color: "rgba(255,255,255,0.35)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>{suffix}</span>}
      </div>
      {hint && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", margin: "18px 0 10px" }}>{children}</p>;
}

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

function Mono({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "#a78bfa", lineHeight: 1.9, marginTop: "10px" }}>{children}</div>;
}

// ─── Scenario block ───────────────────────────────────────────────────────────

const SCENARIO_COLORS: Record<ActiveScenario, string> = {
  cap: "#7C3AED",
  discount: "#10B981",
  round: "rgba(255,255,255,0.15)",
};

const SCENARIO_LABELS: Record<ActiveScenario, string> = {
  cap: "Cap price",
  discount: "Discount price",
  round: "Round price",
};

function ScenarioBlock({
  label, scenario, price, shares, ownership, effectiveVal, savings, isActive, result,
}: {
  label: string; scenario: ActiveScenario; price: number;
  shares: number; ownership: number; effectiveVal: number; savings: number;
  isActive: boolean; result: ConversionResult;
}) {
  const color = SCENARIO_COLORS[scenario];
  return (
    <div style={{
      background: "#0d0d10",
      border: `1.5px solid ${isActive ? color : "rgba(255,255,255,0.06)"}`,
      borderRadius: "10px", padding: "16px",
      opacity: isActive ? 1 : 0.5,
      transition: "border-color 0.2s, opacity 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: isActive ? color : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {isActive && <span style={{ fontSize: "10px", background: `${color}22`, color, padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Active</span>}
      </div>
      {[
        { label: "Conversion price", value: fmtPrice(price) },
        { label: "Shares received", value: fmtShares(shares) },
        { label: "Your ownership", value: fmtPct(ownership) },
        { label: "Effective valuation", value: fmt$(effectiveVal) },
      ].map(({ label: l, value: v }) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{l}</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Savings vs round price</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: savings > 0 ? "#10B981" : "rgba(255,255,255,0.3)" }}>
          {savings > 0 ? `+${fmt$(savings)}` : "No discount applied"}
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SafeNotePage() {
  // Shared inputs (both tabs)
  const [tab, setTab] = useState<"investor" | "founder">("investor");
  const [safeInvestment, setSafeInvestment] = useState(100_000);
  const [valuationCap, setValuationCap] = useState(5_000_000);
  const [discountRate, setDiscountRate] = useState(20);
  const [mfn, setMfn] = useState(false);
  const [preMoney, setPreMoney] = useState(8_000_000);
  const [totalSharesPre, setTotalSharesPre] = useState(9_000_000);
  const [roundSize, setRoundSize] = useState(2_000_000);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => computeSafe(safeInvestment, valuationCap, discountRate, preMoney, totalSharesPre, roundSize),
    [safeInvestment, valuationCap, discountRate, preMoney, totalSharesPre, roundSize],
  );

  // Per-scenario values (always compute all three for display)
  const scenarios = useMemo(() => {
    const rp = totalSharesPre > 0 ? preMoney / totalSharesPre : 0;
    const cp = totalSharesPre > 0 ? valuationCap / totalSharesPre : 0;
    const dp = rp * (1 - discountRate / 100);
    const newRoundShares = rp > 0 ? Math.round(roundSize / rp) : 0;
    const postPre = totalSharesPre + newRoundShares;

    function forPrice(p: number) {
      const sh = p > 0 ? Math.round(safeInvestment / p) : 0;
      const total = postPre + sh;
      const own = total > 0 ? (sh / total) * 100 : 0;
      const effVal = own > 0 ? (safeInvestment / own) * 100 : 0;
      const savings = Math.max((rp - p) * sh, 0);
      return { price: p, shares: sh, ownership: own, effectiveVal: effVal, savings };
    }

    return {
      cap: forPrice(cp),
      discount: forPrice(dp),
      round: forPrice(rp),
    };
  }, [safeInvestment, valuationCap, discountRate, preMoney, totalSharesPre, roundSize]);

  const activeColor = SCENARIO_COLORS[result.activeScenario];
  const activeLabel = SCENARIO_LABELS[result.activeScenario];

  const founderDilution = result.safeShares > 0
    ? (result.safeShares / result.totalPostShares) * 100
    : 0;

  const copyText = `SAFE Conversion Summary (Hockystick Calculator)
SAFE: ${fmt$(safeInvestment)} at ${fmt$(valuationCap)} cap, ${discountRate}% discount
Converts at: ${fmtPrice(result.conversionPrice)}/share (${activeLabel} applies)
Shares: ${fmtShares(result.safeShares)} | Ownership: ${fmtPct(result.ownership)}
Model yours at hockystick.app/tools/safe-note`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const pw = { maxWidth: "900px", margin: "0 auto", padding: "0 24px" };

  const InputPanel = (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "24px" }}>
      <SLabel>The SAFE</SLabel>
      <NumInput label="SAFE investment amount" value={safeInvestment} onChange={setSafeInvestment} />
      <NumInput label="Valuation cap" value={valuationCap} onChange={setValuationCap}
        hint="The maximum valuation at which your SAFE converts. If the round values the company higher, the cap price protects you." />
      <NumInput label="Discount rate" value={discountRate} onChange={setDiscountRate} prefix="" suffix="%"
        hint="You receive shares at this % below the round price. Applies only if the discount price is lower than the cap price." />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "4px", marginBottom: "4px" }}>
        <input type="checkbox" id="mfn" checked={mfn} onChange={(e) => setMfn(e.target.checked)}
          style={{ width: "14px", height: "14px", accentColor: "#7C3AED", flexShrink: 0, marginTop: "2px", cursor: "pointer" }} />
        <div>
          <label htmlFor="mfn" style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>MFN (Most Favored Nation) clause</label>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px", lineHeight: 1.5 }}>
            If checked, this SAFE automatically adopts better terms from any future SAFE issued before conversion. Common in pre-seed YC SAFEs.
          </p>
        </div>
      </div>

      <SLabel>Priced round (conversion event)</SLabel>
      <NumInput label="Pre-money valuation at conversion" value={preMoney} onChange={setPreMoney} />
      <NumInput label="Total shares outstanding pre-round" value={totalSharesPre} onChange={setTotalSharesPre} prefix="#"
        hint="Total shares before the new round is issued. Include option pool in this number." />
      <NumInput label="Round size (total new investment)" value={roundSize} onChange={setRoundSize} />

      <div style={{ marginTop: "14px", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0, fontFamily: "monospace" }}>
          Round price = {totalSharesPre > 0 ? fmtPrice(preMoney / totalSharesPre) : "—"}<br />
          Cap price = {totalSharesPre > 0 ? fmtPrice(valuationCap / totalSharesPre) : "—"}<br />
          Discounted price = {totalSharesPre > 0 ? fmtPrice((preMoney / totalSharesPre) * (1 - discountRate / 100)) : "—"}<br />
          <span style={{ color: activeColor }}>Conversion price = {fmtPrice(result.conversionPrice)} ({activeLabel} applies)</span>
        </p>
      </div>
    </div>
  );

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a SAFE note?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A SAFE gives an investor the right to receive equity at a future priced round. The investor gives money now and receives shares later at a price reflecting their early risk through a lower cap or discount rate."
        }
      },
      {
        "@type": "Question",
        "name": "Is a SAFE the same as a convertible note?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. A convertible note is debt with interest. A SAFE is not debt — no interest, no maturity date, no repayment obligation if no priced round occurs. SAFEs are simpler and faster to execute."
        }
      },
      {
        "@type": "Question",
        "name": "What valuation cap should I offer?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A typical pre-seed SAFE in MENA runs at a $2M to $5M cap. US pre-seed SAFEs often carry $5M to $15M caps. The lower the cap, the better the deal for the investor. Negotiate based on traction, team, and market size."
        }
      },
      {
        "@type": "Question",
        "name": "What happens if I never raise a priced round?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The SAFE remains unconverted with no maturity date and no repayment obligation. In an acquisition, the SAFE typically converts at the cap or receives a return per the change of control clause."
        }
      },
      {
        "@type": "Question",
        "name": "Should I offer a cap or a discount or both?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Standard practice: offer both, with the cap as primary protection. A discount alone with no cap is unusual and can be meaningless at high-valuation rounds where the discount is too small to matter."
        }
      }
    ]
  };

  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", color: "#fff" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="tool-no-print"><SiteHeader /></div>

      {/* S1 — Hero */}
      <section style={{ ...pw, padding: "56px 24px 48px" }}>
        <nav style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "20px" }}>
          <Link to="/tools" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>SAFE Note Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          SAFE Note Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          Model exactly how your SAFE converts at the next priced round. Compare cap and discount scenarios before you negotiate terms.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Used by founders and early investors modeling pre-seed instruments</p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        {/* View tabs */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "28px", display: "flex" }}>
          {(["investor", "founder"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#7C3AED" : "transparent"}`, marginBottom: "-1px", cursor: "pointer", fontSize: "14px", fontWeight: tab === t ? 600 : 400, color: tab === t ? "#fff" : "rgba(255,255,255,0.45)", transition: "all 0.15s" }}>
              {t === "investor" ? "Investor view" : "Founder view"}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="safe-grid">
          <style>{`@media (max-width: 640px) { .safe-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* Left — inputs (shared) */}
          {InputPanel}

          {/* Right — view-specific output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {tab === "investor" ? (
              <>
                {/* Active scenario indicator */}
                <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px 18px" }}>
                  <p style={{ fontSize: "13px", margin: 0 }}>
                    Based on your inputs, the{" "}
                    <span style={{ fontWeight: 700, color: activeColor }}>{activeLabel}</span>{" "}
                    applies.
                  </p>
                  {mfn && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#F59E0B", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "6px", padding: "6px 10px" }}>
                      <span style={{ fontSize: "14px" }}>⚑</span> MFN clause active — this SAFE adopts best future terms before conversion.
                    </div>
                  )}
                </div>

                {/* Three scenarios */}
                <ScenarioBlock label="Cap price binds" scenario="cap"
                  price={scenarios.cap.price} shares={scenarios.cap.shares}
                  ownership={scenarios.cap.ownership} effectiveVal={scenarios.cap.effectiveVal}
                  savings={scenarios.cap.savings} isActive={result.activeScenario === "cap"} result={result} />
                <ScenarioBlock label="Discount binds" scenario="discount"
                  price={scenarios.discount.price} shares={scenarios.discount.shares}
                  ownership={scenarios.discount.ownership} effectiveVal={scenarios.discount.effectiveVal}
                  savings={scenarios.discount.savings} isActive={result.activeScenario === "discount"} result={result} />
                <ScenarioBlock label="Round price (no benefit)" scenario="round"
                  price={scenarios.round.price} shares={scenarios.round.shares}
                  ownership={scenarios.round.ownership} effectiveVal={scenarios.round.effectiveVal}
                  savings={0} isActive={result.activeScenario === "round"} result={result} />

                {/* Post-conversion summary */}
                <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "10px" }}>Post-conversion summary</p>
                  {[
                    { label: "Your shares", value: fmtShares(result.safeShares) },
                    { label: "New round shares", value: fmtShares(result.newRoundShares) },
                    { label: "Total post-round shares", value: fmtShares(result.totalPostShares) },
                    { label: "Your post-round ownership", value: fmtPct(result.ownership) },
                    { label: "Post-money valuation", value: fmt$(result.postMoney) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{label}</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Copy / Download */}
                <div className="tool-no-print" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={handleCopy}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#a78bfa", cursor: "pointer" }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy results"}
                  </button>
                  <button
                    onClick={() => { const p = document.title; document.title = "SAFE Note Calculator — Hockystick"; window.print(); document.title = p; }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#a78bfa", cursor: "pointer" }}>
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Founder view */}
                {mfn && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                    <span style={{ fontSize: "16px", flexShrink: 0 }}>⚑</span>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#F59E0B", marginBottom: "4px" }}>MFN clause active</p>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
                        This SAFE has an MFN clause. If you issue future SAFEs on better terms (lower cap or higher discount) before conversion, this investor automatically receives those better terms.
                      </p>
                    </div>
                  </div>
                )}

                {/* Block 1 — Dilution */}
                <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "18px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "12px" }}>Dilution from this SAFE</p>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Shares issued to SAFE investor</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmtShares(result.safeShares)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Your dilution from this SAFE</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#F87171" }}>−{fmtPct(founderDilution)}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginBottom: "10px" }}>
                    Actual dilution depends on your full cap table. Use the Cap Table Calculator for a complete picture.
                  </p>
                  <Link to="/tools/cap-table" style={{ fontSize: "12px", color: "#7C3AED", textDecoration: "none" }}>→ Cap Table Calculator</Link>
                </div>

                {/* Block 2 — Effective cost */}
                <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "18px" }}>
                  <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "12px" }}>Effective cost of this SAFE</p>
                  <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>Effective valuation you're selling at</p>
                    <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "26px", color: result.activeScenario === "cap" ? "#F59E0B" : "#fff", margin: 0 }}>
                      {fmt$(result.effectiveValuation)}
                    </p>
                    {result.activeScenario === "cap" && (
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>
                        Cap binds — lower than your round valuation of {fmt$(preMoney)}
                      </p>
                    )}
                  </div>

                  {/* Compare bar */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginBottom: "6px" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>SAFE investor effective valuation</p>
                        <div style={{ height: "8px", borderRadius: "4px", background: "#7C3AED", width: `${Math.min((result.effectiveValuation / Math.max(preMoney, result.effectiveValuation)) * 100, 100)}%`, minWidth: "4px", transition: "width 0.3s" }} />
                        <p style={{ fontSize: "11px", color: "#a78bfa", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>{fmt$(result.effectiveValuation)}</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>Round investor valuation</p>
                        <div style={{ height: "8px", borderRadius: "4px", background: "#10B981", width: `${Math.min((preMoney / Math.max(preMoney, result.effectiveValuation)) * 100, 100)}%`, minWidth: "4px", transition: "width 0.3s" }} />
                        <p style={{ fontSize: "11px", color: "#34D399", marginTop: "3px", fontVariantNumeric: "tabular-nums" }}>{fmt$(preMoney)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                      The valuation cap is the price ceiling the SAFE investor paid for taking early risk. A lower cap = cheaper entry = more dilution for you.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* S3 — How to use */}
      <section className="tool-no-print" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>How to use this calculator</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              { n: "01", title: "Enter your SAFE terms", body: "Input the investment amount, valuation cap, and discount rate from your SAFE agreement. The calculator works for standard YC SAFEs and most cap-equivalent structures." },
              { n: "02", title: "Enter the conversion round details", body: "Input the expected pre-money valuation, share count, and round size at the priced round where the SAFE will convert. The calculator shows all three scenarios and flags which one applies." },
              { n: "03", title: "Switch between investor and founder view", body: "Investor view shows what the SAFE holder receives. Founder view shows what the SAFE costs you in dilution and effective valuation. Both views use the same inputs." },
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
      <section className="tool-no-print" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>How SAFE conversion works</h2>
          <Accordion title="The three conversion scenarios">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              A SAFE converts at whichever price benefits the investor most: the valuation cap price, the discount price, or the round price. In practice, either the cap or the discount binds — SAFE investors rarely convert at the full round price, which would mean they received no benefit for their early risk.
            </p>
            <Mono>
              round_price = pre_money / total_shares_pre<br />
              cap_price = valuation_cap / total_shares_pre<br />
              discounted_price = round_price × (1 − discount_rate)<br />
              conversion_price = min(cap_price, discounted_price, round_price)
            </Mono>
          </Accordion>
          <Accordion title="Valuation cap vs discount rate">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              These are two separate mechanisms protecting the investor. The cap says: even if the company raises at a high valuation, the SAFE investor converts as if the valuation were the cap. The discount says: the SAFE investor buys shares at X% below whatever the new investors pay. The investor gets whichever is better.
            </p>
          </Accordion>
          <Accordion title="MFN clause">
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              Most Favored Nation means this investor is entitled to the best terms you issue to any SAFE before the conversion round. If you issue a future SAFE at a $3M cap and this SAFE has a $5M cap with MFN, this investor automatically moves to $3M. MFN protects investors when founders issue multiple SAFE tranches over time.
            </p>
          </Accordion>
        </div>
      </section>

      {/* S5 — FAQ */}
      <section className="tool-no-print" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>Frequently asked questions</h2>
          {[
            { q: "What is a SAFE note?", a: "A SAFE (Simple Agreement for Future Equity) is an investment instrument invented by Y Combinator that gives an investor the right to receive equity at a future priced round. The investor gives money now, receives shares later at a price that reflects their early risk through a lower cap or a discount." },
            { q: "Is a SAFE the same as a convertible note?", a: "No. A convertible note is debt with interest that converts to equity. A SAFE is not debt — there is no interest, no maturity date, and no obligation to repay if no priced round occurs. SAFEs are simpler and faster to execute. In GCC/MENA markets, convertible notes are more common but SAFEs are gaining adoption, especially among founders who have worked with YC or US accelerators." },
            { q: "What valuation cap should I offer?", a: "The cap should reflect the risk the investor is taking. A typical pre-seed SAFE in MENA runs at a $2M–$5M cap. US pre-seed SAFEs often carry $5M–$15M caps. The lower the cap, the better the deal for the investor — negotiate based on your traction, team, and market size." },
            { q: "What happens if I never raise a priced round?", a: "The SAFE remains unconverted. It has no maturity date and no repayment obligation. In an acquisition, the SAFE typically converts at the cap or receives a return based on the terms. Read the SAFE agreement for the change of control clause." },
            { q: "Should I offer a cap or a discount or both?", a: "Standard practice: offer both, with the cap as the primary protection. Most SAFE investors expect a cap. A discount alone (no cap) is unusual and can be problematic at high-valuation rounds where the discount is too small to matter." },
          ].map(({ q, a }) => (
            <Accordion key={q} title={q}><p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{a}</p></Accordion>
          ))}
        </div>
      </section>

      {/* S6 — Related tools */}
      <section className="tool-no-print" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>Related tools</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="rel-grid">
            <style>{`@media (max-width: 480px) { .rel-grid { grid-template-columns: 1fr !important; } }`}</style>
            {[
              { to: "/tools/cap-table", title: "Cap Table Calculator", desc: "Model equity across all rounds, including SAFEs." },
              { to: "/tools/dilution", title: "Dilution Calculator", desc: "See how each round reduces your ownership percentage." },
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
      <section className="tool-no-print" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111114", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>Know your terms before you sign.</h3>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "28px" }}>
            Investors who use Hockystick come in with verified track records. You should come in with verified financials.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/sign-up" search={{ role: "founder" } as any}
              style={{ display: "inline-flex", alignItems: "center", background: "#7C3AED", color: "#fff", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
              Create your profile
            </Link>
            <Link to="/trust"
              style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: "rgba(255,255,255,0.5)", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 500, textDecoration: "none", border: "1px solid rgba(255,255,255,0.12)" }}>
              See how verification works
            </Link>
          </div>
        </div>
      </section>

      <div className="tool-no-print"><SiteFooter /></div>
    </div>
  );
}
