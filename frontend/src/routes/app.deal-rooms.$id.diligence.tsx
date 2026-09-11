import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  Check, AlertCircle, AlertTriangle, ClipboardList, Loader2, Sparkles,
  ChevronDown, ChevronUp, Plus, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DDAnalysisPanel } from "@/components/app/DDAnalysisPanel";
import { LcsEmptyState, LcsButton, LcsStatusPill, type LcsStatus } from "@/components/lcs";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/diligence")({
  component: DiligencePage,
});

// 6-color decorative category palette removed — Group 6 Phase-0 decision 5:
// these are category LABELS (Team/Market/Financials/Legal/Product/Traction),
// not states, and color-coding them would falsely imply some are "more
// attention" than others. Plain muted text chip with a border, no
// color-coding at all, for every category uniformly.

const DD_STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "complete",
  complete: "pending",
  flagged: "pending",
};

function CategoryChip({ category }: { category: string }) {
  return (
    <span
      className="text-[10px] font-medium border px-2 py-0.5"
      style={{ color: "var(--lcs-ink-muted)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}
    >
      {category}
    </span>
  );
}

// Genuine 4-state workflow (pending/in_progress/complete/flagged) — a real
// state, not decorative — mapped onto the closed status vocabulary:
// complete→satisfied, in_progress→in-progress, flagged→attention (no red,
// per "attention amber covers errors too"), pending→pending.
function StatusCircle({ status }: { status: string }) {
  if (status === "complete") return (
    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--lcs-satisfied)" }}>
      <Check className="h-3.5 w-3.5" style={{ color: "var(--lcs-white)" }} />
    </div>
  );
  if (status === "in_progress") return (
    <div className="h-6 w-6 rounded-full shrink-0" style={{ border: "2px solid var(--lcs-progress)", background: "var(--lcs-progress-wash)" }} />
  );
  if (status === "flagged") return (
    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--lcs-attention)" }}>
      <AlertCircle className="h-3.5 w-3.5" style={{ color: "var(--lcs-white)" }} />
    </div>
  );
  return <div className="h-6 w-6 rounded-full shrink-0" style={{ border: "2px solid var(--lcs-line)" }} />;
}

function DiligencePage() {
  const {
    dealRoomId, startupId, isInvestor, userId, startup,
    doRequestNextStage: onRequestNextStage, stageRequesting,
  } = useDealRoom();

  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [seedingStandard, setSeedingStandard] = useState(false);
  const [goalNotes, setGoalNotes] = useState<Record<string, string>>({});
  const [goalDueDates, setGoalDueDates] = useState<Record<string, string>>({});
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [newGoalCategory, setNewGoalCategory] = useState("Team");
  const [newGoalText, setNewGoalText] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const [qaSummaryOpen, setQaSummaryOpen] = useState(false);
  const [vaultNotesOpen, setVaultNotesOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["dd-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dd_goal_templates")
        .select("*")
        .order("category")
        .order("display_order");
      return data ?? [];
    },
  });

  const { data: goals = [], refetch: refetchGoals } = useQuery({
    queryKey: ["dd-goals", dealRoomId, userId],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_dd_goals")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("investor_id", userId)
        .order("category")
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: founderGoals = [] } = useQuery({
    queryKey: ["dd-goals-founder", dealRoomId],
    enabled: !isInvestor && !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_dd_goals")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("category")
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: qaSummaryNote } = useQuery({
    queryKey: ["dd-qa-summary", dealRoomId],
    enabled: !!dealRoomId && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_notes")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("title", "AI Q&A Summary")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: vaultNotes = [] } = useQuery({
    queryKey: ["dd-vault-notes", dealRoomId],
    enabled: !!dealRoomId && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_notes")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("ai_generated", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: ddAnalysisNote } = useQuery({
    queryKey: ["dd-analysis-note", dealRoomId],
    enabled: !!dealRoomId && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_notes")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("title", "DD AI Analysis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if ((goals as any[]).length > 0) {
      const noteMap: Record<string, string> = {};
      const dateMap: Record<string, string> = {};
      (goals as any[]).forEach((g: any) => {
        if (g.notes) noteMap[g.id] = g.notes;
        if (g.due_by) dateMap[g.id] = g.due_by;
      });
      setGoalNotes((prev) => ({ ...noteMap, ...prev }));
      setGoalDueDates((prev) => ({ ...dateMap, ...prev }));
    }
  }, [goals]);

  useEffect(() => {
    if (!onboardingDone && (goals as any[]).length === 0 && templates.length > 0) {
      setShowOnboarding(true);
    } else if ((goals as any[]).length > 0) {
      setShowOnboarding(false);
    }
  }, [goals, templates, onboardingDone]);

  const allGoals = goals as any[];
  const categories = ["All", ...Array.from(new Set(allGoals.map((g: any) => g.category)))];
  const filteredGoals = activeCategory === "All" ? allGoals : allGoals.filter((g: any) => g.category === activeCategory);
  const completedCount = allGoals.filter((g: any) => g.status === "complete").length;
  const totalCount = allGoals.length;
  const flaggedGoals = allGoals.filter((g: any) => g.status === "flagged");
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const seedStandardGoals = async () => {
    if (!userId || !dealRoomId || templates.length === 0) return;
    setSeedingStandard(true);
    try {
      const rows = (templates as any[]).map((t: any) => ({
        deal_room_id: dealRoomId,
        investor_id: userId,
        category: t.category,
        goal_text: t.goal_text,
        is_standard: true,
        status: "pending",
      }));
      const { error } = await supabase.from("deal_room_dd_goals").insert(rows);
      if (error) throw error;
      setOnboardingDone(true);
      setShowOnboarding(false);
      await refetchGoals();
      toast.success("Standard goals loaded");
    } catch {
      toast.error("Could not load goals");
    } finally {
      setSeedingStandard(false);
    }
  };

  const cycleStatus = async (goal: any) => {
    const next = DD_STATUS_CYCLE[goal.status] ?? "pending";
    const update: any = { status: next };
    if (next === "complete") update.completed_at = new Date().toISOString();
    else update.completed_at = null;
    const { error } = await supabase.from("deal_room_dd_goals").update(update).eq("id", goal.id);
    if (error) { console.error("[dd-goals] status update failed:", error); toast.error("Could not update goal status."); return; }
    await refetchGoals();
  };

  const flagGoal = async (goal: any) => {
    const { error } = await supabase.from("deal_room_dd_goals").update({ status: "flagged" }).eq("id", goal.id);
    if (error) { console.error("[dd-goals] flag failed:", error); toast.error("Could not flag goal."); return; }
    await refetchGoals();
  };

  const saveNote = async (goalId: string, value: string) => {
    setSavingNoteId(goalId);
    const { error } = await supabase.from("deal_room_dd_goals").update({ notes: value }).eq("id", goalId);
    if (error) { console.error("[dd-goals] note save failed:", error); toast.error("Could not save note."); }
    setSavingNoteId(null);
  };

  const saveDueDate = async (goalId: string, value: string) => {
    const { error } = await supabase.from("deal_room_dd_goals").update({ due_by: value || null }).eq("id", goalId);
    if (error) { console.error("[dd-goals] due date save failed:", error); toast.error("Could not save due date."); return; }
    await refetchGoals();
  };

  const markComplete = async (goalId: string) => {
    const { error } = await supabase.from("deal_room_dd_goals").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", goalId);
    if (error) { console.error("[dd-goals] mark complete failed:", error); toast.error("Could not mark goal complete."); return; }
    await refetchGoals();
    setExpandedGoalId(null);
  };

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase.from("deal_room_dd_goals").delete().eq("id", goalId);
    if (error) { console.error("[dd-goals] delete failed:", error); toast.error("Could not delete goal."); return; }
    await refetchGoals();
  };

  const addCustomGoal = async () => {
    if (!newGoalText.trim() || !userId) return;
    setAddingGoal(true);
    try {
      const { error } = await supabase.from("deal_room_dd_goals").insert({
        deal_room_id: dealRoomId,
        investor_id: userId,
        category: newGoalCategory,
        goal_text: newGoalText.trim(),
        is_standard: false,
        status: "pending",
      });
      if (error) throw error;
      setNewGoalText("");
      setAddGoalOpen(false);
      await refetchGoals();
      toast.success("Goal added");
    } catch {
      toast.error("Could not add goal");
    } finally {
      setAddingGoal(false);
    }
  };

  const runAnalysis = async () => {
    if (!userId) return;
    setRunningAnalysis(true);
    setAnalysisOpen(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Not authenticated"); return; }

      const { data: qaMessages } = await supabase
        .from("deal_room_qa")
        .select("sender_role, content")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(10);

      const qaContext = (qaMessages ?? []).map((m: any) => `${m.sender_role}: ${m.content}`).join("\n");
      const companyName = startup?.company_name ?? "Unknown startup";
      const stage = startup?.stage ?? "Unknown stage";
      const flaggedList = flaggedGoals.map((g: any) => g.goal_text).join(", ") || "None";

      const resp = await fetch(
        "https://ldimninnjlvxozubheib.supabase.co/functions/v1/ai-router",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            task_type: "dd_report",
            user_id: userId,
            system_prompt:
              "You are a due diligence analyst reviewing a startup for potential investment. Be honest and conservative. 'Goals completed' means the investor has reviewed those items, NOT that they are independently verified. Treat all startup-provided data as unverified claims unless explicitly noted as document-verified. Flag any gaps in verification. Never describe a startup as low-risk based solely on self-reported data. Your role is to surface uncertainty, not to validate claims. Format: plain text only. No markdown. No asterisks. Return a JSON object with these exact keys: { summary: string, risk_level: \"low\"|\"medium\"|\"high\", risks: string[], strengths: string[], flags: string[], recommendation: string }",
            messages: [{
              role: "user",
              content:
                `Note: All startup data below is self-reported and unverified unless marked as document-verified. Goal completion indicates investor review only.\n\nStartup: ${companyName}\nStage: ${stage}\nGoals completed: ${completedCount}/${totalCount}\nFlagged items: ${flaggedList}\nKey Q&A:\n${qaContext}`,
            }],
          }),
        },
      );

      const result = await resp.json();
      const raw = result?.content ?? result?.reply ?? result?.message ?? "";
      const cleaned = raw
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      let parsed: any = null;
      try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned, risk_level: "medium", risks: [], strengths: [], flags: [], recommendation: "See summary above." }; }

      setAnalysisResult(parsed);
      const { error: ddNoteErr } = await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        title: "DD AI Analysis",
        content: JSON.stringify(parsed),
        visibility: "private",
        ai_generated: true,
      });
      if (ddNoteErr) throw ddNoteErr;
      toast.success("Analysis saved to your notes");
    } catch {
      toast.error("Analysis failed — try again");
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (!isInvestor) {
    const fGoals = founderGoals as any[];
    const fCategories = Array.from(new Set(fGoals.map((g: any) => g.category)));
    const fCompleted = fGoals.filter((g: any) => g.status === "complete").length;
    const fFlagged = fGoals.filter((g: any) => g.status === "flagged").length;
    const fTotal = fGoals.length;
    const fPct = fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0;
    const lastUpdated = fGoals.length > 0
      ? formatDistanceToNow(new Date(Math.max(...fGoals.map((g: any) => new Date(g.created_at).getTime()))), { addSuffix: true })
      : null;

    let ddAnalysisParsed: any = null;
    let analysisShared = false;
    if (ddAnalysisNote) {
      analysisShared = ddAnalysisNote.visibility === "deal_room";
      try { ddAnalysisParsed = JSON.parse(ddAnalysisNote.content); } catch { ddAnalysisParsed = null; }
    }

    return (
      <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6" style={{ fontFamily: "var(--font-lcs-ui)" }}>
        {fGoals.length === 0 ? (
          <div className="border px-6 py-12 text-center" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
            <ClipboardList className="h-12 w-12 mx-auto mb-4" style={{ color: "var(--lcs-line)" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)" }}>Due diligence not started</p>
            <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>You will see their diligence goals and progress here once they begin.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--lcs-ink)" }}>Diligence Report</h2>
              {lastUpdated && <p className="text-sm mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Updated by investor · {lastUpdated}</p>}
            </div>

            <div className="border px-6 py-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <LcsStatusPill status="pending" label={`${fTotal} total goals`} dot={false} />
                <LcsStatusPill status="satisfied" label={`${fCompleted} complete`} dot={false} />
                {fFlagged > 0 && <LcsStatusPill status="attention" label={`${fFlagged} flagged`} dot={false} />}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--lcs-line)" }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${fPct}%`, background: "var(--lcs-accent)" }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{fPct}% complete</p>
            </div>

            {fCategories.map((cat) => {
              const catGoals = fGoals.filter((g: any) => g.category === cat);
              return (
                <div key={cat} className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
                  <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--lcs-line)" }}>
                    <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{cat}</span>
                    <span className="px-2 py-0.5 text-[10px] font-medium" style={{ borderRadius: "9999px", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>{catGoals.length}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
                    {catGoals.map((g: any) => (
                      <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                        <StatusCircle status={g.status} />
                        <span className="text-sm flex-1" style={{ color: "var(--lcs-ink)", textDecoration: g.status === "complete" ? "line-through" : "none" }}>{g.goal_text}</span>
                        {g.status === "flagged" && <LcsStatusPill status="attention" label="Flagged" dot={false} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border px-6 py-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
              <div className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)" }}>AI Analysis</div>
              {analysisShared && ddAnalysisParsed ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {/* Genuine 3-state risk vocabulary — low/medium/high — mapped
                        onto satisfied/in-progress/attention, no forced adverse. */}
                    <LcsStatusPill
                      status={ddAnalysisParsed.risk_level === "low" ? "satisfied" : ddAnalysisParsed.risk_level === "high" ? "attention" : "in-progress"}
                      label={`${ddAnalysisParsed.risk_level?.toUpperCase() ?? "—"} RISK`}
                    />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{ddAnalysisParsed.summary}</p>
                  <div style={{ borderLeft: "3px solid var(--lcs-accent)" }} className="pl-4 py-1">
                    <div className="text-xs font-semibold mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Recommendation</div>
                    <p className="text-sm" style={{ color: "var(--lcs-ink)" }}>{ddAnalysisParsed.recommendation}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>Not shared</p>
                  <p className="text-xs mt-1" style={{ color: "var(--lcs-ink-muted)" }}>Investors can choose to share their analysis with you.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6" style={{ fontFamily: "var(--font-lcs-ui)" }}>

      {showOnboarding && (
        <div className="border px-6 py-6 text-center" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-progress-wash)" }}>
            <ClipboardList className="h-6 w-6" style={{ color: "var(--lcs-accent)" }} />
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: "var(--lcs-ink)" }}>Set up your diligence goals</h3>
          <p className="text-sm max-w-sm mx-auto mb-5" style={{ color: "var(--lcs-ink-muted)" }}>
            Choose from standard goals or add your own. Goals guide your diligence and generate a structured report.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <LcsButton
              variant="primary"
              onClick={seedStandardGoals}
              disabled={seedingStandard}
              data-testid="dd-use-standard-goals-btn"
            >
              {seedingStandard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Use standard goals
            </LcsButton>
            <LcsButton
              variant="secondary"
              onClick={() => { setOnboardingDone(true); setShowOnboarding(false); }}
            >
              Start from scratch
            </LcsButton>
          </div>
        </div>
      )}

      {(!showOnboarding || onboardingDone) && (
        <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <div className="flex items-center gap-0 border-b overflow-x-auto px-4 pt-3" style={{ borderColor: "var(--lcs-line)" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                style={activeCategory === cat
                  ? { borderColor: "var(--lcs-accent)", color: "var(--lcs-accent)" }
                  : { borderColor: "transparent", color: "var(--lcs-ink-muted)" }}
              >
                {cat}
              </button>
            ))}
          </div>

          {totalCount > 0 && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{completedCount} / {totalCount} goals complete</span>
                <span className="text-xs font-semibold" style={{ color: "var(--lcs-accent)" }}>{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--lcs-line)" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "var(--lcs-accent)" }} />
              </div>
            </div>
          )}

          <div className="px-4 py-3 space-y-2">
            {filteredGoals.length === 0 && (
              <LcsEmptyState title="No goals" text="Diligence goals for this room appear here." />
            )}

            {filteredGoals.map((goal: any) => {
              const isExpanded = expandedGoalId === goal.id;
              return (
                <div key={goal.id} className="border p-4" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => cycleStatus(goal)}
                      className="mt-0.5 shrink-0 focus:outline-none"
                      title="Click to cycle status"
                      data-testid={`dd-goal-status-${goal.id}`}
                    >
                      <StatusCircle status={goal.status} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <CategoryChip category={goal.category} />
                          {goal.is_standard && (
                            <span className="text-[10px] px-2 py-0.5" style={{ borderRadius: "9999px", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>Standard</span>
                          )}
                          {goal.due_by && <span className="text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>Due {format(new Date(goal.due_by), "MMM d")}</span>}
                        </div>
                        <p className="mt-1 text-sm" style={{ color: "var(--lcs-ink)", textDecoration: goal.status === "complete" ? "line-through" : "none" }}>
                          {goal.goal_text}
                        </p>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={goalNotes[goal.id] ?? ""}
                            onChange={(e) => setGoalNotes((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                            onBlur={(e) => saveNote(goal.id, e.target.value)}
                            rows={3}
                            placeholder="Notes..."
                            className="w-full resize-none border px-3 py-2.5 text-sm outline-none"
                            style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                          />
                          {savingNoteId === goal.id && <span className="text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>Saving…</span>}
                          <div className="flex items-center gap-2">
                            <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Due date</label>
                            <input
                              type="date"
                              value={goalDueDates[goal.id] ?? ""}
                              onChange={(e) => setGoalDueDates((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                              onBlur={(e) => saveDueDate(goal.id, e.target.value)}
                              className="border px-3 py-1.5 text-sm outline-none"
                              style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                            />
                          </div>
                          {goal.status !== "complete" && (
                            <LcsButton variant="primary" onClick={() => markComplete(goal.id)}>
                              Mark complete
                            </LcsButton>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => flagGoal(goal)}
                        title="Flag"
                        className="p-1.5 transition-colors hover:text-[var(--lcs-attention)]"
                        style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1.5 transition-colors hover:text-[var(--lcs-attention)]"
                        style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {addGoalOpen ? (
              <div className="border p-4 space-y-3" style={{ borderColor: "var(--lcs-accent)", background: "var(--lcs-progress-wash)", borderRadius: "var(--radius-lcs-control)" }}>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="col-span-1 border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                  >
                    {["Team", "Market", "Financials", "Legal", "Product", "Traction"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Describe the goal..."
                    className="col-span-2 border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                    onKeyDown={(e) => { if (e.key === "Enter") addCustomGoal(); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <LcsButton variant="secondary" onClick={() => setAddGoalOpen(false)}>Cancel</LcsButton>
                  <LcsButton
                    variant="primary"
                    onClick={addCustomGoal}
                    disabled={!newGoalText.trim() || addingGoal}
                    data-testid="dd-add-goal-confirm-btn"
                  >
                    {addingGoal ? "Adding…" : "Add goal"}
                  </LcsButton>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddGoalOpen(true)}
                className="w-full border border-dashed py-3 text-sm flex items-center justify-center gap-2 transition-colors hover:border-[var(--lcs-accent)] hover:text-[var(--lcs-accent)]"
                style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink-muted)" }}
                data-testid="dd-add-goal-btn"
              >
                <Plus className="h-4 w-4" /> Add custom goal
              </button>
            )}
          </div>
        </div>
      )}

      <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <button
          onClick={() => setAnalysisOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>AI Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <LcsButton
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); runAnalysis(); }}
              disabled={runningAnalysis || allGoals.length === 0}
              data-testid="dd-run-analysis-btn"
            >
              {runningAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Run analysis
            </LcsButton>
            {analysisOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />}
          </div>
        </button>

        {analysisOpen && (
          <div className="border-t px-5 py-5" style={{ borderColor: "var(--lcs-line)" }}>
            {!analysisResult && !runningAnalysis && (
              <p className="text-sm text-center py-4" style={{ color: "var(--lcs-ink-muted)" }}>Click "Run analysis" to generate an AI diligence report based on your goals and Q&A thread.</p>
            )}
            {runningAnalysis && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--lcs-accent)" }} />
                <span className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>Analysing…</span>
              </div>
            )}
            {analysisResult && !runningAnalysis && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <LcsStatusPill
                    status={analysisResult.risk_level === "low" ? "satisfied" : analysisResult.risk_level === "high" ? "attention" : "in-progress"}
                    label={`${(analysisResult.risk_level ?? "medium").toUpperCase()} RISK`}
                  />
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{analysisResult.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Strengths/Risks/Flags — evaluative labels, not neutral
                      categories (unlike DD_CATEGORY_COLORS above), so the
                      "categories aren't states" reasoning doesn't apply here.
                      Mapped onto the existing closed status vocabulary:
                      Strengths→satisfied, Risks/Flags→attention — consistent
                      with every other genuine-state mapping in this file
                      (StatusCircle, the risk-level pills). No new tone
                      invented; "flags" and "risks" share the same tone
                      deliberately, since both are adverse signals and the
                      vocabulary has no third negative tier. */}
                  {[
                    { label: "Strengths", items: analysisResult.strengths ?? [], tone: "var(--lcs-satisfied)" },
                    { label: "Risks", items: analysisResult.risks ?? [], tone: "var(--lcs-attention)" },
                    { label: "Flags", items: analysisResult.flags ?? [], tone: "var(--lcs-attention)" },
                  ].map(({ label, items, tone }) => (
                    <div key={label}>
                      <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                      {(items as string[]).length === 0 ? (
                        <p className="text-xs italic" style={{ color: "var(--lcs-ink-muted)" }}>None identified</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: tone }}>
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone }} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderLeft: "3px solid var(--lcs-accent)" }} className="pl-4 py-1">
                  <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--lcs-ink-muted)" }}>Recommendation</div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{analysisResult.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Research from previous stages</div>

        <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <button
            onClick={() => setQaSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Q&A Summary</span>
            {qaSummaryOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />}
          </button>
          {qaSummaryOpen && (
            <div className="border-t px-5 py-4" style={{ borderColor: "var(--lcs-line)" }}>
              {qaSummaryNote ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--lcs-ink-muted)" }}>{qaSummaryNote.content}</p>
              ) : (
                <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>Not generated</p>
              )}
            </div>
          )}
        </div>

        <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <button
            onClick={() => setVaultNotesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Notes from Information Vault</span>
            {vaultNotesOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />}
          </button>
          {vaultNotesOpen && (
            <div className="border-t divide-y" style={{ borderColor: "var(--lcs-line)" }}>
              {(vaultNotes as any[]).length === 0 ? (
                <p className="px-5 py-4 text-sm" style={{ color: "var(--lcs-ink-muted)" }}>No notes</p>
              ) : (
                (vaultNotes as any[]).map((note: any) => (
                  <div key={note.id} className="px-5 py-4">
                    <div className="text-sm font-medium mb-0.5" style={{ color: "var(--lcs-ink)" }}>{note.title}</div>
                    <p className="text-xs line-clamp-2" style={{ color: "var(--lcs-ink-muted)" }}>{note.content?.slice(0, 100)}{(note.content?.length ?? 0) > 100 ? "…" : ""}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--lcs-ink-muted)" }}>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* The "Decision" control (Pass/Withdraw/Pause + reason) was removed
          13 Aug 2026 — second, independently duplicated copy of the same
          dead control removed from app.deal-rooms.$id.information.tsx the
          same day. Its submit handler was an inline console.log: it wrote
          nothing and nothing read it. See that file's note and CLAUDE.md
          §20.9. "Request next stage" is untouched — a real action. */}
      <div className="border px-6 py-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <div className="flex items-center justify-end gap-4 flex-wrap">
          <LcsButton
            variant="primary"
            onClick={onRequestNextStage}
            disabled={stageRequesting}
            data-testid="dd-next-stage"
          >
            {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request next stage →
          </LcsButton>
        </div>
      </div>

      <DDAnalysisPanel dealRoomId={dealRoomId} startupId={startupId ?? ""} isInvestor={isInvestor} />
    </div>
  );
}
