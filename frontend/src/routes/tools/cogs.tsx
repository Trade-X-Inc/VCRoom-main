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

export const Route = createFileRoute("/tools/cogs")({
  head: () => ({
    meta: [
      { title: "COGS Calculator — Gross Margin by Business Model | Hockystick" },
      {
        name: "description",
        content:
          "Calculate cost of goods sold, gross profit, and gross margin for SaaS, hardware, marketplace, and e-commerce startups. Compare your margins to industry benchmarks. Free, no signup required.",
      },
    ],
  }),
  component: CogsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Model = "saas" | "marketplace" | "hardware" | "ecommerce";

interface CogsResult {
  totalCogs: number;
  totalRevenue: number;
  grossProfit: number;
  grossMargin: number; // percentage 0–100
  breakdown: { label: string; value: number }[];
  perUnitCogs?: number;
  perUnitRevenue?: number;
  perUnitProfit?: number;
  unitLabel?: string;
}

// ─── Benchmark data ───────────────────────────────────────────────────────────

const BENCHMARKS: Record<Model, { name: string; low: number; high: number; worldClass: number }> = {
  saas:        { name: "SaaS / Software",     low: 65, high: 80, worldClass: 80 },
  marketplace: { name: "Marketplace",          low: 45, high: 65, worldClass: 65 },
  hardware:    { name: "Hardware / Physical",  low: 30, high: 50, worldClass: 50 },
  ecommerce:   { name: "E-commerce",           low: 30, high: 50, worldClass: 50 },
};

const MODEL_LABELS: Record<Model, string> = {
  saas: "SaaS / Software",
  marketplace: "Marketplace",
  hardware: "Hardware / Physical",
  ecommerce: "E-commerce",
};

const BAR_COLORS = ["var(--brand)", "#10B981", "#F59E0B", "#6366F1", "#EC4899"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n: number): string {
  return `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function NumInput({
  label, value, onChange, hint, suffix, prefix = "$", autoValue,
}: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; suffix?: string; prefix?: string; autoValue?: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "5px" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
        {prefix && (
          <span style={{ padding: "9px 10px", fontSize: "12px", color: "var(--faint)", borderRight: "1px solid var(--border)", whiteSpace: "nowrap" }}>{prefix}</span>
        )}
        <input
          type="number" value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "9px 10px", fontSize: "13px", color: "var(--foreground)" }}
        />
        {suffix && (
          <span style={{ padding: "9px 10px", fontSize: "12px", color: "var(--faint)", borderLeft: "1px solid var(--border)" }}>{suffix}</span>
        )}
      </div>
      {autoValue && <p style={{ fontSize: "11px", color: "#a78bfa", marginTop: "3px" }}>{autoValue}</p>}
      {hint && <p style={{ fontSize: "11px", color: "var(--faint)", marginTop: "3px", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--faint)", textTransform: "uppercase", margin: "20px 0 12px" }}>
      {children}
    </p>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: "var(--brand)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ paddingBottom: "20px" }}>{children}</div>}
    </div>
  );
}

// ─── SaaS inputs ─────────────────────────────────────────────────────────────

interface SaasState {
  mrr: number; oneTime: number;
  hosting: number; cdn: number; db: number;
  apiCosts: number; paymentPct: number;
  support: number; devops: number;
  security: number; compliance: number;
  customers: number;
}

function SaasInputs({ s, set }: { s: SaasState; set: (v: SaasState) => void }) {
  const up = (k: keyof SaasState, v: number) => set({ ...s, [k]: v });
  const paymentFees = (s.mrr * s.paymentPct) / 100;

  return (
    <>
      <SectionLabel>Revenue</SectionLabel>
      <NumInput label="Monthly Recurring Revenue (MRR)" value={s.mrr} onChange={(v) => up("mrr", v)} />
      <NumInput label="One-time / services revenue" value={s.oneTime} onChange={(v) => up("oneTime", v)} />
      <p style={{ fontSize: "11px", color: "var(--faint)", marginBottom: "8px" }}>
        Total revenue: {fmt(s.mrr + s.oneTime)}
      </p>

      <SectionLabel>Infrastructure &amp; Hosting</SectionLabel>
      <NumInput label="Cloud hosting (AWS / GCP / Azure)" value={s.hosting} onChange={(v) => up("hosting", v)} />
      <NumInput label="CDN &amp; bandwidth" value={s.cdn} onChange={(v) => up("cdn", v)} />
      <NumInput label="Database &amp; storage" value={s.db} onChange={(v) => up("db", v)} />

      <SectionLabel>Third-Party APIs &amp; Integrations</SectionLabel>
      <NumInput label="API costs (Twilio, SendGrid, Stripe, etc.)" value={s.apiCosts} onChange={(v) => up("apiCosts", v)} />
      <NumInput label="Payment processing" value={s.paymentPct} onChange={(v) => up("paymentPct", v)} prefix="" suffix="%" autoValue={`= ${fmt(paymentFees)}/mo at current MRR`} />

      <SectionLabel>Customer-Facing Team</SectionLabel>
      <NumInput label="Customer support salaries ($/mo)" value={s.support} onChange={(v) => up("support", v)} hint="Include only time spent on product support, not sales or admin." />
      <NumInput label="DevOps / platform engineers ($/mo)" value={s.devops} onChange={(v) => up("devops", v)} hint="Include only infra-maintenance work, not product development." />

      <SectionLabel>Compliance &amp; Security</SectionLabel>
      <NumInput label="Security tools &amp; audits ($/mo)" value={s.security} onChange={(v) => up("security", v)} />
      <NumInput label="Compliance &amp; legal (ongoing) ($/mo)" value={s.compliance} onChange={(v) => up("compliance", v)} />

      <SectionLabel>Unit Economics (optional)</SectionLabel>
      <NumInput label="Number of active customers" value={s.customers} onChange={(v) => up("customers", v)} prefix="#" />
    </>
  );
}

function computeSaas(s: SaasState): CogsResult {
  const paymentFees = (s.mrr * s.paymentPct) / 100;
  const breakdown = [
    { label: "Cloud hosting", value: s.hosting + s.cdn + s.db },
    { label: "APIs & integrations", value: s.apiCosts + paymentFees },
    { label: "Support team", value: s.support },
    { label: "DevOps / platform", value: s.devops },
    { label: "Security & compliance", value: s.security + s.compliance },
  ].filter((b) => b.value > 0);
  const totalCogs = breakdown.reduce((a, b) => a + b.value, 0);
  const totalRevenue = s.mrr + s.oneTime;
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const perUnit = s.customers > 0 ? {
    perUnitCogs: totalCogs / s.customers,
    perUnitRevenue: totalRevenue / s.customers,
    perUnitProfit: grossProfit / s.customers,
    unitLabel: "customer",
  } : {};
  return { totalCogs, totalRevenue, grossProfit, grossMargin, breakdown, ...perUnit };
}

// ─── Marketplace inputs ───────────────────────────────────────────────────────

interface MarketplaceState {
  gmv: number; takeRate: number;
  paymentPct: number; fraud: number; kyc: number;
  hosting: number; dataInfra: number;
  trustTeam: number; moderation: number;
  support: number;
  transactions: number;
}

function MarketplaceInputs({ s, set }: { s: MarketplaceState; set: (v: MarketplaceState) => void }) {
  const up = (k: keyof MarketplaceState, v: number) => set({ ...s, [k]: v });
  const netRevenue = (s.gmv * s.takeRate) / 100;
  const paymentFees = (s.gmv * s.paymentPct) / 100;

  return (
    <>
      <SectionLabel>Revenue</SectionLabel>
      <NumInput label="Gross Merchandise Value (GMV) ($/mo)" value={s.gmv} onChange={(v) => up("gmv", v)} />
      <NumInput label="Take rate" value={s.takeRate} onChange={(v) => up("takeRate", v)} prefix="" suffix="%" autoValue={`Net revenue = ${fmt(netRevenue)} (GMV × take rate)`} />

      <SectionLabel>Transaction Costs</SectionLabel>
      <NumInput label="Payment processing" value={s.paymentPct} onChange={(v) => up("paymentPct", v)} prefix="" suffix="%" autoValue={`= ${fmt(paymentFees)}/mo (% of GMV)`} />
      <NumInput label="Fraud prevention &amp; chargebacks ($/mo)" value={s.fraud} onChange={(v) => up("fraud", v)} />
      <NumInput label="KYC / identity verification ($/mo)" value={s.kyc} onChange={(v) => up("kyc", v)} />

      <SectionLabel>Infrastructure</SectionLabel>
      <NumInput label="Cloud hosting ($/mo)" value={s.hosting} onChange={(v) => up("hosting", v)} />
      <NumInput label="Data &amp; search infrastructure ($/mo)" value={s.dataInfra} onChange={(v) => up("dataInfra", v)} />

      <SectionLabel>Trust &amp; Safety</SectionLabel>
      <NumInput label="Trust &amp; safety team ($/mo)" value={s.trustTeam} onChange={(v) => up("trustTeam", v)} />
      <NumInput label="Moderation &amp; compliance tools ($/mo)" value={s.moderation} onChange={(v) => up("moderation", v)} />

      <SectionLabel>Customer Support</SectionLabel>
      <NumInput label="Support team ($/mo)" value={s.support} onChange={(v) => up("support", v)} hint="Buyer and seller support combined." />

      <SectionLabel>Unit Economics (optional)</SectionLabel>
      <NumInput label="Number of monthly transactions" value={s.transactions} onChange={(v) => up("transactions", v)} prefix="#" />
    </>
  );
}

function computeMarketplace(s: MarketplaceState): CogsResult {
  const netRevenue = (s.gmv * s.takeRate) / 100;
  const paymentFees = (s.gmv * s.paymentPct) / 100;
  const breakdown = [
    { label: "Payment processing", value: paymentFees },
    { label: "Fraud & KYC", value: s.fraud + s.kyc },
    { label: "Infrastructure", value: s.hosting + s.dataInfra },
    { label: "Trust & safety", value: s.trustTeam + s.moderation },
    { label: "Support team", value: s.support },
  ].filter((b) => b.value > 0);
  const totalCogs = breakdown.reduce((a, b) => a + b.value, 0);
  const grossProfit = netRevenue - totalCogs;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  const perUnit = s.transactions > 0 ? {
    perUnitCogs: totalCogs / s.transactions,
    perUnitRevenue: netRevenue / s.transactions,
    perUnitProfit: grossProfit / s.transactions,
    unitLabel: "transaction",
  } : {};
  return { totalCogs, totalRevenue: netRevenue, grossProfit, grossMargin, breakdown, ...perUnit };
}

// ─── Hardware inputs ──────────────────────────────────────────────────────────

interface HardwareState {
  bom: number; manufacturing: number; qc: number; packaging: number; freight: number;
  duties: number;
  units: number;
  warehouse: number; shipping: number; returns: number;
  revenuePerUnit: number;
}

function HardwareInputs({ s, set }: { s: HardwareState; set: (v: HardwareState) => void }) {
  const up = (k: keyof HardwareState, v: number) => set({ ...s, [k]: v });
  const perUnitBase = s.bom + s.manufacturing + s.qc + s.packaging + s.freight;
  const dutyCost = perUnitBase * (s.duties / 100);
  const perUnitTotal = perUnitBase * (1 + s.duties / 100);

  return (
    <>
      <SectionLabel>Per-Unit Costs</SectionLabel>
      <NumInput label="Bill of Materials (BOM) per unit" value={s.bom} onChange={(v) => up("bom", v)} />
      <NumInput label="Manufacturing &amp; assembly per unit" value={s.manufacturing} onChange={(v) => up("manufacturing", v)} />
      <NumInput label="Quality control &amp; testing per unit" value={s.qc} onChange={(v) => up("qc", v)} />
      <NumInput label="Packaging per unit" value={s.packaging} onChange={(v) => up("packaging", v)} />
      <NumInput label="Inbound freight per unit" value={s.freight} onChange={(v) => up("freight", v)} />

      <SectionLabel>Import Duties &amp; Taxes</SectionLabel>
      <NumInput label="Import duties &amp; taxes" value={s.duties} onChange={(v) => up("duties", v)} prefix="" suffix="%"
        hint="GCC standard import duty is 5% on most goods. Some categories (electronics, medical) vary. Check with your customs agent."
        autoValue={dutyCost > 0 ? `Duties add ${fmt(dutyCost)} per unit at current inputs` : undefined} />

      <SectionLabel>Volume</SectionLabel>
      <NumInput label="Units sold this month" value={s.units} onChange={(v) => up("units", v)} prefix="#" />
      {perUnitTotal > 0 && (
        <p style={{ fontSize: "11px", color: "#a78bfa", marginBottom: "8px" }}>Total per-unit COGS: {fmt(perUnitTotal)}</p>
      )}

      <SectionLabel>Fixed Monthly COGS</SectionLabel>
      <NumInput label="Warehouse / storage ($/mo)" value={s.warehouse} onChange={(v) => up("warehouse", v)} />
      <NumInput label="Outbound shipping to customers ($/mo)" value={s.shipping} onChange={(v) => up("shipping", v)} hint="Enter total monthly spend, not per-unit." />
      <NumInput label="Returns &amp; warranty ($/mo)" value={s.returns} onChange={(v) => up("returns", v)} />

      <SectionLabel>Revenue</SectionLabel>
      <NumInput label="Revenue per unit" value={s.revenuePerUnit} onChange={(v) => up("revenuePerUnit", v)} />
      {s.revenuePerUnit > 0 && s.units > 0 && (
        <p style={{ fontSize: "11px", color: "var(--faint)", marginBottom: "8px" }}>
          Total revenue: {fmt(s.revenuePerUnit * s.units)}
        </p>
      )}
    </>
  );
}

function computeHardware(s: HardwareState): CogsResult {
  const perUnitCogs = (s.bom + s.manufacturing + s.qc + s.packaging + s.freight) * (1 + s.duties / 100);
  const variableCogs = perUnitCogs * s.units;
  const fixedCogs = s.warehouse + s.shipping + s.returns;
  const totalCogs = variableCogs + fixedCogs;
  const totalRevenue = s.revenuePerUnit * s.units;
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const breakdown = [
    { label: "BOM + manufacturing", value: (s.bom + s.manufacturing + s.qc) * s.units },
    { label: "Packaging + freight", value: (s.packaging + s.freight) * s.units },
    { label: "Import duties", value: (s.bom + s.manufacturing + s.qc + s.packaging + s.freight) * (s.duties / 100) * s.units },
    { label: "Warehouse + shipping", value: s.warehouse + s.shipping },
    { label: "Returns & warranty", value: s.returns },
  ].filter((b) => b.value > 0);
  const perUnit = s.units > 0 ? {
    perUnitCogs,
    perUnitRevenue: s.revenuePerUnit,
    perUnitProfit: s.revenuePerUnit - perUnitCogs,
    unitLabel: "unit",
  } : {};
  return { totalCogs, totalRevenue, grossProfit, grossMargin, breakdown, ...perUnit };
}

// ─── E-commerce inputs ────────────────────────────────────────────────────────

interface EcomState {
  revenue: number; aov: number;
  inventory: number; landedMarkup: number;
  fulfillment: number; packaging: number; shipping: number;
  returnsRate: number; chargebacks: number;
  paymentPct: number;
}

function EcomInputs({ s, set }: { s: EcomState; set: (v: EcomState) => void }) {
  const up = (k: keyof EcomState, v: number) => set({ ...s, [k]: v });
  const orders = s.aov > 0 ? Math.round(s.revenue / s.aov) : 0;
  const returnsCost = s.revenue * (s.returnsRate / 100) * 0.3;
  const paymentFees = s.revenue * (s.paymentPct / 100);

  return (
    <>
      <SectionLabel>Revenue</SectionLabel>
      <NumInput label="Monthly revenue" value={s.revenue} onChange={(v) => up("revenue", v)} />
      <NumInput label="Average order value" value={s.aov} onChange={(v) => up("aov", v)} />
      {orders > 0 && <p style={{ fontSize: "11px", color: "var(--faint)", marginBottom: "8px" }}>Orders per month: ~{orders.toLocaleString()}</p>}

      <SectionLabel>Product Costs</SectionLabel>
      <NumInput label="Product / inventory cost ($/mo)" value={s.inventory} onChange={(v) => up("inventory", v)} hint="Total spend on purchasing inventory this month." />
      <NumInput label="Landed cost markup" value={s.landedMarkup} onChange={(v) => up("landedMarkup", v)} prefix="" suffix="%"
        hint="Add if your supplier invoice excludes shipping and duties." />

      <SectionLabel>Fulfillment</SectionLabel>
      <NumInput label="3PL / fulfillment fees ($/mo)" value={s.fulfillment} onChange={(v) => up("fulfillment", v)} />
      <NumInput label="Packaging materials ($/mo)" value={s.packaging} onChange={(v) => up("packaging", v)} />
      <NumInput label="Outbound shipping ($/mo)" value={s.shipping} onChange={(v) => up("shipping", v)} />

      <SectionLabel>Returns &amp; Chargebacks</SectionLabel>
      <NumInput label="Returns rate" value={s.returnsRate} onChange={(v) => up("returnsRate", v)} prefix="" suffix="%"
        autoValue={returnsCost > 0 ? `≈ ${fmt(returnsCost)}/mo (30% of returned order value)` : undefined} />
      <NumInput label="Chargebacks ($/mo)" value={s.chargebacks} onChange={(v) => up("chargebacks", v)} />

      <SectionLabel>Payment Processing</SectionLabel>
      <NumInput label="Payment processing" value={s.paymentPct} onChange={(v) => up("paymentPct", v)} prefix="" suffix="%"
        autoValue={paymentFees > 0 ? `= ${fmt(paymentFees)}/mo at current revenue` : undefined} />
    </>
  );
}

function computeEcom(s: EcomState): CogsResult {
  const inventoryWithMarkup = s.inventory * (1 + s.landedMarkup / 100);
  const returnsCost = s.revenue * (s.returnsRate / 100) * 0.3;
  const paymentFees = s.revenue * (s.paymentPct / 100);
  const breakdown = [
    { label: "Inventory / product", value: inventoryWithMarkup },
    { label: "Fulfillment", value: s.fulfillment + s.packaging + s.shipping },
    { label: "Returns", value: returnsCost + s.chargebacks },
    { label: "Payment processing", value: paymentFees },
  ].filter((b) => b.value > 0);
  const totalCogs = breakdown.reduce((a, b) => a + b.value, 0);
  const grossProfit = s.revenue - totalCogs;
  const grossMargin = s.revenue > 0 ? (grossProfit / s.revenue) * 100 : 0;
  return { totalCogs, totalRevenue: s.revenue, grossProfit, grossMargin, breakdown };
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({ result, model, copied, onCopy }: {
  result: CogsResult; model: Model; copied: boolean; onCopy: () => void;
}) {
  const bm = BENCHMARKS[model];
  const margin = result.grossMargin;
  const marginColor = margin >= bm.worldClass ? "#10B981" : margin >= bm.low ? "#F59E0B" : "#EF4444";

  // Benchmark bar: 0–90% range, dot at user's margin
  const dotPct = Math.min((margin / 90) * 100, 100);
  const lowPct = (bm.low / 90) * 100;
  const highPct = (bm.high / 90) * 100;

  // Top 5 breakdown categories for stacked bar
  const top5 = [...result.breakdown]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const barTotal = top5.reduce((a, b) => a + b.value, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* COGS */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px" }}>Total Monthly COGS</p>
        <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3.5vw, 34px)", color: "var(--foreground)", margin: "0 0 4px" }}>{fmt(result.totalCogs)}</p>
        <p style={{ fontSize: "12px", color: "var(--faint)", margin: 0 }}>Revenue: {fmt(result.totalRevenue)}</p>
      </div>

      {/* Gross Profit */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px" }}>Gross Profit</p>
        <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3.5vw, 34px)", color: result.grossProfit >= 0 ? "#10B981" : "#EF4444", margin: "0 0 4px" }}>
          {result.grossProfit >= 0 ? fmt(result.grossProfit) : `-${fmt(Math.abs(result.grossProfit))}`}
        </p>
        <p style={{ fontSize: "12px", color: "var(--faint)", margin: 0 }}>After direct costs</p>
      </div>

      {/* Gross Margin */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px" }}>Gross Margin</p>
        <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3.5vw, 34px)", color: marginColor, margin: "0 0 12px" }}>
          {pct(margin)}
        </p>

        {/* Benchmark block */}
        <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--faint)", marginBottom: "10px" }}>
          Industry benchmarks — {bm.name}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
          {[
            { label: "World-class", range: `${bm.worldClass}%+`, color: "#10B981" },
            { label: "Healthy", range: `${bm.low}–${bm.high}%`, color: "#F59E0B" },
            { label: "Needs attention", range: `<${bm.low}%`, color: "#EF4444" },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{row.label}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: row.color }}>{row.range}</span>
            </div>
          ))}
        </div>

        {/* Margin range bar */}
        <div style={{ position: "relative", marginBottom: "4px" }}>
          {/* Background track */}
          <div style={{ height: "6px", borderRadius: "99px", background: "var(--accent)", position: "relative", overflow: "visible" }}>
            {/* Healthy zone */}
            <div style={{
              position: "absolute", left: `${lowPct}%`, width: `${highPct - lowPct}%`,
              height: "100%", background: "rgba(245,158,11,0.25)", borderRadius: "99px",
            }} />
            {/* World-class zone */}
            <div style={{
              position: "absolute", left: `${highPct}%`, right: 0,
              height: "100%", background: "rgba(16,185,129,0.25)", borderRadius: "0 99px 99px 0",
            }} />
            {/* Dot */}
            <div style={{
              position: "absolute", left: `${Math.max(0, Math.min(100, dotPct))}%`,
              top: "50%", transform: "translate(-50%, -50%)",
              width: "12px", height: "12px", borderRadius: "50%",
              background: marginColor, border: "2px solid var(--background)",
              transition: "left 0.3s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "9px", color: "var(--faint)" }}>0%</span>
            <span style={{ fontSize: "9px", color: "var(--faint)" }}>90%</span>
          </div>
        </div>
      </div>

      {/* Breakdown stacked bar */}
      {top5.length >= 3 && barTotal > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "12px" }}>
            Where your COGS goes
          </p>
          <div style={{ display: "flex", height: "8px", borderRadius: "6px", overflow: "hidden", marginBottom: "12px" }}>
            {top5.map((cat, i) => (
              <div key={cat.label} style={{ flex: cat.value / barTotal, background: BAR_COLORS[i], transition: "flex 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {top5.map((cat, i) => (
              <div key={cat.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: BAR_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{cat.label}</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span style={{ fontSize: "11px", color: "var(--faint)" }}>{(cat.value / barTotal * 100).toFixed(0)}%</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", minWidth: "50px", textAlign: "right" }}>{fmt(cat.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unit economics */}
      {result.perUnitCogs !== undefined && result.perUnitRevenue !== undefined && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "12px" }}>
            Unit economics — per {result.unitLabel}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[
              { label: "COGS", value: fmt(result.perUnitCogs!), color: "var(--foreground)" },
              { label: "Revenue", value: fmt(result.perUnitRevenue!), color: "var(--foreground)" },
              { label: "Gross profit", value: fmt(result.perUnitProfit!), color: (result.perUnitProfit ?? 0) >= 0 ? "#10B981" : "#EF4444" },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginBottom: "4px" }}>{m.label}</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy / Download buttons */}
      <div className="tool-no-print" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={onCopy}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start",
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "8px", padding: "10px 16px", fontSize: "13px",
            fontWeight: 600, color: "#a78bfa", cursor: "pointer",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy results"}
        </button>
        <button
          onClick={() => { const p = document.title; document.title = "COGS Calculator — Hockystick"; window.print(); document.title = p; }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px", alignSelf: "flex-start",
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: "8px", padding: "10px 16px", fontSize: "13px",
            fontWeight: 600, color: "#a78bfa", cursor: "pointer",
          }}
        >
          <Download size={14} /> Download PDF
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_SAAS: SaasState = { mrr: 0, oneTime: 0, hosting: 0, cdn: 0, db: 0, apiCosts: 0, paymentPct: 2.9, support: 0, devops: 0, security: 0, compliance: 0, customers: 0 };
const DEFAULT_MP: MarketplaceState = { gmv: 0, takeRate: 10, paymentPct: 2.5, fraud: 0, kyc: 0, hosting: 0, dataInfra: 0, trustTeam: 0, moderation: 0, support: 0, transactions: 0 };
const DEFAULT_HW: HardwareState = { bom: 0, manufacturing: 0, qc: 0, packaging: 0, freight: 0, duties: 5, units: 100, warehouse: 0, shipping: 0, returns: 0, revenuePerUnit: 0 };
const DEFAULT_EC: EcomState = { revenue: 0, aov: 0, inventory: 0, landedMarkup: 0, fulfillment: 0, packaging: 0, shipping: 0, returnsRate: 5, chargebacks: 0, paymentPct: 2.9 };

function CogsPage() {
  const [model, setModel] = useState<Model>("saas");
  const [saas, setSaas] = useState<SaasState>(DEFAULT_SAAS);
  const [mp, setMp] = useState<MarketplaceState>(DEFAULT_MP);
  const [hw, setHw] = useState<HardwareState>(DEFAULT_HW);
  const [ec, setEc] = useState<EcomState>(DEFAULT_EC);
  const [copied, setCopied] = useState(false);

  const result = useMemo<CogsResult>(() => {
    if (model === "saas") return computeSaas(saas);
    if (model === "marketplace") return computeMarketplace(mp);
    if (model === "hardware") return computeHardware(hw);
    return computeEcom(ec);
  }, [model, saas, mp, hw, ec]);

  const bm = BENCHMARKS[model];
  const copyText = `COGS Summary (Hockystick Calculator)
Business model: ${MODEL_LABELS[model]}
Monthly COGS: ${fmt(result.totalCogs)} | Gross profit: ${fmt(result.grossProfit)} | Gross margin: ${pct(result.grossMargin)}
Industry benchmark: ${bm.low}–${bm.high}% for ${bm.name}
Calculate yours at hockystick.app/tools/cogs`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const pw = { maxWidth: "900px", margin: "0 auto", padding: "0 24px" };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is COGS for a startup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "COGS is the direct cost of producing and delivering your product or service. For software it includes hosting, APIs, and support. For physical products it includes materials, manufacturing, and shipping. COGS does not include marketing, sales, or R&D."
        }
      },
      {
        "@type": "Question",
        "name": "What is a good gross margin for a SaaS startup?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "World-class SaaS gross margins run 80 percent or higher. For early-stage SaaS, 65 to 75 percent is healthy. Below 60 percent usually means you are misclassifying operating expenses as COGS."
        }
      },
      {
        "@type": "Question",
        "name": "How do GCC and MENA conditions affect COGS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cloud infrastructure costs run 10 to 20 percent higher in Middle East AWS regions. Import duties of 5 percent apply to most physical goods. Local payment processors like Telr and PayTabs charge 2.5 to 3.5 percent."
        }
      },
      {
        "@type": "Question",
        "name": "What is gross margin vs net margin?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gross margin is revenue minus COGS divided by revenue — it measures production efficiency. Net margin is revenue minus all expenses. Early-stage investors focus on gross margin because it shows unit economics before scaling costs."
        }
      },
      {
        "@type": "Question",
        "name": "Why does gross margin matter to investors?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gross margin determines how much of each revenue dollar remains after production costs. A SaaS company at 80 percent can spend aggressively on growth and still reach profitability. A hardware company at 20 percent has almost no room for error."
        }
      }
    ]
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", color: "var(--foreground)" }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="tool-no-print"><SiteHeader /></div>

      {/* S1 — Hero */}
      <section style={{ ...pw, padding: "56px 24px 48px" }}>
        <nav style={{ fontSize: "12px", color: "var(--faint)", marginBottom: "20px" }}>
          <Link to="/tools" style={{ color: "var(--faint)", textDecoration: "none" }}>Tools</Link>
          <span style={{ margin: "0 6px" }}>→</span>
          <span style={{ color: "var(--muted-foreground)" }}>COGS Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          COGS Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "var(--muted-foreground)", lineHeight: 1.6, maxWidth: "560px", marginBottom: "12px" }}>
          Calculate your cost of goods sold, gross margin, and unit economics — broken down by business model. Know where your margins stand before investors ask.
        </p>
        <p style={{ fontSize: "12px", color: "var(--faint)" }}>
          Used by founders preparing financial models for fundraising
        </p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        {/* Model selector */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--faint)", textTransform: "uppercase", marginBottom: "10px" }}>
            Business model
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["saas", "marketplace", "hardware", "ecommerce"] as Model[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                style={{
                  padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: model === m ? "var(--gradient-brand)" : "transparent",
                  border: `1px solid ${model === m ? "var(--brand)" : "var(--border)"}`,
                  color: model === m ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {MODEL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }} className="cogs-grid">
          <style>{`.cogs-grid { } @media (max-width: 640px) { .cogs-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* Inputs */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "24px" }}>
            {model === "saas" && <SaasInputs s={saas} set={setSaas} />}
            {model === "marketplace" && <MarketplaceInputs s={mp} set={setMp} />}
            {model === "hardware" && <HardwareInputs s={hw} set={setHw} />}
            {model === "ecommerce" && <EcomInputs s={ec} set={setEc} />}
          </div>

          {/* Output */}
          <div>
            <OutputPanel result={result} model={model} copied={copied} onCopy={handleCopy} />
          </div>
        </div>
      </section>

      {/* S3 — How to use */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How to use this calculator
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              { n: "01", title: "Select your business model", body: "COGS categories are completely different for SaaS vs hardware vs marketplace. Selecting the right model ensures you're counting the right costs." },
              { n: "02", title: "Fill in each cost category", body: "Be specific. Aggregate numbers like 'total costs: $30K' don't tell you where to cut or what's dragging your margin. Category-level input gives you category-level insight." },
              { n: "03", title: "Compare to the benchmark", body: "Your gross margin percentage is the number investors will ask about. Knowing where you stand against industry medians before you're in a meeting is how you control the conversation." },
            ].map((step) => (
              <div key={step.n}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "32px", color: "rgba(124,58,237,0.3)", marginBottom: "12px" }}>{step.n}</div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)", marginBottom: "8px" }}>{step.title}</h3>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S4 — Methodology */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            How these calculations work
          </h2>
          <Accordion title="What counts as COGS (and what doesn't)">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "16px" }}>
              COGS is the direct cost of delivering your product or service to a customer. For SaaS, that is hosting, APIs, and customer support — not sales, marketing, or R&D. Including sales salaries in COGS is the most common mistake founders make. It overstates cost and understates margin.
            </p>
            <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "#a78bfa", lineHeight: 1.9 }}>
              Gross Profit = Revenue − COGS<br />
              Gross Margin = (Gross Profit / Revenue) × 100
            </div>
          </Accordion>
          <Accordion title="SaaS COGS explained">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              For software companies, COGS includes infrastructure that scales with customers, not with your team. AWS bills go in. Engineer salaries building new features go in operating expenses. The distinction matters because investors evaluate SaaS companies on gross margin expansion — the ability to grow revenue faster than COGS.
            </p>
          </Accordion>
          <Accordion title="Hardware COGS and landed cost">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Hardware COGS starts with your Bill of Materials but the real number includes manufacturing, quality control, packaging, inbound freight, and import duties. In GCC markets, the standard import duty is 5% on most goods. Medical devices, electronics, and industrial equipment may carry different rates. Your landed cost per unit is what the calculator uses as the COGS baseline.
            </p>
          </Accordion>
          <Accordion title="Marketplace COGS and take rate">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Marketplace gross margin is calculated against net revenue (your take rate), not gross merchandise value. If GMV is $1M and your take rate is 10%, your revenue is $100K — and COGS should be measured against that $100K. Payment processing at 2.5% of GMV eats 25% of your net revenue if you're not careful.
            </p>
          </Accordion>
        </div>
      </section>

      {/* S5 — FAQ */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 32px)", marginBottom: "40px", letterSpacing: "-0.02em" }}>
            Frequently asked questions
          </h2>
          {[
            { q: "What is COGS for a startup?", a: "COGS stands for Cost of Goods Sold. It is the direct cost of producing and delivering your product or service to customers. For software companies it includes hosting, APIs, and support. For physical products it includes materials, manufacturing, and shipping. COGS does not include marketing, sales, or R&D." },
            { q: "What is a good gross margin for a SaaS startup?", a: "World-class SaaS gross margins run 80% or higher. Companies like Shopify, Twilio, and Snowflake maintain margins above 65% even at scale. For early-stage SaaS, 65–75% is healthy. Below 60% usually means you are misclassifying operating expenses as COGS, or your infrastructure costs are not yet optimized for your customer count." },
            { q: "How do GCC/MENA market conditions affect COGS?", a: "Three factors are different in the GCC. Cloud infrastructure costs run 10–20% higher in Middle East AWS regions than US East. Import duties of 5% apply to most physical goods, compared to zero for US domestic products. Local payment processors like Telr and PayTabs typically charge 2.5–3.5%, slightly above Stripe's US rates. Build these into your model before you raise." },
            { q: "What is gross margin vs net margin?", a: "Gross margin is revenue minus COGS divided by revenue. It measures production efficiency. Net margin is revenue minus all expenses — including COGS, sales, marketing, R&D, and admin — divided by revenue. At early stage, investors focus on gross margin because it shows the unit economics of the core business before scaling costs are applied." },
            { q: "Why does gross margin matter to investors?", a: "Gross margin determines how much of each dollar of revenue remains to cover operating expenses and eventually generate profit. A SaaS company at 80% gross margin can spend aggressively on sales and marketing and still have room to become profitable. A hardware company at 20% gross margin has almost no room for error. Investors use gross margin to model what the business looks like at scale." },
          ].map(({ q, a }) => (
            <Accordion key={q} title={q}>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>{a}</p>
            </Accordion>
          ))}
        </div>
      </section>

      {/* S6 — Related tools */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>
            Related tools
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="related-grid">
            <style>{`@media (max-width: 480px) { .related-grid { grid-template-columns: 1fr !important; } }`}</style>
            {[
              { to: "/tools/valuation", title: "Startup Valuation Calculator", desc: "VC Method, Revenue Multiples, and Berkus for pre-seed to Series A." },
              { to: "/tools/burn-rate", title: "Burn Rate & Runway Calculator", desc: "Monthly gross/net burn and cash-out date across three scenarios." },
            ].map((t) => (
              <Link key={t.to} to={t.to as any} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", cursor: "pointer" }}>
                  <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", margin: "10px 0 6px" }}>{t.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>{t.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* S7 — CTA */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", background: "var(--card)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Investors will calculate your margins before you do.
          </h3>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "28px" }}>
            Put your financials in front of verified investors on Hockystick — before they find gaps in your numbers.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/sign-up" search={{ role: "founder" } as any}
              style={{ display: "inline-flex", alignItems: "center", background: "var(--gradient-brand)", color: "#fff", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
              Create your profile
            </Link>
            <Link to="/trust"
              style={{ display: "inline-flex", alignItems: "center", background: "transparent", color: "var(--muted-foreground)", borderRadius: "10px", padding: "12px 24px", fontSize: "14px", fontWeight: 500, textDecoration: "none", border: "1px solid var(--border)" }}>
              See how verification works
            </Link>
          </div>
        </div>
      </section>

      <div className="tool-no-print"><SiteFooter /></div>
    </div>
  );
}
