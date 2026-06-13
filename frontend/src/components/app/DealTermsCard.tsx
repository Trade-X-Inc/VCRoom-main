import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DollarSign, Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

const FUNDING_STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C"] as const;

function formatCurrency(val: unknown): string {
  if (!val) return "—";
  const n = Number(val);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n.toLocaleString();
}

interface Round {
  name: string;
  amount: string;
  investors: string;
}

interface Props {
  dealRoomId: string;
  isFounder: boolean;
  isInvestor: boolean;
}

export function DealTermsCard({ dealRoomId, isFounder, isInvestor }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fundingStage, setFundingStage] = useState("");
  const [fundingAsk, setFundingAsk] = useState("");
  const [preMoneyVal, setPreMoneyVal] = useState("");
  const [equityOffered, setEquityOffered] = useState("");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [metrics, setMetrics] = useState<{ k: string; v: string }[]>([]);

  const { data: terms, isLoading } = useQuery({
    queryKey: ["deal-terms", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("funding_stage, funding_ask, pre_money_valuation, equity_offered, previous_rounds, key_metrics")
        .eq("id", dealRoomId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const startEditing = () => {
    setFundingStage(terms?.funding_stage ?? "");
    setFundingAsk(terms?.funding_ask ?? "");
    setPreMoneyVal(terms?.pre_money_valuation ?? "");
    setEquityOffered(terms?.equity_offered ?? "");
    const rawRounds: any[] = Array.isArray(terms?.previous_rounds) ? terms.previous_rounds : [];
    setRounds(rawRounds.map((r: any) => ({ name: r.name ?? "", amount: r.amount ?? "", investors: r.investors ?? "" })));
    const rawMetrics = terms?.key_metrics ?? {};
    setMetrics(Object.entries(rawMetrics).map(([k, v]) => ({ k, v: String(v) })));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const metricsObj: Record<string, string> = {};
      metrics.filter((m) => m.k.trim()).forEach((m) => { metricsObj[m.k.trim()] = m.v; });
      const { error } = await supabase
        .from("deal_rooms")
        .update({
          funding_stage: fundingStage || null,
          funding_ask: fundingAsk || null,
          pre_money_valuation: preMoneyVal || null,
          equity_offered: equityOffered || null,
          previous_rounds: rounds.filter((r) => r.name.trim()),
          key_metrics: metricsObj,
        })
        .eq("id", dealRoomId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["deal-terms", dealRoomId] });
      setEditing(false);
      toast.success("Deal terms saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addRound = () => setRounds((r) => [...r, { name: "", amount: "", investors: "" }]);
  const removeRound = (i: number) => setRounds((r) => r.filter((_, idx) => idx !== i));
  const updateRound = (i: number, field: keyof Round, val: string) =>
    setRounds((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const addMetric = () => { if (metrics.length < 6) setMetrics((m) => [...m, { k: "", v: "" }]); };
  const removeMetric = (i: number) => setMetrics((m) => m.filter((_, idx) => idx !== i));
  const updateMetric = (i: number, field: "k" | "v", val: string) =>
    setMetrics((m) => m.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const hasAnyData = terms && (
    terms.funding_stage || terms.funding_ask || terms.pre_money_valuation ||
    terms.equity_offered ||
    (Array.isArray(terms.previous_rounds) && terms.previous_rounds.length > 0) ||
    (terms.key_metrics && Object.keys(terms.key_metrics).length > 0)
  );

  if (!isFounder && !hasAnyData && !isLoading) return null;

  const prevRounds: Round[] = Array.isArray(terms?.previous_rounds) ? terms.previous_rounds : [];
  const keyMetrics: Record<string, string> = terms?.key_metrics ?? {};

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold inline-flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-brand" /> Funding Terms
        </div>
        {isFounder && !editing && (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Pencil className="h-3 w-3" /> {hasAnyData ? "Edit" : "Add terms"}
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-2.5 py-1.5 hover:bg-accent"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1.5 shadow-glow disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />)}
        </div>
      ) : editing ? (
        <div className="space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Stage</label>
              <select
                value={fundingStage}
                onChange={(e) => setFundingStage(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand/50"
              >
                <option value="">Select…</option>
                {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Funding ask</label>
              <input
                value={fundingAsk}
                onChange={(e) => setFundingAsk(e.target.value)}
                placeholder="e.g. $5M"
                className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Pre-money valuation</label>
              <input
                value={preMoneyVal}
                onChange={(e) => setPreMoneyVal(e.target.value)}
                placeholder="e.g. $20M"
                className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Equity offered</label>
              <input
                value={equityOffered}
                onChange={(e) => setEquityOffered(e.target.value)}
                placeholder="e.g. 20%"
                className="w-full rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
          </div>

          {/* Previous rounds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous rounds</div>
              <button onClick={addRound} className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline">
                <Plus className="h-3 w-3" /> Add round
              </button>
            </div>
            {rounds.length === 0 ? (
              <p className="text-xs text-muted-foreground">No previous rounds.</p>
            ) : (
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input value={r.name} onChange={(e) => updateRound(i, "name", e.target.value)} placeholder="Round (e.g. Pre-seed)"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50" />
                    <input value={r.amount} onChange={(e) => updateRound(i, "amount", e.target.value)} placeholder="Amount"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50" />
                    <input value={r.investors} onChange={(e) => updateRound(i, "investors", e.target.value)} placeholder="Investors"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50" />
                    <button onClick={() => removeRound(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Key metrics</div>
              {metrics.length < 6 && (
                <button onClick={addMetric} className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline">
                  <Plus className="h-3 w-3" /> Add metric
                </button>
              )}
            </div>
            {metrics.length === 0 ? (
              <p className="text-xs text-muted-foreground">No metrics added yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input value={m.k} onChange={(e) => updateMetric(i, "k", e.target.value)} placeholder="Label (e.g. MRR)"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50" />
                    <input value={m.v} onChange={(e) => updateMetric(i, "v", e.target.value)} placeholder="Value (e.g. $120k)"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs focus:outline-none focus:border-brand/50" />
                    <button onClick={() => removeMetric(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !hasAnyData ? (
        <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
          <DollarSign className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No funding terms added yet.</p>
          {isFounder && (
            <button onClick={startEditing} className="mt-2 text-xs text-brand hover:underline">
              Add funding terms
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Core terms grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Stage", value: terms?.funding_stage },
              { label: "Funding ask", value: formatCurrency(terms?.funding_ask) },
              { label: "Pre-money val.", value: formatCurrency(terms?.pre_money_valuation) },
              { label: "Equity offered", value: terms?.equity_offered ? (String(terms.equity_offered).includes("%") ? String(terms.equity_offered) : `${terms.equity_offered}%`) : "—" },
            ].map(({ label, value }) => value && value !== "—" ? (
              <div key={label} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
                <div className="mt-1 text-sm font-semibold">{value}</div>
              </div>
            ) : null)}
          </div>

          {/* Previous rounds */}
          {prevRounds.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Previous rounds</div>
              <div className="rounded-lg border border-border/60 overflow-hidden divide-y divide-border/60">
                {prevRounds.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                    <span className="font-medium min-w-[80px]">{r.name}</span>
                    <span className="text-muted-foreground">{r.amount}</span>
                    {r.investors && <span className="text-muted-foreground ml-auto truncate max-w-[160px]">{r.investors}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key metrics */}
          {Object.keys(keyMetrics).length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key metrics</div>
              <div className={cn("grid gap-2", Object.keys(keyMetrics).length <= 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6")}>
                {Object.entries(keyMetrics).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border/60 bg-background p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{k}</div>
                    <div className="mt-0.5 text-sm font-semibold truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
