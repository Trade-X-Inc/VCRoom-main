import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  LayoutGrid, FileText, MessageSquare, ListChecks, StickyNote, Activity,
  Calendar, Gavel, Download, CheckCircle2, AlertTriangle, Clock, Plus,
  ArrowLeft, Lock, Sparkles, X, MessagesSquare, ThumbsUp, ThumbsDown,
  HelpCircle, Building2, TrendingUp, Users, DollarSign, Target, Shield,
  Send, AlertCircle, Eye, UserPlus, Loader2, ExternalLink, ChevronDown,
  Check, ClipboardList, Copy, Trash2, Pencil, Image, Film,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AIChat } from "@/components/ai/AIChat";
import { DealRoomChat } from "@/components/app/DealRoomChat";
import { DDChecklist } from "@/components/app/DDChecklist";
import { Dropzone } from "@/components/app/Dropzone";
import { useAuth } from "@/lib/auth";
import { supabase, logActivity, createNotification } from "@/lib/supabase";
import { ReviewTab } from "@/components/app/ReviewTab";
import { DocRequestsTab } from "@/components/app/DocRequestsTab";
import {
  useParticipants, useGeneratedNdaDocs,
  participantsStore, qaStore,
  type QAQuestion, type Participant,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/invite-fn";
import { generateDocumentSummary } from "@/lib/document-summary-fn";
import { getQASuggestions } from "@/lib/qa-suggestions-fn";

export const Route = createFileRoute("/app/deal-room/$id")({
  component: DealRoom,
});

const tabs = [
  { k: "overview", l: "Overview", i: LayoutGrid },
  { k: "documents", l: "Documents", i: FileText },
  { k: "qa", l: "Q&A", i: MessageSquare },
  { k: "checklist", l: "Checklist", i: ListChecks },
  { k: "chat", l: "Team chat", i: MessagesSquare },
  { k: "notes", l: "Notes", i: StickyNote },
  { k: "timeline", l: "Activity", i: Activity },
  { k: "meetings", l: "Meetings", i: Calendar },
  { k: "requests", l: "Requests", i: ClipboardList },
  { k: "decision", l: "Review", i: Gavel },
];

function DealRoom() {
  const { id: dealRoomId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userName = user?.fullName ?? "User";

  // ── Supabase queries ──────────────────────────────────────────
  const { data: room } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*, startups(*)")
        .eq("id", dealRoomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: memberRow } = useQuery({
    queryKey: ["deal-room-member", dealRoomId, user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: memberList = [] } = useQuery({
    queryKey: ["deal-room-members", dealRoomId],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("*, users(full_name, email, role)")
        .eq("deal_room_id", dealRoomId);
      return data ?? [];
    },
  });

  const { data: qaMessages = [] } = useQuery({
    queryKey: ["deal-room-qa", dealRoomId],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("is_qa", true)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: ndaAcceptance, isLoading: ndaLoading } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("id, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  // ── Redirect to NDA page if not yet signed ───────────────────
  useEffect(() => {
    if (!ndaLoading && user?.id && !ndaAcceptance) {
      navigate({ to: "/app/deal-room/$id/nda", params: { id: dealRoomId } });
    }
  }, [ndaLoading, ndaAcceptance, user?.id, navigate, dealRoomId]);

  // ── Seed stores from Supabase data ────────────────────────────

  useEffect(() => {
    if (qaMessages.length > 0) {
      const mapped: QAQuestion[] = (qaMessages as any[]).map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        side: m.metadata?.side ?? "investor-to-founder",
        authorRole: m.metadata?.authorRole ?? "Investor",
        authorName: m.metadata?.authorName ?? "Unknown",
        question: m.body,
        answer: m.metadata?.answer,
        answeredAt: m.metadata?.answeredAt,
        createdAt: m.created_at,
        editedAt: m.metadata?.editedAt,
      }));
      qaStore.set(() => mapped);
    }
  }, [qaMessages]);

  useEffect(() => {
    if (memberList.length > 0) {
      const mapped: Participant[] = (memberList as any[]).map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        name: m.users?.full_name ?? "Unknown",
        email: m.users?.email ?? "",
        role: m.role,
        company: "",
        status: m.accepted_at ? "NDA Accepted" : "Invited",
        dateJoined: m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : undefined,
      }));
      participantsStore.set(() => mapped);
    }
  }, [memberList]);

  const isInvestor = memberRow ? (memberRow.role === "investor" || memberRow.role === "viewer") : user?.role === "investor";
  const isFounder = memberRow ? memberRow.role === "founder" : user?.role !== "investor";

  const dealRoomName = (room as any)?.startups?.company_name
    ? `${(room as any).startups.company_name} — Deal Room`
    : "Deal Room";
  const companyName = (room as any)?.startups?.company_name ?? "Unknown Company";

  const visibleTabs = tabs.filter((t) => {
    if (isInvestor) return ["overview", "documents", "qa", "checklist", "notes", "timeline", "meetings", "requests", "decision"].includes(t.k);
    return t.k !== "decision";
  });

  // ── Q&A Supabase callbacks ────────────────────────────────────
  const handleAddQuestion = async (q: QAQuestion): Promise<string | undefined> => {
    const { data } = await supabase.from("messages").insert({
      deal_room_id: dealRoomId,
      sender_id: user?.id,
      body: q.question,
      is_qa: true,
      metadata: { side: q.side, authorRole: q.authorRole, authorName: q.authorName },
    }).select("id").maybeSingle();
    queryClient.invalidateQueries({ queryKey: ["deal-room-qa", dealRoomId] });
    return data?.id;
  };

  const handleSaveAnswer = async (questionId: string, answer: string) => {
    const { data: existing } = await supabase.from("messages").select("metadata").eq("id", questionId).maybeSingle();
    await supabase.from("messages").update({
      metadata: { ...(existing?.metadata ?? {}), answer, answeredAt: new Date().toISOString(), editedAt: new Date().toISOString() },
    }).eq("id", questionId);
    queryClient.invalidateQueries({ queryKey: ["deal-room-qa", dealRoomId] });
  };

  if (!user?.id || ndaLoading || !ndaAcceptance) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Verifying access…</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-border/60 bg-sidebar flex flex-col">
        <div className="p-5 border-b border-border/60">
          <Link to={"/app/deal-rooms" as any} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All deal rooms</Link>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">
              {companyName[0] ?? "D"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{companyName}</div>
              <div className="text-[11px] text-muted-foreground">{isInvestor ? "Founder · Deal Room" : "Investor · Deal Room"}</div>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" /> Active · NDA signed
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.k}
              onClick={() => {
                queryClient.invalidateQueries({
                  predicate: (query) => (query.queryKey as string[]).includes(dealRoomId),
                });
                setTab(t.k);
              }}
              className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              <t.i className={`h-4 w-4 ${tab === t.k ? "text-brand" : ""}`} />
              {t.l}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 inline mr-1" /> Encrypted · watermarked
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {tab === "overview" && (
          <DealRoomOverview
            dealRoomId={dealRoomId}
            room={room}
            memberList={memberList}
            isInvestor={isInvestor}
            isFounder={isFounder}
            onTabChange={setTab}
          />
        )}
        {tab === "documents" && <Documents dealRoomId={dealRoomId} isFounder={isFounder} userId={user?.id} />}
        {tab === "chat" && <div className="h-full"><DealRoomChat dealRoomId={dealRoomId} userId={user?.id} userName={userName} /></div>}
        {tab === "qa" && <QA dealRoomId={dealRoomId} userId={user?.id} userName={userName} isInvestor={isInvestor} isFounder={isFounder} companyName={(room as any)?.startups?.company_name ?? ""} sector={(room as any)?.startups?.sector ?? ""} />}
        {tab === "checklist" && <DDChecklist dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "notes" && <Notes dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "timeline" && <Timeline dealRoomId={dealRoomId} />}
        {tab === "meetings" && <MeetingsTab dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "requests" && (
          <DocRequestsTab
            dealRoomId={dealRoomId}
            isInvestor={isInvestor}
            isFounder={isFounder}
            userId={user?.id}
            founderUserId={
              Array.isArray((room as any)?.startups)
                ? (room as any)?.startups?.[0]?.founder_id
                : (room as any)?.startups?.founder_id ?? undefined
            }
          />
        )}
        {tab === "decision" && isInvestor && (
          <InvestorDecisionTab dealRoomId={dealRoomId} userId={user?.id} />
        )}
        {tab === "decision" && !isInvestor && (
          <ReviewTab
            dealRoomId={dealRoomId}
            currentUserRole="founder"
            startupId={(room as any)?.startup_id ?? ""}
          />
        )}
      </main>

      {/* AI floating button */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform"
        >
          <Sparkles className="h-4 w-4" /> Ask AI
        </button>
      )}

      {/* AI slide-over */}
      {aiOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col">
            <div className="h-14 border-b border-border/60 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Deal Room AI</div>
                  <div className="text-[10px] text-muted-foreground">{companyName}</div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 min-h-0">
              <AIChat
                compact
                userId={user?.id}
                scope={`the ${companyName} deal room`}
                initialAssistant="I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything."
                starters={isInvestor ? [
                  "Summarize this deal in 3 bullets.",
                  "What are the top 3 risks?",
                  "How does ARR growth compare to peers?",
                  "Draft my partner meeting memo.",
                ] : [
                  "Summarize this deal in 3 bullets.",
                  "What diligence items are still open?",
                  "Draft a follow-up to the investor.",
                  "Flag the top 3 risks.",
                ]}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

// ── Deal Room Overview (unified for founder + investor) ───────────
function DealRoomOverview({
  dealRoomId,
  room,
  memberList,
  isInvestor,
  isFounder,
  onTabChange,
}: {
  dealRoomId: string;
  room: any;
  memberList: any[];
  isInvestor: boolean;
  isFounder: boolean;
  onTabChange: (tab: string) => void;
}) {
  const startup = room?.startups;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["activities-overview", dealRoomId],
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: dealTasks = [] } = useQuery({
    queryKey: ["deal-tasks", dealRoomId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_tasks")
        .select("id, title, assignee_id, due_date, completed, created_by, created_at")
        .eq("deal_room_id", dealRoomId)
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: latestDecision } = useQuery({
    queryKey: ["overview-decision", dealRoomId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("status, created_at, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const docsShared = useQuery({
    queryKey: ["overview-doc-count", dealRoomId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("deal_room_id", dealRoomId);
      return count ?? 0;
    },
  });

  const qaCount = useQuery({
    queryKey: ["overview-qa-count", dealRoomId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("deal_room_id", dealRoomId)
        .eq("is_qa", true);
      return count ?? 0;
    },
  });

  const meetingsCount = useQuery({
    queryKey: ["overview-meetings-count", dealRoomId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("deal_room_id", dealRoomId);
      return count ?? 0;
    },
  });

  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ["pending-invites", dealRoomId],
    enabled: !!user?.id && isFounder,
    queryFn: async () => {
      const { data } = await supabase
        .from("invites")
        .select("token, email, role, created_at, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Deal health score (0–80, -10 if stale)
  const docsCount = docsShared.data ?? 0;
  const qCount = qaCount.data ?? 0;
  const meetCount = meetingsCount.data ?? 0;
  const tasks = dealTasks as any[];
  const completedTasks = tasks.filter((t) => t.completed).length;
  const lastActivityAt = (recentActivity as any[])[0]?.created_at ?? null;
  const daysSinceActivity = lastActivityAt
    ? (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  let healthScore = 0;
  if (docsCount > 0) healthScore += 20;
  if (tasks.length > 0 && completedTasks / tasks.length > 0.5) healthScore += 20;
  if (qCount > 0) healthScore += 20;
  if (meetCount > 0) healthScore += 20;
  if (daysSinceActivity !== null && daysSinceActivity > 7) healthScore -= 10;
  healthScore = Math.max(0, healthScore);
  const healthFill = Math.round((healthScore / 80) * 100);
  const healthColor = healthScore >= 57 ? "bg-success" : healthScore >= 33 ? "bg-warning" : "bg-destructive";
  const healthLabel = healthScore >= 57 ? "On track" : healthScore >= 33 ? "In progress" : "Early stage";
  const healthTextColor = healthScore >= 57 ? "text-success" : healthScore >= 33 ? "text-warning" : "text-destructive";

  const decisionLabel = getDecisionLabel((latestDecision as any)?.status);
  const progressSteps = [
    { label: "NDA Signed", complete: true },
    { label: "Documents Shared", complete: (docsShared.data ?? 0) > 0 },
    { label: "Q&A Complete", complete: (qaCount.data ?? 0) > 0 && (qaMessagesAnswered(recentActivity as any[]) || decisionLabel !== "Under Review") },
    { label: "Review Done", complete: decisionLabel === "Term Sheet" || decisionLabel === "Passed" },
    { label: "Decision", complete: decisionLabel === "Term Sheet" || decisionLabel === "Passed" },
  ];
  const currentStepIndex = Math.min(
    progressSteps.findIndex((step) => !step.complete) === -1 ? progressSteps.length - 1 : progressSteps.findIndex((step) => !step.complete),
    progressSteps.length - 1,
  );

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !user?.id) return;
    setSavingTask(true);
    try {
      await supabase.from("deal_tasks").insert({
        deal_room_id: dealRoomId,
        title: taskTitle.trim(),
        assignee_id: taskAssignee || null,
        due_date: taskDueDate || null,
        created_by: user.id,
      });
      await logActivity(dealRoomId, user.id, "Added a deal task", { title: taskTitle.trim() });
      await queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealRoomId] });
      await queryClient.invalidateQueries({ queryKey: ["activities-overview", dealRoomId] });
      setTaskTitle("");
      setTaskAssignee("");
      setTaskDueDate("");
      toast.success("Task added");
    } finally {
      setSavingTask(false);
    }
  };

  const toggleTask = async (task: any) => {
    if (!user?.id) return;
    await supabase.from("deal_tasks").update({ completed: !task.completed }).eq("id", task.id);
    await logActivity(dealRoomId, user.id, `${task.completed ? "Reopened" : "Completed"} a deal task`, { title: task.title });
    queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealRoomId] });
    queryClient.invalidateQueries({ queryKey: ["activities-overview", dealRoomId] });
  };

  const founderMembers = (memberList as any[]).filter((m) => m.role === "founder");
  const investorMembers = (memberList as any[]).filter((m) => m.role === "investor" || m.role === "viewer");
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://main.vcroom-main.pages.dev";

  const handleCopyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${baseOrigin}/join/${token}`);
    toast.success("Invite link copied");
  };

  const handleCancelInvite = async (token: string) => {
    await supabase.from("invites").delete().eq("token", token);
    void refetchInvites();
    toast.success("Invite cancelled");
  };

  const handleResendInvite = async (inv: any) => {
    if (!user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await sendInviteEmail({
        data: {
          dealRoomId,
          email: inv.email,
          role: "investor",
          invitedBy: user.id,
          userAccessToken: session?.access_token ?? "",
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          appUrl: import.meta.env.VITE_APP_URL,
          founderName: (user as any)?.fullName ?? user?.email ?? "The founder",
          startupName: startup?.company_name ?? "Unknown",
        },
      });
      if (result.success) { toast.success("Invite resent"); void refetchInvites(); }
      else toast.error("Failed to resend");
    } catch {
      toast.error("Failed to resend");
    }
  };

  const summary = startup?.tagline || startup?.description || startup?.traction || "Shared diligence workspace for this investment opportunity.";
  const profileLink = isInvestor ? "/app/investor/startups" : "/app/profile";
  const decisionMeta = DECISION_BADGES[decisionLabel];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isInvestor ? "Investor Deal Room" : "Founder Deal Room"}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {startup?.company_name ?? (room as any)?.investor_company ?? "Deal Room"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInvestor
              ? `Investor Deal Room · ${(room as any)?.status ?? "Due Diligence"}`
              : "Diligence, tasks, decisions, and activity in one place."}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> NDA signed
        </span>
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-4">
          <section className="rounded-xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-gradient-brand text-xl font-bold text-brand-foreground">
                {startup?.logo_url
                  ? <img src={startup.logo_url} alt={`${startup?.company_name ?? "Company"} logo`} className="h-full w-full object-cover" />
                  : (startup?.company_name?.[0] ?? "D")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight">{startup?.company_name ?? "Company"}</h3>
                  {startup?.stage && (
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                      {startup.stage}
                    </span>
                  )}
                  {startup?.sector && (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {startup.sector}
                    </span>
                  )}
                </div>
                <div className="mt-4 rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Funding target</div>
                  <div className="mt-1 text-lg font-semibold">{formatMoney(startup?.funding_target)}</div>
                </div>
                {(startup?.revenue || startup?.team_size) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {startup?.revenue && (
                      <div className="rounded-md border border-border/60 bg-background p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">ARR</div>
                        <div className="mt-0.5 text-sm font-semibold truncate">{startup.revenue}</div>
                      </div>
                    )}
                    {startup?.team_size && (
                      <div className="rounded-md border border-border/60 bg-background p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Team</div>
                        <div className="mt-0.5 text-sm font-semibold">{startup.team_size}</div>
                      </div>
                    )}
                  </div>
                )}
                {startup?.traction && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Traction: </span>{startup.traction}
                  </p>
                )}
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">{summary}</p>
                <Link to={profileLink as any} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  View full profile <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" /> Deal progress
              </div>
              <span className="text-xs text-muted-foreground">Current: {progressSteps[currentStepIndex].label}</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {progressSteps.map((step, index) => {
                const current = index === currentStepIndex;
                const completed = step.complete && index < currentStepIndex;
                return (
                  <div key={step.label} className="relative min-w-0">
                    {index < progressSteps.length - 1 && (
                      <div className={cn("absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-4 h-0.5", completed ? "bg-success" : "bg-border")} />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <div className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold",
                        completed && "border-success bg-success text-white",
                        current && "border-brand bg-brand text-brand-foreground shadow-glow",
                        !completed && !current && "border-border bg-background text-muted-foreground",
                      )}>
                        {completed ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className={cn("text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{step.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold inline-flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-brand" /> Deal tasks
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Shared next steps visible to both parties.</p>
              </div>
              <span className="text-xs text-muted-foreground">{(dealTasks as any[]).filter((t) => t.completed).length}/{(dealTasks as any[]).length} complete</span>
            </div>

            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {(dealTasks as any[]).length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No shared tasks yet.</div>
              )}
              {(dealTasks as any[]).map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!task.completed}
                    onChange={() => toggleTask(task)}
                    className="h-4 w-4 rounded border-border accent-[var(--brand)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium truncate", task.completed && "text-muted-foreground line-through")}>{task.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{"Unassigned"}</span>
                      <span>•</span>
                      <span>{task.due_date ? format(new Date(`${task.due_date}T00:00:00`), "MMM d") : "No due date"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addTask} className="mt-4 grid gap-2 md:grid-cols-[1fr_150px_140px_auto]">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a shared task"
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              >
                <option value="">Unassigned</option>
                {(memberList as any[]).map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.users?.full_name || member.users?.email || member.role}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              <button
                type="submit"
                disabled={!taskTitle.trim() || savingTask}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground shadow-glow disabled:opacity-50"
              >
                {savingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add task
              </button>
            </form>
          </section>
        </div>

        <div className="md:col-span-2 space-y-4">
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold">Decision status</div>
            <div className={cn("mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-5 text-xl font-semibold", decisionMeta.className)}>
              {decisionLabel}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {(latestDecision as any)?.created_at
                ? `Updated ${formatDistanceToNow(new Date((latestDecision as any).created_at), { addSuffix: true })}`
                : "No investor decision submitted yet."}
            </div>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Key metrics</div>
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={DollarSign} label="ARR" value={formatMoney(startup?.revenue)} />
              <Metric icon={Users} label="Team size" value={startup?.team_size ?? "—"} />
              <Metric icon={Building2} label="Stage" value={startup?.stage ?? "—"} />
              <Metric icon={Target} label="Raise amount" value={formatMoney(startup?.funding_target)} />
            </div>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Deal health</div>
              <span className={cn("text-xs font-medium", healthTextColor)}>{healthLabel}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", healthColor)}
                  style={{ width: `${healthFill}%` }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">{healthScore}<span className="text-xs font-normal text-muted-foreground">/80</span></span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { label: "Documents", done: docsCount > 0, value: `${docsCount} file${docsCount !== 1 ? "s" : ""}` },
                { label: "Q&A", done: qCount > 0, value: `${qCount} message${qCount !== 1 ? "s" : ""}` },
                { label: "Tasks", done: tasks.length > 0 && completedTasks / Math.max(tasks.length, 1) > 0.5, value: `${completedTasks}/${tasks.length} done` },
                { label: "Meetings", done: meetCount > 0, value: `${meetCount} held` },
              ].map(({ label, done, value }) => (
                <div key={label} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5", done ? "bg-success/5 text-success" : "bg-muted/40 text-muted-foreground")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", done ? "bg-success" : "bg-muted-foreground/40")} />
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto tabular-nums">{value}</span>
                </div>
              ))}
            </div>
            {daysSinceActivity !== null && daysSinceActivity > 7 && (
              <div className="mt-2 text-[10px] text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> No activity in {Math.floor(daysSinceActivity)} days (−10 pts)
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Recent activity</div>
            {(recentActivity as any[]).length === 0 ? (
              <div className="text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="space-y-3">
                {(recentActivity as any[]).slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{e.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Team & Participants
              </div>
              {isFounder && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1 text-xs shadow-glow"
                >
                  <UserPlus className="h-3 w-3" /> Invite
                </button>
              )}
            </div>

            {/* Founder team */}
            {founderMembers.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Founder team</div>
                <div className="space-y-1.5">
                  {founderMembers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-[9px] font-semibold shrink-0">
                        {(m.users?.full_name || "F").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium truncate flex-1">{m.users?.full_name ?? m.users?.email ?? "Founder"}</span>
                      <span className="text-[9px] bg-brand/10 text-brand rounded px-1.5 py-0.5 shrink-0">Founder</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investor team */}
            {investorMembers.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Investor team</div>
                <div className="space-y-1.5">
                  {investorMembers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-accent text-muted-foreground text-[9px] font-semibold shrink-0">
                        {(m.users?.full_name || "I").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium truncate flex-1">{m.users?.full_name ?? m.users?.email ?? "Investor"}</span>
                      <span className="text-[9px] bg-success/10 text-success rounded px-1.5 py-0.5 shrink-0">Investor</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending invites (founders only) */}
            {isFounder && (pendingInvites as any[]).length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Pending invites</div>
                <div className="space-y-1.5">
                  {(pendingInvites as any[]).map((inv) => (
                    <div key={inv.token} className="flex items-center gap-1.5 text-xs">
                      <span className="truncate text-muted-foreground flex-1 min-w-0">{inv.email}</span>
                      <span className="shrink-0 text-[9px] bg-warning/10 text-warning rounded px-1.5 py-0.5">Pending</span>
                      <button
                        onClick={() => handleCopyInviteLink(inv.token)}
                        className="shrink-0 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Copy invite link"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleResendInvite(inv)}
                        className="shrink-0 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Resend invite"
                      >
                        <Send className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleCancelInvite(inv.token)}
                        className="shrink-0 grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        title="Cancel invite"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {founderMembers.length === 0 && investorMembers.length === 0 && (pendingInvites as any[]).length === 0 && (
              <div className="text-xs text-muted-foreground">No participants yet.</div>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Quick actions</div>
            <div className="space-y-2">
              {isFounder ? (
                <>
                  <button
                    onClick={() => onTabChange("documents")}
                    className="w-full rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <FileText className="mr-2 inline h-4 w-4 text-brand" /> Upload doc
                  </button>
                  <button
                    onClick={() => onTabChange("meetings")}
                    className="w-full rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Calendar className="mr-2 inline h-4 w-4 text-brand" /> Schedule meeting
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onTabChange("documents")}
                    className="w-full rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <FileText className="mr-2 inline h-4 w-4 text-brand" /> Request doc
                  </button>
                  <button
                    onClick={() => onTabChange("decision")}
                    className="w-full rounded-md border border-success/40 bg-success/10 px-3 py-2 text-left text-sm text-success hover:bg-success/15"
                  >
                    <ThumbsUp className="mr-2 inline h-4 w-4" /> Submit decision
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          dealRoomId={dealRoomId}
          dealRoomName={startup?.company_name ? `${startup.company_name} — Deal Room` : "Deal Room"}
          companyName={startup?.company_name ?? "Unknown"}
          founderName={user?.fullName ?? user?.email ?? "The founder"}
          invitedBy={user?.id ?? ""}
          onClose={() => setShowInvite(false)}
          onSent={() => { void refetchInvites(); }}
        />
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value || "—"}</div>
    </div>
  );
}

const DECISION_BADGES: Record<string, { className: string }> = {
  "Under Review": { className: "bg-brand/10 text-brand border border-brand/20" },
  Interested: { className: "bg-success/10 text-success border border-success/20" },
  "Term Sheet": { className: "bg-violet/10 text-violet border border-violet/20" },
  Passed: { className: "bg-destructive/10 text-destructive border border-destructive/20" },
};

function getDecisionLabel(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  if (["pass", "passed", "rejected"].includes(normalized)) return "Passed";
  if (["accepted", "accept", "invest", "term_sheet", "term sheet"].includes(normalized)) return "Term Sheet";
  if (["interested", "hold", "request info", "requested_info"].includes(normalized)) return "Interested";
  return "Under Review";
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: value >= 1000000 ? "compact" : "standard",
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value);
  }
  return String(value);
}

function qaMessagesAnswered(activity: any[]) {
  return activity.some((item) => String(item.action ?? "").toLowerCase().includes("answer"));
}

// ── Documents ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Pitch Deck": "bg-brand/10 text-brand",
  "Financials": "bg-success/10 text-success",
  "Legal": "bg-violet/10 text-violet",
  "Market Research": "bg-warning/10 text-warning",
  "Team": "bg-brand/10 text-brand",
  "Product": "bg-violet/10 text-violet",
  "Other": "bg-accent text-muted-foreground",
};

const TEXT_EXTS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "txt"]);

function getFileTypeStyle(ext: string): { bg: string; color: string; Icon: any } {
  if (ext === "pdf") return { bg: "bg-red-500/10", color: "text-red-500", Icon: FileText };
  if (["docx", "doc"].includes(ext)) return { bg: "bg-blue-500/10", color: "text-blue-500", Icon: FileText };
  if (["xlsx", "xls", "csv"].includes(ext)) return { bg: "bg-green-500/10", color: "text-green-500", Icon: FileText };
  if (["pptx", "ppt"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: FileText };
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { bg: "bg-purple-500/10", color: "text-purple-500", Icon: Image };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: Film };
  return { bg: "bg-accent", color: "text-muted-foreground", Icon: FileText };
}

function Documents({ dealRoomId, isFounder, userId }: { dealRoomId: string; isFounder: boolean; userId?: string }) {
  const queryClient = useQueryClient();
  const [showLibrary, setShowLibrary] = useState(false);
  const [addingFromLib, setAddingFromLib] = useState<string | null>(null);
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [summaryEdits, setSummaryEdits] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", dealRoomId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, uploader:users!uploader_id(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: libraryDocs = [], isLoading: libLoading } = useQuery({
    queryKey: ["library-docs", userId],
    enabled: showLibrary && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("uploader_id", userId!)
        .is("deal_room_id", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);

  const handleDownload = async (storagePath: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const addFromLibrary = async (docId: string) => {
    setAddingFromLib(docId);
    await supabase.from("documents").update({ deal_room_id: dealRoomId }).eq("id", docId);
    await queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    await queryClient.invalidateQueries({ queryKey: ["library-docs", userId] });
    setAddingFromLib(null);
    toast.success("Document added to deal room");
    setShowLibrary(false);
  };

  const generateSummary = async (doc: any) => {
    setGeneratingSummaryId(doc.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await generateDocumentSummary({
        data: {
          documentPath: doc.storage_path,
          documentName: doc.name || doc.storage_path?.split("/").pop() || "Document",
          dealRoomId,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          userAccessToken: session?.access_token ?? "",
        },
      });
      if (result.error) {
        toast.error(`AI Summary failed: ${result.error}`);
        return;
      }
      if (!result.summary) {
        toast.error("AI Summary returned empty. Check Cloudflare logs.");
        return;
      }
      await supabase.from("documents").update({ ai_summary: result.summary }).eq("id", doc.id);
      // DB write confirmed — update cache directly, no refetch needed
      queryClient.setQueryData(["documents", dealRoomId], (old: any) =>
        (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: result.summary } : d)
      );
      toast.success("Summary generated");
    } catch (err) {
      console.error("Summary generation error:", err);
      toast.error(err instanceof Error ? err.message : `Unknown error: ${String(err)}`);
    } finally {
      setGeneratingSummaryId(null);
    }
  };

  const saveSummaryEdit = async (docId: string) => {
    const text = summaryEdits[docId]?.trim();
    if (!text) return;
    const { error } = await supabase
      .from("documents")
      .update({ ai_summary: text, summary_edited: true })
      .eq("id", docId);
    if (error) { toast.error("Failed to save summary"); return; }
    queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    setEditingSummaryId(null);
    setSummaryEdits((s) => { const n = { ...s }; delete n[docId]; return n; });
    toast.success("Summary saved");
  };

  const handleDeleteDoc = (doc: any) => {
    const docName: string = doc.name || doc.storage_path?.split("/").pop() || "Document";
    console.log("Delete initiated for:", doc.id, "storage:", doc.storage_path);
    let toastId: string | number;
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(doc.id);
      console.log("Executing delete for doc:", doc.id);
      const { error: dbError } = await supabase.from("documents").delete().eq("id", doc.id);
      console.log("DB delete result:", dbError ?? "success");
      if (dbError) {
        toast.error(`Failed to delete "${docName}": ${dbError.message}`);
        return;
      }
      if (doc.storage_path) {
        const { error: storageError } = await supabase.storage.from("documents").remove([doc.storage_path]);
        console.log("Storage delete result:", storageError ?? "success");
      }
      // DB confirmed deleted — update cache directly, no refetch (refetch would race and restore the row)
      queryClient.setQueryData(["documents", dealRoomId], (old: any) =>
        (old ?? []).filter((d: any) => d.id !== doc.id)
      );
      toast.success(`"${docName}" deleted`);
    }, 5000);
    pendingDeletes.current.set(doc.id, timer);
    toastId = toast(`"${docName}" will be deleted`, {
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingDeletes.current.get(doc.id);
          if (t) { clearTimeout(t); pendingDeletes.current.delete(doc.id); }
          toast.dismiss(toastId);
        },
      },
      duration: 5000,
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <div className="flex gap-2">
          {isFounder && (
            <button
              onClick={() => setShowLibrary(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-sm hover:bg-brand/10"
            >
              <Plus className="h-4 w-4" /> Add from library
            </button>
          )}
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">
            Request document
          </button>
        </div>
      </div>

      {isFounder && (
        <div className="mt-5">
          <Dropzone
            dealRoomId={dealRoomId}
            onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] })}
          />
        </div>
      )}

      {/* Library modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div className="text-sm font-semibold">Add from document library</div>
              <button
                onClick={() => setShowLibrary(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {libLoading && <div className="text-sm text-muted-foreground p-3 animate-pulse">Loading…</div>}
              {!libLoading && (libraryDocs as any[]).length === 0 && (
                <div className="text-sm text-muted-foreground p-3">
                  No personal documents without a deal room. Upload documents in the Documents page first.
                </div>
              )}
              {(libraryDocs as any[]).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {doc.name || doc.storage_path?.split("/").pop() || "Document"}
                    </div>
                    {doc.category && <div className="text-xs text-muted-foreground">{doc.category}</div>}
                  </div>
                  <button
                    onClick={() => addFromLibrary(doc.id)}
                    disabled={addingFromLib === doc.id}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {addingFromLib === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ndaDocs.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">System generated</div>
          <div className="rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
            {ndaDocs.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-success/10"><Shield className="h-4 w-4 text-success" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">Auto-generated NDA · {new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Signed by all</span>
                <button className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(docs as any[]).length > 0 && (
        <div className="mt-5 space-y-3">
          {(docs as any[]).map((doc) => {
            const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
            const displayName = rawName.replace(/^\d{13}-/, "");
            const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
            const hasSummary = !!doc.ai_summary;
            const isGenerating = generatingSummaryId === doc.id;
            const isEditing = editingSummaryId === doc.id;
            const supportsAI = TEXT_EXTS.has(ext);
            const catColor = CATEGORY_COLORS[doc.category] ?? "bg-accent text-muted-foreground";
            const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);

            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-xl bg-card shadow-card overflow-hidden",
                  hasSummary ? "border border-border/60" : "border border-dashed border-border/60"
                )}
              >
                {/* Doc header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", iconBg)}>
                    <FileIcon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{displayName}</span>
                      {doc.category && (
                        <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded-full", catColor)}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {doc.uploader?.full_name ?? "Unknown"} · {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {(isFounder || doc.uploader_id === userId) && (
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        title="Delete document"
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Summary section — only for text-based files */}
                {supportsAI && (
                  <div className="border-t border-border/40">
                    {isEditing ? (
                      <div className="px-4 py-3 space-y-2">
                        <textarea
                          value={summaryEdits[doc.id] ?? doc.ai_summary ?? ""}
                          onChange={(e) => setSummaryEdits((s) => ({ ...s, [doc.id]: e.target.value }))}
                          rows={5}
                          className="w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSummaryEdit(doc.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSummaryId(null)}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : hasSummary ? (
                      <div className="px-4 py-3">
                        {/* Summary header */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                          <span className="text-xs font-medium text-brand flex-1">AI Summary</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", doc.summary_edited ? "bg-brand/10 text-brand" : "bg-muted/60 text-muted-foreground")}>
                            {doc.summary_edited ? "Edited" : "AI"}
                          </span>
                        </div>
                        {/* Summary panel */}
                        <div className="rounded-lg border-l-2 border-brand/40 bg-muted/30 pl-3 pr-3 py-3">
                          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{doc.ai_summary}</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => generateSummary(doc)}
                              disabled={isGenerating}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-2.5 py-1 hover:bg-accent disabled:opacity-50"
                            >
                              {isGenerating ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</> : "Regenerate"}
                            </button>
                            {isFounder && (
                              <button
                                onClick={() => {
                                  setEditingSummaryId(doc.id);
                                  setSummaryEdits((s) => ({ ...s, [doc.id]: doc.ai_summary! }));
                                }}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-2.5 py-1 hover:bg-accent"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* No summary yet — compact generate row */
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="text-xs font-medium text-brand flex-1">AI Summary</span>
                        <span className="text-xs text-muted-foreground italic mr-2">Not generated yet</span>
                        <button
                          onClick={() => generateSummary(doc)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2.5 py-1 text-xs font-medium shadow-sm disabled:opacity-50"
                        >
                          {isGenerating
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                            : <><Sparkles className="h-3 w-3" /> Generate</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(docs as any[]).length === 0 && (
        <div className="mt-8 rounded-xl border border-border/60 bg-card shadow-card p-10 flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">No documents yet</div>
          <div className="text-xs text-muted-foreground max-w-xs">
            {isFounder
              ? "Upload files above or add from your document library."
              : "The founder hasn't shared any documents yet."}
          </div>
        </div>
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

// ── Participants ───────────────────────────────────────────────────
function DocPreviewModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
  const displayName = rawName.replace(/^\d{13}-/, "");
  const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

  useEffect(() => {
    supabase.storage.from("documents").createSignedUrl(doc.storage_path, 300).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [doc.storage_path]);

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="text-sm font-semibold truncate">{displayName}</div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          {isImage && url ? (
            <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">{displayName}</div>
                <div className="text-xs text-muted-foreground mt-1">This file type requires downloading to view.</div>
              </div>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 text-sm font-medium shadow-sm"
                >
                  <Download className="h-4 w-4" /> Download to view
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantsSection({ dealRoomId }: { dealRoomId: string }) {
  const all = useParticipants();
  const list = all.filter((p) => p.dealRoomId === dealRoomId);
  const statusColor = (s: string) =>
    s === "NDA Accepted" || s === "Active" ? "bg-success/10 text-success"
      : s === "Joined" ? "bg-brand/10 text-brand"
      : "bg-warning/10 text-warning";
  return (
    <div className="px-8 pb-10 max-w-5xl mx-auto">
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand" /> Participants</div>
          <button className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><UserPlus className="h-3.5 w-3.5" /> Invite</button>
        </div>
        {list.length === 0 ? (
          <div className="mt-4 text-xs text-muted-foreground">No participants yet.</div>
        ) : (
          <div className="mt-4 divide-y divide-border/60">
            {list.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 py-3 items-center text-sm">
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0">{p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</div>
                  <span className="font-medium truncate">{p.name}</span>
                </div>
                <div className="col-span-3 text-muted-foreground truncate">{p.email}</div>
                <div className="col-span-2 text-muted-foreground truncate">{p.role}</div>
                <div className="col-span-2 text-muted-foreground truncate">{p.company || "—"}</div>
                <div className="col-span-1"><span className={cn("text-[10px] px-2 py-0.5 rounded", statusColor(p.status))}>{p.status}</span></div>
                <div className="col-span-1 text-right text-xs text-muted-foreground">{p.dateJoined ?? "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────
function InviteModal({
  dealRoomId, dealRoomName, companyName, founderName, invitedBy, onClose, onSent,
}: {
  dealRoomId: string;
  dealRoomName: string;
  companyName: string;
  founderName: string;
  invitedBy: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentLink, setSentLink] = useState("");
  const [copied, setCopied] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !invitedBy) return;
    setSending(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await sendInviteEmail({
        data: {
          dealRoomId,
          email,
          role: "investor",
          invitedBy,
          userAccessToken: session?.access_token ?? "",
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          appUrl: import.meta.env.VITE_APP_URL,
          dealRoomName,
          founderName,
          startupName: companyName,
          message: message || undefined,
        },
      });
      if (!result.success) throw new Error(result.error ?? "Failed to send invite");
      setSentLink(result.inviteLink ?? "");
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold">Invite investor to deal room</div>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {sentLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-success/10 text-success px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Invite sent to {email}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Or share this link directly</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={sentLink}
                    className="flex-1 rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs font-mono text-muted-foreground focus:outline-none min-w-0"
                  />
                  <button
                    onClick={copyLink}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Investor email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@firm.com"
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Personal message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Hi, I'd love to share our deal room with you…"
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!email || sending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sending ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ── Notes ─────────────────────────────────────────────────────────
function Notes({ dealRoomId, userId }: { dealRoomId: string; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: notes = [], isLoading, isError } = useQuery({
    queryKey: ["notes", dealRoomId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const filter = userId ? `private.eq.false,author_id.eq.${userId}` : "private.eq.false";
      const { data, error } = await supabase
        .from("notes")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .or(filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("notes")
        .insert({ deal_room_id: dealRoomId, author_id: userId, body: body.trim(), private: isPrivate });
      if (error) throw error;
      await logActivity(dealRoomId, userId, "Added a note");
      queryClient.invalidateQueries({ queryKey: ["notes", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["activities-overview", dealRoomId] });
      setBody("");
      setIsPrivate(false);
      toast.success("Note saved");
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error("Failed to save note — check console for details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Notes</h2>

      <form onSubmit={submit} className="mt-5 rounded-xl border border-border/60 bg-card p-4 shadow-card space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note…"
          rows={3}
          className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
            <span className="text-xs text-muted-foreground">Private (only visible to me)</span>
          </label>
          <button type="submit" disabled={!body.trim() || saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save note
          </button>
        </div>
      </form>

      {isError && <p className="mt-4 text-sm text-destructive">Could not load data. Please refresh.</p>}
      {isLoading && <div className="mt-4 text-sm text-muted-foreground animate-pulse">Loading…</div>}

      <div className="mt-5 grid gap-3">
        {(notes as any[]).map((n) => (
          <div key={n.id} className={`rounded-xl border border-border/60 p-4 shadow-card ${n.private ? "bg-warning/5 border-warning/30" : "bg-card"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{n.author_id === userId ? "You" : (n.users?.full_name ?? "Unknown")}</span>
              <span className="text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
              {n.private && <span className="ml-auto text-[10px] uppercase tracking-wider text-warning">Private</span>}
            </div>
            <div className="mt-2 text-sm">{n.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline({ dealRoomId }: { dealRoomId: string }) {
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["activities", dealRoomId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const dotColor = (action: string) => {
    const a = action?.toLowerCase() ?? "";
    if (a.includes("signed") || a.includes("nda")) return "success";
    if (a.includes("upload") || a.includes("document")) return "brand";
    if (a.includes("message") || a.includes("question")) return "violet";
    if (a.includes("invited") || a.includes("member")) return "warning";
    return "muted-foreground";
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Activity</h2>
      {isError && <p className="mt-4 text-sm text-destructive">Could not load data. Please refresh.</p>}
      {isLoading && <div className="mt-4 text-sm text-muted-foreground animate-pulse">Loading…</div>}
      {!isLoading && !isError && events.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No activity yet. Activity is recorded automatically as the deal room is used.</p>
      )}
      {events.length > 0 && (
        <div className="mt-6 relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {(events as any[]).map((e) => (
            <div key={e.id} className="relative pb-6 last:pb-0">
              <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-${dotColor(e.action)} ring-4 ring-background`} />
              <div className="text-sm font-medium">{e.action}</div>
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {e.users?.full_name ? `${e.users.full_name} · ` : ""}
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingsTab({ dealRoomId, userId }: { dealRoomId: string; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ title: "", scheduledAt: "", meetingLink: "", notes: "" });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const { data: meetings = [], isLoading, isError } = useQuery({
    queryKey: ["meetings", dealRoomId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.scheduledAt || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("meetings").insert({
        deal_room_id: dealRoomId,
        title: f.title,
        scheduled_at: new Date(f.scheduledAt).toISOString(),
        meeting_link: f.meetingLink || null,
        notes: f.notes || null,
        created_by: userId,
      });
      if (error) throw error;
      await logActivity(dealRoomId, userId, "Scheduled a meeting", { title: f.title });
      queryClient.invalidateQueries({ queryKey: ["meetings", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["activities-overview", dealRoomId] });
      setF({ title: "", scheduledAt: "", meetingLink: "", notes: "" });
      setShowForm(false);
      toast.success("Meeting scheduled");
    } catch (err) {
      console.error("Failed to schedule meeting:", err);
      toast.error("Failed to schedule meeting — check console for details");
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const upcoming = (meetings as any[]).filter((m) => new Date(m.scheduled_at) >= now);
  const past = (meetings as any[]).filter((m) => new Date(m.scheduled_at) < now);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Meetings</h2>
        <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow">
          <Plus className="h-4 w-4" /> Schedule meeting
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-5 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Title *</label>
            <input required value={f.title} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Date &amp; Time *</label>
            <input type="datetime-local" required value={f.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Meeting link</label>
            <input type="url" value={f.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="Zoom / Google Meet / Teams link" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-border/60 px-3 py-1.5 text-sm">Cancel</button>
            <button type="submit" disabled={!f.title || !f.scheduledAt || saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm disabled:opacity-50">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Add meeting
            </button>
          </div>
        </form>
      )}

      {isError && <p className="mt-4 text-sm text-destructive">Could not load data. Please refresh.</p>}
      {isLoading && <div className="mt-4 text-sm text-muted-foreground animate-pulse">Loading…</div>}

      {upcoming.length > 0 && (
        <>
          <div className="mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Upcoming</div>
          <div className="mt-2 space-y-3">{upcoming.map((m: any) => <MeetingCard key={m.id} m={m} />)}</div>
        </>
      )}
      {past.length > 0 && (
        <>
          <div className="mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Past</div>
          <div className="mt-2 space-y-3 opacity-60">{past.map((m: any) => <MeetingCard key={m.id} m={m} />)}</div>
        </>
      )}
      {!isLoading && meetings.length === 0 && !showForm && (
        <p className="mt-6 text-sm text-muted-foreground">No meetings scheduled yet.</p>
      )}
    </div>
  );
}

function MeetingCard({ m }: { m: any }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold">{m.title}</div>
        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(m.scheduled_at), "EEE, d MMM · h:mm a")}</span>
      </div>
      {m.notes && <div className="mt-1 text-sm text-muted-foreground">{m.notes}</div>}
      {m.meeting_link && (
        <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10">
          <ExternalLink className="h-3 w-3" /> Join meeting
        </a>
      )}
    </div>
  );
}

// ── Investor Decision Tab ─────────────────────────────────────────
function InvestorDecisionTab({ dealRoomId, userId }: { dealRoomId: string; userId?: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({
    team: 0, market: 0, product: 0, traction: 0, deal_terms: 0, overall_fit: 0,
  });
  const [loaded, setLoaded] = useState(false);

  const { data: decisionData } = useQuery({
    queryKey: ["investor-decision-tab", dealRoomId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("investor_decision, investor_scores, investor_notes")
        .eq("id", dealRoomId)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (decisionData && !loaded) {
      setNotes((decisionData as any).investor_notes ?? "");
      if ((decisionData as any).investor_scores) {
        setScores((s) => ({ ...s, ...((decisionData as any).investor_scores as Record<string, number>) }));
      }
      setLoaded(true);
    }
  }, [decisionData, loaded]);

  const currentDecision = (decisionData as any)?.investor_decision as string | null;

  const handleDecision = async (d: string) => {
    setSaving(true);
    try {
      await supabase.from("deal_rooms").update({ investor_decision: d }).eq("id", dealRoomId);
      await queryClient.invalidateQueries({ queryKey: ["investor-decision-tab", dealRoomId] });
      await queryClient.invalidateQueries({ queryKey: ["investor-decisions-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["investor-rooms"] });
      toast.success(`Decision set: ${d}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssessment = async () => {
    setSavingAssessment(true);
    try {
      await supabase.from("deal_rooms").update({ investor_notes: notes, investor_scores: scores }).eq("id", dealRoomId);
      await queryClient.invalidateQueries({ queryKey: ["investor-decision-tab", dealRoomId] });
      toast.success("Assessment saved");
    } finally {
      setSavingAssessment(false);
    }
  };

  const setScore = (key: string, val: number) => setScores((s) => ({ ...s, [key]: val }));

  const scoreCategories = [
    { key: "team", label: "Team" },
    { key: "market", label: "Market" },
    { key: "product", label: "Product" },
    { key: "traction", label: "Traction" },
    { key: "deal_terms", label: "Deal terms" },
    { key: "overall_fit", label: "Overall fit" },
  ];

  const decisionConfig = {
    invest: { label: "Invest", emoji: "✅", cls: "border-success/40 text-success hover:bg-success/10", activeCls: "bg-success/15 border-success text-success font-semibold" },
    hold: { label: "Hold", emoji: "⏸", cls: "border-warning/40 text-warning hover:bg-warning/10", activeCls: "bg-warning/15 border-warning text-warning font-semibold" },
    pass: { label: "Pass", emoji: "❌", cls: "border-destructive/40 text-destructive hover:bg-destructive/10", activeCls: "bg-destructive/15 border-destructive text-destructive font-semibold" },
  } as const;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Investment Decision</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your confidential assessment of this deal</p>

      {/* Decision buttons */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {(["invest", "hold", "pass"] as const).map((key) => {
          const cfg = decisionConfig[key];
          return (
            <button
              key={key}
              onClick={() => handleDecision(key)}
              disabled={saving}
              className={cn(
                "rounded-xl border px-4 py-5 text-sm transition-all disabled:opacity-50 flex flex-col items-center gap-2",
                currentDecision === key ? cfg.activeCls : cfg.cls,
              )}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {currentDecision && (
        <div className="mt-3 text-xs text-muted-foreground">
          Current decision: <span className="font-medium capitalize">{currentDecision}</span>
        </div>
      )}

      {/* Scoring */}
      <div className="mt-8 rounded-xl border border-border/60 bg-card p-5 shadow-card">
        <div className="text-sm font-semibold mb-4">Scoring</div>
        <div className="space-y-4">
          {scoreCategories.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-24 text-sm text-muted-foreground shrink-0">{label}</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setScore(key, star)}
                    className={cn(
                      "text-xl leading-none transition-colors hover:text-warning",
                      star <= (scores[key] ?? 0) ? "text-warning" : "text-muted-foreground/25",
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">
                {scores[key] ? `${scores[key]}/5` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-5">
        <div className="text-sm font-semibold mb-2">Decision notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Your private notes about this investment decision…"
          rows={5}
          className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand/50"
        />
      </div>

      <button
        onClick={handleSaveAssessment}
        disabled={savingAssessment}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50"
      >
        {savingAssessment && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save assessment
      </button>
    </div>
  );
}

function Decision({ isInvestor, dealRoomId, userId, queryClient }: { isInvestor: boolean; dealRoomId: string; userId?: string; queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: existingDecision, isLoading: decisionLoading } = useQuery({
    queryKey: ["decision", dealRoomId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"accepted" | "hold" | "pass" | null>(null);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingDecision) {
      setStatus(existingDecision.status as "accepted" | "hold" | "pass");
      setRisk((existingDecision.risk_level as "low" | "medium" | "high") ?? "low");
      setNotes(existingDecision.notes ?? "");
    }
  }, [existingDecision]);

  const showForm = editing || (!decisionLoading && !existingDecision);

  const save = async (submit = false) => {
    if (!userId || !status) return;
    setSaving(true);
    await supabase.from("decisions").insert({
      deal_room_id: dealRoomId,
      decided_by: userId,
      status,
      risk_level: risk,
      notes,
    });
    if (submit) {
      await logActivity(dealRoomId, userId, `Submitted a decision: ${status}`);
      toast.success("Decision saved");
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
    queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
    setEditing(false);
    setSaving(false);
  };

  if (!isInvestor) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold tracking-tight">Investor decisions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Real-time view of where each investor stands.</p>
        <div className="mt-6 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
          {[
            ["Investor A", "Reviewing", "warning", "Awaiting partner meeting"],
            ["Investor B", "Requested info", "brand", "Asked for Q4 cohort details"],
            ["Investor C", "Accepted", "success", "Ready to sign term sheet"],
          ].map(([n, s, c, note]: any) => (
            <div key={n} className="flex items-center gap-4 px-5 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-semibold">{n.split(" ").map((x: string) => x[0]).join("")}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{n}</div>
                <div className="text-xs text-muted-foreground">{note}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-md bg-${c}/10 text-${c}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusMeta: Record<string, { label: string; color: string }> = {
    accepted: { label: "Accept", color: "success" },
    hold: { label: "Request info", color: "warning" },
    pass: { label: "Pass", color: "destructive" },
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Your decision</h2>
      <p className="mt-1 text-sm text-muted-foreground">One-click. Founder is notified immediately.</p>

      {existingDecision && !editing && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Current decision</div>
            <button onClick={() => setEditing(true)} className="text-xs text-brand hover:underline">Update decision</button>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {existingDecision.status && (
              <span className={`text-xs px-2 py-1 rounded-md bg-${statusMeta[existingDecision.status]?.color}/10 text-${statusMeta[existingDecision.status]?.color}`}>
                {statusMeta[existingDecision.status]?.label}
              </span>
            )}
            <span className="text-xs text-muted-foreground capitalize">Risk: {existingDecision.risk_level}</span>
            <span className="text-xs text-muted-foreground">
              {existingDecision.users?.full_name ?? "You"} · {formatDistanceToNow(new Date(existingDecision.created_at), { addSuffix: true })}
            </span>
          </div>
          {existingDecision.notes && <p className="mt-3 text-sm text-muted-foreground">{existingDecision.notes}</p>}
        </div>
      )}

      {showForm && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {([
              ["accept", "Accept", "Move to term sheet", ThumbsUp, "success"],
              ["hold", "Request info", "Ask for more diligence", HelpCircle, "warning"],
              ["pass", "Pass", "Decline this round", ThumbsDown, "destructive"],
            ] as const).map(([k, l, sub, I, c]) => (
              <button
                key={k}
                onClick={() => setStatus(k)}
                className={cn("rounded-xl border-2 p-5 text-left transition-colors", status === k ? `border-${c} bg-${c}/5` : "border-border/60 hover:border-border")}
              >
                <I className={`h-5 w-5 text-${c}`} />
                <div className="mt-3 text-sm font-semibold">{l}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Risk level</div>
            <div className="mt-3 flex gap-2">
              {(["low", "medium", "high"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={cn("flex-1 rounded-md border px-3 py-2 text-sm capitalize", risk === r ? "border-success bg-success/10 text-success" : "border-border/60 hover:bg-accent")}
                >{r}</button>
              ))}
            </div>
            <div className="mt-6 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Partner notes (private)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your investment thesis notes…"
              className="mt-3 w-full min-h-[120px] rounded-md border border-border/60 bg-background p-3 text-sm focus:outline-none focus:border-brand/50"
            />
            <div className="mt-5 flex justify-end gap-2">
              {editing && <button onClick={() => setEditing(false)} className="rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent">Cancel</button>}
              <button onClick={() => save(false)} disabled={saving} className="rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent disabled:opacity-50">Save draft</button>
              <button onClick={() => save(true)} disabled={!status || saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit decision
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Structured Q&A + live discussion ──────────────────────────────
function QA({
  dealRoomId,
  userId,
  userName,
  isInvestor,
  isFounder,
  companyName = "",
  sector = "",
}: {
  dealRoomId: string;
  userId: string | undefined;
  userName: string;
  isInvestor: boolean;
  isFounder: boolean;
  companyName?: string;
  sector?: string;
}) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [openQaId, setOpenQaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [draftingAiReplyId, setDraftingAiReplyId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*, users(full_name)")
      .eq("deal_room_id", dealRoomId)
      .eq("private_to_org", false)
      .order("created_at", { ascending: true });
    if (error) setLoadError(true);
    else setMsgs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    loadMessages();
  }, [dealRoomId, userId]);

  useEffect(() => {
    const channel = supabase
      .channel("qa-" + dealRoomId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: "deal_room_id=eq." + dealRoomId },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.private_to_org) return;
          let senderName = userName;
          if (msg.sender_id !== userId) {
            const { data } = await supabase.from("users").select("full_name").eq("id", msg.sender_id).maybeSingle();
            senderName = data?.full_name ?? "Unknown";
          }
          setMsgs((xs) => xs.find((x) => x.id === msg.id) ? xs : [...xs, { ...msg, users: { full_name: senderName } }]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: "deal_room_id=eq." + dealRoomId },
        (payload) => {
          setMsgs((xs) => xs.map((x) => x.id === (payload.new as any).id ? { ...x, ...(payload.new as any) } : x));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, userId, userName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const structured = msgs.filter((m) => !!m.is_qa);
  const discussion = msgs.filter((m) => !m.is_qa);

  const askQuestion = async () => {
    const text = question.trim();
    if (!text || !userId || !isInvestor) return;
    setAsking(true);
    const { data } = await supabase
      .from("messages")
      .insert({
        deal_room_id: dealRoomId,
        sender_id: userId,
        body: text,
        private_to_org: false,
        is_qa: true,
        metadata: { authorName: userName, authorRole: "Investor" },
      })
      .select("id")
      .maybeSingle();
    if (data?.id) {
      await logActivity(dealRoomId, userId, "Asked a structured Q&A question", { question: text });
      setQuestion("");
      setOpenQaId(data.id);
      // Fetch AI suggestions for follow-up questions
      try {
        const result = await getQASuggestions({
          data: {
            question: text,
            startupName: companyName || "the startup",
            sector: sector || "tech",
            previousQuestions: msgs.filter((m) => m.is_qa).map((m) => m.body).slice(-5),
          },
        });
        if (result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
          if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
          suggestionsTimerRef.current = setTimeout(() => setSuggestions([]), 30000);
        }
      } catch {
        // suggestions are non-critical, silently skip
      }
    }
    setAsking(false);
  };

  const saveAnswer = async (messageId: string) => {
    const answer = (answerDrafts[messageId] ?? "").trim();
    if (!answer || !userId || !isFounder) return;
    setAnsweringId(messageId);
    const current = msgs.find((m) => m.id === messageId);
    await supabase
      .from("messages")
      .update({
        metadata: {
          ...(current?.metadata ?? {}),
          answer,
          answeredBy: userName,
          answeredAt: new Date().toISOString(),
        },
      })
      .eq("id", messageId);
    await logActivity(dealRoomId, userId, "Answered a structured Q&A question", { question_id: messageId });
    setAnswerDrafts((drafts) => ({ ...drafts, [messageId]: "" }));
    setAnsweringId(null);
    toast.success("Answer posted");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !userId) return;
    setSending(true);
    const optId = crypto.randomUUID();
    setMsgs((xs) => [...xs, { id: optId, sender_id: userId, body: text, created_at: new Date().toISOString(), private_to_org: false, is_qa: false, users: { full_name: userName }, _opt: true }]);
    setInput("");
    const { data } = await supabase
      .from("messages")
      .insert({ deal_room_id: dealRoomId, sender_id: userId, body: text, private_to_org: false, is_qa: false })
      .select("id")
      .maybeSingle();
    if (data?.id) {
      setMsgs((xs) => xs.map((x) => x.id === optId ? { ...x, id: data.id, _opt: false } : x));
      // Notify other deal room members
      const { data: members } = await supabase
        .from("deal_room_members")
        .select("user_id")
        .eq("deal_room_id", dealRoomId)
        .neq("user_id", userId!);
      for (const m of members ?? []) {
        await createNotification(
          m.user_id,
          "New Q&A message",
          text.slice(0, 100),
          "message",
          dealRoomId,
          `/app/deal-room/${dealRoomId}`,
        );
      }
    }
    setSending(false);
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Q&amp;A</h2>
            <p className="mt-1 text-sm text-muted-foreground">Structured diligence questions stay separate from the live discussion.</p>
          </div>
          {isInvestor && (
            <button
              onClick={() => document.getElementById("ask-question-box")?.focus()}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground shadow-glow"
            >
              <Plus className="h-4 w-4" /> Ask question
            </button>
          )}
        </div>

        <section className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="border-b border-border/60 p-5">
            <div className="text-sm font-semibold">Structured Q&amp;A</div>
            <div className="mt-1 text-xs text-muted-foreground">Investor questions and founder answers, organized as expandable cards.</div>
          </div>

          {isInvestor && (
            <div className="border-b border-border/60 p-5">
              <textarea
                id="ask-question-box"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  if (e.target.value && suggestions.length > 0) {
                    setSuggestions([]);
                    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
                  }
                }}
                rows={3}
                placeholder="Ask a diligence question for the founder..."
                className="w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-brand" /> Suggested follow-ups
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuestion(s);
                          setSuggestions([]);
                          if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
                          document.getElementById("ask-question-box")?.focus();
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/5 text-brand px-3 py-1 text-xs hover:bg-brand/10 transition-colors"
                      >
                        <HelpCircle className="h-3 w-3 shrink-0" /> {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={askQuestion}
                  disabled={!question.trim() || asking}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
                >
                  {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ask question
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border/60">
            {loading && <div className="p-5 text-sm text-muted-foreground animate-pulse">Loading…</div>}
            {loadError && <p className="p-5 text-sm text-destructive">Could not load data. Please refresh.</p>}
            {!loading && !loadError && structured.length === 0 && (
              <div className="p-5 text-sm text-muted-foreground">No structured questions yet.</div>
            )}
            {structured.map((item) => {
              const answer = item.metadata?.answer ?? "";
              const author = item.metadata?.authorName || item.users?.full_name || "Investor";
              const open = openQaId === item.id;
              const words = countWords(answer);
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setOpenQaId(open ? null : item.id)}
                    className="flex w-full items-start gap-3 p-5 text-left hover:bg-accent/40"
                  >
                    <div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", answer ? "bg-success/10 text-success" : "bg-brand/10 text-brand")}>
                      {answer ? <CheckCircle2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{item.body}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Asked by {author} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-medium", answer ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                        {answer ? `${words} words` : "Awaiting answer"}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-border/60 bg-background/60 px-5 py-4">
                      {answer ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>Founder answer</span>
                            <span>{words} words</span>
                          </div>
                          <p className="text-sm leading-relaxed">{answer}</p>
                          {item.metadata?.answeredAt && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              Answered by {item.metadata?.answeredBy || "Founder"} · {formatDistanceToNow(new Date(item.metadata.answeredAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      ) : isFounder ? (
                        <div>
                          <textarea
                            value={answerDrafts[item.id] ?? ""}
                            onChange={(e) => setAnswerDrafts((drafts) => ({ ...drafts, [item.id]: e.target.value }))}
                            rows={4}
                            placeholder="Answer this question..."
                            className="w-full resize-none rounded-md border border-border/60 bg-card px-3 py-2 text-sm outline-none focus:border-brand/50"
                          />
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">{countWords(answerDrafts[item.id] ?? "")} words</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  if (!userId || draftingAiReplyId === item.id) return;
                                  setDraftingAiReplyId(item.id);
                                  try {
                                    const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || "";
                                    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAIKey}` },
                                      body: JSON.stringify({
                                        model: "gpt-4o-mini",
                                        max_tokens: 300,
                                        temperature: 0.7,
                                        messages: [
                                          { role: "system", content: "You are a startup founder assistant. Write a clear, professional answer to an investor due-diligence question. Return only the answer text, under 120 words, no markdown symbols." },
                                          { role: "user", content: `Investor question: "${item.body}"\n\nWrite a founder's answer.` },
                                        ],
                                      }),
                                    });
                                    const json = await resp.json() as { choices: Array<{ message: { content: string } }> };
                                    const draft = (json.choices[0]?.message?.content ?? "").trim();
                                    if (draft) setAnswerDrafts((d) => ({ ...d, [item.id]: draft }));
                                  } catch {
                                    toast.error("AI draft failed");
                                  } finally {
                                    setDraftingAiReplyId(null);
                                  }
                                }}
                                disabled={draftingAiReplyId === item.id}
                                className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 text-brand px-3 py-2 text-sm font-medium hover:bg-brand/5 disabled:opacity-50"
                              >
                                {draftingAiReplyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                AI Draft
                              </button>
                              <button
                                onClick={() => saveAnswer(item.id)}
                                disabled={!answerDrafts[item.id]?.trim() || answeringId === item.id}
                                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
                              >
                                {answeringId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Post answer
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">The founder has not answered this question yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="border-b border-border/60 p-5">
            <div className="text-sm font-semibold">Live discussion</div>
            <div className="mt-1 text-xs text-muted-foreground">Informal back-and-forth for quick clarifications.</div>
          </div>

          <div ref={scrollRef} className="max-h-[360px] overflow-y-auto px-5 py-4 space-y-3">
            {loading && <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>}
            {!loading && !loadError && discussion.length === 0 && (
              <div className="text-sm text-muted-foreground">No live discussion yet.</div>
            )}
            {discussion.map((m, i) => {
              const isMe = m.sender_id === userId;
              const name = isMe ? userName : (m.users?.full_name ?? "Unknown");
              const prev = discussion[i - 1];
              const grouped = prev && prev.sender_id === m.sender_id;
              const initials = name.split(" ").map((s: string) => s[0]).slice(0, 2).join("");
              return (
                <div key={m.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "")}>
                  <div className={cn("h-8 w-8 shrink-0", grouped && "invisible")}>
                    <div className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", isMe ? "bg-gradient-brand text-brand-foreground" : "bg-accent")}>
                      {initials}
                    </div>
                  </div>
                  <div className={cn("max-w-[72%]", isMe && "items-end flex flex-col")}>
                    {!grouped && (
                      <div className={cn("mb-1 flex items-center gap-2 text-[11px]", isMe && "flex-row-reverse")}>
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground">{format(new Date(m.created_at), "h:mm a")}</span>
                      </div>
                    )}
                    <div className={cn("rounded-2xl px-3.5 py-2 text-sm", isMe ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm")}>
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/60 bg-background px-5 py-4">
            <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Post to live discussion..."
                className="max-h-32 flex-1 resize-none bg-transparent py-1 text-sm outline-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || !userId || sending}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-3 py-1.5 text-xs text-brand-foreground disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}
