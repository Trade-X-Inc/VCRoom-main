import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, Sparkles, X, FileText, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/system";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/term-sheets")({
  component: TermSheetsPage,
});

const TS_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600  ",
  sent: "bg-blue-50 text-blue-700  ",
  counter_proposed: "bg-amber-50 text-amber-700  ",
  accepted: "bg-green-50 text-green-700  ",
  rejected: "bg-red-50 text-red-700  ",
};

const DEFAULT_TS_TERMS = {
  investment_amount: "",
  valuation: "",
  equity_percentage: "",
  investment_type: "SAFE",
  board_seat: "No",
  pro_rata_rights: "No",
  information_rights: "Quarterly",
  liquidation_preference: "1x non-participating",
  anti_dilution: "Broad-based weighted average",
  closing_date: "",
  conditions_precedent: "",
};

function TermSheetsPage() {
  const {
    dealRoomId, isInvestor, userId, startup,
    doRequestNextStage: onRequestNextStage, stageRequesting,
  } = useDealRoom();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<any>(null);
  const [tsForm, setTsForm] = useState({ ...DEFAULT_TS_TERMS });
  const [tsNotes, setTsNotes] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState<string | null>(null);
  const [counterText, setCounterText] = useState("");
  const [acceptConfirmId, setAcceptConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: termSheets = [], refetch: refetchTS } = useQuery({
    queryKey: ["term-sheets", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_term_sheets")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("version", { ascending: false });
      return data ?? [];
    },
  });

  // R12B — the counterparty's status change (sent/accepted/countered) must
  // appear in this session live, without a reload.
  useEffect(() => {
    if (!dealRoomId) return;
    const channel = supabase
      .channel(`term-sheets-${dealRoomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_room_term_sheets", filter: `deal_room_id=eq.${dealRoomId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["term-sheets", dealRoomId] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, queryClient]);

  const allSheets = termSheets as any[];
  const nextVersion = allSheets.length > 0 ? (allSheets[0].version ?? 0) + 1 : 1;

  const visibleSheets = isInvestor ? allSheets : allSheets.filter((s: any) => s.status !== "draft");

  const openEditor = (sheet?: any) => {
    if (sheet) {
      setEditingVersion(sheet);
      setTsForm({ ...DEFAULT_TS_TERMS, ...(sheet.terms ?? {}) });
      setTsNotes(sheet.notes ?? "");
    } else {
      setEditingVersion(null);
      setTsForm({ ...DEFAULT_TS_TERMS });
      setTsNotes("");
    }
    setEditorOpen(true);
  };

  const saveDraft = async () => {
    if (!userId) return;
    setSavingDraft(true);
    try {
      if (editingVersion) {
        const { error } = await supabase.from("deal_room_term_sheets").update({ terms: tsForm, notes: tsNotes, status: "draft" }).eq("id", editingVersion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deal_room_term_sheets").insert({ deal_room_id: dealRoomId, created_by: userId, version: nextVersion, terms: tsForm, notes: tsNotes, status: "draft" });
        if (error) throw error;
      }
      await refetchTS();
      setEditorOpen(false);
      toast.success("Draft saved");
    } catch { toast.error("Could not save draft"); }
    finally { setSavingDraft(false); }
  };

  const sendToFounder = async () => {
    if (!userId) return;
    setSending(true);
    try {
      if (editingVersion) {
        const { error } = await supabase.from("deal_room_term_sheets").update({ terms: tsForm, notes: tsNotes, status: "sent", sent_at: new Date().toISOString() }).eq("id", editingVersion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deal_room_term_sheets").insert({ deal_room_id: dealRoomId, created_by: userId, version: nextVersion, terms: tsForm, notes: tsNotes, status: "sent", sent_at: new Date().toISOString() });
        if (error) throw error;
      }
      await refetchTS();
      setEditorOpen(false);
      toast.success("Term sheet sent to founder");
    } catch { toast.error("Could not send term sheet"); }
    finally { setSending(false); }
  };

  const aiDraftTerms = async () => {
    if (!userId) return;
    setAiDrafting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Not authenticated"); return; }
      const resp = await fetch("https://ldimninnjlvxozubheib.supabase.co/functions/v1/ai-router", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: "deal_brief",
          user_id: userId,
          system_prompt: "You are a VC investment analyst drafting a term sheet for a GCC/MENA startup investment. Generate standard term sheet terms as JSON. Return only valid JSON with these exact keys: investment_amount, valuation, equity_percentage, investment_type, board_seat, pro_rata_rights, information_rights, liquidation_preference, anti_dilution, conditions_precedent.",
          messages: [{ role: "user", content: `Draft term sheet for: ${startup?.company_name ?? "startup"}, Stage: ${startup?.stage ?? "unknown"}, Sector: ${startup?.sector ?? "unknown"}` }],
        }),
      });
      const result = await resp.json();
      const raw = result?.content ?? result?.reply ?? result?.message ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        setTsForm((prev) => ({ ...prev, ...parsed }));
        toast.success("AI terms loaded — review before sending");
      } catch {
        toast.error("Could not parse AI response");
      }
    } catch { toast.error("AI draft failed"); }
    finally { setAiDrafting(false); }
  };

  const updateStatus = async (sheetId: string, status: string) => {
    setRespondingId(sheetId);
    try {
      const { error } = await supabase.from("deal_room_term_sheets").update({ status, responded_at: new Date().toISOString() }).eq("id", sheetId);
      if (error) throw error;
      await refetchTS();
      toast.success(status === "accepted" ? "Term sheet accepted" : status === "rejected" ? "Term sheet rejected" : "Status updated");
    } catch { toast.error("Could not update term sheet"); }
    finally { setRespondingId(null); }
  };

  const submitCounter = async (sheetId: string, version: number) => {
    if (!counterText.trim() || !userId) return;
    setRespondingId(sheetId);
    try {
      const { error: counterErr } = await supabase.from("deal_room_term_sheets").update({ status: "counter_proposed", responded_at: new Date().toISOString() }).eq("id", sheetId);
      if (counterErr) throw counterErr;
      const { error: noteErr } = await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId, user_id: userId,
        title: `Counter-offer: Term Sheet v${version}`,
        content: counterText.trim(), visibility: "deal_room", ai_generated: false,
      });
      if (noteErr) throw noteErr;
      await refetchTS();
      setCounterOpen(null);
      setCounterText("");
      toast.success("Counter-offer submitted");
    } catch { toast.error("Could not submit counter-offer"); }
    finally { setRespondingId(null); }
  };

  const TermInput = ({ label, field, type = "text", placeholder = "" }: { label: string; field: keyof typeof tsForm; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={tsForm[field]}
        onChange={(e) => setTsForm((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
      />
    </div>
  );

  const TermSelect = ({ label, field, options }: { label: string; field: keyof typeof tsForm; options: string[] }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={tsForm[field]}
        onChange={(e) => setTsForm((p) => ({ ...p, [field]: e.target.value }))}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {editorOpen && isInvestor && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)] ">
            <h3 className="text-sm font-bold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>
              Term Sheet v{editingVersion ? editingVersion.version : nextVersion}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={aiDraftTerms}
                disabled={aiDrafting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-medium text-brand hover:bg-accent disabled:opacity-40"
                data-testid="ai-draft-term-sheet-btn"
              >
                {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate with AI
              </button>
              <button onClick={() => setEditorOpen(false)} className="rounded-lg p-1.5 text-[#71717A] hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TermInput label="Investment amount" field="investment_amount" placeholder="e.g. $500,000" />
              <TermInput label="Valuation" field="valuation" placeholder="e.g. Pre-money $5M" />
              <TermInput label="Equity percentage" field="equity_percentage" placeholder="e.g. 10%" />
              <TermSelect label="Investment type" field="investment_type" options={["SAFE", "Convertible Note", "Equity", "Revenue Share"]} />
              <TermSelect label="Board seat" field="board_seat" options={["Yes", "No", "Observer"]} />
              <TermSelect label="Pro-rata rights" field="pro_rata_rights" options={["Yes", "No"]} />
              <TermSelect label="Information rights" field="information_rights" options={["Monthly", "Quarterly", "Annual", "None"]} />
              <TermInput label="Liquidation preference" field="liquidation_preference" placeholder="e.g. 1x non-participating" />
              <TermSelect label="Anti-dilution" field="anti_dilution" options={["None", "Broad-based weighted average", "Ratchet"]} />
              <TermInput label="Closing date" field="closing_date" type="date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Conditions precedent</label>
              <textarea
                value={tsForm.conditions_precedent}
                onChange={(e) => setTsForm((p) => ({ ...p, conditions_precedent: e.target.value }))}
                rows={2}
                placeholder="e.g. Completion of legal audit..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Additional notes</label>
              <textarea
                value={tsNotes}
                onChange={(e) => setTsNotes(e.target.value)}
                rows={2}
                placeholder="Any other terms or conditions..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={saveDraft}
                disabled={savingDraft}
                className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                {savingDraft ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={sendToFounder}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
                data-testid="send-term-sheet-btn"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send to founder →
              </button>
            </div>
          </div>
        </div>
      )}

      {isInvestor && !editorOpen && allSheets.length === 0 && (
        <div className="bg-white border border-brand/20 rounded-none px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "rgba(124,58,237,0.08)" }}>
            <FileText className="h-6 w-6 text-brand" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Draft a term sheet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">Share investment terms with the founder.</p>
          <button
            onClick={() => openEditor()}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-foreground"
            style={{ background: "var(--gradient-brand)" }}
            data-testid="draft-term-sheet-btn"
          >
            <Plus className="h-4 w-4" /> Draft term sheet
          </button>
        </div>
      )}

      {isInvestor && !editorOpen && allSheets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>Term sheets</h3>
            <button onClick={() => openEditor()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground" style={{ background: "var(--gradient-brand)" }}>
              <Plus className="h-3.5 w-3.5" /> New version
            </button>
          </div>
          <div className="space-y-3">
            {allSheets.map((sheet: any) => (
              <div key={sheet.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 ">Term Sheet v{sheet.version}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TS_STATUS_COLORS[sheet.status] ?? "bg-gray-100 text-gray-600  ")}>
                        {sheet.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    {sheet.sent_at && <p className="text-xs text-[#71717A] mt-0.5">Sent {formatDistanceToNow(new Date(sheet.sent_at), { addSuffix: true })}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => openEditor(sheet)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs font-medium text-gray-700 ">View / Edit</button>
                    {sheet.status === "sent" && (
                      <>
                        <button
                          onClick={() => updateStatus(sheet.id, "accepted")}
                          disabled={respondingId === sheet.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground"
                          style={{ background: "#10B981" }}
                        >
                          Mark accepted
                        </button>
                        <button
                          onClick={() => updateStatus(sheet.id, "rejected")}
                          disabled={respondingId === sheet.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 "
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isInvestor && (
        <>
          {visibleSheets.length === 0 ? (
            <EmptyState kind="empty" title="No term sheet" />
          ) : (
            <div className="space-y-4">
              {visibleSheets.map((sheet: any) => {
                const terms = sheet.terms ?? {};
                const TERM_LABELS: [string, string][] = [
                  ["investment_amount", "Investment amount"],
                  ["valuation", "Valuation"],
                  ["equity_percentage", "Equity"],
                  ["investment_type", "Instrument"],
                  ["board_seat", "Board seat"],
                  ["pro_rata_rights", "Pro-rata rights"],
                  ["information_rights", "Information rights"],
                  ["liquidation_preference", "Liquidation preference"],
                  ["anti_dilution", "Anti-dilution"],
                  ["closing_date", "Closing date"],
                  ["conditions_precedent", "Conditions precedent"],
                ];
                return (
                  <div key={sheet.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)] ">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 ">Term Sheet v{sheet.version}</span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", TS_STATUS_COLORS[sheet.status] ?? "bg-gray-100 text-gray-600  ")}>
                          {sheet.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {sheet.sent_at && <span className="text-xs text-[#71717A] ">{formatDistanceToNow(new Date(sheet.sent_at), { addSuffix: true })}</span>}
                    </div>

                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {TERM_LABELS.filter(([k]) => terms[k]).map(([k, label]) => (
                        <div key={k} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-gray-500 shrink-0">{label}</span>
                          <span className="text-sm text-gray-900 text-right">{String(terms[k])}</span>
                        </div>
                      ))}
                    </div>

                    {sheet.notes && (
                      <div className="px-5 pb-4">
                        <div className="rounded-lg bg-gray-50 px-3 py-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">Additional notes</p>
                          <p className="text-sm text-gray-700 ">{sheet.notes}</p>
                        </div>
                      </div>
                    )}

                    {sheet.status === "sent" && (
                      <div className="px-5 pb-5 space-y-3">
                        {counterOpen === sheet.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={counterText}
                              onChange={(e) => setCounterText(e.target.value)}
                              rows={3}
                              placeholder="Describe your counter-offer terms in plain language..."
                              className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => { setCounterOpen(null); setCounterText(""); }} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                              <button
                                onClick={() => submitCounter(sheet.id, sheet.version)}
                                disabled={!counterText.trim() || respondingId === sheet.id}
                                className="rounded-lg px-4 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                                style={{ background: "var(--gradient-brand)" }}
                                data-testid="counter-offer-btn"
                              >
                                Send counter-offer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setCounterOpen(sheet.id)}
                              className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 "
                              data-testid="counter-offer-btn"
                            >
                              Submit counter-offer
                            </button>
                            <button
                              onClick={() => setAcceptConfirmId(sheet.id)}
                              className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground"
                              style={{ background: "#10B981" }}
                              data-testid="accept-term-sheet-btn"
                            >
                              Accept term sheet
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {(sheet.status === "counter_proposed") && (
                      <div className="px-5 pb-5">
                        <button
                          onClick={() => setAcceptConfirmId(sheet.id)}
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground"
                          style={{ background: "#10B981" }}
                          data-testid="accept-term-sheet-btn"
                        >
                          Accept term sheet
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {isInvestor && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 ">Ready to close?</div>
            <div className="text-xs text-gray-500 mt-0.5">Request to advance to the Closing stage when terms are agreed.</div>
          </div>
          <button
            onClick={onRequestNextStage}
            disabled={stageRequesting}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60 shrink-0"
            style={{ background: "var(--gradient-brand)" }}
            data-testid="term-sheet-next-stage"
          >
            {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request next stage →
          </button>
        </div>
      )}

      {acceptConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-none border border-[rgba(0,0,0,0.08)] p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-bold text-gray-900 ">Accept this term sheet?</h3>
            <p className="text-sm text-gray-500">Review with a lawyer before accepting.</p>
            <div className="flex gap-2">
              <button onClick={() => setAcceptConfirmId(null)} className="flex-1 rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-gray-500">Cancel</button>
              <button
                onClick={async () => { await updateStatus(acceptConfirmId, "accepted"); setAcceptConfirmId(null); }}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-foreground"
                style={{ background: "#10B981" }}
              >
                Confirm accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
