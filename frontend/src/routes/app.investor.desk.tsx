import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Loader2, X, MoreHorizontal,
  BellOff, Check, ExternalLink, TrendingUp, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  getDeskTasks, updateDeskTask, type DeskTask, type ChainPhase,
} from "@/lib/desk-fn";
import { ChatResultCard } from "@/components/app/ChatResultCard";
import { generateInvestorDealBrief, type InvestorDealBrief } from "@/lib/investor-deal-brief-fn";

export const Route = createFileRoute("/app/investor/desk")({
  beforeLoad: () => { throw redirect({ to: "/app/investor/overview" }); },
  component: InvestorDesk,
});

// ── Phase badge ────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: ChainPhase }) {
  if (phase === "autonomous_done") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.10)", color: "#10B981", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        <CheckCircle2 size={10} /> Already done
      </span>
    );
  }
  if (phase === "awaiting_checkpoint") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.12)", color: "#F59E0B", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        <AlertTriangle size={10} /> Needs your decision
      </span>
    );
  }
  return null;
}

function PriorityDot({ priority }: { priority: string }) {
  const color = priority === "high" ? "#EF4444" : priority === "normal" ? "#F59E0B" : "rgba(255,255,255,0.2)";
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", marginRight: 2 }} />;
}

// ── Inline deal brief card (expanded from thesis_match task) ──────────────────

function InlineDealBriefCard({ startupId, investorId }: { startupId: string; investorId: string }) {
  const [brief, setBrief] = useState<InvestorDealBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateInvestorDealBrief({ data: { investorId, startupId } })
      .then((b) => setBrief(b))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [investorId, startupId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", padding: "8px 0" }}>
      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading deal brief…
    </div>
  );
  if (error) return <div style={{ fontSize: 12, color: "#EF4444" }}>Could not load brief: {error}</div>;
  if (!brief) return null;

  const VERDICT_COLORS: Record<string, { bg: string; color: string }> = {
    strong:  { bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
    neutral: { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
    weak:    { bg: "rgba(239,68,68,0.12)",   color: "#EF4444" },
  };
  const vc = VERDICT_COLORS[brief.verdictSignal] ?? VERDICT_COLORS.neutral;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: "14px 16px", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: vc.color }}>{brief.matchScore}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>/100 deal quality score</span>
        <span style={{ background: vc.bg, color: vc.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, marginLeft: "auto" }}>
          {brief.verdictSignal.charAt(0).toUpperCase() + brief.verdictSignal.slice(1)} fit
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8, lineHeight: 1.4 }}>{brief.headline}</div>
      {brief.strengths.length > 0 && (
        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#10B981", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 14 }}>{brief.strengths.slice(0, 2).map((s, i) => <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{s}</li>)}</ul>
        </div>
      )}
      {brief.redFlags.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Watch points</div>
          <ul style={{ margin: 0, paddingLeft: 14 }}>{brief.redFlags.slice(0, 2).map((r, i) => <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ── Task card ──────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: DeskTask;
  userId: string;
  onRefresh: () => void;
}

function InvestorTaskCard({ task, userId, onRefresh }: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [acting, setActing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doAction = async (action: "dismiss" | "done" | "snooze") => {
    setActing(true);
    try {
      await updateDeskTask({ data: { taskId: task.id, userId, action } });
      toast.success(action === "dismiss" ? "Dismissed" : action === "snooze" ? "Snoozed 24h" : "Marked done");
      onRefresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(false);
      setMenuOpen(false);
    }
  };

  const addToWatchlist = async () => {
    if (!task.relatedEntityId || task.relatedEntityType !== "thesis_alert") return;
    setAddingToWatchlist(true);
    try {
      // Fetch company name from the autonomous_summary (first word before " —")
      const companyName = task.title.replace(/^Thesis match:\s*/i, "").replace(/\s*\(\d+%.*$/, "").trim();
      const { error } = await supabase.from("investor_watchlist").insert({
        investor_id: userId,
        company_name: companyName,
        source: "thesis_alert",
        status: "Reviewing",
      });
      if (error) throw error;
      toast.success(`${companyName} added to watchlist`);
      doAction("done");
    } catch {
      toast.error("Could not add to watchlist");
    } finally {
      setAddingToWatchlist(false);
    }
  };

  const isAutonomous = task.chainPhase === "autonomous_done";
  const isSingle = task.chainPhase === "single";
  const isThesisMatch = task.taskType === "review_thesis_match";
  const isWatchlistStale = task.taskType === "follow_up_watchlist";

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      {/* Header */}
      <div
        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
        onClick={() => setExpanded((v) => !v)}
      >
        <PriorityDot priority={task.priority} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {!isSingle && <PhaseBadge phase={task.chainPhase} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{task.title}</span>
          </div>
          {task.description && !expanded && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.4, marginTop: 2 }}>{task.description}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} style={{ width: 28, height: 28, borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)" }}>
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", top: 32, right: 0, background: "#18181C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "5px 4px", minWidth: 160, zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                <button onClick={() => doAction("done")} style={menuItemStyle}><Check size={12} /> Mark done</button>
                <button onClick={() => doAction("snooze")} style={menuItemStyle}><BellOff size={12} /> Snooze 24h</button>
                <button onClick={() => doAction("dismiss")} style={{ ...menuItemStyle, color: "rgba(239,68,68,0.8)" }}><X size={12} /> Dismiss</button>
              </div>
            )}
          </div>
          {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
          {task.autonomousSummary && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 14 }}>
              {task.autonomousSummary}
            </div>
          )}

          {/* Inline deal brief for thesis match tasks */}
          {isThesisMatch && task.relatedEntityId && showBrief && (
            <InlineDealBriefCard startupId={task.relatedEntityId} investorId={userId} />
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: isThesisMatch && task.relatedEntityId && showBrief ? 12 : 0 }}>
            {isThesisMatch && task.relatedEntityId && (
              <button
                onClick={() => setShowBrief((v) => !v)}
                style={{ background: "rgba(124,58,237,0.1)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                <BarChart3 size={12} /> {showBrief ? "Hide brief" : "View full brief"}
              </button>
            )}
            {isThesisMatch && (
              <button
                onClick={addToWatchlist}
                disabled={addingToWatchlist}
                style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: addingToWatchlist ? 0.6 : 1 }}
              >
                {addingToWatchlist ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <TrendingUp size={12} />}
                Add to watchlist
              </button>
            )}
            {task.actionUrl && !isThesisMatch && (
              <a href={task.actionUrl} style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 14px", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(255,255,255,0.08)" }}>
                {task.actionLabel ?? "View details"} <ExternalLink size={11} />
              </a>
            )}
            <button onClick={() => doAction("dismiss")} disabled={acting} style={{ background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  background: "none", border: "none", padding: "7px 12px", borderRadius: 7,
  color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
};

// ── Main ───────────────────────────────────────────────────────────────────────

function InvestorDesk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["desk-tasks", user?.id, "investor"],
    enabled: !!user?.id,
    queryFn: () => getDeskTasks({ data: { userId: user!.id, role: "investor" } }),
  });

  const { data: resolvedTasks = [] } = useQuery({
    queryKey: ["desk-tasks-resolved", user?.id, "investor"],
    enabled: !!user?.id,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("desk_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("role", "investor")
        .eq("status", "done")
        .gte("completed_at", sevenDaysAgo)
        .order("completed_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["desk-tasks", user?.id, "investor"] });
    queryClient.invalidateQueries({ queryKey: ["desk-tasks-resolved", user?.id, "investor"] });
  };

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const highPriority = tasks.filter((t) => t.priority === "high");
  const normalPriority = tasks.filter((t) => t.priority !== "high");

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, background: "#0A0A0B", overflow: "hidden" }}>
      {/* Main panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 680, marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Daily Desk</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif", marginBottom: 2 }}>{today}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {isLoading ? "Loading…" : tasks.length === 0 ? "All clear — no tasks right now." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} need${tasks.length === 1 ? "s" : ""} your attention`}
          </div>
        </div>

        {isLoading ? (
          <div style={{ maxWidth: 680 }}>
            {[1, 2].map((i) => <div key={i} style={{ background: "#111114", borderRadius: 12, height: 80, marginBottom: 12, opacity: 0.5 }} />)}
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ maxWidth: 480 }}>
            <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "40px 32px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle2 size={22} color="#10B981" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>All clear</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                No tasks right now. The AI advisor runs nightly and will surface new thesis matches and pipeline updates automatically.
              </div>
              {resolvedTasks.length > 0 && (
                <div style={{ fontSize: 12, color: "rgba(16,185,129,0.6)", marginTop: 12 }}>{resolvedTasks.length} task{resolvedTasks.length !== 1 ? "s" : ""} resolved this week</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 680 }}>
            {highPriority.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>High priority</div>
                {highPriority.map((t) => <InvestorTaskCard key={t.id} task={t} userId={user!.id} onRefresh={onRefresh} />)}
                {normalPriority.length > 0 && <div style={{ height: 8 }} />}
              </>
            )}
            {normalPriority.length > 0 && (
              <>
                {highPriority.length > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Other tasks</div>}
                {normalPriority.map((t) => <InvestorTaskCard key={t.id} task={t} userId={user!.id} onRefresh={onRefresh} />)}
              </>
            )}
          </div>
        )}

        {resolvedTasks.length > 0 && tasks.length > 0 && (
          <div style={{ maxWidth: 680, marginTop: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Recently resolved</div>
            {resolvedTasks.map((t: any) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6 }}>
                <CheckCircle2 size={13} color="rgba(16,185,129,0.5)" />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flex: 1 }}>{t.title}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  {t.completed_at ? new Date(t.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
