import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Flag, Clock, Eye, FileText, StickyNote, Save,
  Loader2, ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { getDDData, updateDDStatus, updateDDNotes, toggleChecklistItem } from "@/lib/dd-fn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/investor/diligence")({
  component: DiligencePage,
});

const CATEGORIES = ["Financials", "Team", "Legal", "Market", "Product", "References"] as const;
type DDCategory = (typeof CATEGORIES)[number];
const STATUSES = ["Pending", "In Review", "Complete", "Red Flag"] as const;
type DDStatus = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<DDStatus, { label: string; icon: any; cls: string; dot: string }> = {
  Pending:     { label: "Pending",    icon: Clock,        cls: "bg-muted text-muted-foreground",     dot: "bg-muted-foreground" },
  "In Review": { label: "In Review", icon: Eye,          cls: "bg-brand/10 text-brand",             dot: "bg-brand" },
  Complete:    { label: "Complete",  icon: CheckCircle2, cls: "bg-success/10 text-success",         dot: "bg-success" },
  "Red Flag":  { label: "Red Flag",  icon: Flag,         cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

const CAT_ICON: Record<DDCategory, string> = {
  Financials: "💰", Team: "👥", Legal: "⚖️", Market: "📊", Product: "🚀", References: "🤝",
};

function DiligencePage() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const token = session?.access_token ?? "";
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const supabaseKey = (import.meta.env as any).VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || "";

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [expandedCat, setExpandedCat] = useState<DDCategory | null>("Financials");
  const [editingNotes, setEditingNotes] = useState<DDCategory | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["investor-dd-rooms", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, startups(company_name))")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? r.deal_room_id,
      }));
    },
  });

  const { data: ddData, isLoading: ddLoading } = useQuery({
    queryKey: ["dd-data", selectedRoomId, userId],
    enabled: !!selectedRoomId && !!token && !!userId,
    queryFn: () =>
      getDDData({ data: { dealRoomId: selectedRoomId, userId, userAccessToken: token, supabaseUrl, supabaseKey } }),
  });

  const categories = ddData?.categories ?? [];
  const checklistItems = ddData?.items ?? [];

  const getCatData = (cat: DDCategory) =>
    categories.find((c: any) => c.category === cat) ?? { status: "Pending", investor_notes: "" };
  const getCatItems = (cat: DDCategory) =>
    checklistItems.filter((i: any) => i.category === cat);
  const getProgress = (cat: DDCategory) => {
    const items = getCatItems(cat);
    if (!items.length) return 0;
    return Math.round((items.filter((i: any) => i.checked).length / items.length) * 100);
  };
  const overallProgress = () => {
    if (!checklistItems.length) return 0;
    return Math.round((checklistItems.filter((i: any) => i.checked).length / checklistItems.length) * 100);
  };

  const statusMut = useMutation({
    mutationFn: (vars: { category: string; status: string }) =>
      updateDDStatus({ data: { dealRoomId: selectedRoomId, userId, userAccessToken: token, supabaseUrl, supabaseKey, ...vars } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dd-data", selectedRoomId, userId] }),
    onError: () => toast.error("Failed to update status"),
  });

  const notesMut = useMutation({
    mutationFn: (vars: { category: string; notes: string }) =>
      updateDDNotes({ data: { dealRoomId: selectedRoomId, userId, userAccessToken: token, supabaseUrl, supabaseKey, ...vars } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dd-data", selectedRoomId, userId] });
      setEditingNotes(null);
      toast.success("Notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const checkMut = useMutation({
    mutationFn: (vars: { itemId: string; checked: boolean }) =>
      toggleChecklistItem({ data: { dealRoomId: selectedRoomId, userId, userAccessToken: token, supabaseUrl, supabaseKey, ...vars } }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["dd-data", selectedRoomId, userId] });
      const prev = qc.getQueryData(["dd-data", selectedRoomId, userId]);
      qc.setQueryData(["dd-data", selectedRoomId, userId], (old: any) => ({
        ...old,
        items: old?.items?.map((i: any) =>
          i.id === vars.itemId ? { ...i, checked: vars.checked } : i,
        ),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["dd-data", selectedRoomId, userId], ctx?.prev);
      toast.error("Failed to update item");
    },
  });

  const handleSaveNotes = useCallback(
    (cat: DDCategory) => notesMut.mutate({ category: cat, notes: noteDraft }),
    [noteDraft, notesMut],
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Due Diligence</h1>
          <p className="text-sm text-muted-foreground mt-0.5">6-category tracker — checklists, notes, and status per category</p>
        </div>
        {selectedRoomId && (
          <Link to="/app/deal-room/$id" params={{ id: selectedRoomId }} className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline">
            Open deal room <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="mt-5">
        <select
          value={selectedRoomId}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 min-w-[220px]"
        >
          <option value="">Select a company…</option>
          {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {!selectedRoomId ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border/60 bg-card p-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground mb-4">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">Select a company to begin</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your active deal flow companies appear in the dropdown above.</p>
        </div>
      ) : ddLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading due diligence data…
        </div>
      ) : (
        <>
          {/* Overall progress */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Overall progress</span>
              <span className="text-sm tabular-nums text-muted-foreground font-medium">
                {checklistItems.filter((i: any) => i.checked).length}/{checklistItems.length} items · {overallProgress()}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-brand transition-all duration-500" style={{ width: `${overallProgress()}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const catData = getCatData(cat);
                const cfg = STATUS_CONFIG[catData.status as DDStatus] ?? STATUS_CONFIG.Pending;
                return (
                  <div key={cat} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    {CAT_ICON[cat]} {cat}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category accordion */}
          <div className="mt-4 space-y-3">
            {CATEGORIES.map((cat) => {
              const catData = getCatData(cat);
              const items = getCatItems(cat);
              const progress = getProgress(cat);
              const isExpanded = expandedCat === cat;
              const status = (catData.status as DDStatus) ?? "Pending";
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              const isEditingNote = editingNotes === cat;

              return (
                <div key={cat} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : cat)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/40 transition-colors text-left"
                  >
                    <span className="text-xl">{CAT_ICON[cat]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{cat}</span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {items.filter((i: any) => i.checked).length}/{items.length}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/60">
                      <div className="grid lg:grid-cols-[1fr_280px] divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                        {/* Checklist */}
                        <div className="p-5 space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Checklist</div>
                          {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No items yet.</p>
                          ) : items.map((item: any) => (
                            <button
                              key={item.id}
                              onClick={() => checkMut.mutate({ itemId: item.id, checked: !item.checked })}
                              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-left group"
                            >
                              {item.checked
                                ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                : <Circle className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />}
                              <span className={cn("text-sm flex-1", item.checked ? "line-through text-muted-foreground" : "")}>
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>

                        {/* Status + Notes */}
                        <div className="p-5 space-y-5">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {STATUSES.map((s) => {
                                const scfg = STATUS_CONFIG[s];
                                const SIcon = scfg.icon;
                                return (
                                  <button
                                    key={s}
                                    onClick={() => statusMut.mutate({ category: cat, status: s })}
                                    disabled={statusMut.isPending}
                                    className={cn(
                                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                                      status === s ? cn(scfg.cls, "border-current") : "border-border/60 text-muted-foreground hover:bg-accent",
                                    )}
                                  >
                                    <SIcon className="h-3.5 w-3.5 shrink-0" />{s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Investor Notes</div>
                              {!isEditingNote && (
                                <button
                                  onClick={() => { setEditingNotes(cat); setNoteDraft(catData.investor_notes ?? ""); }}
                                  className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline"
                                >
                                  <StickyNote className="h-3 w-3" />{catData.investor_notes ? "Edit" : "Add note"}
                                </button>
                              )}
                            </div>
                            {isEditingNote ? (
                              <div className="space-y-2">
                                <textarea
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  rows={4}
                                  placeholder="Add your internal notes…"
                                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand/50"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => setEditingNotes(null)} className="flex-1 rounded-md border border-border/60 py-1.5 text-xs hover:bg-accent">Cancel</button>
                                  <button
                                    onClick={() => handleSaveNotes(cat)}
                                    disabled={notesMut.isPending}
                                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-gradient-brand text-brand-foreground py-1.5 text-xs shadow-glow"
                                  >
                                    {notesMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : catData.investor_notes ? (
                              <div className="rounded-lg bg-muted/40 border border-border/40 px-3 py-2.5 text-sm text-muted-foreground whitespace-pre-wrap">
                                {catData.investor_notes}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
                                <FileText className="h-4 w-4 text-muted-foreground/40 mx-auto mb-1" />
                                <p className="text-xs text-muted-foreground/60">No notes yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
