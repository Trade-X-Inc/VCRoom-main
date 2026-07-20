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

// R15A — Term negotiation engine. Sole content of /deal-rooms/:id/term-sheets
// (the old investor-only blob builder was fully replaced here; see git history).
// Lawyers never reach this route: DealRoomLayout intercepts them into
// LawyerRoomView before this Outlet renders, and RLS gives them 0 rows anyway.

export const Route = createFileRoute("/app/deal-rooms/$id/term-sheets")({
  component: TermNegotiationPage,
});

const BORDER = "#E4E4E7";
const INK = "#0A0A0B";
const INK2 = "#52525B";
const INK3 = "#71717A";
const BRAND = "#7C3AED";

const STATUS_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  unset:    { bg: "#F4F4F5", fg: "#52525B", label: "Not started" },
  proposed: { bg: "#EDE9FE", fg: "#6D28D9", label: "Proposed" },
  counter:  { bg: "#FEF3C7", fg: "#92400E", label: "Counter-proposed" },
  accepted: { bg: "#DBEAFE", fg: "#1E40AF", label: "Accepted (one side)" },
  rejected: { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected" },
  locked:   { bg: "#DCFCE7", fg: "#166534", label: "Finalized" },
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
      <div className="mx-auto max-w-[1360px] px-8 py-8">
        <Header locked={false} acceptedCount={0} total={0} />
        <div className="mt-6 border bg-white p-8" style={{ borderColor: BORDER }}>
          <h2 className="text-base font-semibold" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Choose the instrument type</h2>
          <p className="mt-1 text-sm" style={{ color: INK2 }}>
            This sets the standard terms both parties will negotiate. It locks once the first term is proposed.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {INSTRUMENT_ORDER.map((t) => {
              const tmpl = INSTRUMENT_TEMPLATES[t];
              return (
                <button key={t} onClick={() => doSelectInstrument(t)} disabled={busy === "instrument"}
                  className="border bg-white p-4 text-left transition-colors hover:bg-[#FAFAFA] disabled:opacity-50"
                  style={{ borderColor: BORDER, borderRadius: 0 }}>
                  <div className="text-sm font-semibold" style={{ color: INK }}>{tmpl.label}</div>
                  <div className="mt-1 text-xs leading-relaxed" style={{ color: INK2 }}>{tmpl.description}</div>
                  <div className="mt-2 text-[11px]" style={{ color: INK3 }}>{tmpl.terms.length} standard terms</div>
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
    <div className="mx-auto max-w-[1360px] px-8 py-8">
      <Header locked={locked} acceptedCount={acceptedCount} total={allTerms.length} instrumentLabel={tmpl?.label} />

      {locked && (
        <div className="mt-6 flex items-center gap-3 border p-4" style={{ borderColor: "#166534", background: "#F0FDF4", borderRadius: 0 }}>
          <Lock className="h-5 w-5 shrink-0" style={{ color: "#166534" }} />
          <div>
            <div className="text-sm font-semibold" style={{ color: "#166534" }}>
              Terms Finalized — {config.locked_at ? new Date(config.locked_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}
            </div>
            <div className="text-xs" style={{ color: INK2 }}>Every term is accepted by both parties. The term set is locked.</div>
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border bg-white px-4 py-3" style={{ borderColor: BORDER, borderRadius: 0 }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: INK }}>
            <span className="font-semibold">Instrument:</span> {tmpl?.label}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {INSTRUMENT_ORDER.filter((t) => t !== config.instrument_type).map((t) => (
              <button key={t} onClick={() => setResetConfirm(t)} disabled={!!busy}
                className="inline-flex items-center gap-1.5 border px-3 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: BORDER, color: INK2, height: 32, borderRadius: 2 }}>
                <RotateCcw className="h-3 w-3" /> Switch to {INSTRUMENT_TEMPLATES[t].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending mutual-reset request — counterparty approves, requester waits */}
      {!locked && resetRequest && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border px-4 py-3" style={{ borderColor: "#F59E0B", background: "#FFFBEB", borderRadius: 0 }}>
          <div className="text-sm" style={{ color: "#92400E" }}>
            {resetRequest.requested_by === userId
              ? <>You requested a reset to <strong>{INSTRUMENT_TEMPLATES[resetRequest.target_instrument as InstrumentType]?.label}</strong> — awaiting counterparty approval. All terms will be cleared if approved.</>
              : <><strong className="capitalize">{resetRequest.requested_role}</strong> requested a reset to <strong>{INSTRUMENT_TEMPLATES[resetRequest.target_instrument as InstrumentType]?.label}</strong>. Approving clears every term and its history.</>}
          </div>
          {resetRequest.requested_by !== userId && (
            <div className="flex items-center gap-2">
              <button onClick={() => doResolveReset(resetRequest.id, false)} disabled={busy === "reset-resolve"}
                className="border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 32, borderRadius: 2 }}>Decline</button>
              <button onClick={() => doResolveReset(resetRequest.id, true)} disabled={busy === "reset-resolve"}
                className="px-3 text-xs font-medium text-white" style={{ background: "#D97706", height: 32, borderRadius: 2 }}>Approve reset</button>
            </div>
          )}
        </div>
      )}

      {/* Terms table */}
      <div className="mt-6 border bg-white" style={{ borderColor: BORDER, borderRadius: 0 }}>
        {allTerms.map((term) => {
          const chip = STATUS_CHIP[term.status] ?? STATUS_CHIP.unset;
          const mineAccepted = role === "founder" ? term.accepted_by_founder : term.accepted_by_investor;
          const theirsAccepted = role === "founder" ? term.accepted_by_investor : term.accepted_by_founder;
          const isMyMove = !locked && term.status !== "locked" && (term.awaiting_role === role || term.status === "unset");
          const history = proposalsByTerm[term.id] ?? [];
          return (
            <div key={term.id} data-testid={`term-row-${term.term_key}`} data-term-status={term.status} className="border-b last:border-b-0" style={{ borderColor: BORDER }}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5" style={{ minHeight: 44 }}>
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: INK }}>{term.term_label}</span>
                    {term.is_custom && <span className="text-[10px] uppercase tracking-wide" style={{ color: INK3 }}>Custom</span>}
                  </div>
                  <div className="mt-0.5 text-[13px]" style={{ color: term.current_value ? INK : INK3 }}>
                    {formatTermValue(term.current_value, term.value_type as TermValueType)}
                  </div>
                </div>

                <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium" style={{ background: chip.bg, color: chip.fg, borderRadius: 2 }}>
                  {chip.label}
                </span>

                {/* Whose move */}
                <div className="min-w-[90px] text-[12px]" style={{ color: INK3 }}>
                  {term.status === "locked" ? <span style={{ color: "#166534" }}>Done</span>
                    : isMyMove ? <span style={{ color: BRAND, fontWeight: 600 }}>Your move</span>
                    : term.awaiting_role ? `Awaiting ${term.awaiting_role}` : "—"}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {!locked && term.status !== "locked" && (
                    <>
                      {/* Accept — only when the OTHER side proposed a value awaiting me */}
                      {term.current_value && term.awaiting_role === role && !mineAccepted && (
                        <button onClick={() => doAccept(term.id)} disabled={busy === term.id}
                          className="inline-flex items-center gap-1 px-3 text-xs font-medium text-white disabled:opacity-50"
                          style={{ background: BRAND, height: 32, borderRadius: 2 }}>
                          {busy === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Accept
                        </button>
                      )}
                      {/* Reject / counter — when there's a value awaiting me */}
                      {term.current_value && term.awaiting_role === role && (
                        <>
                          <button onClick={() => { setProposeOpen(term.id); setProposeValue(term.current_value ?? ""); setCounterMode(true); }}
                            className="border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 32, borderRadius: 2 }}>
                            Counter
                          </button>
                          <button onClick={() => { setRejectOpen(term.id); setRejectText(""); }}
                            className="border px-3 text-xs font-medium" style={{ borderColor: "#FCA5A5", color: "#991B1B", height: 32, borderRadius: 2 }}>
                            Reject
                          </button>
                        </>
                      )}
                      {/* Propose — unset / rejected / my turn to (re)propose */}
                      {(term.status === "unset" || term.status === "rejected" || (!term.current_value)) && (
                        <button onClick={() => { setProposeOpen(term.id); setProposeValue(""); setCounterMode(false); }}
                          className="inline-flex items-center gap-1 px-3 text-xs font-medium text-white"
                          style={{ background: BRAND, height: 32, borderRadius: 2 }}>
                          <Plus className="h-3 w-3" /> Propose
                        </button>
                      )}
                      {/* I proposed and I've accepted my own value; waiting on them */}
                      {mineAccepted && !theirsAccepted && (
                        <span className="text-[12px]" style={{ color: INK3 }}>You accepted · awaiting counterparty</span>
                      )}
                    </>
                  )}
                  {history.length > 0 && (
                    <button onClick={() => setHistoryOpen(historyOpen === term.id ? null : term.id)}
                      className="inline-flex items-center gap-1 px-2 text-[11px]" style={{ color: INK3, height: 32 }}>
                      {historyOpen === term.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      History ({history.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Inline propose/counter editor */}
              {proposeOpen === term.id && (
                <div className="border-t bg-[#FAFAFA] px-4 py-3" style={{ borderColor: BORDER }}>
                  <label className="block text-[12px] font-medium" style={{ color: INK2 }}>
                    {counterMode ? "Counter-propose a value" : "Propose a value"}
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input value={proposeValue} onChange={(e) => setProposeValue(e.target.value)} autoFocus
                      placeholder={term.value_type === "boolean" ? "true or false" : `Enter ${term.term_label.toLowerCase()}`}
                      className="min-w-[220px] flex-1 border px-3 text-sm outline-none"
                      style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }} />
                    <button onClick={() => doPropose(term.id, counterMode)} disabled={!proposeValue.trim() || busy === term.id}
                      className="px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: 2 }}>
                      {busy === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : counterMode ? "Send counter" : "Send proposal"}
                    </button>
                    <button onClick={() => { setProposeOpen(null); setProposeValue(""); }}
                      className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Inline reject editor */}
              {rejectOpen === term.id && (
                <div className="border-t bg-[#FAFAFA] px-4 py-3" style={{ borderColor: BORDER }}>
                  <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Reject — suggest an alternative (optional)</label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input value={rejectText} onChange={(e) => setRejectText(e.target.value)} autoFocus
                      placeholder="What would you accept instead?"
                      className="min-w-[220px] flex-1 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }} />
                    <button onClick={() => doReject(term.id)} disabled={busy === term.id}
                      className="px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: "#DC2626", height: 36, borderRadius: 2 }}>
                      Reject term
                    </button>
                    <button onClick={() => { setRejectOpen(null); setRejectText(""); }}
                      className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Audit trail */}
              {historyOpen === term.id && history.length > 0 && (
                <div className="border-t bg-[#FAFAFA] px-4 py-3" style={{ borderColor: BORDER }}>
                  <div className="space-y-1.5">
                    {history.map((p) => (
                      <div key={p.id} className="flex items-baseline gap-2 text-[12px]" style={{ color: INK2 }}>
                        <span className="font-medium capitalize" style={{ color: INK }}>{p.actor_role}</span>
                        <span>{p.action === "propose" ? "proposed" : p.action === "counter" ? "countered" : p.action === "accept" ? "accepted" : "rejected"}</span>
                        {p.proposed_value && <span style={{ color: INK }}>"{p.proposed_value}"</span>}
                        {p.suggested_alternative && <span className="italic">— suggested: {p.suggested_alternative}</span>}
                        <span className="ml-auto shrink-0" style={{ color: INK3 }}>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
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
            <div className="border bg-white p-4" style={{ borderColor: BORDER, borderRadius: 0 }}>
              <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Add a custom term</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Term name"
                  className="min-w-[220px] flex-1 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }} />
                <select value={customType} onChange={(e) => setCustomType(e.target.value as TermValueType)}
                  className="border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }}>
                  {["text", "currency", "percentage", "boolean", "date", "number"].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <button onClick={doAddCustom} disabled={!customLabel.trim() || busy === "custom"}
                  className="px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: 2 }}>Add term</button>
                <button onClick={() => { setCustomOpen(false); setCustomLabel(""); }}
                  className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setCustomOpen(true)}
              className="inline-flex items-center gap-1.5 border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>
              <Plus className="h-3.5 w-3.5" /> Add custom term
            </button>
          )}
        </div>
      )}

      {/* Mutual-reset confirmation dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md border bg-white p-6" style={{ borderColor: BORDER, borderRadius: 0 }}>
            <h3 className="text-base font-semibold" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>
              Switch to {INSTRUMENT_TEMPLATES[resetConfirm].label}?
            </h3>
            <p className="mt-2 text-sm" style={{ color: INK2 }}>
              Changing the instrument type resets all terms — every proposed value and its history is cleared, and the {INSTRUMENT_TEMPLATES[resetConfirm].label} standard terms replace the current set. This affects both parties.
            </p>
            <p className="mt-2 text-xs" style={{ color: INK3 }}>
              This sends a reset request. The counterparty must approve it before any term is cleared — neither side can reset alone.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setResetConfirm(null)} className="flex-1 border px-4 text-sm" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
              <button onClick={() => doRequestReset(resetConfirm)} disabled={busy === "instrument"}
                className="flex-1 px-4 text-sm font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: 2 }}>
                Request reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ locked, acceptedCount, total, instrumentLabel }: { locked: boolean; acceptedCount: number; total: number; instrumentLabel?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[12px]" style={{ color: INK3 }}>Deal room · Term Sheet</div>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Term negotiation</h1>
        <p className="mt-1 text-sm" style={{ color: INK2 }}>
          {locked ? "The term set is finalized." : "Both parties propose, accept, reject, or counter each term until every term is agreed."}
        </p>
      </div>
      {total > 0 && (
        <div className="border bg-white px-4 py-3 text-right" style={{ borderColor: BORDER, borderRadius: 0 }}>
          <div className="text-[12px]" style={{ color: INK3 }}>{instrumentLabel ? `${instrumentLabel} · progress` : "Progress"}</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: acceptedCount === total ? "#166534" : INK }}>
            {acceptedCount} <span style={{ color: INK3 }}>of</span> {total} <span className="text-sm font-normal" style={{ color: INK3 }}>accepted</span>
          </div>
        </div>
      )}
    </div>
  );
}
