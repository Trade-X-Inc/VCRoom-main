import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Lock, Check, X, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import {
  INSTRUMENT_TEMPLATES, INSTRUMENT_ORDER, formatTermValue,
  type InstrumentType, type TermValueType,
} from "@/lib/term-templates";
import {
  selectInstrument, addCustomTerm, proposeTerm, acceptTerm, rejectTerm,
  requestInstrumentReset, resolveInstrumentReset,
} from "@/lib/term-negotiation-fn";
import { TermClosingPanel } from "@/components/app/TermClosingPanel";
import { V2Button, V2PageHeader, StatusLabel, type StatusTone } from "@/components/v2";

// R15A — Term negotiation engine. Sole content of /deal-rooms/:id/term-sheets
// (the old investor-only blob builder was fully replaced here; see git history).
// Lawyers never reach this route: DealRoomLayout intercepts them into
// LawyerRoomView before this Outlet renders, and RLS gives them 0 rows anyway.

export const Route = createFileRoute("/app/deal-rooms/$id/term-sheets")({
  component: TermNegotiationPage,
});

// §7.2 closed 4-tone vocabulary — "counter"/"accepted (one side)" are both
// in-progress states, mapped to the nearest tone rather than invented ones.
const STATUS_CHIP: Record<string, { tone: StatusTone; label: string }> = {
  unset:    { tone: "neutral",   label: "Not started" },
  proposed: { tone: "attention", label: "Proposed" },
  counter:  { tone: "attention", label: "Counter-proposed" },
  accepted: { tone: "attention", label: "Accepted (one side)" },
  rejected: { tone: "adverse",   label: "Rejected" },
  locked:   { tone: "satisfied", label: "Finalized" },
};

async function token() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function TermNegotiationPage() {
  const { dealRoomId, isInvestor, userId, isClosed } = useDealRoom();
  const role: "founder" | "investor" = isInvestor ? "investor" : "founder";
  const qc = useQueryClient();

  const [busy, setBusy] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState<string | null>(null);
  const [proposeValue, setProposeValue] = useState("");
  const [counterMode, setCounterMode] = useState(false);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<TermValueType>("text");
  const [resetConfirm, setResetConfirm] = useState<InstrumentType | null>(null);
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["term-config", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_term_config").select("*").eq("deal_room_id", dealRoomId).maybeSingle();
      return data;
    },
  });

  const { data: terms = [] } = useQuery({
    queryKey: ["terms", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_terms").select("*").eq("deal_room_id", dealRoomId).order("created_at");
      return data ?? [];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["term-proposals", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_term_proposals").select("*").eq("deal_room_id", dealRoomId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: resetRequest } = useQuery({
    queryKey: ["term-reset-request", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_term_reset_requests")
        .select("*").eq("deal_room_id", dealRoomId).eq("status", "pending")
        .order("created_at", { ascending: false }).maybeSingle();
      return data;
    },
  });

  // Realtime — the counterparty's saved change lands here within seconds, no
  // reload. Single channel per room; invalidate all three query keys on any
  // change (§27: one invalidate per real key). Reuses the verified R12B pattern.
  useEffect(() => {
    if (!dealRoomId) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["terms", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["term-config", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["term-proposals", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["term-reset-request", dealRoomId] });
    };
    const channel = supabase
      .channel(`term-negotiation-${dealRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_terms", filter: `deal_room_id=eq.${dealRoomId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_term_config", filter: `deal_room_id=eq.${dealRoomId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_term_proposals", filter: `deal_room_id=eq.${dealRoomId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_term_reset_requests", filter: `deal_room_id=eq.${dealRoomId}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, qc]);

  const allTerms = terms as any[];
  const locked = !!config?.locked_at;
  const acceptedCount = allTerms.filter((t) => t.status === "locked").length;
  const proposalsByTerm = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const p of proposals as any[]) (m[p.term_id] ||= []).push(p);
    return m;
  }, [proposals]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["terms", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["term-config", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["term-proposals", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["term-reset-request", dealRoomId] });
  };

  // First selection only (no terms yet). Instrument change after terms exist
  // goes through the mutual-reset request flow below, never here.
  const doSelectInstrument = async (t: InstrumentType) => {
    setBusy("instrument");
    try {
      const r = await selectInstrument({ data: { dealRoomId, accessToken: await token(), instrumentType: t } });
      if (!r.ok) { toast.error("Could not set instrument"); return; }
      refresh();
    } catch { toast.error("Could not set instrument"); }
    finally { setBusy(null); }
  };

  // Open a mutual-reset request — the COUNTERPARTY must approve before any term
  // is wiped. One party can never reset alone.
  const doRequestReset = async (t: InstrumentType) => {
    setBusy("instrument");
    try {
      const r = await requestInstrumentReset({ data: { dealRoomId, accessToken: await token(), targetInstrument: t } });
      if (!r.ok) { toast.error(r.error === "term_set_locked" ? "Terms are finalized" : "Could not request reset"); return; }
      setResetConfirm(null);
      toast.success("Reset requested — awaiting counterparty approval");
      refresh();
    } catch { toast.error("Could not request reset"); }
    finally { setBusy(null); }
  };

  const doResolveReset = async (requestId: string, approve: boolean) => {
    setBusy("reset-resolve");
    try {
      const r = await resolveInstrumentReset({ data: { dealRoomId, accessToken: await token(), requestId, approve } });
      if (!r.ok) {
        toast.error(r.error === "self_approval" ? "You can't approve your own reset request" : "Could not resolve");
        return;
      }
      toast.success(approve ? "Terms reset to the new instrument" : "Reset request declined");
      refresh();
    } catch { toast.error("Could not resolve"); }
    finally { setBusy(null); }
  };

  const doPropose = async (termId: string, isCounter: boolean) => {
    if (!proposeValue.trim()) return;
    setBusy(termId);
    try {
      const r = await proposeTerm({ data: { dealRoomId, accessToken: await token(), termId, value: proposeValue.trim(), isCounter } });
      if (!r.ok) { toast.error("Could not submit"); return; }
      setProposeOpen(null); setProposeValue(""); setCounterMode(false);
      refresh();
    } catch { toast.error("Could not submit"); }
    finally { setBusy(null); }
  };

  const doAccept = async (termId: string) => {
    setBusy(termId);
    try {
      const r = await acceptTerm({ data: { dealRoomId, accessToken: await token(), termId } });
      if (!r.ok) { toast.error("Could not accept"); return; }
      if (r.termLocked) toast.success("Term finalized — accepted by both sides");
      refresh();
    } catch { toast.error("Could not accept"); }
    finally { setBusy(null); }
  };

  const doReject = async (termId: string) => {
    setBusy(termId);
    try {
      const r = await rejectTerm({ data: { dealRoomId, accessToken: await token(), termId, suggestedAlternative: rejectText.trim() || undefined } });
      if (!r.ok) { toast.error("Could not reject"); return; }
      setRejectOpen(null); setRejectText("");
      refresh();
    } catch { toast.error("Could not reject"); }
    finally { setBusy(null); }
  };

  const doAddCustom = async () => {
    if (!customLabel.trim()) return;
    setBusy("custom");
    try {
      const termKey = "custom_" + customLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const r = await addCustomTerm({ data: { dealRoomId, accessToken: await token(), termKey, termLabel: customLabel.trim(), valueType: customType } });
      if (!r.ok) { toast.error(r.error === "term_exists" ? "A term with that name exists" : "Could not add term"); return; }
      setCustomOpen(false); setCustomLabel(""); setCustomType("text");
      refresh();
    } catch { toast.error("Could not add term"); }
    finally { setBusy(null); }
  };

  // ── Instrument not yet chosen — selector ───────────────────────────────────
  if (!config?.instrument_type) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8 font-v2-ui text-v2-ink">
        <Header locked={false} acceptedCount={0} total={0} />
        <div className="mt-6 border border-v2-rule bg-v2-panel p-8">
          <h2 className="text-v2-ink font-semibold" style={{ fontSize: "15px" }}>Choose the instrument type</h2>
          <p className="mt-1 text-v2-ink-secondary text-sm">
            This sets the standard terms both parties will negotiate. It locks once the first term is proposed.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {INSTRUMENT_ORDER.map((t) => {
              const tmpl = INSTRUMENT_TEMPLATES[t];
              return (
                <button key={t} onClick={() => doSelectInstrument(t)} disabled={busy === "instrument"}
                  className="border border-v2-rule bg-v2-panel p-4 text-left transition-colors hover:bg-v2-accent-wash disabled:opacity-50">
                  <div className="text-v2-ink font-semibold text-sm">{tmpl.label}</div>
                  <div className="mt-1 text-v2-ink-secondary text-xs leading-relaxed">{tmpl.description}</div>
                  <div className="mt-2 text-v2-ink-muted" style={{ fontSize: "11px" }}>{tmpl.terms.length} standard terms</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const tmpl = INSTRUMENT_TEMPLATES[config.instrument_type as InstrumentType];

  return (
    <div className="mx-auto max-w-5xl px-8 py-8 font-v2-ui text-v2-ink">
      <Header locked={locked} acceptedCount={acceptedCount} total={allTerms.length} instrumentLabel={tmpl?.label} />

      {locked && (
        <div className="mt-6 flex items-center gap-3 border border-v2-satisfied bg-v2-satisfied-wash p-4">
          <Lock className="h-5 w-5 shrink-0 text-v2-satisfied" />
          <div>
            <div className="text-v2-satisfied font-semibold text-sm">
              Terms finalized — {config.locked_at ? new Date(config.locked_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}
            </div>
            <div className="text-v2-ink-secondary text-xs">Every term is accepted by both parties. The term set is locked.</div>
          </div>
        </div>
      )}

      {/* R15B — post-lock closing panel: generated summary + agreement upload/
          review + re-open flow. Rendered for founder/investor here; the lawyer
          sees the same panel via LawyerRoomView. */}
      {locked && userId && (
        <div className="mt-6">
          <TermClosingPanel dealRoomId={dealRoomId} role={role} userId={userId} isClosed={isClosed} />
        </div>
      )}

      {/* Instrument bar — change is a mutual reset (escape hatch) */}
      {!locked && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-v2-rule bg-v2-panel px-4 py-3">
          <div className="flex items-center gap-2 text-v2-ink text-sm">
            <span className="font-semibold">Instrument:</span> {tmpl?.label}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {INSTRUMENT_ORDER.filter((t) => t !== config.instrument_type).map((t) => (
              <V2Button key={t} variant="secondary" onClick={() => setResetConfirm(t)} disabled={!!busy}>
                <RotateCcw className="h-3 w-3" /> Switch to {INSTRUMENT_TEMPLATES[t].label}
              </V2Button>
            ))}
          </div>
        </div>
      )}

      {/* Pending mutual-reset request — counterparty approves, requester waits */}
      {!locked && resetRequest && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-v2-attention bg-v2-attention-wash px-4 py-3">
          <div className="text-v2-attention text-sm">
            {resetRequest.requested_by === userId
              ? <>You requested a reset to <strong>{INSTRUMENT_TEMPLATES[resetRequest.target_instrument as InstrumentType]?.label}</strong> — awaiting counterparty approval. All terms will be cleared if approved.</>
              : <><strong className="capitalize">{resetRequest.requested_role}</strong> requested a reset to <strong>{INSTRUMENT_TEMPLATES[resetRequest.target_instrument as InstrumentType]?.label}</strong>. Approving clears every term and its history.</>}
          </div>
          {resetRequest.requested_by !== userId && (
            <div className="flex items-center gap-2">
              <V2Button variant="secondary" onClick={() => doResolveReset(resetRequest.id, false)} disabled={busy === "reset-resolve"}>Decline</V2Button>
              <V2Button variant="primary" onClick={() => doResolveReset(resetRequest.id, true)} disabled={busy === "reset-resolve"}>Approve reset</V2Button>
            </div>
          )}
        </div>
      )}

      {/* Terms table — inline expansion (edit/history) rows make this a
          bordered list, not a LedgerTable: LedgerTable rows can't expand
          into a form or history block, so forcing it there would lose
          real functionality. Same call as the founder room list's
          expand-to-team-row pattern (surface 1). */}
      <div className="mt-6 border border-v2-rule bg-v2-panel">
        {allTerms.map((term) => {
          const chip = STATUS_CHIP[term.status] ?? STATUS_CHIP.unset;
          const mineAccepted = role === "founder" ? term.accepted_by_founder : term.accepted_by_investor;
          const theirsAccepted = role === "founder" ? term.accepted_by_investor : term.accepted_by_founder;
          const isMyMove = !locked && term.status !== "locked" && (term.awaiting_role === role || term.status === "unset");
          const history = proposalsByTerm[term.id] ?? [];
          return (
            <div key={term.id} data-testid={`term-row-${term.term_key}`} data-term-status={term.status} className="border-b border-v2-rule-light last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5" style={{ minHeight: 44 }}>
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-v2-ink font-medium" style={{ fontSize: "13px" }}>{term.term_label}</span>
                    {term.is_custom && <span className="text-v2-ink-muted uppercase" style={{ fontSize: "10px", letterSpacing: "0.07em" }}>Custom</span>}
                  </div>
                  <div className="mt-0.5 font-v2-data" style={{ fontSize: "13px", color: term.current_value ? "var(--v2-ink)" : "var(--v2-ink-muted)" }}>
                    {formatTermValue(term.current_value, term.value_type as TermValueType)}
                  </div>
                </div>

                <StatusLabel tone={chip.tone}>{chip.label}</StatusLabel>

                {/* Whose move */}
                <div className="min-w-[90px] text-v2-ink-muted" style={{ fontSize: "12px" }}>
                  {term.status === "locked" ? <span className="text-v2-satisfied">Done</span>
                    : isMyMove ? <span className="text-v2-accent font-semibold">Your move</span>
                    : term.awaiting_role ? `Awaiting ${term.awaiting_role}` : "—"}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {!locked && term.status !== "locked" && (
                    <>
                      {/* Accept — only when the OTHER side proposed a value awaiting me */}
                      {term.current_value && term.awaiting_role === role && !mineAccepted && (
                        <V2Button variant="primary" onClick={() => doAccept(term.id)} disabled={busy === term.id}>
                          {busy === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Accept
                        </V2Button>
                      )}
                      {/* Reject / counter — when there's a value awaiting me */}
                      {term.current_value && term.awaiting_role === role && (
                        <>
                          <V2Button variant="secondary" onClick={() => { setProposeOpen(term.id); setProposeValue(term.current_value ?? ""); setCounterMode(true); }}>
                            Counter
                          </V2Button>
                          <V2Button variant="adverse" onClick={() => { setRejectOpen(term.id); setRejectText(""); }}>
                            Reject
                          </V2Button>
                        </>
                      )}
                      {/* Propose — unset / rejected / my turn to (re)propose */}
                      {(term.status === "unset" || term.status === "rejected" || (!term.current_value)) && (
                        <V2Button variant="primary" onClick={() => { setProposeOpen(term.id); setProposeValue(""); setCounterMode(false); }}>
                          <Plus className="h-3 w-3" /> Propose
                        </V2Button>
                      )}
                      {/* I proposed and I've accepted my own value; waiting on them */}
                      {mineAccepted && !theirsAccepted && (
                        <span className="text-v2-ink-muted" style={{ fontSize: "12px" }}>You accepted · awaiting counterparty</span>
                      )}
                    </>
                  )}
                  {history.length > 0 && (
                    <V2Button variant="quiet" onClick={() => setHistoryOpen(historyOpen === term.id ? null : term.id)}>
                      {historyOpen === term.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      History ({history.length})
                    </V2Button>
                  )}
                </div>
              </div>

              {/* Inline propose/counter editor */}
              {proposeOpen === term.id && (
                <div className="border-t border-v2-rule-light bg-v2-surface px-4 py-3">
                  <label className="block text-v2-ink-secondary font-medium" style={{ fontSize: "12px" }}>
                    {counterMode ? "Counter-propose a value" : "Propose a value"}
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input value={proposeValue} onChange={(e) => setProposeValue(e.target.value)} autoFocus
                      placeholder={term.value_type === "boolean" ? "true or false" : `Enter ${term.term_label.toLowerCase()}`}
                      className="min-w-[220px] flex-1 border border-v2-rule bg-v2-panel px-3 text-sm text-v2-ink outline-none focus:border-v2-accent"
                      style={{ height: 36, borderRadius: "var(--v2-radius)" }} />
                    <V2Button variant="primary" onClick={() => doPropose(term.id, counterMode)} disabled={!proposeValue.trim() || busy === term.id}>
                      {busy === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : counterMode ? "Send counter" : "Send proposal"}
                    </V2Button>
                    <V2Button variant="secondary" onClick={() => { setProposeOpen(null); setProposeValue(""); }}>Cancel</V2Button>
                  </div>
                </div>
              )}

              {/* Inline reject editor */}
              {rejectOpen === term.id && (
                <div className="border-t border-v2-rule-light bg-v2-surface px-4 py-3">
                  <label className="block text-v2-ink-secondary font-medium" style={{ fontSize: "12px" }}>Reject — suggest an alternative (optional)</label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input value={rejectText} onChange={(e) => setRejectText(e.target.value)} autoFocus
                      placeholder="What would you accept instead?"
                      className="min-w-[220px] flex-1 border border-v2-rule bg-v2-panel px-3 text-sm text-v2-ink outline-none focus:border-v2-accent"
                      style={{ height: 36, borderRadius: "var(--v2-radius)" }} />
                    <V2Button variant="adverse" onClick={() => doReject(term.id)} disabled={busy === term.id}>
                      Reject term
                    </V2Button>
                    <V2Button variant="secondary" onClick={() => { setRejectOpen(null); setRejectText(""); }}>Cancel</V2Button>
                  </div>
                </div>
              )}

              {/* Audit trail */}
              {historyOpen === term.id && history.length > 0 && (
                <div className="border-t border-v2-rule-light bg-v2-surface px-4 py-3">
                  <div className="space-y-1.5">
                    {history.map((p) => (
                      <div key={p.id} className="flex items-baseline gap-2 text-v2-ink-secondary" style={{ fontSize: "12px" }}>
                        <span className="font-medium capitalize text-v2-ink">{p.actor_role}</span>
                        <span>{p.action === "propose" ? "proposed" : p.action === "counter" ? "countered" : p.action === "accept" ? "accepted" : "rejected"}</span>
                        {p.proposed_value && <span className="text-v2-ink">"{p.proposed_value}"</span>}
                        {p.suggested_alternative && <span className="italic">— suggested: {p.suggested_alternative}</span>}
                        <span className="ml-auto shrink-0 text-v2-ink-muted">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add custom term */}
      {!locked && (
        <div className="mt-4">
          {customOpen ? (
            <div className="border border-v2-rule bg-v2-panel p-4">
              <label className="block text-v2-ink-secondary font-medium" style={{ fontSize: "12px" }}>Add a custom term</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Term name"
                  className="min-w-[220px] flex-1 border border-v2-rule bg-v2-surface px-3 text-sm text-v2-ink outline-none focus:border-v2-accent"
                  style={{ height: 36, borderRadius: "var(--v2-radius)" }} />
                <select value={customType} onChange={(e) => setCustomType(e.target.value as TermValueType)}
                  className="border border-v2-rule bg-v2-surface px-3 text-sm text-v2-ink outline-none focus:border-v2-accent"
                  style={{ height: 36, borderRadius: "var(--v2-radius)" }}>
                  {["text", "currency", "percentage", "boolean", "date", "number"].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <V2Button variant="primary" onClick={doAddCustom} disabled={!customLabel.trim() || busy === "custom"}>Add term</V2Button>
                <V2Button variant="secondary" onClick={() => { setCustomOpen(false); setCustomLabel(""); }}>Cancel</V2Button>
              </div>
            </div>
          ) : (
            <V2Button variant="secondary" onClick={() => setCustomOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add custom term
            </V2Button>
          )}
        </div>
      )}

      {/* Mutual-reset confirmation dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md border border-v2-rule bg-v2-panel p-6" style={{ borderRadius: "var(--v2-radius)" }}>
            <h3 className="text-v2-ink font-semibold" style={{ fontSize: "15px" }}>
              Switch to {INSTRUMENT_TEMPLATES[resetConfirm].label}?
            </h3>
            <p className="mt-2 text-v2-ink-secondary text-sm">
              Changing the instrument type resets all terms — every proposed value and its history is cleared, and the {INSTRUMENT_TEMPLATES[resetConfirm].label} standard terms replace the current set. This affects both parties.
            </p>
            <p className="mt-2 text-v2-ink-muted text-xs">
              This sends a reset request. The counterparty must approve it before any term is cleared — neither side can reset alone.
            </p>
            <div className="mt-5 flex gap-2">
              <V2Button variant="secondary" className="flex-1" onClick={() => setResetConfirm(null)}>Cancel</V2Button>
              <V2Button variant="primary" className="flex-1" onClick={() => doRequestReset(resetConfirm)} disabled={busy === "instrument"}>
                Request reset
              </V2Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ locked, acceptedCount, total, instrumentLabel }: { locked: boolean; acceptedCount: number; total: number; instrumentLabel?: string }) {
  return (
    <V2PageHeader
      breadcrumb={[{ label: "Deal room" }, { label: "Term sheet" }]}
      title="Term negotiation"
      description={locked ? "The term set is finalized." : "Both parties propose, accept, reject, or counter each term until every term is agreed."}
      actions={total > 0 ? (
        <div className="border border-v2-rule bg-v2-panel px-4 py-3 text-right">
          <div className="text-v2-ink-muted" style={{ fontSize: "12px" }}>{instrumentLabel ? `${instrumentLabel} · progress` : "Progress"}</div>
          <div className="mt-0.5 font-semibold font-v2-data" style={{ fontSize: "17px", color: acceptedCount === total ? "var(--v2-satisfied)" : "var(--v2-ink)" }}>
            {acceptedCount} <span className="text-v2-ink-muted">of</span> {total} <span className="text-v2-ink-muted font-normal" style={{ fontSize: "13px" }}>accepted</span>
          </div>
        </div>
      ) : undefined}
    />
  );
}
