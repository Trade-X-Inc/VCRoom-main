import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import {
  LayoutGrid, List, Columns3, Search,
  AlertTriangle, Clock, X,
  CheckCircle2, ExternalLink, ArrowRight, Gavel,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/investor/decisions")({
  // P5: consolidated into the deal-flow steps — old links keep resolving.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/decide", hash: "decisions", replace: true });
  },
  component: DecisionsPage,
});

// ── Constants ──────────────────────────────────────────────────────────────────

const STAGES = [
  "Sourcing", "Reviewing", "Meeting", "Diligence",
  "Term Sheet", "Decision", "Invested",
] as const;
type ActiveStage = typeof STAGES[number];
type Stage = ActiveStage | "Passed";

const STAGE_ORDER: Record<string, number> = {
  Sourcing: 0, Reviewing: 1, Meeting: 2, Diligence: 3,
  "Term Sheet": 4, Decision: 5, Invested: 6, Passed: 7,
};

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Sourcing:    { bg: "rgba(107,114,128,0.12)", text: "#6B7280", border: "rgba(107,114,128,0.25)" },
  Reviewing:   { bg: "rgba(59,130,246,0.12)",  text: "#3B82F6",              border: "rgba(59,130,246,0.25)" },
  Meeting:     { bg: "rgba(168,85,247,0.12)",  text: "#A855F7",              border: "rgba(168,85,247,0.25)" },
  Diligence:   { bg: "rgba(245,158,11,0.12)",  text: "#F59E0B",              border: "rgba(245,158,11,0.25)" },
  "Term Sheet":{ bg: "rgba(251,146,60,0.12)",  text: "#FB923C",              border: "rgba(251,146,60,0.25)" },
  Decision:    { bg: "rgba(239,68,68,0.12)",   text: "#EF4444",              border: "rgba(239,68,68,0.25)" },
  Invested:    { bg: "rgba(16,185,129,0.12)",  text: "#10B981",              border: "rgba(16,185,129,0.25)" },
  Passed:      { bg: "rgba(107,114,128,0.08)", text: "#9CA3AF", border: "rgba(107,114,128,0.15)" },
};

const PASS_CATEGORIES = [
  "Valuation", "Traction", "Team", "Market", "Thesis fit", "Timing",
] as const;

const STALE_DAYS = 14;

// ── Types ──────────────────────────────────────────────────────────────────────

interface WatchlistEntry {
  id: string;
  company_name: string;
  status: string;
  stage: string | null;
  sector: string | null;
  initial_score: number | null;
  notes: string | null;
  stage_entered_at: string | null;
  stale_flagged: boolean;
  updated_at: string;
  created_at: string;
  pass_reason_category: string | null;
  pass_reason_detail: string | null;
  deal_room_id?: string | null;
  startup_id?: string | null;
}

type ViewMode = "kanban" | "list" | "grid";

interface DecisionModal {
  type: "invest" | "hold" | "pass";
  entry: WatchlistEntry;
  investAmount?: string;
  investNotes?: string;
  holdDate?: string;
  holdNotes?: string;
  passCategory?: string;
  passDetail?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysInStage(entry: WatchlistEntry): number {
  const ref = entry.stage_entered_at ?? entry.updated_at ?? entry.created_at;
  const ms = Date.now() - new Date(ref).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isStale(entry: WatchlistEntry): boolean {
  if (entry.status === "Invested" || entry.status === "Passed") return false;
  return daysInStage(entry) >= STALE_DAYS;
}

function nextStage(current: string): ActiveStage | null {
  const idx = STAGES.indexOf(current as ActiveStage);
  if (idx === -1 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

function StageBadge({ status }: { status: string }) {
  const c = STAGE_COLORS[status] ?? STAGE_COLORS.Sourcing;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      letterSpacing: "0.05em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
    }}>
      {status}
    </span>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 7 ? "#10B981" : score >= 4 ? "#F59E0B" : "#EF4444";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {score}/10
    </span>
  );
}

function actionBtn(color: string): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none",
    cursor: "pointer", background: `${color}18`, color, outline: `1px solid ${color}30`,
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function DecisionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);
  const [staleOnly, setStaleOnly] = useState(false);
  const [showPassed, setShowPassed] = useState(false);
  const [modal, setModal] = useState<DecisionModal | null>(null);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ entry: WatchlistEntry; next: ActiveStage } | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: rawEntries = [], isLoading, isError } = useQuery({
    queryKey: ["investor-pipeline", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_watchlist")
        .select("id, company_name, status, stage, sector, initial_score, notes, stage_entered_at, stale_flagged, updated_at, created_at, pass_reason_category, pass_reason_detail")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Resolve deal_room links by matching investor's deal room members → startups
      const { data: drData } = await supabase
        .from("deal_room_members")
        .select("deal_rooms(id, startup_id, startups(company_name))")
        .eq("user_id", user!.id);

      const dealRoomMap: Record<string, { deal_room_id: string; startup_id: string }> = {};
      (drData ?? []).forEach((m: any) => {
        const dr = m.deal_rooms;
        if (!dr) return;
        const name = (dr.startups?.company_name ?? "").toLowerCase().trim();
        if (name) dealRoomMap[name] = { deal_room_id: dr.id, startup_id: dr.startup_id };
      });

      return (data ?? []).map((e: any) => {
        const match = dealRoomMap[(e.company_name ?? "").toLowerCase().trim()];
        return { ...e, deal_room_id: match?.deal_room_id ?? null, startup_id: match?.startup_id ?? null } as WatchlistEntry;
      });
    },
  });

  // Distinct sector values for filter
  const sectors = useMemo(
    () => [...new Set(rawEntries.map((e) => e.sector).filter(Boolean))] as string[],
    [rawEntries],
  );

  // Client-side filtering
  const entries = useMemo(() => {
    let list = [...rawEntries];
    if (!showPassed) list = list.filter((e) => e.status !== "Passed");
    if (stageFilter.length > 0) list = list.filter((e) => stageFilter.includes(e.status));
    if (sectorFilter.length > 0) list = list.filter((e) => sectorFilter.includes(e.sector ?? ""));
    if (staleOnly) list = list.filter(isStale);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.company_name?.toLowerCase().includes(q));
    }
    return list;
  }, [rawEntries, search, stageFilter, sectorFilter, staleOnly, showPassed]);

  // ── Stage advance ──────────────────────────────────────────────────────────

  const advanceStage = useCallback(async (entry: WatchlistEntry, next: ActiveStage) => {
    if (advancing) return;
    setAdvancing(entry.id);
    setConfirmPending(null);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("investor_watchlist")
      .update({ status: next, stage_entered_at: now, updated_at: now })
      .eq("id", entry.id);

    if (error) { toast.error("Could not update stage."); setAdvancing(null); return; }

    // Background activity log — log failures, never block the user
    const { error: stageLogErr } = await supabase.from("activity_log").insert({
      account_type: "investor", account_id: user!.id, actor_user_id: user!.id,
      actor_name: user!.user_metadata?.full_name ?? user!.email ?? "Investor",
      action_type: "pipeline_status_changed", target_type: "watchlist",
      target_id: entry.id, target_label: entry.company_name,
      detail: `${entry.status} → ${next}`, metadata: { from: entry.status, to: next },
    });
    if (stageLogErr) console.error("[decisions] activity log failed:", stageLogErr);

    qc.invalidateQueries({ queryKey: ["investor-pipeline", user?.id] });
    toast.success(`${entry.company_name} moved to ${next}`);
    setAdvancing(null);
  }, [advancing, user, qc]);

  // ── Decision commit ────────────────────────────────────────────────────────

  const commitDecision = async () => {
    if (!modal) return;
    const { type, entry } = modal;
    const now = new Date().toISOString();

    if (type === "invest") {
      const { error: wlErr } = await supabase.from("investor_watchlist").update({ status: "Invested", stage_entered_at: now, updated_at: now }).eq("id", entry.id);
      if (wlErr) { console.error("[decisions] invest update failed:", wlErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: decErr } = await supabase.from("decisions").insert({ deal_room_id: entry.deal_room_id ?? null, decided_by: user!.id, status: "invested", decision_type: "invest", notes: modal.investNotes ?? null });
      if (decErr) { console.error("[decisions] invest insert failed:", decErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: logErr } = await supabase.from("activity_log").insert({ account_type: "investor", account_id: user!.id, actor_user_id: user!.id, actor_name: user!.user_metadata?.full_name ?? user!.email ?? "Investor", action_type: "pipeline_status_changed", target_type: "watchlist", target_id: entry.id, target_label: entry.company_name, detail: "Decision: Invest", metadata: { type: "invest", amount: modal.investAmount } });
      if (logErr) console.error("[decisions] activity log failed:", logErr);
      toast.success(`${entry.company_name} — investment recorded`);
    }

    if (type === "hold") {
      const { error: wlErr } = await supabase.from("investor_watchlist").update({ updated_at: now }).eq("id", entry.id);
      if (wlErr) { console.error("[decisions] hold update failed:", wlErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: decErr } = await supabase.from("decisions").insert({ deal_room_id: entry.deal_room_id ?? null, decided_by: user!.id, status: "hold", decision_type: "hold", follow_up_date: modal.holdDate ?? null, notes: modal.holdNotes ?? null });
      if (decErr) { console.error("[decisions] hold insert failed:", decErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: logErr } = await supabase.from("activity_log").insert({ account_type: "investor", account_id: user!.id, actor_user_id: user!.id, actor_name: user!.user_metadata?.full_name ?? user!.email ?? "Investor", action_type: "pipeline_status_changed", target_type: "watchlist", target_id: entry.id, target_label: entry.company_name, detail: "Decision: Hold", metadata: { type: "hold", follow_up: modal.holdDate } });
      if (logErr) console.error("[decisions] activity log failed:", logErr);
      toast.success(`${entry.company_name} — held, follow-up set`);
    }

    if (type === "pass") {
      const { error: wlErr } = await supabase.from("investor_watchlist").update({ status: "Passed", stage_entered_at: now, updated_at: now, pass_reason_category: modal.passCategory ?? null, pass_reason_detail: modal.passDetail ?? null }).eq("id", entry.id);
      if (wlErr) { console.error("[decisions] pass update failed:", wlErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: decErr } = await supabase.from("decisions").insert({ deal_room_id: entry.deal_room_id ?? null, decided_by: user!.id, status: "passed", decision_type: "pass", pass_reason_category: modal.passCategory ?? null, pass_reason_detail: modal.passDetail ?? null });
      if (decErr) { console.error("[decisions] pass insert failed:", decErr); toast.error("Could not record decision. Please try again."); return; }
      const { error: logErr } = await supabase.from("activity_log").insert({ account_type: "investor", account_id: user!.id, actor_user_id: user!.id, actor_name: user!.user_metadata?.full_name ?? user!.email ?? "Investor", action_type: "pipeline_status_changed", target_type: "watchlist", target_id: entry.id, target_label: entry.company_name, detail: `Decision: Pass — ${modal.passCategory ?? "no reason"}`, metadata: { type: "pass", category: modal.passCategory } });
      if (logErr) console.error("[decisions] activity log failed:", logErr);
      toast.success(`${entry.company_name} — passed`);
      // Auto-trigger founder coaching for rejection (fire and forget)
      if (entry.startup_id) {
        const startupId = entry.startup_id;
        const rejectionReason = [modal.passCategory, modal.passDetail].filter(Boolean).join(" — ") || "No specific reason provided";
        supabase.from("startups").select("founder_id").eq("id", startupId).maybeSingle().then(({ data: startupRow }) => {
          if (!startupRow?.founder_id) return;
          supabase.auth.getSession().then(({ data: authData }) => {
            const jwt = authData?.session?.access_token ?? "";
            import("@/lib/coaching-fn").then(({ runFounderCoaching }) => {
              runFounderCoaching({
                startupId,
                userId: startupRow.founder_id,
                triggerType: "rejection",
                triggerData: { rejection_reason: rejectionReason },
                jwt,
              }).catch(() => {});
            });
          });
        });
      }
    }

    qc.invalidateQueries({ queryKey: ["investor-pipeline", user?.id] });
    setModal(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (isError) {
    return <div style={{ padding: 24, color: "#EF4444", fontSize: 14 }}>Could not load pipeline. Try refreshing.</div>;
  }

  const activeCount = rawEntries.filter((e) => e.status !== "Passed").length;
  const staleCount = rawEntries.filter(isStale).length;

  return (
    <div style={{ paddingBottom: 40, paddingLeft: 24, paddingRight: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Decision Board</h1>
          <p style={{ color: "var(--color-muted-foreground)", fontSize: 13, marginTop: 4 }}>
            {activeCount} active
            {staleCount > 0 && <> · <span style={{ color: "#F59E0B" }}>{staleCount} stale</span></>}
          </p>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, background: "var(--hs-bg-secondary)", padding: 3, borderRadius: 8, border: "1px solid var(--hs-border)" }}>
          {([["kanban", Columns3, "Kanban"], ["list", List, "List"], ["grid", LayoutGrid, "Grid"]] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              data-testid={`view-${mode}`}
              onClick={() => setView(mode)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: view === mode ? "rgba(124,58,237,0.8)" : "transparent",
                color: "var(--hs-text-primary)",
              }}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        search={search} onSearch={setSearch}
        stageFilter={stageFilter} onStageFilter={setStageFilter}
        sectors={sectors} sectorFilter={sectorFilter} onSectorFilter={setSectorFilter}
        staleOnly={staleOnly} onStaleOnly={setStaleOnly}
        showPassed={showPassed} onShowPassed={setShowPassed}
      />

      {/* Empty state */}
      {entries.length === 0 && (
        <EmptyState
          kind={rawEntries.length === 0 ? "empty" : "no-results"}
          title={rawEntries.length === 0 ? "No companies" : "No matches"}
          action={
            rawEntries.length === 0
              ? { label: "Watchlist", href: "/app/investor/source#watchlist" }
              : undefined
          }
        />
      )}

      {/* Views */}
      {entries.length > 0 && view === "kanban" && (
        <KanbanView entries={entries} advancing={advancing}
          onAdvance={(e) => {
            const next = nextStage(e.status);
            if (!next) return;
            if (e.status === "Decision") { setModal({ type: "invest", entry: e }); return; }
            setConfirmPending({ entry: e, next });
          }}
          onDecision={(e, type) => setModal({ type, entry: e })} />
      )}
      {entries.length > 0 && view === "list" && (
        <ListView entries={entries} advancing={advancing}
          onAdvance={(e) => {
            const next = nextStage(e.status);
            if (!next) return;
            if (e.status === "Decision") { setModal({ type: "invest", entry: e }); return; }
            setConfirmPending({ entry: e, next });
          }}
          onDecision={(e, type) => setModal({ type, entry: e })} />
      )}
      {entries.length > 0 && view === "grid" && (
        <GridView entries={entries} advancing={advancing}
          onAdvance={(e) => {
            const next = nextStage(e.status);
            if (!next) return;
            if (e.status === "Decision") { setModal({ type: "invest", entry: e }); return; }
            setConfirmPending({ entry: e, next });
          }}
          onDecision={(e, type) => setModal({ type, entry: e })} />
      )}

      {/* Confirm advance */}
      {confirmPending && (
        <ConfirmModal
          title={`Move to ${confirmPending.next}?`}
          body={`This will advance ${confirmPending.entry.company_name} from ${confirmPending.entry.status} to ${confirmPending.next} and reset the stale timer.`}
          confirmLabel={`Move to ${confirmPending.next}`}
          onConfirm={() => advanceStage(confirmPending.entry, confirmPending.next)}
          onCancel={() => setConfirmPending(null)}
        />
      )}

      {/* Decision modals */}
      {modal?.type === "invest" && <InvestModal entry={modal.entry} amount={modal.investAmount ?? ""} notes={modal.investNotes ?? ""} onChange={(f, v) => setModal((m) => m ? { ...m, [f]: v } : m)} onConfirm={commitDecision} onCancel={() => setModal(null)} />}
      {modal?.type === "hold" && <HoldModal entry={modal.entry} date={modal.holdDate ?? ""} notes={modal.holdNotes ?? ""} onChange={(f, v) => setModal((m) => m ? { ...m, [f]: v } : m)} onConfirm={commitDecision} onCancel={() => setModal(null)} />}
      {modal?.type === "pass" && <PassModal entry={modal.entry} category={modal.passCategory ?? ""} detail={modal.passDetail ?? ""} onChange={(f, v) => setModal((m) => m ? { ...m, [f]: v } : m)} onConfirm={commitDecision} onCancel={() => setModal(null)} />}
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({ search, onSearch, stageFilter, onStageFilter, sectors, sectorFilter, onSectorFilter, staleOnly, onStaleOnly, showPassed, onShowPassed }: {
  search: string; onSearch: (v: string) => void;
  stageFilter: string[]; onStageFilter: (v: string[]) => void;
  sectors: string[]; sectorFilter: string[]; onSectorFilter: (v: string[]) => void;
  staleOnly: boolean; onStaleOnly: (v: boolean) => void;
  showPassed: boolean; onShowPassed: (v: boolean) => void;
}) {
  const toggleStage = (s: string) => onStageFilter(stageFilter.includes(s) ? stageFilter.filter((x) => x !== s) : [...stageFilter, s]);
  const toggleSector = (s: string) => onSectorFilter(sectorFilter.includes(s) ? sectorFilter.filter((x) => x !== s) : [...sectorFilter, s]);
  const hasFilters = search || stageFilter.length > 0 || sectorFilter.length > 0 || staleOnly;

  return (
    <div style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {/* Search */}
      <div style={{ position: "relative", flex: "0 1 200px" }}>
        <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-foreground)" }} />
        <input
          data-testid="pipeline-search"
          value={search} onChange={(e) => onSearch(e.target.value)}
          placeholder="Search…"
          style={{ width: "100%", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px 7px 28px", color: "var(--color-foreground)", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
        />
      </div>

      {/* Stage pills */}
      {([...STAGES, "Passed"] as string[]).map((s) => {
        const active = s === "Passed" ? showPassed : stageFilter.includes(s);
        const c = STAGE_COLORS[s] ?? STAGE_COLORS.Sourcing;
        return (
          <button key={s} data-testid={`filter-stage-${s.toLowerCase().replace(" ", "-")}`}
            onClick={() => s === "Passed" ? onShowPassed(!showPassed) : toggleStage(s)}
            style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", letterSpacing: "0.04em", background: active ? c.bg : "var(--color-muted)", color: active ? c.text : "var(--color-muted-foreground)", outline: active ? `1px solid ${c.border}` : "1px solid transparent" }}
          >
            {s}
          </button>
        );
      })}

      {/* Sector pills */}
      {sectors.map((s) => {
        const active = sectorFilter.includes(s);
        return (
          <button key={s} onClick={() => toggleSector(s)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: active ? "rgba(124,58,237,0.2)" : "var(--color-muted)", color: active ? "#A855F7" : "var(--color-muted-foreground)", outline: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent" }}>
            {s}
          </button>
        );
      })}

      {/* Stale toggle */}
      <button data-testid="filter-stale" onClick={() => onStaleOnly(!staleOnly)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: staleOnly ? "rgba(245,158,11,0.15)" : "var(--color-muted)", color: staleOnly ? "#F59E0B" : "var(--color-muted-foreground)", outline: staleOnly ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent" }}>
        <AlertTriangle size={10} />Stale only
      </button>

      {hasFilters && (
        <button onClick={() => { onSearch(""); onStageFilter([]); onSectorFilter([]); onStaleOnly(false); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
          <X size={10} style={{ display: "inline", marginRight: 2 }} />Clear
        </button>
      )}
    </div>
  );
}

// ── Company Card ───────────────────────────────────────────────────────────────

function CompanyCard({ entry, compact = false, onAdvance, onDecision, advancing }: {
  entry: WatchlistEntry; compact?: boolean;
  onAdvance: (e: WatchlistEntry) => void;
  onDecision: (e: WatchlistEntry, type: "invest" | "hold" | "pass") => void;
  advancing: string | null;
}) {
  const days = daysInStage(entry);
  const stale = isStale(entry);
  const next = nextStage(entry.status);
  const isDecisionStage = entry.status === "Decision";
  const isPassed = entry.status === "Passed";
  const isAdvancing = advancing === entry.id;

  return (
    <div
      data-testid={`company-card-${entry.id}`}
      className="bg-card rounded-none flex flex-col gap-2.5"
      style={{
        border: `1px solid ${stale ? "rgba(245,158,11,0.4)" : "var(--hs-border)"}`,
        borderLeft: stale ? "3px solid #F59E0B" : undefined,
        padding: compact ? "12px 14px" : "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#A855F7" }}>
          {(entry.company_name ?? "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-semibold text-sm text-foreground truncate">
            {entry.company_name}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const, alignItems: "center" }}>
            <StageBadge status={entry.status} />
            {entry.sector && <span className="text-xs text-muted-foreground">{entry.sector}</span>}
            {entry.stage && <span className="text-xs text-muted-foreground/60">{entry.stage}</span>}
          </div>
        </div>
        <ScorePill score={entry.initial_score} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: stale ? "#F59E0B" : "var(--color-muted-foreground)" }}>
          {stale ? <AlertTriangle size={11} /> : <Clock size={11} />}
          {stale ? `Stale ${days}d` : `${days}d in stage`}
        </span>
        {entry.deal_room_id && (
          <a href={`/app/deal-room/${entry.deal_room_id}`} style={{ fontSize: 11, color: "var(--brand)", display: "flex", alignItems: "center", gap: 3 }}>
            <ExternalLink size={10} />Open DD
          </a>
        )}
        {isPassed && entry.pass_reason_category && (
          <span style={{ fontSize: 10, color: "var(--faint)" }}>Passed: {entry.pass_reason_category}</span>
        )}
      </div>

      {!isPassed && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {isDecisionStage ? (
            <>
              <button onClick={() => onDecision(entry, "invest")} style={actionBtn("#10B981")}>Invest</button>
              <button onClick={() => onDecision(entry, "hold")} style={actionBtn("#F59E0B")}>Hold</button>
              <button onClick={() => onDecision(entry, "pass")} style={actionBtn("#EF4444")}>Pass</button>
            </>
          ) : next ? (
            <button onClick={() => onAdvance(entry)} disabled={isAdvancing} style={{ ...actionBtn("var(--brand)"), opacity: isAdvancing ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4 }}>
              {isAdvancing ? "Moving…" : <>{`→ ${next}`}<ArrowRight size={10} /></>}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Kanban View ────────────────────────────────────────────────────────────────

function KanbanView({ entries, advancing, onAdvance, onDecision }: {
  entries: WatchlistEntry[]; advancing: string | null;
  onAdvance: (e: WatchlistEntry) => void;
  onDecision: (e: WatchlistEntry, type: "invest" | "hold" | "pass") => void;
}) {
  const visibleStages = ([...STAGES, "Passed"] as string[]).filter((s) => entries.some((e) => e.status === s));

  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {visibleStages.map((stage) => {
          const cols = entries.filter((e) => e.status === stage);
          const c = STAGE_COLORS[stage] ?? STAGE_COLORS.Sourcing;
          return (
            <div key={stage} data-testid={`kanban-col-${stage.toLowerCase().replace(" ", "-")}`} style={{ flex: "1 1 0", minWidth: 240, maxWidth: 340, background: "var(--color-muted)", borderRadius: 10, padding: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "5px 8px", borderRadius: 6, background: c.bg }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.text, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{stage}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.text, opacity: 0.7 }}>{cols.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {cols.map((e) => <CompanyCard key={e.id} entry={e} compact advancing={advancing} onAdvance={onAdvance} onDecision={onDecision} />)}
                {cols.length === 0 && <div style={{ textAlign: "center" as const, padding: "20px 8px", color: "var(--color-muted-foreground)", fontSize: 12 }}>Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List View ──────────────────────────────────────────────────────────────────

function ListView({ entries, advancing, onAdvance, onDecision }: {
  entries: WatchlistEntry[]; advancing: string | null;
  onAdvance: (e: WatchlistEntry) => void;
  onDecision: (e: WatchlistEntry, type: "invest" | "hold" | "pass") => void;
}) {
  const [sortCol, setSortCol] = useState<"company_name" | "status" | "days" | "initial_score">("status");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => [...entries].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortCol === "days") { av = daysInStage(a); bv = daysInStage(b); }
    else if (sortCol === "status") { av = STAGE_ORDER[a.status] ?? 99; bv = STAGE_ORDER[b.status] ?? 99; }
    else { av = (a as any)[sortCol] ?? ""; bv = (b as any)[sortCol] ?? ""; }
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  }), [entries, sortCol, sortDir]);

  const toggleSort = (col: typeof sortCol) => { if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortCol(col); setSortDir(1); } };

  const th = (col: typeof sortCol, label: string) => (
    <th onClick={() => toggleSort(col)} style={{ padding: "8px 12px", textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: sortCol === col ? "#A855F7" : "var(--color-muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.08em", cursor: "pointer", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--color-border)", background: "var(--color-card)" }}>
      {label}{sortCol === col ? (sortDir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
      <table data-testid="list-view-table" style={{ width: "100%", borderCollapse: "collapse" as const }}>
        <thead><tr>{th("company_name", "Company")}{th("status", "Stage")}{th("days", "Days")}{th("initial_score", "Score")}<th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.08em", borderBottom: "1px solid var(--color-border)", background: "var(--color-card)" }}>Sector</th><th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.08em", borderBottom: "1px solid var(--color-border)", background: "var(--color-card)" }}>Actions</th></tr></thead>
        <tbody>
          {sorted.map((e) => {
            const days = daysInStage(e);
            const stale = isStale(e);
            const next = nextStage(e.status);
            const isPassed = e.status === "Passed";
            const isDecisionStage = e.status === "Decision";
            const isAdv = advancing === e.id;
            return (
              <tr key={e.id} style={{ borderLeft: stale ? "3px solid #F59E0B" : "3px solid transparent", borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--color-foreground)" }}>{e.company_name}</div>
                  {e.deal_room_id && <a href={`/app/deal-room/${e.deal_room_id}`} style={{ fontSize: 10, color: "var(--brand)", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}><ExternalLink size={9} />Open DD</a>}
                </td>
                <td style={{ padding: "10px 12px" }}><StageBadge status={e.status} /></td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: stale ? "#F59E0B" : "var(--color-muted-foreground)", whiteSpace: "nowrap" as const }}>
                  {stale && <AlertTriangle size={10} style={{ display: "inline", marginRight: 3 }} />}{days}d
                </td>
                <td style={{ padding: "10px 12px" }}><ScorePill score={e.initial_score} /></td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-muted-foreground)" }}>{e.sector ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {!isPassed && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {isDecisionStage ? (
                        <><button onClick={() => onDecision(e, "invest")} style={actionBtn("#10B981")}>Invest</button><button onClick={() => onDecision(e, "hold")} style={actionBtn("#F59E0B")}>Hold</button><button onClick={() => onDecision(e, "pass")} style={actionBtn("#EF4444")}>Pass</button></>
                      ) : next ? (
                        <button onClick={() => onAdvance(e)} disabled={isAdv} style={{ ...actionBtn("var(--brand)"), opacity: isAdv ? 0.6 : 1 }}>{isAdv ? "…" : `→ ${next}`}</button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Grid View ──────────────────────────────────────────────────────────────────

function GridView({ entries, advancing, onAdvance, onDecision }: {
  entries: WatchlistEntry[]; advancing: string | null;
  onAdvance: (e: WatchlistEntry) => void;
  onDecision: (e: WatchlistEntry, type: "invest" | "hold" | "pass") => void;
}) {
  return (
    <div data-testid="grid-view" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {entries.map((e) => <CompanyCard key={e.id} entry={e} advancing={advancing} onAdvance={onAdvance} onDecision={onDecision} />)}
    </div>
  );
}

// ── Modal Primitives ───────────────────────────────────────────────────────────

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", background: "var(--color-input)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", color: "var(--color-foreground)", fontSize: 13, outline: "none", boxSizing: "border-box" };

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function ModalBtns({ onConfirm, onCancel, label, color = "var(--brand)", disabled = false }: { onConfirm: () => void; onCancel: () => void; label: string; color?: string; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
      <button onClick={onCancel} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-muted-foreground)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
      <button onClick={onConfirm} disabled={disabled} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: color, color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>{label}</button>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }: { title: string; body: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>{title}</h2>
      <p style={{ fontSize: 13, color: "var(--color-muted-foreground)", margin: "0 0 4px" }}>{body}</p>
      <ModalBtns onConfirm={onConfirm} onCancel={onCancel} label={confirmLabel} />
    </ModalOverlay>
  );
}

function InvestModal({ entry, amount, notes, onChange, onConfirm, onCancel }: { entry: WatchlistEntry; amount: string; notes: string; onChange: (f: string, v: string) => void; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Record investment — {entry.company_name}</h2>
      <p style={{ fontSize: 13, color: "var(--color-muted-foreground)", margin: "0 0 16px" }}>This will move the company to Invested and record the decision.</p>
      <FieldRow label="Investment amount (optional)"><input value={amount} onChange={(e) => onChange("investAmount", e.target.value)} placeholder="e.g. $250,000" style={inputStyle} /></FieldRow>
      <FieldRow label="Notes (optional)"><textarea value={notes} onChange={(e) => onChange("investNotes", e.target.value)} rows={3} placeholder="Board seat, pro-rata, terms…" style={{ ...inputStyle, resize: "vertical" as const }} /></FieldRow>
      <ModalBtns onConfirm={onConfirm} onCancel={onCancel} label="Record investment" color="#10B981" />
    </ModalOverlay>
  );
}

function HoldModal({ entry, date, notes, onChange, onConfirm, onCancel }: { entry: WatchlistEntry; date: string; notes: string; onChange: (f: string, v: string) => void; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Hold — {entry.company_name}</h2>
      <p style={{ fontSize: 13, color: "var(--color-muted-foreground)", margin: "0 0 16px" }}>Set a follow-up date. Company stays in Decision stage.</p>
      <FieldRow label="Follow-up date (required)"><input type="date" value={date} onChange={(e) => onChange("holdDate", e.target.value)} style={inputStyle} /></FieldRow>
      <FieldRow label="Notes (optional)"><textarea value={notes} onChange={(e) => onChange("holdNotes", e.target.value)} rows={2} placeholder="What needs to change before you invest?" style={{ ...inputStyle, resize: "vertical" as const }} /></FieldRow>
      <ModalBtns onConfirm={onConfirm} onCancel={onCancel} label="Confirm hold" color="#F59E0B" disabled={!date} />
    </ModalOverlay>
  );
}

function PassModal({ entry, category, detail, onChange, onConfirm, onCancel }: { entry: WatchlistEntry; category: string; detail: string; onChange: (f: string, v: string) => void; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ModalOverlay>
      <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px" }}>Pass — {entry.company_name}</h2>
      <p style={{ fontSize: 13, color: "var(--color-muted-foreground)", margin: "0 0 16px" }}>Select the primary reason. Not shared with the founder.</p>
      <FieldRow label="Primary reason">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {PASS_CATEGORIES.map((cat) => (
            <button key={cat} data-testid={`pass-cat-${cat.toLowerCase().replace(" ", "-")}`}
              onClick={() => onChange("passCategory", category === cat ? "" : cat)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, textAlign: "left" as const, display: "flex", alignItems: "center", gap: 6, background: category === cat ? "rgba(239,68,68,0.15)" : "var(--color-muted)", color: category === cat ? "#EF4444" : "var(--color-muted-foreground)", outline: category === cat ? "1px solid rgba(239,68,68,0.3)" : "1px solid var(--color-border)" }}
            >
              {category === cat && <CheckCircle2 size={11} />}{cat}
            </button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Detail (optional, 1–2 sentences)">
        <textarea value={detail} onChange={(e) => onChange("passDetail", e.target.value)} rows={2} placeholder="Brief context for your records…" style={{ ...inputStyle, resize: "vertical" as const }} maxLength={300} />
      </FieldRow>
      <ModalBtns onConfirm={onConfirm} onCancel={onCancel} label="Confirm pass" color="#EF4444" disabled={!category} />
    </ModalOverlay>
  );
}
