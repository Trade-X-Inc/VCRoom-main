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
import { EmptyState } from "@/components/system";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/diligence")({
  component: DiligencePage,
});

const DD_CATEGORY_COLORS: Record<string, string> = {
  Team: "bg-blue-50 text-blue-700  ",
  Market: "bg-green-50 text-green-700  ",
  Financials: "bg-purple-50 text-purple-700  ",
  Legal: "bg-amber-50 text-amber-700  ",
  Product: "bg-indigo-50 text-indigo-700  ",
  Traction: "bg-pink-50 text-pink-700  ",
};

const DD_STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "complete",
  complete: "pending",
  flagged: "pending",
};

function StatusCircle({ status }: { status: string }) {
  if (status === "complete") return (
    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
      <Check className="h-3.5 w-3.5 text-foreground" />
    </div>
  );
  if (status === "in_progress") return (
    <div className="h-6 w-6 rounded-full border-2 border-amber-400 bg-amber-50 shrink-0" />
  );
  if (status === "flagged") return (
    <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
      <AlertCircle className="h-3.5 w-3.5 text-foreground" />
    </div>
  );
  return <div className="h-6 w-6 rounded-full border-2 border-gray-300 shrink-0" />;
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
  const [showDecision, setShowDecision] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState("Pass");
  const [decisionReason, setDecisionReason] = useState("");

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
      <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6">
        {fGoals.length === 0 ? (
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-900 mb-1">Due diligence not started</p>
            <p className="text-sm text-gray-500 ">You will see their diligence goals and progress here once they begin.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>Diligence Report</h2>
              {lastUpdated && <p className="text-sm text-gray-500 mt-0.5">Updated by investor · {lastUpdated}</p>}
            </div>

            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-5">
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ">{fTotal} total goals</span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ">{fCompleted} complete</span>
                {fFlagged > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ">{fFlagged} flagged</span>}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-2 rounded-full transition-all" style={{ width: `${fPct}%`, background: "var(--gradient-brand)" }} />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 ">{fPct}% complete</p>
            </div>

            {fCategories.map((cat) => {
              const catGoals = fGoals.filter((g: any) => g.category === cat);
              return (
                <div key={cat} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(0,0,0,0.08)] ">
                    <span className="text-sm font-semibold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>{cat}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", DD_CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600  ")}>{catGoals.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100 ">
                    {catGoals.map((g: any) => (
                      <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                        <StatusCircle status={g.status} />
                        <span className={cn("text-sm flex-1", g.status === "complete" ? "line-through text-[#71717A] " : "text-gray-900 ")}>{g.goal_text}</span>
                        {g.status === "flagged" && <span className="text-[10px] rounded-full bg-red-50 px-2 py-0.5 text-red-600 font-medium">Flagged</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-5">
              <div className="text-sm font-semibold text-gray-900 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>AI Analysis</div>
              {analysisShared && ddAnalysisParsed ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold",
                      ddAnalysisParsed.risk_level === "low" ? "bg-green-50 text-green-700  " :
                      ddAnalysisParsed.risk_level === "high" ? "bg-red-50 text-red-700  " :
                      "bg-amber-50 text-amber-700  "
                    )}>
                      {ddAnalysisParsed.risk_level?.toUpperCase() ?? "—"} RISK
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{ddAnalysisParsed.summary}</p>
                  <div style={{ borderLeft: "3px solid var(--brand)" }} className="pl-4 py-1">
                    <div className="text-xs font-semibold text-gray-500 mb-1">Recommendation</div>
                    <p className="text-sm text-gray-800 ">{ddAnalysisParsed.recommendation}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Not shared</p>
                  <p className="text-xs text-[#71717A] mt-1">Investors can choose to share their analysis with you.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6">

      {showOnboarding && (
        <div className="bg-white border border-brand/20 rounded-none px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: "rgba(124,58,237,0.08)" }}>
            <ClipboardList className="h-6 w-6 text-brand" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Set up your diligence goals</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
            Choose from standard goals or add your own. Goals guide your diligence and generate a structured report.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={seedStandardGoals}
              disabled={seedingStandard}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="dd-use-standard-goals-btn"
            >
              {seedingStandard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Use standard goals
            </button>
            <button
              onClick={() => { setOnboardingDone(true); setShowOnboarding(false); }}
              className="rounded-lg border border-[rgba(0,0,0,0.08)] px-5 py-2.5 text-sm font-medium text-gray-700 "
            >
              Start from scratch
            </button>
          </div>
        </div>
      )}

      {(!showOnboarding || onboardingDone) && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <div className="flex items-center gap-0 border-b border-[rgba(0,0,0,0.08)] overflow-x-auto px-4 pt-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeCategory === cat
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-600 hover:text-gray-900 ",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {totalCount > 0 && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 ">{completedCount} / {totalCount} goals complete</span>
                <span className="text-xs font-semibold text-brand">{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "var(--gradient-brand)" }} />
              </div>
            </div>
          )}

          <div className="px-4 py-3 space-y-2">
            {filteredGoals.length === 0 && (
              <EmptyState kind="empty" title="No goals" />
            )}

            {filteredGoals.map((goal: any) => {
              const isExpanded = expandedGoalId === goal.id;
              return (
                <div key={goal.id} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none p-4">
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
                          <span className={cn("text-sm font-medium", DD_CATEGORY_COLORS[goal.category] ?? "bg-gray-100 text-gray-600  ", "rounded-full px-2 py-0.5 text-[10px]")}>{goal.category}</span>
                          {goal.is_standard && <span className="text-[10px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 ">Standard</span>}
                          {goal.due_by && <span className="text-[10px] text-[#71717A] ">Due {format(new Date(goal.due_by), "MMM d")}</span>}
                        </div>
                        <p className={cn("mt-1 text-sm", goal.status === "complete" ? "line-through text-[#71717A] " : "text-gray-900 ")}>
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
                            className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
                          />
                          {savingNoteId === goal.id && <span className="text-[10px] text-[#71717A] ">Saving…</span>}
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 ">Due date</label>
                            <input
                              type="date"
                              value={goalDueDates[goal.id] ?? ""}
                              onChange={(e) => setGoalDueDates((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                              onBlur={(e) => saveDueDate(goal.id, e.target.value)}
                              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 outline-none"
                            />
                          </div>
                          {goal.status !== "complete" && (
                            <button
                              onClick={() => markComplete(goal.id)}
                              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground"
                              style={{ background: "#10B981" }}
                            >
                              Mark complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => flagGoal(goal)}
                        title="Flag"
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-red-500"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="rounded-lg p-1.5 text-[#71717A] hover:text-red-500"
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
              <div className="rounded-lg border border-brand/20 bg-accent p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="col-span-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
                  >
                    {["Team", "Market", "Financials", "Legal", "Product", "Traction"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Describe the goal..."
                    className="col-span-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
                    onKeyDown={(e) => { if (e.key === "Enter") addCustomGoal(); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddGoalOpen(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                  <button
                    onClick={addCustomGoal}
                    disabled={!newGoalText.trim() || addingGoal}
                    className="rounded-lg px-4 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                    style={{ background: "var(--gradient-brand)" }}
                    data-testid="dd-add-goal-confirm-btn"
                  >
                    {addingGoal ? "Adding…" : "Add goal"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddGoalOpen(true)}
                className="w-full rounded-none border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-brand hover:text-brand flex items-center justify-center gap-2"
                data-testid="dd-add-goal-btn"
              >
                <Plus className="h-4 w-4" /> Add custom goal
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
        <button
          onClick={() => setAnalysisOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>AI Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); runAnalysis(); }}
              disabled={runningAnalysis || allGoals.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-medium text-brand hover:bg-accent disabled:opacity-40"
              data-testid="dd-run-analysis-btn"
            >
              {runningAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Run analysis
            </button>
            {analysisOpen ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
          </div>
        </button>

        {analysisOpen && (
          <div className="border-t border-[rgba(0,0,0,0.08)] px-5 py-5">
            {!analysisResult && !runningAnalysis && (
              <p className="text-sm text-[#71717A] text-center py-4">Click "Run analysis" to generate an AI diligence report based on your goals and Q&A thread.</p>
            )}
            {runningAnalysis && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                <span className="text-sm text-gray-500 ">Analysing…</span>
              </div>
            )}
            {analysisResult && !runningAnalysis && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold",
                    analysisResult.risk_level === "low" ? "bg-green-50 text-green-700  " :
                    analysisResult.risk_level === "high" ? "bg-red-50 text-red-700  " :
                    "bg-amber-50 text-amber-700  "
                  )}>
                    {(analysisResult.risk_level ?? "medium").toUpperCase()} RISK
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Strengths", items: analysisResult.strengths ?? [], color: "text-green-600 ", dot: "bg-green-500" },
                    { label: "Risks", items: analysisResult.risks ?? [], color: "text-red-600 ", dot: "bg-red-500" },
                    { label: "Flags", items: analysisResult.flags ?? [], color: "text-amber-600 ", dot: "bg-amber-500" },
                  ].map(({ label, items, color, dot }) => (
                    <div key={label}>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</div>
                      {(items as string[]).length === 0 ? (
                        <p className="text-xs text-[#71717A] italic">None identified</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(items as string[]).map((item, i) => (
                            <li key={i} className={cn("flex items-start gap-1.5 text-xs", color)}>
                              <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", dot)} />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderLeft: "3px solid var(--brand)" }} className="pl-4 py-1">
                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Recommendation</div>
                  <p className="text-sm text-gray-800 leading-relaxed">{analysisResult.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-xs" style={{ fontFamily: "Syne, sans-serif" }}>Research from previous stages</div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <button
            onClick={() => setQaSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 ">Q&A Summary</span>
            {qaSummaryOpen ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
          </button>
          {qaSummaryOpen && (
            <div className="border-t border-[rgba(0,0,0,0.08)] px-5 py-4">
              {qaSummaryNote ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{qaSummaryNote.content}</p>
              ) : (
                <p className="text-sm text-[#71717A]">Not generated</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <button
            onClick={() => setVaultNotesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 ">Notes from Information Vault</span>
            {vaultNotesOpen ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
          </button>
          {vaultNotesOpen && (
            <div className="border-t border-[rgba(0,0,0,0.08)] divide-y divide-gray-100 ">
              {(vaultNotes as any[]).length === 0 ? (
                <p className="px-5 py-4 text-sm text-[#71717A]">No notes</p>
              ) : (
                (vaultNotes as any[]).map((note: any) => (
                  <div key={note.id} className="px-5 py-4">
                    <div className="text-sm font-medium text-gray-900 mb-0.5">{note.title}</div>
                    <p className="text-xs text-gray-500 line-clamp-2">{note.content?.slice(0, 100)}{(note.content?.length ?? 0) > 100 ? "…" : ""}</p>
                    <p className="text-[10px] text-[#71717A] mt-1">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-5">
        {showDecision ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 ">Submit a decision</div>
            <select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
            >
              {["Pass", "Withdraw", "Pause"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDecision(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-gray-500 ">Cancel</button>
              <button
                onClick={() => { console.log("submitDecision dd:", decisionOutcome, decisionReason); setShowDecision(false); setDecisionReason(""); }}
                disabled={!decisionReason.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
                style={{ background: "#EF4444" }}
              >
                Submit decision
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setShowDecision(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 bg-white hover:bg-red-50 "
            >
              Decision
            </button>
            <button
              onClick={onRequestNextStage}
              disabled={stageRequesting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="dd-next-stage"
            >
              {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request next stage →
            </button>
          </div>
        )}
      </div>

      <DDAnalysisPanel dealRoomId={dealRoomId} startupId={startupId ?? ""} isInvestor={isInvestor} />
    </div>
  );
}
