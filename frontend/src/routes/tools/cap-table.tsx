import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, X, Check, Download } from "lucide-react";
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

export const Route = createFileRoute("/tools/cap-table")({
  head: () => ({
    meta: [
      { title: "Cap Table Calculator — Model Equity & Dilution Across Rounds | Hockystick" },
      {
        name: "description",
        content:
          "Build your startup cap table, model dilution across pre-seed, seed, and Series A rounds. See exactly how each funding round affects founder and investor ownership. Free, no signup required.",
      },
    ],
  }),
  component: CapTablePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Founder { id: string; name: string; shares: number }

interface RoundInvestor { id: string; name: string; amount: number }

interface PricedRound {
  id: string; name: string; type: "priced";
  preMoneyValuation: number; totalInvestment: number;
  optionPoolTopUp: number;
  investors: RoundInvestor[];
}

interface SafeNote {
  id: string; name: string; type: "safe";
  safeInvestment: number; valuationCap: number;
  discountRate: number; convertAtRound: string;
}

type Round = PricedRound | SafeNote;

interface OptionPool { initialShares: number }

// Snapshot: the state of the cap table at one stage
interface Snapshot {
  stageName: string;
  stageId: string; // "founding" | round.id
  totalShares: number;
  pricePerShare: number | null;
  postMoneyValuation: number | null;
  // stakeholder entries
  entries: SnapshotEntry[];
}

interface SnapshotEntry {
  id: string;
  name: string;
  type: "founder" | "pool" | "safe" | "investor";
  shares: number | null; // null = SAFE not yet converted
  pct: number | null;    // null = SAFE not yet converted
  roundId: string | null; // which round they first appear in
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _id = 0;
function uid() { return `id_${++_id}`; }

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtPct(n: number): string { return `${n.toFixed(1)}%`; }

// ─── Calculation Engine ───────────────────────────────────────────────────────

function calculateCapTable(
  founders: Founder[],
  pool: OptionPool,
  rounds: Round[],
): Snapshot[] {
  const snapshots: Snapshot[] = [];

  // Stage 0 — Founding
  const founderTotal = founders.reduce((s, f) => s + f.shares, 0);
  const foundingTotal = founderTotal + pool.initialShares;

  const foundingEntries: SnapshotEntry[] = [
    ...founders.map((f): SnapshotEntry => ({
      id: f.id, name: f.name, type: "founder",
      shares: f.shares,
      pct: foundingTotal > 0 ? (f.shares / foundingTotal) * 100 : 0,
      roundId: null,
    })),
    {
      id: "pool", name: "Option Pool (ESOP)", type: "pool",
      shares: pool.initialShares,
      pct: foundingTotal > 0 ? (pool.initialShares / foundingTotal) * 100 : 0,
      roundId: null,
    },
  ];

  snapshots.push({
    stageName: "Founding", stageId: "founding",
    totalShares: foundingTotal, pricePerShare: null, postMoneyValuation: null,
    entries: foundingEntries,
  });

  // Track running state
  let currentShares: Record<string, number> = {};
  founders.forEach((f) => { currentShares[f.id] = f.shares; });
  currentShares["pool"] = pool.initialShares;
  let currentTotal = foundingTotal;
  // Track SAFE holders — key = safe.id, value = shares (0 until converted)
  const safeHolders: Record<string, { name: string; shares: number; converted: boolean }> = {};

  for (const round of rounds) {
    if (round.type === "safe") {
      // No shares issued yet — record as pending
      safeHolders[round.id] = { name: round.name, shares: 0, converted: false };
      // Emit a snapshot with SAFE shown as "—"
      const entries: SnapshotEntry[] = [
        ...founders.map((f): SnapshotEntry => ({
          id: f.id, name: f.name, type: "founder",
          shares: currentShares[f.id] ?? 0,
          pct: currentTotal > 0 ? ((currentShares[f.id] ?? 0) / currentTotal) * 100 : 0,
          roundId: null,
        })),
        {
          id: "pool", name: "Option Pool (ESOP)", type: "pool",
          shares: currentShares["pool"] ?? 0,
          pct: currentTotal > 0 ? ((currentShares["pool"] ?? 0) / currentTotal) * 100 : 0,
          roundId: null,
        },
        // Existing converted SAFEs / investors
        ...Object.entries(currentShares)
          .filter(([k]) => k !== "pool" && !founders.find((f) => f.id === k))
          .map(([k, sh]): SnapshotEntry => ({
            id: k, name: safeHolders[k]?.name ?? k, type: safeHolders[k] ? "investor" : "investor",
            shares: sh, pct: currentTotal > 0 ? (sh / currentTotal) * 100 : 0,
            roundId: null,
          })),
        // This SAFE — pending
        {
          id: round.id, name: round.name, type: "safe",
          shares: null, pct: null, roundId: round.id,
        },
      ];
      snapshots.push({
        stageName: round.name, stageId: round.id,
        totalShares: currentTotal, pricePerShare: null, postMoneyValuation: null,
        entries,
      });
      continue;
    }

    // PRICED ROUND
    const pr = round as PricedRound;

    // Step 1 — option pool top-up (pre-money)
    currentShares["pool"] = (currentShares["pool"] ?? 0) + pr.optionPoolTopUp;
    currentTotal += pr.optionPoolTopUp;

    // Step 2 — convert SAFEs targeting this round
    let safeConvertedTotal = 0;
    for (const r of rounds) {
      if (r.type !== "safe") continue;
      if ((r as SafeNote).convertAtRound !== pr.id) continue;
      if (safeHolders[r.id]?.converted) continue;
      const safe = r as SafeNote;
      const capPrice = safe.valuationCap > 0 ? safe.valuationCap / currentTotal : Infinity;
      const roundPrice = pr.preMoneyValuation / currentTotal;
      const discountedPrice = roundPrice * (1 - safe.discountRate / 100);
      const conversionPrice = Math.min(capPrice, discountedPrice, roundPrice);
      if (conversionPrice <= 0) continue;
      const safeShares = Math.round(safe.safeInvestment / conversionPrice);
      safeHolders[r.id] = { name: safe.name, shares: safeShares, converted: true };
      currentShares[r.id] = safeShares;
      currentTotal += safeShares;
      safeConvertedTotal += safe.safeInvestment;
    }

    // Step 3 — new priced shares
    const pricePerShare = pr.preMoneyValuation / currentTotal;
    const investorShares: Record<string, { name: string; shares: number; amount: number }> = {};

    for (const inv of pr.investors) {
      const sh = pricePerShare > 0 ? Math.round(inv.amount / pricePerShare) : 0;
      investorShares[inv.id] = { name: inv.name, shares: sh, amount: inv.amount };
      currentShares[inv.id] = sh;
      currentTotal += sh;
    }

    const postMoney = pr.preMoneyValuation + pr.totalInvestment;

    // Build snapshot
    const entries: SnapshotEntry[] = [];

    // Founders
    for (const f of founders) {
      entries.push({
        id: f.id, name: f.name, type: "founder",
        shares: currentShares[f.id] ?? 0,
        pct: currentTotal > 0 ? ((currentShares[f.id] ?? 0) / currentTotal) * 100 : 0,
        roundId: null,
      });
    }

    // Pool
    entries.push({
      id: "pool", name: "Option Pool (ESOP)", type: "pool",
      shares: currentShares["pool"] ?? 0,
      pct: currentTotal > 0 ? ((currentShares["pool"] ?? 0) / currentTotal) * 100 : 0,
      roundId: null,
    });

    // SAFEs — show converted ones as investors, pending ones as "—"
    for (const r of rounds) {
      if (r.type !== "safe") continue;
      const safe = r as SafeNote;
      const holder = safeHolders[safe.id];
      if (!holder) continue;
      if (holder.converted) {
        entries.push({
          id: safe.id, name: safe.name + " (SAFE→equity)", type: "investor",
          shares: currentShares[safe.id] ?? 0,
          pct: currentTotal > 0 ? ((currentShares[safe.id] ?? 0) / currentTotal) * 100 : 0,
          roundId: pr.id,
        });
      } else {
        entries.push({
          id: safe.id, name: safe.name, type: "safe",
          shares: null, pct: null, roundId: safe.id,
        });
      }
    }

    // This round's investors
    for (const inv of pr.investors) {
      entries.push({
        id: inv.id, name: inv.name, type: "investor",
        shares: currentShares[inv.id] ?? 0,
        pct: currentTotal > 0 ? ((currentShares[inv.id] ?? 0) / currentTotal) * 100 : 0,
        roundId: pr.id,
      });
    }

    snapshots.push({
      stageName: pr.name, stageId: pr.id,
      totalShares: currentTotal, pricePerShare,
      postMoneyValuation: postMoney,
      entries,
    });
  }

  return snapshots;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const FOUNDER_COLORS = ["var(--brand)", "#9F67F7", "#BFA4F9", "#D4C5FB"];
const INVESTOR_COLORS = ["#10B981", "#34D399", "#6EE7B7", "#A7F3D0"];
const POOL_COLOR = "#F59E0B";
const SAFE_COLOR = "#6366F1";

function colorForEntry(entry: SnapshotEntry, founders: Founder[], allInvestorIds: string[]): string {
  if (entry.type === "pool") return POOL_COLOR;
  if (entry.type === "safe") return SAFE_COLOR;
  const fi = founders.findIndex((f) => f.id === entry.id);
  if (fi >= 0) return FOUNDER_COLORS[fi % FOUNDER_COLORS.length];
  const ii = allInvestorIds.indexOf(entry.id);
  return INVESTOR_COLORS[Math.max(0, ii) % INVESTOR_COLORS.length];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, hint, prefix = "$", suffix, min }: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; prefix?: string; suffix?: string; min?: number;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {label && <label style={{ display: "block", fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "5px" }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid var(--border)", borderRadius: "7px", overflow: "hidden" }}>
        {prefix && <span style={{ padding: "8px 10px", fontSize: "12px", color: "var(--faint)", borderRight: "1px solid var(--border)", whiteSpace: "nowrap" }}>{prefix}</span>}
        <input
          type="number" value={value || ""} min={min}
          onChange={(e) => onChange(Math.max(min ?? 0, Number(e.target.value) || 0))}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "8px 10px", fontSize: "13px", color: "var(--foreground)" }}
        />
        {suffix && <span style={{ padding: "8px 10px", fontSize: "12px", color: "var(--faint)", borderLeft: "1px solid var(--border)" }}>{suffix}</span>}
      </div>
      {hint && <p style={{ fontSize: "11px", color: "var(--faint)", marginTop: "3px", lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}

function TextInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "#1a1a1f", border: "1px solid var(--border)", borderRadius: "7px", padding: "8px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none", width: "100%" }}
    />
  );
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "var(--faint)", textTransform: "uppercase", margin: "18px 0 10px" }}>{children}</p>;
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: "var(--brand)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
      </button>
      {open && <div style={{ paddingBottom: "20px" }}>{children}</div>}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0d0d10", borderRadius: "8px", padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "#a78bfa", lineHeight: 1.9, marginTop: "12px" }}>{children}</div>;
}

// ─── Add Round Form ───────────────────────────────────────────────────────────

function AddRoundForm({
  onAdd, onCancel, pricedRounds,
}: {
  onAdd: (r: Round) => void;
  onCancel: () => void;
  pricedRounds: PricedRound[];
}) {
  const [name, setName] = useState("Seed");
  const [type, setType] = useState<"priced" | "safe">("priced");
  const [preMoney, setPreMoney] = useState(5_000_000);
  const [investment, setInvestment] = useState(1_000_000);
  const [poolTopUp, setPoolTopUp] = useState(0);
  const [investors, setInvestors] = useState<RoundInvestor[]>(() => [{ id: uid(), name: "Lead Investor", amount: 1_000_000 }]);
  const [safeInvestment, setSafeInvestment] = useState(250_000);
  const [valuationCap, setValuationCap] = useState(5_000_000);
  const [discountRate, setDiscountRate] = useState(20);
  const [convertAt, setConvertAt] = useState(pricedRounds[0]?.id ?? "");

  const invTotal = investors.reduce((s, i) => s + i.amount, 0);
  const postMoney = preMoney + investment;
  const invMismatch = type === "priced" && Math.abs(invTotal - investment) > 1;

  function addInvestor() { setInvestors([...investors, { id: uid(), name: "", amount: 0 }]); }
  function removeInvestor(id: string) { setInvestors(investors.filter((i) => i.id !== id)); }
  function updateInvestor(id: string, k: "name" | "amount", v: string | number) {
    setInvestors(investors.map((i) => i.id === id ? { ...i, [k]: v } : i));
  }

  function handleAdd() {
    if (!name.trim()) return;
    if (type === "priced") {
      onAdd({
        id: uid(), name: name.trim(), type: "priced",
        preMoneyValuation: preMoney, totalInvestment: investment,
        optionPoolTopUp: poolTopUp, investors,
      });
    } else {
      onAdd({
        id: uid(), name: name.trim(), type: "safe",
        safeInvestment, valuationCap, discountRate, convertAtRound: convertAt,
      });
    }
  }

  const inputRow = { display: "flex", gap: "8px", marginBottom: "10px" };

  return (
    <div style={{ background: "#0d0d10", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px", padding: "18px", marginBottom: "16px" }}>
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: "5px" }}>Round name</label>
        <TextInput placeholder="e.g. Seed" value={name} onChange={setName} />
        <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
          {["Pre-seed", "Seed", "Series A", "Bridge"].map((n) => (
            <button key={n} onClick={() => setName(n)} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted-foreground)", cursor: "pointer" }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        {(["priced", "safe"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "7px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer", background: type === t ? "var(--gradient-brand)" : "transparent", border: `1px solid ${type === t ? "var(--brand)" : "var(--border)"}`, color: type === t ? "#fff" : "var(--muted-foreground)" }}>
            {t === "priced" ? "Priced Round" : "SAFE Note"}
          </button>
        ))}
      </div>

      {type === "priced" ? (
        <>
          <NumInput label="Pre-money valuation" value={preMoney} onChange={setPreMoney} />
          <NumInput label="Total investment" value={investment} onChange={setInvestment} />
          <p style={{ fontSize: "11px", color: "var(--faint)", marginBottom: "10px" }}>
            Post-money: {fmt$(postMoney)}
          </p>
          <NumInput label="Option pool top-up (additional shares)" value={poolTopUp} onChange={setPoolTopUp} prefix="#"
            hint="Added pre-money — dilutes founders, not incoming investors." />

          <SLabel>Investors</SLabel>
          {investors.map((inv, idx) => (
            <div key={inv.id} style={inputRow}>
              <div style={{ flex: 1 }}>
                <TextInput placeholder={`Investor ${idx + 1}`} value={inv.name} onChange={(v) => updateInvestor(inv.id, "name", v)} />
              </div>
              <div style={{ width: "120px" }}>
                <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: "1px solid var(--border)", borderRadius: "7px", overflow: "hidden" }}>
                  <span style={{ padding: "8px 8px", fontSize: "11px", color: "var(--faint)" }}>$</span>
                  <input type="number" value={inv.amount || ""} onChange={(e) => updateInvestor(inv.id, "amount", Number(e.target.value) || 0)}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "8px 6px", fontSize: "12px", color: "var(--foreground)", width: "80px" }} />
                </div>
              </div>
              {investors.length > 1 && (
                <button onClick={() => removeInvestor(inv.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: "8px 4px" }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <button onClick={addInvestor} style={{ fontSize: "12px", color: "var(--brand)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
              <Plus size={12} /> Add investor
            </button>
            <span style={{ fontSize: "11px", color: invMismatch ? "#F87171" : "var(--faint)" }}>
              Allocated: {fmt$(invTotal)} of {fmt$(investment)}
            </span>
          </div>
          {invMismatch && <p style={{ fontSize: "11px", color: "#F87171", marginBottom: "8px" }}>Investor total must match round investment.</p>}
        </>
      ) : (
        <>
          <NumInput label="SAFE investment" value={safeInvestment} onChange={setSafeInvestment} />
          <NumInput label="Valuation cap" value={valuationCap} onChange={setValuationCap} />
          <NumInput label="Discount rate" value={discountRate} onChange={setDiscountRate} prefix="" suffix="%" />
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "block", marginBottom: "5px" }}>Converts at</label>
            {pricedRounds.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--faint)" }}>Add a priced round first to set conversion target.</p>
            ) : (
              <select value={convertAt} onChange={(e) => setConvertAt(e.target.value)}
                style={{ width: "100%", background: "#1a1a1f", border: "1px solid var(--border)", borderRadius: "7px", padding: "8px 10px", fontSize: "13px", color: "var(--foreground)", outline: "none" }}>
                {pricedRounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <p style={{ fontSize: "11px", color: "var(--faint)", marginTop: "4px" }}>SAFE converts to equity at the next priced round. Shares are not issued until then.</p>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
        <button onClick={handleAdd} style={{ flex: 1, padding: "9px", borderRadius: "7px", background: "var(--gradient-brand)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Add round
        </button>
        <button onClick={onCancel} style={{ padding: "9px 14px", borderRadius: "7px", background: "transparent", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "13px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Cap Table Display ────────────────────────────────────────────────────────

function CapTableDisplay({ snapshots, founders }: { snapshots: Snapshot[]; founders: Founder[] }) {
  if (snapshots.length === 0) return null;

  // Collect all unique stakeholder IDs in order
  const seenIds: string[] = [];
  const allInvestorIds: string[] = [];
  for (const snap of snapshots) {
    for (const e of snap.entries) {
      if (!seenIds.includes(e.id)) seenIds.push(e.id);
      if (e.type === "investor" && !allInvestorIds.includes(e.id)) allInvestorIds.push(e.id);
    }
  }

  // Get entry for a stakeholder in a snapshot (may be absent)
  function getEntry(snap: Snapshot, id: string): SnapshotEntry | undefined {
    return snap.entries.find((e) => e.id === id);
  }

  const cellStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right", color: "var(--muted-foreground)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };
  const hdrStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: "10px", fontWeight: 700,
    textAlign: "right", color: "var(--faint)",
    textTransform: "uppercase", letterSpacing: "0.08em",
    background: "var(--accent)",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
        <thead>
          <tr>
            <th style={{ ...hdrStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--card)", minWidth: "140px" }}>Stakeholder</th>
            {snapshots.map((snap) => (
              <th key={snap.stageId} colSpan={2} style={{ ...hdrStyle, textAlign: "center" }}>
                {snap.stageName}
              </th>
            ))}
          </tr>
          <tr>
            <th style={{ ...hdrStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--card)" }}></th>
            {snapshots.map((snap) => (
              <>
                <th key={snap.stageId + "_sh"} style={hdrStyle}>Shares</th>
                <th key={snap.stageId + "_pct"} style={hdrStyle}>%</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {seenIds.map((id, rowIdx) => {
            // Find one entry to get type/name
            const sample = snapshots.flatMap((s) => s.entries).find((e) => e.id === id);
            if (!sample) return null;
            const color = colorForEntry(sample, founders, allInvestorIds);
            const isAlt = rowIdx % 2 === 1;

            return (
              <tr key={id} style={{ background: isAlt ? "var(--accent)" : "transparent" }}>
                <td style={{
                  ...cellStyle, textAlign: "left", position: "sticky", left: 0,
                  background: isAlt ? "#161619" : "var(--card)",
                  borderLeft: `2px solid ${color}`, paddingLeft: "10px",
                  fontVariantNumeric: "normal",
                }}>
                  <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{sample.name}</span>
                  <span style={{ marginLeft: "6px", fontSize: "10px", color: "var(--faint)", textTransform: "uppercase" }}>
                    {sample.type === "founder" ? "Founder" : sample.type === "pool" ? "ESOP" : sample.type === "safe" ? "SAFE" : "Investor"}
                  </span>
                </td>
                {snapshots.map((snap) => {
                  const e = getEntry(snap, id);
                  const isLatest = snap.stageId === snapshots[snapshots.length - 1].stageId;
                  const textColor = isLatest ? "var(--muted-foreground)" : "var(--muted-foreground)";
                  if (!e) {
                    return (
                      <>
                        <td key={snap.stageId + "_sh"} style={{ ...cellStyle, color: "var(--faint)" }}>—</td>
                        <td key={snap.stageId + "_pct"} style={{ ...cellStyle, color: "var(--faint)" }}>—</td>
                      </>
                    );
                  }
                  return (
                    <>
                      <td key={snap.stageId + "_sh"} style={{ ...cellStyle, color: textColor }}>
                        {e.shares === null ? "—" : fmtShares(e.shares)}
                      </td>
                      <td key={snap.stageId + "_pct"} style={{ ...cellStyle, color: e.pct === null ? "var(--faint)" : textColor }}>
                        {e.pct === null ? "—" : fmtPct(e.pct)}
                      </td>
                    </>
                  );
                })}
              </tr>
            );
          })}

          {/* Total row */}
          <tr style={{ borderTop: "1px solid var(--border)" }}>
            <td style={{ ...cellStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--card)", fontWeight: 700, color: "var(--foreground)", fontVariantNumeric: "normal" }}>Total</td>
            {snapshots.map((snap) => (
              <>
                <td key={snap.stageId + "_tot_sh"} style={{ ...cellStyle, fontWeight: 700, color: "var(--foreground)" }}>{fmtShares(snap.totalShares)}</td>
                <td key={snap.stageId + "_tot_pct"} style={{ ...cellStyle, fontWeight: 700, color: "var(--foreground)" }}>100%</td>
              </>
            ))}
          </tr>

          {/* Post-money row */}
          <tr>
            <td style={{ ...cellStyle, textAlign: "left", position: "sticky", left: 0, background: "var(--card)", color: "var(--faint)", fontSize: "11px", fontVariantNumeric: "normal" }}>Post-money</td>
            {snapshots.map((snap) => (
              <td key={snap.stageId + "_pm"} colSpan={2} style={{ ...cellStyle, textAlign: "center", color: "var(--faint)", fontSize: "11px" }}>
                {snap.postMoneyValuation ? fmt$(snap.postMoneyValuation) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Stacked Ownership Bars ───────────────────────────────────────────────────

function OwnershipBars({ snapshots, founders }: { snapshots: Snapshot[]; founders: Founder[] }) {
  const allInvestorIds: string[] = [];
  for (const snap of snapshots) {
    for (const e of snap.entries) {
      if (e.type === "investor" && !allInvestorIds.includes(e.id)) allInvestorIds.push(e.id);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {snapshots.map((snap) => {
        const visibleEntries = snap.entries.filter((e) => e.shares !== null && e.pct !== null && (e.pct ?? 0) > 0);
        const founderTotal = visibleEntries.filter((e) => e.type === "founder").reduce((s, e) => s + (e.pct ?? 0), 0);
        const poolTotal = visibleEntries.filter((e) => e.type === "pool").reduce((s, e) => s + (e.pct ?? 0), 0);
        const invTotal = visibleEntries.filter((e) => e.type === "investor").reduce((s, e) => s + (e.pct ?? 0), 0);

        return (
          <div key={snap.stageId}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", minWidth: "80px", textAlign: "right" }}>{snap.stageName}</span>
              <div style={{ flex: 1, height: "32px", display: "flex", borderRadius: "4px", overflow: "hidden", background: "var(--accent)" }}>
                {visibleEntries.map((e) => {
                  const color = colorForEntry(e, founders, allInvestorIds);
                  return (
                    <div
                      key={e.id}
                      title={`${e.name}: ${fmtPct(e.pct ?? 0)}`}
                      style={{ flex: e.pct ?? 0, background: color, transition: "flex 0.3s", minWidth: (e.pct ?? 0) > 0.5 ? "1px" : "0" }}
                    />
                  );
                })}
              </div>
            </div>
            <div style={{ marginLeft: "92px", marginTop: "4px", fontSize: "11px", color: "var(--faint)" }}>
              {founderTotal > 0 && <span>Founders: {fmtPct(founderTotal)}</span>}
              {poolTotal > 0 && <span style={{ marginLeft: "12px" }}>ESOP: {fmtPct(poolTotal)}</span>}
              {invTotal > 0 && <span style={{ marginLeft: "12px" }}>Investors: {fmtPct(invTotal)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Round Summary Cards ──────────────────────────────────────────────────────

function RoundCards({ snapshots, rounds, founders }: { snapshots: Snapshot[]; rounds: Round[]; founders: Founder[] }) {
  const pricedSnaps = snapshots.filter((s) => s.stageId !== "founding" && s.pricePerShare !== null);
  if (pricedSnaps.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "24px" }}>
      {pricedSnaps.map((snap) => {
        const prevIdx = snapshots.indexOf(snap) - 1;
        const prev = prevIdx >= 0 ? snapshots[prevIdx] : null;

        const founderPctNow = snap.entries.filter((e) => e.type === "founder").reduce((s, e) => s + (e.pct ?? 0), 0);
        const founderPctPrev = prev ? prev.entries.filter((e) => e.type === "founder").reduce((s, e) => s + (e.pct ?? 0), 0) : founderPctNow;
        const dilution = founderPctPrev - founderPctNow;

        const round = rounds.find((r) => r.id === snap.stageId) as PricedRound | undefined;
        const safeConvertedInRound = rounds
          .filter((r): r is SafeNote => r.type === "safe" && r.convertAtRound === snap.stageId)
          .reduce((s, r) => s + r.safeInvestment, 0);

        return (
          <div key={snap.stageId} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px" }}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>{snap.stageName}</p>
            {[
              { label: "Pre-money", value: round ? fmt$(round.preMoneyValuation) : "—" },
              { label: "Investment", value: round ? fmt$(round.totalInvestment) : "—" },
              { label: "Post-money", value: snap.postMoneyValuation ? fmt$(snap.postMoneyValuation) : "—" },
              { label: "Price / share", value: snap.pricePerShare ? `$${snap.pricePerShare.toFixed(4)}` : "—" },
              { label: "Founder dilution", value: dilution > 0 ? `−${fmtPct(dilution)}` : "0%", red: dilution > 0 },
            ].map(({ label, value, red }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{label}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: red ? "#F87171" : "var(--muted-foreground)" }}>{value}</span>
              </div>
            ))}
            {safeConvertedInRound > 0 && (
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)", fontSize: "11px", color: "#6366F1" }}>
                SAFE converted: {fmt$(safeConvertedInRound)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CapTablePage() {
  const [authorized, setAuthorized] = useState(10_000_000);
  const [founders, setFounders] = useState<Founder[]>(() => [
    { id: uid(), name: "Co-founder 1", shares: 4_000_000 },
    { id: uid(), name: "Co-founder 2", shares: 4_000_000 },
  ]);
  const [pool, setPool] = useState<OptionPool>({ initialShares: 1_000_000 });
  const [rounds, setRounds] = useState<Round[]>([]);
  const [showAddRound, setShowAddRound] = useState(false);

  const founderTotal = founders.reduce((s, f) => s + f.shares, 0);
  const foundingTotal = founderTotal + pool.initialShares;
  const unallocated = authorized - foundingTotal;

  const pricedRounds = rounds.filter((r): r is PricedRound => r.type === "priced");

  const snapshots = useMemo(
    () => calculateCapTable(founders, pool, rounds),
    [founders, pool, rounds],
  );

  const addFounder = useCallback(() => {
    setFounders((prev) => [...prev, { id: uid(), name: `Co-founder ${prev.length + 1}`, shares: 0 }]);
  }, []);

  const removeFounder = useCallback((id: string) => {
    setFounders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFounder = useCallback((id: string, k: "name" | "shares", v: string | number) => {
    setFounders((prev) => prev.map((f) => f.id === id ? { ...f, [k]: v } : f));
  }, []);

  const pw = { maxWidth: "1100px", margin: "0 auto", padding: "0 24px" };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a cap table?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A cap table lists every person or entity owning equity in a company, the type of equity, share count, and ownership percentage. It updates with every funding round, option grant, and share transfer."
        }
      },
      {
        "@type": "Question",
        "name": "How much equity should founders give up at seed?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Standard seed rounds dilute founders 15 to 25 percent. GCC and MENA seed rounds often run at lower pre-money valuations, meaning higher dilution for the same check size compared to US deals."
        }
      },
      {
        "@type": "Question",
        "name": "What is a standard option pool size?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pre-seed: 10 to 12 percent. Seed: investors often ask for a top-up to 15 percent pre-close. Series A: 10 to 15 percent. Size the pool for the next 18 to 24 months of hiring, not indefinitely."
        }
      },
      {
        "@type": "Question",
        "name": "What is a SAFE note?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A SAFE gives an investor the right to receive equity at a future priced round at a discounted price or capped valuation. Common at pre-seed in the US. In GCC and MENA, convertible notes are more common but SAFEs are gaining adoption."
        }
      },
      {
        "@type": "Question",
        "name": "When should I hire a lawyer to manage my cap table?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "From your first priced round. Pre-seed SAFEs can be tracked in a spreadsheet. Once you have a priced round with multiple investors, pro-rata rights, and an option pool, the cap table becomes a legal document. Use Carta or equivalent from Seed onwards."
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
          <span style={{ color: "var(--muted-foreground)" }}>Cap Table Calculator</span>
        </nav>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "16px" }}>
          Cap Table Calculator
        </h1>
        <p style={{ fontSize: "16px", color: "var(--muted-foreground)", lineHeight: 1.6, maxWidth: "600px", marginBottom: "12px" }}>
          Model your equity structure from day one through Series A. See exactly how each funding round dilutes founders, employees, and early investors — before you sign a term sheet.
        </p>
        <p style={{ fontSize: "12px", color: "var(--faint)" }}>
          Used by founders modeling equity before investor conversations
        </p>
      </section>

      {/* S2 — Calculator */}
      <section style={{ ...pw, paddingBottom: "80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "24px", alignItems: "start" }} className="captable-grid">
          <style>{`@media (max-width: 860px) { .captable-grid { grid-template-columns: 1fr !important; } }`}</style>

          {/* LEFT PANEL — Setup */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {/* Block 1 — Authorized shares */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <SLabel>Initial Setup</SLabel>
              <NumInput label="Authorized shares" value={authorized} onChange={setAuthorized} prefix="#"
                hint="Most startups start with 10M authorized shares. This does not affect ownership percentages." />
            </div>

            {/* Block 2 — Founders */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>Founders</span>
                <button onClick={addFounder} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
                  <Plus size={12} /> Add founder
                </button>
              </div>

              {founders.length === 0 && (
                <p style={{ fontSize: "12px", color: "#F87171", marginBottom: "10px" }}>Add at least one founder to continue.</p>
              )}

              {founders.map((f) => (
                <div key={f.id} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <TextInput placeholder="Name" value={f.name} onChange={(v) => updateFounder(f.id, "name", v)} />
                  </div>
                  <div style={{ width: "110px" }}>
                    <div style={{ display: "flex", alignItems: "center", background: "#1a1a1f", border: `1px solid ${f.shares === 0 ? "rgba(248,113,113,0.4)" : "var(--accent)"}`, borderRadius: "7px", overflow: "hidden" }}>
                      <span style={{ padding: "8px 8px", fontSize: "11px", color: "var(--faint)" }}>#</span>
                      <input type="number" value={f.shares || ""} onChange={(e) => updateFounder(f.id, "shares", Number(e.target.value) || 0)}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "8px 4px", fontSize: "12px", color: "var(--foreground)", width: "70px" }} />
                    </div>
                    {f.shares === 0 && <p style={{ fontSize: "10px", color: "#F87171", marginTop: "2px" }}>Enter share count</p>}
                  </div>
                  {founders.length > 1 && (
                    <button onClick={() => removeFounder(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: "9px 4px", flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)", fontSize: "12px", color: "var(--faint)" }}>
                <div>Founders: {fmtShares(founderTotal)} shares ({foundingTotal > 0 ? fmtPct((founderTotal / foundingTotal) * 100) : "—"})</div>
                {unallocated < 0
                  ? <div style={{ color: "#F87171", marginTop: "3px" }}>Over-allocated by {fmtShares(Math.abs(unallocated))} shares</div>
                  : <div style={{ marginTop: "3px" }}>Unallocated: {fmtShares(unallocated)} shares</div>}
              </div>
            </div>

            {/* Block 3 — Option pool */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)", marginBottom: "12px" }}>Option Pool (ESOP)</p>
              <NumInput label="Initial option pool shares" value={pool.initialShares}
                onChange={(v) => setPool({ initialShares: v })} prefix="#"
                hint="Reserved for employees and advisors. Dilutes founders at founding — this is intentional and standard." />
              {foundingTotal > 0 && (
                <p style={{ fontSize: "11px", color: "var(--faint)" }}>
                  Option pool = {fmtPct((pool.initialShares / foundingTotal) * 100)} of founding total
                </p>
              )}
            </div>

            {/* Block 4 — Funding rounds */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>Funding Rounds</span>
                {!showAddRound && (
                  <button onClick={() => setShowAddRound(true)} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
                    <Plus size={12} /> Add round
                  </button>
                )}
              </div>

              {showAddRound && (
                <AddRoundForm
                  pricedRounds={pricedRounds}
                  onAdd={(r) => { setRounds((prev) => [...prev, r]); setShowAddRound(false); }}
                  onCancel={() => setShowAddRound(false)}
                />
              )}

              {rounds.length === 0 && !showAddRound && (
                <p style={{ fontSize: "12px", color: "var(--faint)", textAlign: "center", padding: "12px 0" }}>No rounds yet. Add a round to model dilution.</p>
              )}

              {rounds.map((r) => (
                <div key={r.id} style={{ background: "#0d0d10", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{r.name}</span>
                      <span style={{ marginLeft: "8px", fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: r.type === "priced" ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)", color: r.type === "priced" ? "#10B981" : "#818CF8" }}>
                        {r.type === "priced" ? "Priced" : "SAFE"}
                      </span>
                    </div>
                    <button onClick={() => setRounds((prev) => prev.filter((x) => x.id !== r.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: "0 2px" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--faint)", marginTop: "5px" }}>
                    {r.type === "priced"
                      ? `${fmt$(r.preMoneyValuation)} pre · ${fmt$(r.totalInvestment)} raise · ${r.investors.length} investor${r.investors.length !== 1 ? "s" : ""}`
                      : `${fmt$(r.safeInvestment)} · Cap ${fmt$(r.valuationCap)} · ${r.discountRate}% discount`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL — Output */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {founders.length === 0 ? (
              <div style={{ background: "var(--card)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
                <p style={{ color: "#F87171", fontSize: "14px" }}>Add at least one founder to see the cap table.</p>
              </div>
            ) : (
              <>
                {/* Cap Table */}
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--faint)", textTransform: "uppercase", marginBottom: "16px" }}>
                    Cap Table
                  </p>
                  <CapTableDisplay snapshots={snapshots} founders={founders} />
                </div>

                {/* Ownership bars */}
                {snapshots.length > 0 && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--faint)", textTransform: "uppercase", marginBottom: "20px" }}>
                      Ownership by round
                    </p>
                    <OwnershipBars snapshots={snapshots} founders={founders} />
                  </div>
                )}

                {/* Round summary cards */}
                {pricedRounds.length > 0 && (
                  <div>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--faint)", textTransform: "uppercase", marginBottom: "12px" }}>
                      Round summary
                    </p>
                    <RoundCards snapshots={snapshots} rounds={rounds} founders={founders} />
                  </div>
                )}
              </>
            )}
            {/* Download PDF */}
            {founders.length > 0 && (
              <div className="tool-no-print">
                <button
                  onClick={() => { const p = document.title; document.title = "Cap Table — Hockystick"; window.print(); document.title = p; }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
                    borderRadius: "8px", padding: "10px 16px", fontSize: "13px",
                    fontWeight: 600, color: "#a78bfa", cursor: "pointer",
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            )}
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
              { n: "01", title: "Set up your founding structure", body: "Enter each founder's share count. Standard splits are equal between co-founders, but the number of shares is less important than the ratio. 10M authorized shares with a 50/50 split is the same as 2M shares with a 50/50 split." },
              { n: "02", title: "Add your option pool", body: "Most startups reserve 10–15% for employees and advisors. This dilutes founders now — investors prefer a large option pool so post-investment dilution doesn't come out of their stake. This is negotiable but expected." },
              { n: "03", title: "Add funding rounds in order", body: "Add rounds chronologically. If you have a SAFE note, add it and specify which priced round it converts at. The table updates automatically to show how each round changes everyone's ownership." },
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
            How this calculator works
          </h2>
          <Accordion title="Why share counts, not percentages">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "12px" }}>
              Percentages change every time new shares are issued. Share counts do not — a founder with 4,000,000 shares always has 4,000,000 shares unless they sell or transfer. Calculating ownership as (your shares / total shares) at any point in time gives the accurate percentage for that moment. This is how lawyers and accountants build cap tables.
            </p>
          </Accordion>
          <Accordion title="How option pool top-ups work">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Investors typically require an option pool refresh before a round closes, calculated on a pre-money basis. This means the new shares go into the pool before the investment is counted — which means founders bear the dilution, not the incoming investors. A 15% post-money option pool is often negotiated as an 18–20% pre-money pool.
            </p>
          </Accordion>
          <Accordion title="How SAFE notes convert">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "12px" }}>
              A SAFE (Simple Agreement for Future Equity) is not equity until it converts. At the next priced round, the SAFE investor receives shares at the lower of: the price implied by their valuation cap, or the priced round price minus their discount rate. This calculator applies standard YC SAFE conversion math.
            </p>
            <Mono>
              Cap price = valuation_cap / pre_round_total_shares<br />
              Discounted price = round_price × (1 − discount_rate)<br />
              Conversion price = min(cap_price, discounted_price)<br />
              SAFE shares = SAFE_investment / conversion_price
            </Mono>
          </Accordion>
          <Accordion title="How dilution is calculated">
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              When a new investor buys shares, they receive newly issued shares — not shares from existing holders. This means the total share count grows, and everyone's percentage shrinks proportionally. A founder with 4M shares out of 10M (40%) becomes 4M out of 14M (28.6%) after 4M new shares are issued — the founder still has 4M shares, their percentage has simply changed.
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
            { q: "What is a cap table?", a: "Cap table is short for capitalization table. It lists every person or entity that owns equity in a company, the type of equity they hold, the number of shares they own, and what percentage of the company that represents. It is a living document that updates with every funding round, option grant, and share transfer." },
            { q: "How much equity should founders give up at seed?", a: "Standard seed rounds dilute founders 15–25%. A $2M seed round at $8M pre-money gives investors 20% and leaves founders with 80% before option pool adjustments. GCC/MENA seed rounds often run at lower pre-money valuations ($2M–$5M), meaning higher dilution for the same check size compared to US deals." },
            { q: "What is a standard option pool size?", a: "Pre-seed: 10–12% of post-founding shares. Seed: investors often ask for a top-up to 15% before the round closes. Series A: top-up to 10–15% is typical, sometimes more for fast-hiring companies. The option pool should be sized for the next 18–24 months of hiring, not indefinitely — unused options create unnecessary dilution." },
            { q: "What is a SAFE note?", a: "A SAFE (Simple Agreement for Future Equity) is an investment instrument that converts to equity at a future priced round. The investor gives you money now in exchange for the right to buy shares later at a discounted price or capped valuation. SAFEs are common at pre-seed in the US. In GCC/MENA markets, convertible notes with interest are more common but SAFEs are gaining adoption." },
            { q: "When should I hire a lawyer to manage my cap table?", a: "From your first priced round. Pre-seed SAFEs are relatively simple and can be modeled in a spreadsheet. Once you have a priced round with multiple investors, pro-rata rights, and an option pool, the cap table becomes a legal document that affects every future transaction. Errors in cap tables cause problems at acquisition. Use a lawyer and a proper equity management platform (Carta or the GCC equivalent) from Seed onwards." },
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
          <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "22px", marginBottom: "24px", letterSpacing: "-0.02em" }}>Related tools</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { to: "/tools/valuation", title: "Startup Valuation Calculator", desc: "VC Method, Revenue Multiples, and Berkus.", live: true },
              { to: "/tools/safe-note", title: "SAFE Note Calculator", desc: "Model SAFE conversion scenarios.", live: true },
              { to: "/tools/dilution", title: "Dilution Calculator", desc: "See equity impact of each round in isolation.", live: true },
            ].map((t) => (
              t.live ? (
                <Link key={t.to} to={t.to as any} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px" }}>
                    <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Live</span>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", margin: "10px 0 6px" }}>{t.title}</h3>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>{t.desc}</p>
                  </div>
                </Link>
              ) : (
                <div key={t.to} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", opacity: 0.5 }}>
                  <span style={{ fontSize: "10px", background: "rgba(124,58,237,0.15)", color: "var(--brand)", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>Coming soon</span>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", margin: "10px 0 6px" }}>{t.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>{t.desc}</p>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      {/* S7 — CTA */}
      <section className="tool-no-print" style={{ borderTop: "1px solid var(--border)", background: "var(--card)", padding: "72px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(22px, 4vw, 30px)", letterSpacing: "-0.02em", marginBottom: "16px" }}>
            Investors review your cap table before they write a check.
          </h3>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: "28px" }}>
            A clean cap structure signals a founder who understands how equity works. Build your Hockystick profile to show investors you are fundraising-ready.
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
