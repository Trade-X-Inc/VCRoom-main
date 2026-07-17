import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, CheckCircle2, ClipboardList, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/close")({
  component: ClosePage,
});

const CLOSING_STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "complete",
  complete: "pending",
  blocked: "pending",
};

const CLOSING_OWNER_COLORS: Record<string, string> = {
  founder: "bg-purple-50 text-purple-700  ",
  investor: "bg-blue-50 text-blue-700  ",
  both: "bg-gray-100 text-gray-600  ",
  lawyer: "bg-amber-50 text-amber-700  ",
};

const EXIT_REASON_CATEGORIES = [
  "Valuation disagreement",
  "Due diligence findings",
  "Market conditions",
  "Terms disagreement",
  "Timing",
  "Other",
];

function ItemStatusCircle({ status }: { status: string }) {
  if (status === "complete") return (
    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
      <Check className="h-3 w-3 text-foreground" />
    </div>
  );
  if (status === "in_progress") return <div className="h-5 w-5 rounded-full border-2 border-amber-400 bg-amber-50 shrink-0" />;
  if (status === "blocked") return (
    <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
      <X className="h-3 w-3 text-foreground" />
    </div>
  );
  return <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />;
}

function ClosePage() {
  const { dealRoomId, isInvestor, userId } = useDealRoom();
  const queryClient = useQueryClient();

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [itemDueDates, setItemDueDates] = useState<Record<string, string>>({});
  const [itemStatuses, setItemStatuses] = useState<Record<string, string>>({});
  const [seedingChecklist, setSeedingChecklist] = useState(false);
  const [closeDealOpen, setCloseDealOpen] = useState(false);
  const [finalNotes, setFinalNotes] = useState("");
  const [closingDeal, setClosingDeal] = useState(false);
  const [dealClosed, setDealClosed] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitOutcome, setExitOutcome] = useState("Pass");
  const [exitReasonCat, setExitReasonCat] = useState(EXIT_REASON_CATEGORIES[0]);
  const [exitReasonDetail, setExitReasonDetail] = useState("");
  const [exiting, setExiting] = useState(false);
  const [exitDone, setExitDone] = useState(false);
  const [overrideClose, setOverrideClose] = useState(false);

  const { data: closingItems = [], refetch: refetchItems } = useQuery({
    queryKey: ["closing-items", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_closing_items")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("category")
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: acceptedTS } = useQuery({
    queryKey: ["accepted-ts", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_term_sheets")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("status", "accepted")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const items = closingItems as any[];
  const categories = Array.from(new Set(items.map((i: any) => i.category)));
  const completedCount = items.filter((i: any) => i.status === "complete").length;
  const totalCount = items.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (items.length > 0) {
      const notes: Record<string, string> = {};
      const dates: Record<string, string> = {};
      const statuses: Record<string, string> = {};
      items.forEach((i: any) => {
        if (i.notes) notes[i.id] = i.notes;
        if (i.due_by) dates[i.id] = i.due_by;
        statuses[i.id] = i.status;
      });
      setItemNotes((p) => ({ ...notes, ...p }));
      setItemDueDates((p) => ({ ...dates, ...p }));
      setItemStatuses((p) => ({ ...statuses, ...p }));
    }
  }, [closingItems]);

  const seedChecklist = async () => {
    if (!dealRoomId) return;
    setSeedingChecklist(true);
    try {
      const { data: templates } = await supabase
        .from("closing_item_templates")
        .select("*")
        .order("category")
        .order("display_order");
      if (!templates) return;
      const rows = (templates as any[]).map((t: any) => ({
        deal_room_id: dealRoomId,
        category: t.category,
        item_text: t.item_text,
        owner: t.owner,
        status: "pending",
        is_standard: true,
      }));
      const { error } = await supabase.from("deal_room_closing_items").insert(rows);
      if (error) throw error;
      await refetchItems();
      toast.success("Closing checklist loaded");
    } catch { toast.error("Could not load checklist"); }
    finally { setSeedingChecklist(false); }
  };

  const cycleItemStatus = async (item: any) => {
    const next = CLOSING_STATUS_CYCLE[item.status] ?? "pending";
    const update: any = { status: next };
    if (next === "complete") update.completed_at = new Date().toISOString();
    else update.completed_at = null;
    setItemStatuses((p) => ({ ...p, [item.id]: next }));
    const { error } = await supabase.from("deal_room_closing_items").update(update).eq("id", item.id);
    if (error) { console.error("[closing] status cycle failed:", error); toast.error("Could not update item status."); return; }
    await refetchItems();
  };

  const markItemComplete = async (itemId: string) => {
    setItemStatuses((p) => ({ ...p, [itemId]: "complete" }));
    const { error } = await supabase.from("deal_room_closing_items").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", itemId);
    if (error) { console.error("[closing] mark complete failed:", error); toast.error("Could not mark item complete."); return; }
    await refetchItems();
    setExpandedItemId(null);
  };

  const saveItemNote = async (itemId: string, value: string) => {
    const { error } = await supabase.from("deal_room_closing_items").update({ notes: value }).eq("id", itemId);
    if (error) { console.error("[closing] note save failed:", error); toast.error("Could not save note."); return; }
    await refetchItems();
  };

  const saveItemDueDate = async (itemId: string, value: string) => {
    const { error } = await supabase.from("deal_room_closing_items").update({ due_by: value || null }).eq("id", itemId);
    if (error) { console.error("[closing] due date save failed:", error); toast.error("Could not save due date."); return; }
    await refetchItems();
  };

  const changeItemStatus = async (itemId: string, status: string) => {
    setItemStatuses((p) => ({ ...p, [itemId]: status }));
    const { error } = await supabase.from("deal_room_closing_items").update({ status }).eq("id", itemId);
    if (error) { console.error("[closing] status change failed:", error); toast.error("Could not update item status."); return; }
    await refetchItems();
  };

  const closeDeal = async () => {
    if (!userId) return;
    setClosingDeal(true);
    try {
      const { error: reportErr } = await supabase.from("deal_room_closure_reports").insert({
        deal_room_id: dealRoomId, closed_by: userId,
        outcome: "invested", reason_detail: finalNotes || null, ai_summary: null,
      });
      if (reportErr) throw reportErr;
      const { error: closeErr } = await supabase.from("deal_rooms").update({ status: "closed" }).eq("id", dealRoomId);
      if (closeErr) throw closeErr;
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { deal_room_id: dealRoomId } })).catch(() => {});
      console.log("Email closing report to both parties — Claude Code will wire email");
      // R11 step 4: the shared deal-room shell (status badge, tab gating)
      // reads from useDealRoomContext's ["deal-room", dealRoomId] query —
      // without this it kept showing the room as open until a hard reload.
      queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      setDealClosed(true);
      setCloseDealOpen(false);
      toast.success("Deal closed successfully");
    } catch { toast.error("Could not close deal"); }
    finally { setClosingDeal(false); }
  };

  const exitDeal = async () => {
    if (!userId) return;
    setExiting(true);
    try {
      const { error: reportErr } = await supabase.from("deal_room_closure_reports").insert({
        deal_room_id: dealRoomId, closed_by: userId,
        outcome: exitOutcome.toLowerCase(),
        reason_category: exitReasonCat,
        reason_detail: exitReasonDetail.trim() || null,
        ai_summary: null,
      });
      if (reportErr) throw reportErr;
      const { error: closeErr } = await supabase.from("deal_rooms").update({ status: "closed" }).eq("id", dealRoomId);
      if (closeErr) throw closeErr;
      import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { deal_room_id: dealRoomId } })).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      setExitDone(true);
      setExitOpen(false);
    } catch { toast.error("Could not close deal room"); }
    finally { setExiting(false); }
  };

  if (dealClosed || exitDone) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: dealClosed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
            <CheckCircle2 className={cn("h-7 w-7", dealClosed ? "text-green-500" : "text-red-400")} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
            {dealClosed ? "Deal closed successfully" : "Deal room closed"}
          </h3>
          <p className="text-sm text-gray-500 ">
            {dealClosed ? "Both parties will receive a closing report." : "A report has been sent to both parties."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.08)] ">
          <h3 className="text-sm font-bold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>Closing Checklist</h3>
          {items.length === 0 && (
            <button
              onClick={seedChecklist}
              disabled={seedingChecklist}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="load-closing-checklist-btn"
            >
              {seedingChecklist ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Load standard checklist
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 ">{completedCount} / {totalCount} items complete</span>
              <span className="text-xs font-semibold text-green-600 ">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#10B981" }} />
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500 ">Load the standard closing checklist to get started.</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-4">
            {categories.map((cat) => {
              const catItems = items.filter((i: any) => i.category === cat);
              return (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[#71717A] mb-2">{cat}</div>
                  <div className="space-y-2">
                    {catItems.map((item: any) => {
                      const isExpanded = expandedItemId === item.id;
                      const currentStatus = itemStatuses[item.id] ?? item.status;
                      return (
                        <div key={item.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <button onClick={() => cycleItemStatus(item)} className="mt-0.5 focus:outline-none" title="Click to cycle status">
                              <ItemStatusCircle status={currentStatus} />
                            </button>
                            <button onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="flex-1 text-left">
                              <span className={cn("text-sm", currentStatus === "complete" ? "line-through text-[#71717A] " : "text-gray-900 ")}>
                                {item.item_text}
                              </span>
                            </button>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", CLOSING_OWNER_COLORS[item.owner] ?? "bg-gray-100 text-gray-600  ")}>
                              {item.owner}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pl-8 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => changeItemStatus(item.id, e.target.value)}
                                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
                                >
                                  {["pending", "in_progress", "complete", "blocked"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                                </select>
                              </div>
                              <textarea
                                value={itemNotes[item.id] ?? ""}
                                onChange={(e) => setItemNotes((p) => ({ ...p, [item.id]: e.target.value }))}
                                onBlur={(e) => saveItemNote(item.id, e.target.value)}
                                rows={2}
                                placeholder="Notes..."
                                className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-[#71717A] outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 ">Due date</label>
                                <input
                                  type="date"
                                  value={itemDueDates[item.id] ?? ""}
                                  onChange={(e) => setItemDueDates((p) => ({ ...p, [item.id]: e.target.value }))}
                                  onBlur={(e) => saveItemDueDate(item.id, e.target.value)}
                                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
                                />
                              </div>
                              {currentStatus !== "complete" && (
                                <button
                                  onClick={() => markItemComplete(item.id)}
                                  className="rounded-lg px-4 py-2 text-sm font-medium text-foreground"
                                  style={{ background: "#10B981" }}
                                >
                                  Mark complete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-5 py-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4" style={{ fontFamily: "Syne, sans-serif" }}>Deal Summary</h3>
        {!acceptedTS ? (
          <p className="text-sm text-gray-500">No accepted term sheet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              ["Investment", (acceptedTS as any).terms?.investment_amount],
              ["Valuation", (acceptedTS as any).terms?.valuation],
              ["Equity", (acceptedTS as any).terms?.equity_percentage],
              ["Instrument", (acceptedTS as any).terms?.investment_type],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 px-3 py-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#71717A] mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-900 ">{value || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isInvestor && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-5 py-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Close this deal</h3>

          {!closeDealOpen ? (
            <div className="space-y-3">
              {!allComplete && !overrideClose && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-sm text-amber-700 ">{totalCount - completedCount} closing items still pending. Complete all items before closing.</p>
                </div>
              )}
              <button
                onClick={() => setCloseDealOpen(true)}
                disabled={!allComplete && !overrideClose && items.length > 0}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
                style={{ background: "#10B981" }}
              >
                <CheckCircle2 className="h-4 w-4" /> Close this deal
              </button>
              {!allComplete && items.length > 0 && (
                <div>
                  <button
                    onClick={() => setOverrideClose(true)}
                    className="text-sm text-[#71717A] hover:text-red-500 "
                  >
                    Close deal anyway →
                  </button>
                  {overrideClose && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                      <p className="text-sm text-red-700 ">{totalCount - completedCount} items still pending. Proceed anyway?</p>
                      <button
                        onClick={() => setCloseDealOpen(true)}
                        className="mt-2 rounded-lg px-4 py-1.5 text-sm font-medium text-foreground"
                        style={{ background: "#EF4444" }}
                      >
                        Yes, close anyway
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 ">This will mark the deal as closed and notify both parties.</p>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                rows={3}
                placeholder="Final notes (optional)..."
                className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setCloseDealOpen(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-gray-500">Cancel</button>
                <button
                  onClick={closeDeal}
                  disabled={closingDeal}
                  className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                  style={{ background: "#10B981" }}
                  data-testid="confirm-close-deal-btn"
                >
                  {closingDeal ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm and close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        {!exitOpen ? (
          <button
            onClick={() => setExitOpen(true)}
            className="text-sm text-[#71717A] hover:text-red-500 "
            data-testid="exit-deal-btn"
          >
            Exit deal →
          </button>
        ) : (
          <div className="bg-white border border-red-200 rounded-none px-5 py-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 ">Exit this deal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Outcome</label>
                <select
                  value={exitOutcome}
                  onChange={(e) => setExitOutcome(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
                >
                  <option>Pass</option>
                  <option>Withdraw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason category</label>
                <select
                  value={exitReasonCat}
                  onChange={(e) => setExitReasonCat(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
                >
                  {EXIT_REASON_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <textarea
              value={exitReasonDetail}
              onChange={(e) => setExitReasonDetail(e.target.value)}
              rows={2}
              placeholder="Reason detail..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setExitOpen(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-gray-500">Cancel</button>
              <button
                onClick={exitDeal}
                disabled={exiting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                style={{ background: "#EF4444" }}
              >
                {exiting ? "Submitting…" : "Submit and close room"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
