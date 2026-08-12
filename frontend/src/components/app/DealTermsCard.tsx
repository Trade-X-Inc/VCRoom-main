import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callAction } from "@/lib/actions/call";
import { roomGetDealTerms, roomUpdateDealTerms } from "@/lib/actions/deal-room-core";
import { DollarSign, Plus, Trash2, Pencil, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { V2Button, V2EmptyState, V2Skeleton, LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td } from "@/components/v2";

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
  // §20.4 error semantics — three distinct save-failure states, not one
  // generic toast: conflict (someone else saved first — form values kept,
  // user chooses reload-or-keep-editing), sessionExpired (distinct copy,
  // form values kept), and the generic toast path for everything else.
  const [conflict, setConflict] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [fundingStage, setFundingStage] = useState("");
  const [fundingAsk, setFundingAsk] = useState("");
  const [preMoneyVal, setPreMoneyVal] = useState("");
  const [equityOffered, setEquityOffered] = useState("");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [metrics, setMetrics] = useState<{ k: string; v: string }[]>([]);

  // room_get_deal_terms's "forbidden" (non-member) is mapped to null, same
  // as the old RLS query's silent-zero-rows contract — hasAnyData/isFounder
  // below already treat a null/empty terms object as "nothing to show yet",
  // and this component has no member-only render path that would need a
  // distinct error UI (a non-member should never mount this card in the
  // first place; DealRoomLayout's accessError already fails closed before
  // any child route renders it).
  const { data: terms, isLoading } = useQuery({
    queryKey: ["deal-terms", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      try {
        const res = await callAction<{ terms: Record<string, any> }>(roomGetDealTerms, dealRoomId, { dealRoomId });
        return res.terms;
      } catch (err) {
        if (err instanceof Error && err.message === "forbidden") return null;
        throw err;
      }
    },
  });

  // The updated_at this edit session started from — the compare-and-swap
  // key. Captured once, at edit-start, not re-read on every keystroke.
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const startEditing = () => {
    setFundingStage(terms?.funding_stage ?? "");
    setFundingAsk(terms?.funding_ask ?? "");
    setPreMoneyVal(terms?.pre_money_valuation ?? "");
    setEquityOffered(terms?.equity_offered ?? "");
    const rawRounds: any[] = Array.isArray(terms?.previous_rounds) ? terms.previous_rounds : [];
    setRounds(rawRounds.map((r: any) => ({ name: r.name ?? "", amount: r.amount ?? "", investors: r.investors ?? "" })));
    const rawMetrics = terms?.key_metrics ?? {};
    setMetrics(Object.entries(rawMetrics).map(([k, v]) => ({ k, v: String(v) })));
    setLoadedAt(terms?.updated_at ?? null);
    setConflict(false);
    setSessionExpired(false);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setConflict(false);
    setSessionExpired(false);
    try {
      const metricsObj: Record<string, string> = {};
      metrics.filter((m) => m.k.trim()).forEach((m) => { metricsObj[m.k.trim()] = m.v; });
      const res = await callAction<{ conflict?: boolean }>(roomUpdateDealTerms, dealRoomId, {
        dealRoomId,
        expectedUpdatedAt: loadedAt,
        fundingStage: fundingStage || null,
        fundingAsk: fundingAsk || null,
        preMoneyValuation: preMoneyVal || null,
        equityOffered: equityOffered || null,
        previousRounds: rounds.filter((r) => r.name.trim()),
        keyMetrics: metricsObj,
      });
      if (res.conflict) {
        // Form values are NOT cleared — the user keeps what they typed and
        // chooses reload-vs-keep-editing explicitly (§20.4). Whole-form
        // conflict, not field-level: a negotiation record's terms are
        // never silently merged across two parties' edits.
        setConflict(true);
        return;
      }
      qc.invalidateQueries({ queryKey: ["deal-terms", dealRoomId] });
      setEditing(false);
      toast.success("Deal terms saved");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg === "not_authenticated" || msg.includes("JWT") || msg.includes("session")) {
        setSessionExpired(true);
      } else {
        toast.error(msg || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const reloadAfterConflict = () => {
    qc.invalidateQueries({ queryKey: ["deal-terms", dealRoomId] });
    setConflict(false);
    setEditing(false);
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
    <section className="border border-v2-rule bg-v2-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold inline-flex items-center gap-2 text-v2-ink">
          <DollarSign className="h-4 w-4 text-v2-accent" /> Funding terms
        </div>
        {isFounder && !editing && (
          <V2Button variant="quiet" onClick={startEditing}>
            <Pencil className="h-3 w-3" /> {hasAnyData ? "Edit" : "Add terms"}
          </V2Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <V2Button variant="secondary" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" /> Cancel
            </V2Button>
            <V2Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </V2Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <V2Skeleton key={i} style={{ height: "32px" }} />)}
        </div>
      ) : editing ? (
        <div className="space-y-4">
          {conflict && (
            <div className="border border-v2-attention px-3 py-2.5 text-v2-attention flex items-start gap-2" style={{ fontSize: "12px" }}>
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Someone else saved changes to these terms while you were editing.</p>
                <p className="mt-0.5">Your changes have not been saved. Reload to see the latest, or keep editing and save again.</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={reloadAfterConflict} className="font-medium underline hover:no-underline">
                    Reload
                  </button>
                  <button onClick={() => setConflict(false)} className="font-medium underline hover:no-underline">
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          )}
          {sessionExpired && (
            <div className="border border-v2-adverse px-3 py-2.5 text-v2-adverse flex items-start gap-2" style={{ fontSize: "12px" }}>
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Your session expired.</p>
                <p className="mt-0.5">Sign in again to save this — your changes are still here.</p>
              </div>
            </div>
          )}
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-v2-ink-muted uppercase font-semibold block mb-1" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Stage</label>
              <select
                value={fundingStage}
                onChange={(e) => setFundingStage(e.target.value)}
                className="w-full border border-v2-rule bg-v2-surface px-2.5 py-1.5 text-sm text-v2-ink focus:outline-none focus:border-v2-accent"
                style={{ borderRadius: "var(--v2-radius)" }}
              >
                <option value="">Select…</option>
                {FUNDING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-v2-ink-muted uppercase font-semibold block mb-1" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Funding ask</label>
              <input
                value={fundingAsk}
                onChange={(e) => setFundingAsk(e.target.value)}
                placeholder="e.g. $5M"
                className="w-full border border-v2-rule bg-v2-surface px-2.5 py-1.5 text-sm text-v2-ink focus:outline-none focus:border-v2-accent"
                style={{ borderRadius: "var(--v2-radius)" }}
              />
            </div>
            <div>
              <label className="text-v2-ink-muted uppercase font-semibold block mb-1" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Pre-money valuation</label>
              <input
                value={preMoneyVal}
                onChange={(e) => setPreMoneyVal(e.target.value)}
                placeholder="e.g. $20M"
                className="w-full border border-v2-rule bg-v2-surface px-2.5 py-1.5 text-sm text-v2-ink focus:outline-none focus:border-v2-accent"
                style={{ borderRadius: "var(--v2-radius)" }}
              />
            </div>
            <div>
              <label className="text-v2-ink-muted uppercase font-semibold block mb-1" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Equity offered</label>
              <input
                value={equityOffered}
                onChange={(e) => setEquityOffered(e.target.value)}
                placeholder="e.g. 20%"
                className="w-full border border-v2-rule bg-v2-surface px-2.5 py-1.5 text-sm text-v2-ink focus:outline-none focus:border-v2-accent"
                style={{ borderRadius: "var(--v2-radius)" }}
              />
            </div>
          </div>

          {/* Previous rounds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-v2-ink-muted uppercase font-semibold" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Previous rounds</div>
              <V2Button variant="quiet" onClick={addRound}>
                <Plus className="h-3 w-3" /> Add round
              </V2Button>
            </div>
            {rounds.length === 0 ? (
              <p className="text-v2-ink-muted" style={{ fontSize: "12px" }}>No previous rounds.</p>
            ) : (
              <div className="space-y-2">
                {rounds.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <input value={r.name} onChange={(e) => updateRound(i, "name", e.target.value)} placeholder="Round (e.g. Pre-seed)"
                      className="border border-v2-rule bg-v2-surface px-2 py-1 text-xs text-v2-ink focus:outline-none focus:border-v2-accent" style={{ borderRadius: "var(--v2-radius)" }} />
                    <input value={r.amount} onChange={(e) => updateRound(i, "amount", e.target.value)} placeholder="Amount"
                      className="border border-v2-rule bg-v2-surface px-2 py-1 text-xs text-v2-ink focus:outline-none focus:border-v2-accent" style={{ borderRadius: "var(--v2-radius)" }} />
                    <input value={r.investors} onChange={(e) => updateRound(i, "investors", e.target.value)} placeholder="Investors"
                      className="border border-v2-rule bg-v2-surface px-2 py-1 text-xs text-v2-ink focus:outline-none focus:border-v2-accent" style={{ borderRadius: "var(--v2-radius)" }} />
                    <button onClick={() => removeRound(i)} className="text-v2-ink-muted hover:text-v2-adverse">
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
              <div className="text-v2-ink-muted uppercase font-semibold" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Key metrics</div>
              {metrics.length < 6 && (
                <V2Button variant="quiet" onClick={addMetric}>
                  <Plus className="h-3 w-3" /> Add metric
                </V2Button>
              )}
            </div>
            {metrics.length === 0 ? (
              <p className="text-v2-ink-muted" style={{ fontSize: "12px" }}>No metrics added yet.</p>
            ) : (
              <div className="space-y-2">
                {metrics.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input value={m.k} onChange={(e) => updateMetric(i, "k", e.target.value)} placeholder="Label (e.g. MRR)"
                      className="border border-v2-rule bg-v2-surface px-2 py-1 text-xs text-v2-ink focus:outline-none focus:border-v2-accent" style={{ borderRadius: "var(--v2-radius)" }} />
                    <input value={m.v} onChange={(e) => updateMetric(i, "v", e.target.value)} placeholder="Value (e.g. $120k)"
                      className="border border-v2-rule bg-v2-surface px-2 py-1 text-xs text-v2-ink focus:outline-none focus:border-v2-accent" style={{ borderRadius: "var(--v2-radius)" }} />
                    <button onClick={() => removeMetric(i)} className="text-v2-ink-muted hover:text-v2-adverse">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !hasAnyData ? (
        <V2EmptyState
          text="No funding terms added yet."
          action={isFounder ? { label: "Add funding terms", onClick: startEditing } : undefined}
        />
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
              <div key={label} className="border border-v2-rule bg-v2-surface p-3">
                <div className="text-v2-ink-muted uppercase font-semibold" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>{label}</div>
                <div className="mt-1 text-v2-ink font-semibold font-v2-data" style={{ fontSize: "14px" }}>{value}</div>
              </div>
            ) : null)}
          </div>

          {/* Previous rounds */}
          {prevRounds.length > 0 && (
            <div>
              <div className="text-v2-ink-muted uppercase font-semibold mb-2" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Previous rounds</div>
              <LedgerTable>
                <LedgerHead>
                  <tr>
                    <Th>Round</Th>
                    <Th>Amount</Th>
                    <Th>Investors</Th>
                  </tr>
                </LedgerHead>
                <LedgerBody>
                  {prevRounds.map((r, i) => (
                    <Tr key={i}>
                      <Td>{r.name}</Td>
                      <Td>{r.amount || "—"}</Td>
                      <Td>{r.investors || "—"}</Td>
                    </Tr>
                  ))}
                </LedgerBody>
              </LedgerTable>
            </div>
          )}

          {/* Key metrics */}
          {Object.keys(keyMetrics).length > 0 && (
            <div>
              <div className="text-v2-ink-muted uppercase font-semibold mb-2" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Key metrics</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(keyMetrics).map(([k, v]) => (
                  <div key={k} className="border border-v2-rule bg-v2-surface p-2.5 text-center">
                    <div className="text-v2-ink-muted uppercase font-semibold truncate" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>{k}</div>
                    <div className="mt-0.5 text-v2-ink font-semibold font-v2-data truncate" style={{ fontSize: "13px" }}>{v}</div>
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
