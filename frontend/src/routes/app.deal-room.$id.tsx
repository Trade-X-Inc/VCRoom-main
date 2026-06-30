import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  LayoutGrid, FileText, FolderOpen, MessageSquare, ListChecks, StickyNote, Activity,
  Calendar, Gavel, Download, CheckCircle2, AlertTriangle, Clock, Plus,
  ArrowLeft, Lock, Sparkles, X, MessagesSquare, ThumbsUp, ThumbsDown,
  HelpCircle, Building2, TrendingUp, Users, DollarSign, Target, Shield,
  Send, AlertCircle, Eye, UserPlus, Loader2, ExternalLink, ChevronDown,
  Check, ClipboardList, Copy, Trash2, Pencil, Image, Film,
  ChevronUp, Lightbulb, Upload, Link as LinkIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AIChat } from "@/components/ai/AIChat";
import { DealRoomChat } from "@/components/app/DealRoomChat";
import { DDWorkstation } from "@/components/app/DDWorkstation";
import { Dropzone } from "@/components/app/Dropzone";
import { useAuth } from "@/lib/auth";
import { supabase, logActivity, createNotification } from "@/lib/supabase";
import { DocumentWishlist } from "@/components/app/DocumentWishlist";
import { generateDocSummary, secureAICall } from "@/lib/ai-secure-fn";
import { extractDocumentText } from "@/lib/document-extractor";
import { DealTermsCard } from "@/components/app/DealTermsCard";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { FieldVerificationBadge, prewarmClassificationCache } from "@/components/app/FieldVerificationBadge";
import type { StartupClaim } from "@/lib/claims-fn";
import {
  useParticipants, useGeneratedNdaDocs,
  participantsStore, qaStore,
  type QAQuestion, type Participant,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { PageGuide } from "@/components/app/PageGuide";
import { sendInviteEmail } from "@/lib/invite-fn";
import { getQASuggestions } from "@/lib/qa-suggestions-fn";
import { triggerDecisionEmail, triggerMeetingEmail, triggerDocumentUploadedEmail } from "@/lib/email/triggers";
import { Stage2Gate } from "@/components/app/DealRoomWorkflow";
import { withTimeout, AITimeoutError } from "@/lib/with-timeout";
import { AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { useStageTransition } from "@/hooks/useStageTransition";
import {
  advanceDealStage, skipMeeting, completeMeeting, updateMeetingNotes,
  sendTermSheet, respondToTermSheet, createDocumentRequest, respondToDocumentRequest, passDeal,
  DEAL_STAGES, type DealStage,
} from "@/lib/deal-room-fn";

const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf","pptx","ppt","xlsx","xls","docx","doc","csv","png","jpg","jpeg"]);
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const Route = createFileRoute("/app/deal-room/$id")({
  component: DealRoom,
});

type DealRoomRecord = Record<string, any>;
type StartupRecord = Record<string, any>;
type InvestorProfileRecord = {
  your_name?: string | null;
  fund_name?: string | null;
  thesis?: string | null;
  thesis_statement?: string | null;
  sectors?: string | string[] | null;
  match_score?: number | string | null;
};

type DealRoomStageKey =
  | "overview"
  | "information_vault"
  | "qa"
  | "due_diligence"
  | "term_sheet"
  | "closing";

const STAGES: { key: DealRoomStageKey; label: string; icon: string | null }[] = [
  { key: "overview", label: "Overview", icon: "⬛" },
  { key: "information_vault", label: "Information Vault", icon: null },
  { key: "qa", label: "Q&A", icon: null },
  { key: "due_diligence", label: "Due Diligence", icon: null },
  { key: "term_sheet", label: "Term Sheet", icon: "🔒" },
  { key: "closing", label: "Closing", icon: "🔒" },
];

const UI_STAGE_ORDER: DealRoomStageKey[] = [
  "overview",
  "information_vault",
  "qa",
  "due_diligence",
  "term_sheet",
  "closing",
];

const UI_TO_DEAL_STAGE: Record<Exclude<DealRoomStageKey, "overview">, DealStage> = {
  information_vault: "initial_review",
  qa: "initial_review",
  due_diligence: "diligence",
  term_sheet: "term_sheet",
  closing: "closed",
};

function stageRank(stage?: string | null): number {
  const normalized = stage ?? "";
  if (normalized === "closing" || normalized === "closed") return UI_STAGE_ORDER.indexOf("closing");
  if (normalized === "term_sheet") return UI_STAGE_ORDER.indexOf("term_sheet");
  if (normalized === "due_diligence" || normalized === "diligence") return UI_STAGE_ORDER.indexOf("due_diligence");
  if (normalized === "qa" || normalized === "initial_review") return UI_STAGE_ORDER.indexOf("qa");
  if (normalized === "information_vault" || normalized === "nda_signed") return UI_STAGE_ORDER.indexOf("information_vault");
  return UI_STAGE_ORDER.indexOf("overview");
}

function workflowStageLabel(stage?: string | null) {
  if (!stage) return "—";
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const STAGE_SHORT: Record<DealStage, string> = {
  nda_signed: "Information Vault",
  initial_review: "Q&A",
  diligence: "Due Diligence",
  term_sheet: "Term Sheet",
  closed: "Closing",
};

function DealRoom() {
  const { id: dealRoomId } = Route.useParams();
  const [aiOpen, setAiOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [viewStage, setViewStage] = useState<DealStage | null>(null);
  const [showOverview, setShowOverview] = useState(true);
  const [activeStageKey, setActiveStageKey] = useState<Exclude<DealRoomStageKey, "overview">>("information_vault");
  const [qaUnlockedByNext, setQaUnlockedByNext] = useState(false);
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
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("id, user_id, role, deal_room_id, users(full_name, avatar_url)")
        .eq("deal_room_id", dealRoomId);
      return data ?? [];
    },
  });

  const { data: investorProfile } = useQuery({
    queryKey: ["deal-room-investor-profile", (room as any)?.investor_user_id],
    enabled: !!(room as any)?.investor_user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("your_name, fund_name, thesis, thesis_statement, sectors")
        .eq("user_id", (room as any).investor_user_id)
        .maybeSingle();
      return data as InvestorProfileRecord | null;
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

  // Check if current user is the actual startup owner (founder_id match)
  const { data: ownedStartup } = useQuery({
    queryKey: ["owned-startup-check", user?.id],
    enabled: !!user?.id && !isInvestor,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const isStartupOwner = !!ownedStartup;

  const { data: teamAccountRow } = useQuery({
    queryKey: ["team-account-row", user?.id],
    enabled: !!user?.id && !isInvestor && !isStartupOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_team_accounts")
        .select("id, startup_id, role")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const isAdminTeamMember = teamAccountRow?.role === "admin";
  const isTeamMember = !!teamAccountRow && !isInvestor && !isStartupOwner && !isAdminTeamMember;

  const { data: teamAssignment, isLoading: teamAssignmentLoading } = useQuery({
    queryKey: ["team-assignment-gate", dealRoomId, teamAccountRow?.id],
    enabled: isTeamMember && !!teamAccountRow?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select("deal_room_id")
        .eq("deal_room_id", dealRoomId)
        .eq("team_account_id", teamAccountRow!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const companyName = (room as any)?.startups?.company_name ?? "Unknown Company";
  const currentStage = ((room as any)?.workflow_stage ?? "nda_signed") as DealStage;
  const currentIndex = DEAL_STAGES.indexOf(currentStage);

  const drFounderUserId: string | null = (room as any)?.startups?.founder_id ?? null;
  const drInvestorUserId: string | null = (room as any)?.investor_user_id ?? null;

  const {
    pendingTransition,
    requesting: stageRequesting,
    approving: stageApproving,
    requestNextStage: doRequestNextStage,
    approveTransition: doApproveTransition,
    rejectTransition: doRejectTransition,
  } = useStageTransition({
    dealRoomId,
    currentStage,
    isInvestor,
    userId: user?.id ?? "",
    investorUserId: drInvestorUserId,
    founderUserId: drFounderUserId,
  });

  // Current user is the approver if the pending request was made by the OTHER party
  const isApprover = !!pendingTransition && pendingTransition.requested_by !== (user?.id ?? "");

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
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Verifying access…</div>
      </div>
    );
  }

  // Team member access gate (A2)
  if (isTeamMember && !teamAssignmentLoading && teamAssignment === null) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-100/30">
          <Lock className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="text-center">
          <div className="font-semibold">Access restricted</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            You haven't been assigned to this deal room. Ask your team admin to give you access.
          </div>
        </div>
        <Link to="/app/deal-rooms" className="mt-2 text-sm text-brand hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to deal rooms
        </Link>
      </div>
    );
  }

  const activeStage = viewStage ?? UI_TO_DEAL_STAGE[activeStageKey];
  const viewingHistory = viewStage !== null && DEAL_STAGES.indexOf(viewStage) < currentIndex;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
      {/* ── Top header bar ─────────────────────────────────────── */}
      <header
        className="shrink-0 border-b bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
        data-testid="deal-stage-bar"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Left: back + company chip */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to={"/app/deal-rooms" as any}
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-accent shrink-0"
              title="All deal rooms"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid h-8 w-8 place-items-center rounded-lg shrink-0 font-semibold text-white"
              style={{ background: "#7C3AED" }}>
              {companyName[0] ?? "D"}
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate" style={{ fontFamily: "Syne, sans-serif" }}>{companyName}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{isInvestor ? "Founder · Deal Room" : "Investor · Deal Room"}</div>
            </div>
          </div>

          {/* Center: stage pills */}
          <StageBar
            workflowStage={(room as any)?.workflow_stage ?? "nda_signed"}
            isInvestor={isInvestor}
            activeStageKey={activeStageKey}
            showOverview={showOverview}
            qaUnlockedByNext={qaUnlockedByNext}
            onOverviewClick={() => {
              setShowOverview(true);
              setViewStage(null);
            }}
            onSelect={(stageKey) => {
              setShowOverview(false);
              setActiveStageKey(stageKey);
              setViewStage(UI_TO_DEAL_STAGE[stageKey]);
            }}
            onUnlockQa={() => {
              setQaUnlockedByNext(true);
              setShowOverview(false);
              setActiveStageKey("qa");
              setViewStage(UI_TO_DEAL_STAGE.qa);
            }}
          />

          {/* Right: activity + AI */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setActivityOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800"
              title="Activity"
              data-testid="open-activity"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ background: "#7C3AED" }}
              data-testid="open-ai"
            >
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content (full width) ──────────────────────────── */}
      <main key={showOverview ? "overview" : activeStage} className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-[#0A0A0B]">
        {/* Stage approval banner — shown to the approver whenever a pending transition exists */}
        {isApprover && pendingTransition && (
          <div
            className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3"
            data-testid="stage-approval-banner"
          >
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <span className="font-semibold">{pendingTransition.requested_by === drInvestorUserId ? "Investor" : "Founder"}</span>
              {" "}has requested to advance to{" "}
              <span className="font-semibold">{pendingTransition.to_stage.replace(/_/g, " ")}</span>.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => doRejectTransition(pendingTransition.id)}
                className="rounded-lg border border-red-300 dark:border-red-700 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                data-testid="stage-reject-btn"
              >
                Decline
              </button>
              <button
                onClick={() => doApproveTransition(pendingTransition.id)}
                disabled={stageApproving}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: "#10B981" }}
                data-testid="stage-approve-btn"
              >
                {stageApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Approve →
              </button>
            </div>
          </div>
        )}

        {showOverview ? (
          <OverviewPanel
            dealRoom={room as DealRoomRecord}
            startup={(room as any)?.startups as StartupRecord}
            investorProfile={investorProfile ?? undefined}
            currentUserId={user.id}
            pendingTransition={pendingTransition}
            isApprover={isApprover}
            stageRequesting={stageRequesting}
            stageApproving={stageApproving}
            onRequestNextStage={doRequestNextStage}
            onApproveTransition={doApproveTransition}
            onRejectTransition={doRejectTransition}
          />
        ) : (
          <StagedDealRoom
            dealRoomId={dealRoomId}
            room={room}
            memberList={memberList}
            isInvestor={isInvestor}
            isFounder={isFounder}
            userId={user?.id}
            userName={userName}
            companyName={companyName}
            currentStage={currentStage}
            activeStage={activeStage}
            activeStageKey={activeStageKey}
            viewingHistory={viewingHistory}
            onAddQuestion={handleAddQuestion}
            onSaveAnswer={handleSaveAnswer}
            onRequestNextStage={doRequestNextStage}
            stageRequesting={stageRequesting}
            founderUserId={drFounderUserId}
            investorUserId={drInvestorUserId}
          />
        )}
      </main>

      {/* ── Activity drawer ─────────────────────────────────────── */}
      {activityOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setActivityOpen(false)} />
          <aside
            className="fixed top-0 bottom-0 right-0 z-40 w-full sm:w-[420px] border-l border-gray-200 dark:border-zinc-700 flex flex-col bg-white dark:bg-zinc-900"
            data-testid="activity-drawer"
          >
            <div className="h-14 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-4">
              <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Activity</div>
              <button onClick={() => setActivityOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Timeline dealRoomId={dealRoomId} />
            </div>
          </aside>
        </>
      )}

      {/* ── AI slide-over ───────────────────────────────────────── */}
      {aiOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl flex flex-col" data-testid="ai-panel">
            <div className="h-14 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Deal Room AI</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">{companyName}</div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground" data-testid="close-ai"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 min-h-0">
              <AIChat
                compact
                userId={user?.id}
                scope={`the ${companyName} deal room`}
                startupContext={{
                  companyName: (room as any)?.startups?.company_name,
                  stage: (room as any)?.startups?.stage,
                  sector: (room as any)?.startups?.sector,
                  fundingTarget: (room as any)?.startups?.funding_target,
                  revenue: (room as any)?.startups?.revenue,
                  traction: (room as any)?.startups?.traction,
                }}
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

// ── Horizontal stage bar ──────────────────────────────────────────
function StageBar({
  workflowStage,
  isInvestor,
  activeStageKey,
  showOverview,
  qaUnlockedByNext,
  onOverviewClick,
  onUnlockQa,
  onSelect,
}: {
  workflowStage: string;
  isInvestor: boolean;
  activeStageKey: Exclude<DealRoomStageKey, "overview">;
  showOverview: boolean;
  qaUnlockedByNext: boolean;
  onOverviewClick: () => void;
  onUnlockQa: () => void;
  onSelect: (stage: Exclude<DealRoomStageKey, "overview">) => void;
}) {
  const workflowRank = stageRank(workflowStage);
  const canAccess = (stage: DealRoomStageKey) => {
    if (stage === "overview") return true;
    if (stage === "information_vault") return true;
    if (stage === "qa") return workflowRank >= stageRank("qa") || qaUnlockedByNext;
    if (stage === "due_diligence") return workflowRank >= stageRank("due_diligence");
    if (stage === "term_sheet") return isInvestor && workflowRank >= stageRank("term_sheet");
    if (stage === "closing") return workflowRank >= stageRank("closing");
    return false;
  };

  return (
    <div className="min-w-0 flex-1" data-testid="stage-pills">
      <nav className="flex flex-nowrap overflow-x-auto border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        {STAGES.map((stage) => {
          const active = stage.key === "overview" ? showOverview : !showOverview && activeStageKey === stage.key;
          const accessible = canAccess(stage.key);
          const className = active
            ? "bg-[#7C3AED] text-white rounded-t-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
            : accessible
              ? "text-gray-600 dark:text-gray-400 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-t-lg whitespace-nowrap"
              : "text-gray-300 dark:text-gray-600 px-4 py-2 text-sm cursor-not-allowed whitespace-nowrap";
          return (
            <button
              key={stage.key}
              onClick={() => {
                if (!accessible) return;
                if (stage.key === "overview") {
                  onOverviewClick();
                } else {
                  onSelect(stage.key);
                }
              }}
              disabled={!accessible}
              className={className}
              data-testid={`stage-pill-${stage.key}`}
              data-state={active ? "current" : accessible ? "available" : "locked"}
            >
              <span className="inline-flex items-center gap-1.5">
                {stage.icon && <span aria-hidden="true">{stage.icon}</span>}
                {stage.label}
              </span>
            </button>
          );
        })}
        {!canAccess("qa") && activeStageKey === "information_vault" && isInvestor && (
          <button
            onClick={onUnlockQa}
            className="ml-2 text-gray-600 dark:text-gray-400 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-t-lg whitespace-nowrap"
            data-testid="stage-next-qa"
          >
            Next →
          </button>
        )}
      </nav>
    </div>
  );
}

// ── Reusable dark UI atoms ─────────────────────────────────────────
const CARD_CLASSES = "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl";
const CARD: React.CSSProperties = {
  borderRadius: 12,
};
function DarkCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl ${className}`} style={{ padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}
function PrimaryButton({ children, onClick, disabled, testid, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; testid?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50", className)}
      style={{ background: "#7C3AED" }}
    >
      {children}
    </button>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2 text-gray-500 dark:text-gray-400" style={{ fontFamily: "Syne, sans-serif" }}>
      {children}
    </div>
  );
}

// ── Staged deal room — renders the panel for the active stage ──────
function StagedDealRoom({
  dealRoomId, room, memberList, isInvestor, isFounder, userId, userName,
  companyName, currentStage, activeStage, activeStageKey, viewingHistory, onAddQuestion, onSaveAnswer,
  onRequestNextStage, stageRequesting, founderUserId: propFounderUserId, investorUserId: propInvestorUserId,
}: {
  dealRoomId: string;
  room: any;
  memberList: any[];
  isInvestor: boolean;
  isFounder: boolean;
  userId?: string;
  userName: string;
  companyName: string;
  currentStage: DealStage;
  activeStage: DealStage;
  activeStageKey: Exclude<DealRoomStageKey, "overview">;
  viewingHistory: boolean;
  onAddQuestion: (q: QAQuestion) => Promise<string | undefined>;
  onSaveAnswer: (questionId: string, answer: string) => Promise<void>;
  onRequestNextStage: () => Promise<void>;
  stageRequesting: boolean;
  founderUserId: string | null;
  investorUserId: string | null;
}) {
  const startup = room?.startups;
  const sector = startup?.sector ?? "";
  const startupId = (room as any)?.startup_id ?? startup?.id ?? null;
  const investorUserId = propInvestorUserId ?? (room as any)?.investor_user_id ?? null;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {viewingHistory && (
        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }} className="mb-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">
          <Clock className="h-3.5 w-3.5" style={{ color: "#A855F7" }} />
          Viewing {STAGE_SHORT[activeStage]} history. This stage is complete — current stage is {STAGE_SHORT[currentStage]}.
        </div>
      )}

      {activeStageKey === "information_vault" && (
        <InformationVaultPanel
          dealRoomId={dealRoomId}
          startupId={startupId}
          isInvestor={isInvestor}
          isFounder={isFounder}
          userId={userId ?? ""}
          userName={userName}
          investorUserId={investorUserId}
          room={room}
          onRequestNextStage={onRequestNextStage}
          stageRequesting={stageRequesting}
        />
      )}
      {activeStageKey === "qa" && (
        <QAPanel
          dealRoomId={dealRoomId}
          startupId={startupId ?? ""}
          isInvestor={isInvestor}
          userId={userId ?? ""}
          userName={userName}
          onRequestNextStage={onRequestNextStage}
          stageRequesting={stageRequesting}
        />
      )}
      {activeStageKey === "due_diligence" && (
        <DueDiligencePanel
          dealRoomId={dealRoomId}
          startupId={startupId ?? ""}
          isInvestor={isInvestor}
          userId={userId ?? ""}
          userName={userName}
          startup={startup}
          onRequestNextStage={onRequestNextStage}
          stageRequesting={stageRequesting}
        />
      )}
      {activeStageKey === "term_sheet" && (
        <NewTermSheetPanel
          dealRoomId={dealRoomId}
          startupId={startupId ?? ""}
          isInvestor={isInvestor}
          userId={userId ?? ""}
          userName={userName}
          startup={startup}
          onRequestNextStage={onRequestNextStage}
          stageRequesting={stageRequesting}
        />
      )}
      {activeStageKey === "closing" && (
        <NewClosingPanel
          dealRoomId={dealRoomId}
          startupId={startupId ?? ""}
          isInvestor={isInvestor}
          userId={userId ?? ""}
          userName={userName}
        />
      )}
    </div>
  );
}

// ── Pass modal (shared, confirm-first) ─────────────────────────────
const PASS_REASONS = [
  "Stage/traction mismatch",
  "Sector outside thesis",
  "Team concerns",
  "Valuation expectations",
  "Too early",
  "Portfolio conflict",
];

function PassModal({ dealRoomId, userId, onClose }: { dealRoomId: string; userId?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(PASS_REASONS[0]);
  const [context, setContext] = useState("");
  const [reconsider, setReconsider] = useState("");
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await passDeal({
        data: { deal_room_id: dealRoomId, actor_user_id: userId, reason_category: reason, context: context || undefined, reconsider_if: reconsider || undefined },
      });
      if (!res.ok) { toast.error("Could not pass — try again"); return; }
      await queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success("Deal passed");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl" style={{ padding: 0 }} onClick={(e) => e.stopPropagation()} data-testid="pass-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Pass on this deal</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Eyebrow>Reason</Eyebrow>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none bg-muted border border-gray-200 dark:border-zinc-700"
              data-testid="pass-reason"
            >
              {PASS_REASONS.map((r) => <option key={r} value={r} style={{ background: "var(--color-card)" }}>{r}</option>)}
            </select>
          </div>
          <div>
            <Eyebrow>Context for founder (optional)</Eyebrow>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="One or two sentences the founder will see."
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-gray-500 dark:text-gray-400"
              style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)" }}
            />
          </div>
          <div>
            <Eyebrow>Reconsider if (optional)</Eyebrow>
            <input
              value={reconsider}
              onChange={(e) => setReconsider(e.target.value)}
              placeholder="e.g. you reach $50K MRR"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 dark:text-gray-400"
              style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)" }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-foreground" style={{ border: "1px solid var(--color-border)" }}>Cancel</button>
          <button
            onClick={confirm}
            disabled={saving}
            data-testid="pass-confirm"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#EF4444" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirm pass
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm-first generic modal ────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose, testid, busy }: { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; testid?: string; busy?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl" style={{ padding: 0 }} onClick={(e) => e.stopPropagation()} data-testid={testid}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>{title}</div>
        </div>
        <div className="p-5 text-sm" style={{ color: "var(--color-foreground)" }}>{body}</div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-foreground" style={{ border: "1px solid var(--color-border)" }}>Cancel</button>
          <PrimaryButton onClick={onConfirm} disabled={busy} testid={testid ? `${testid}-confirm` : undefined} className="!px-4 !py-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ── NDA stage panel ────────────────────────────────────────────────
// ── Information Vault Panel ────────────────────────────────────────
const DEFAULT_PROFILE_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "team", label: "Team" },
  { key: "problem_solution", label: "Problem & Solution" },
  { key: "market", label: "Market (TAM/SAM/SOM)" },
  { key: "revenue_traction", label: "Revenue & Traction" },
  { key: "legal", label: "Legal & Registration" },
];

function InformationVaultPanel({
  dealRoomId, startupId, isInvestor, isFounder, userId, userName, investorUserId, room,
  onRequestNextStage, stageRequesting,
}: {
  dealRoomId: string;
  startupId: string | null;
  isInvestor: boolean;
  isFounder: boolean;
  userId: string;
  userName: string;
  investorUserId: string | null;
  room: any;
  onRequestNextStage: () => Promise<void>;
  stageRequesting: boolean;
}) {
  const queryClient = useQueryClient();

  // ── Section 1: Digital Profiles ──
  const [profilesOpen, setProfilesOpen] = useState(true);

  const { data: profileSections = [] } = useQuery({
    queryKey: ["startup-profile-sections", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_profile_sections")
        .select("*")
        .eq("startup_id", startupId!)
        .in("visibility", ["deal_room", "public"])
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  // ── Section 2: Document Requests ──
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqCategory, setReqCategory] = useState("Financial");
  const [reqCreating, setReqCreating] = useState(false);
  const [respondingReqId, setRespondingReqId] = useState<string | null>(null);
  const [declineMode, setDeclineMode] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data: docRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["iv-doc-requests", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_document_requests")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: startupRow } = useQuery({
    queryKey: ["startup-founder-id", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("founder_id").eq("id", startupId!).maybeSingle();
      return data;
    },
  });
  const startupFounderId = startupRow?.founder_id ?? null;

  const submitDocRequest = async () => {
    if (!reqName.trim() || !userId) return;
    setReqCreating(true);
    try {
      const requestedFrom = isInvestor ? startupFounderId : investorUserId;
      await supabase.from("deal_room_document_requests").insert({
        deal_room_id: dealRoomId,
        requested_by: userId,
        requested_from: requestedFrom,
        document_name: reqName.trim(),
        document_description: reqDesc.trim() || null,
        category: reqCategory,
        status: "pending",
      });
      setReqName(""); setReqDesc(""); setReqCategory("Financial");
      setShowReqForm(false);
      await refetchRequests();
      toast.success("Document requested");
    } catch {
      toast.error("Could not create request");
    } finally {
      setReqCreating(false);
    }
  };

  const declineRequest = async (reqId: string) => {
    if (!declineReason.trim()) return;
    setRespondingReqId(reqId);
    try {
      await supabase.from("deal_room_document_requests").update({
        status: "declined",
        decline_reason: declineReason.trim(),
        responded_at: new Date().toISOString(),
      }).eq("id", reqId);
      setDeclineMode(null);
      setDeclineReason("");
      await refetchRequests();
      toast.success("Declined");
    } finally {
      setRespondingReqId(null);
    }
  };

  // ── Section 4: Notes ──
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "shared">("private");
  const [noteSaving, setNoteSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const notesFilter = isInvestor
    ? { user_id: userId }
    : { visibility: "shared" };

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["iv-notes", dealRoomId, userId, isInvestor],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      let q = supabase
        .from("deal_room_notes")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (isInvestor) q = q.eq("user_id", userId);
      else q = (q as any).eq("visibility", "shared");
      const { data } = await q;
      return data ?? [];
    },
  });

  const saveNote = async () => {
    if (!noteContent.trim() || !userId) return;
    setNoteSaving(true);
    try {
      await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        title: noteTitle.trim() || null,
        content: noteContent.trim(),
        visibility: noteVisibility,
        ai_generated: false,
      });
      setNoteTitle(""); setNoteContent(""); setNoteVisibility("private");
      setShowNoteForm(false);
      await refetchNotes();
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note");
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from("deal_room_notes").delete().eq("id", noteId);
    await refetchNotes();
  };

  // ── Section 5: Decision state ──
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState("Pass");
  const [decisionReason, setDecisionReason] = useState("");

  const submitDecision = () => {
    console.log("submitDecision — information_vault:", decisionOutcome, decisionReason);
    setShowDecisionForm(false);
    setDecisionReason("");
  };

  const startup = room?.startups;

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: Digital Profiles ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setProfilesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[#7C3AED]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Digital Profiles</div>
              {!profilesOpen && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {startup?.company_name ?? "—"} {startup?.tagline ? `· ${startup.tagline}` : ""}
                </div>
              )}
            </div>
          </div>
          {profilesOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {profilesOpen && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-zinc-800">
            {(profileSections as any[]).length === 0 ? (
              <div className="mt-4 space-y-2">
                {DEFAULT_PROFILE_SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-zinc-800 px-4 py-3">
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{s.label}</span>
                    <span className="text-xs text-gray-300 dark:text-gray-600 italic">Not added yet</span>
                  </div>
                ))}
                {isFounder && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    Add profile sections in your <Link to="/app/documents" className="text-[#7C3AED] hover:underline">Documents page</Link>.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(profileSections as any[]).map((sec: any) => (
                  <div key={sec.id} className="rounded-lg border border-gray-100 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{sec.section_label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          sec.visibility === "public"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-[#7C3AED]/10 text-[#7C3AED]"
                        )}>
                          {sec.visibility === "public" ? "Public" : "Deal Room"}
                        </span>
                        {isFounder && (
                          <button className="grid h-6 w-6 place-items-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => console.log("edit section — Claude Code will wire")}>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {sec.content && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {typeof sec.content === "object" && sec.content !== null
                          ? (sec.content.text
                            ? <p>{sec.content.text}</p>
                            : Object.entries(sec.content).map(([k, v]) => (
                              <div key={k} className="flex gap-1.5 text-xs">
                                <span className="font-medium text-gray-500 dark:text-gray-400 shrink-0">{k}:</span>
                                <span>{String(v)}</span>
                              </div>
                            ))
                          )
                          : <p>{String(sec.content)}</p>
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Document Requests ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Document Requests</span>
            {(docRequests as any[]).length > 0 && (
              <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                {(docRequests as any[]).length}
              </span>
            )}
          </div>
          {isInvestor && (
            <button
              onClick={() => setShowReqForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "#7C3AED" }}
              data-testid="iv-new-request-btn"
            >
              <Plus className="h-3.5 w-3.5" /> New request
            </button>
          )}
        </div>

        {showReqForm && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-3">
            <input
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder="Document name (e.g. Cap table, Bank statement)"
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
              data-testid="iv-req-name"
            />
            <textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              rows={2}
              placeholder="Why you need this document (optional)"
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none focus:border-[#7C3AED]"
            />
            <select
              value={reqCategory}
              onChange={(e) => setReqCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
              data-testid="iv-req-category"
            >
              {["Financial", "Legal", "Team", "Product", "Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setShowReqForm(false); setReqName(""); setReqDesc(""); }} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-zinc-700">
                Cancel
              </button>
              <button
                onClick={submitDocRequest}
                disabled={!reqName.trim() || reqCreating}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                style={{ background: "#7C3AED" }}
                data-testid="iv-req-submit"
              >
                {reqCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {(docRequests as any[]).length === 0 ? (
            <div className="px-6 py-8 text-center">
              <FolderOpen className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No document requests yet</p>
              {isInvestor && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Request specific documents from the founder above.</p>}
            </div>
          ) : (
            (docRequests as any[]).map((req: any) => {
              const statusMap: Record<string, { label: string; cls: string }> = {
                pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
                fulfilled: { label: "Fulfilled", cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                provided: { label: "Fulfilled", cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                declined: { label: "Declined", cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
              };
              const pill = statusMap[req.status] ?? statusMap.pending;
              const canFounderRespond = isFounder && req.status === "pending" && req.requested_from === userId;

              return (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{req.document_name}</span>
                        {req.category && (
                          <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            {req.category}
                          </span>
                        )}
                      </div>
                      {req.document_description && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{req.document_description}</p>
                      )}
                      {req.decline_reason && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Declined: {req.decline_reason}</p>
                      )}
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", pill.cls)}>
                      {pill.label}
                    </span>
                  </div>

                  {canFounderRespond && declineMode !== req.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800">
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                        <input type="file" className="sr-only" onChange={() => console.log("upload — Claude Code will wire")} />
                      </label>
                      <button
                        onClick={() => { setDeclineMode(req.id); setDeclineReason(""); }}
                        className="rounded-lg border border-red-200 dark:border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {declineMode === req.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        rows={2}
                        placeholder="Reason for declining"
                        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setDeclineMode(null)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">Cancel</button>
                        <button
                          onClick={() => declineRequest(req.id)}
                          disabled={!declineReason.trim() || respondingReqId === req.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          style={{ background: "#EF4444" }}
                        >
                          {respondingReqId === req.id ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Submit"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── SECTION 3: Documents & Links ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Documents & Links</span>
        </div>
        <div className="px-0 py-0">
          <Documents
            dealRoomId={dealRoomId}
            isFounder={isFounder}
            isInvestor={isInvestor}
            userId={userId}
            startupId={startupId ?? undefined}
          />
        </div>
      </div>

      {/* ── SECTION 4: Notes ── */}
      {isInvestor && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">My Notes</span>
            <button
              onClick={() => setShowNoteForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "#7C3AED" }}
              data-testid="iv-add-note-btn"
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </button>
          </div>

          {showNoteForm && (
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-3">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title"
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                placeholder="Write your notes here..."
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none focus:border-[#7C3AED]"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={noteVisibility}
                  onChange={(e) => setNoteVisibility(e.target.value as "private" | "shared")}
                  className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option value="private">Private (only me)</option>
                  <option value="shared">Share with founder</option>
                </select>
                <button
                  onClick={() => console.log("AI note generation — Claude Code will wire")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-2 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowNoteForm(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Cancel</button>
                  <button
                    onClick={saveNote}
                    disabled={!noteContent.trim() || noteSaving}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "#7C3AED" }}
                    data-testid="iv-save-note-btn"
                  >
                    {noteSaving ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {(notes as any[]).length === 0 ? (
              <div className="px-6 py-8 text-center">
                <StickyNote className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Notes are private by default.</p>
              </div>
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {note.title && <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{note.title}</div>}
                      <p className={cn("text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap", expandedNoteId !== note.id && "line-clamp-2")}>
                        {note.content}
                      </p>
                      {note.content?.length > 120 && (
                        <button
                          onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                          className="text-xs text-[#7C3AED] mt-1 hover:underline"
                        >
                          {expandedNoteId === note.id ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium",
                          note.visibility === "shared"
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-400"
                        )}>
                          {note.visibility === "shared" ? "Shared" : "Private"}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="hidden group-hover:grid h-7 w-7 place-items-center rounded text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isFounder && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notes from investor</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {(notes as any[]).length === 0 ? (
              <div className="px-6 py-8 text-center">
                <StickyNote className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No shared notes yet</p>
              </div>
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4">
                  {note.title && <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{note.title}</div>}
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 5: Next Stage / Decision ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-5">
        {showDecisionForm ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Submit a decision</div>
            <select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
            >
              {["Pass", "Withdraw", "Pause"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDecisionForm(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Cancel</button>
              <button
                onClick={submitDecision}
                disabled={!decisionReason.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#EF4444" }}
              >
                Submit decision
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setShowDecisionForm(true)}
              className="rounded-lg border border-red-200 dark:border-red-900/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              Decision
            </button>
            <button
              onClick={onRequestNextStage}
              disabled={stageRequesting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#7C3AED" }}
              data-testid="info-vault-next-stage"
            >
              {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request next stage →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Q&A Panel ─────────────────────────────────────────────────────
const MEETING_TYPES: { value: string; label: string }[] = [
  { value: "intro_call", label: "Intro Call" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "term_negotiation", label: "Term Negotiation" },
  { value: "other", label: "Other" },
];

function QAPanel({
  dealRoomId, startupId, isInvestor, userId, userName, onRequestNextStage, stageRequesting,
}: {
  dealRoomId: string;
  startupId: string;
  isInvestor: boolean;
  userId: string;
  userName: string;
  onRequestNextStage: () => Promise<void>;
  stageRequesting: boolean;
}) {
  const queryClient = useQueryClient();
  const threadRef = useRef<HTMLDivElement>(null);

  // ── Q&A state ──
  const [qaMessages, setQaMessages] = useState<any[]>([]);
  const [qaLoaded, setQaLoaded] = useState(false);
  const [sendText, setSendText] = useState("");
  const [isQuestion, setIsQuestion] = useState(isInvestor);
  const [sending, setSending] = useState(false);
  const [summarising, setSummarising] = useState(false);
  const [prepNotesId, setPrepNotesId] = useState<string | null>(null);
  const [prepText, setPrepText] = useState<Record<string, string>>({});

  // ── Meetings state ──
  const [showMeetForm, setShowMeetForm] = useState(false);
  const [meetTitle, setMeetTitle] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetDuration, setMeetDuration] = useState("60");
  const [meetType, setMeetType] = useState("intro_call");
  const [meetNotes, setMeetNotes] = useState("");
  const [meetSaving, setMeetSaving] = useState(false);
  const [investorNotes, setInvestorNotes] = useState<Record<string, string>>({});

  // ── Decision state ──
  const [showDecision, setShowDecision] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState("Pass");
  const [decisionReason, setDecisionReason] = useState("");

  // ── Load Q&A messages ──
  const { data: initialQa = [] } = useQuery({
    queryKey: ["qa-messages", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_qa")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!qaLoaded && initialQa.length >= 0) {
      setQaMessages(initialQa as any[]);
      setQaLoaded(true);
    }
  }, [initialQa, qaLoaded]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!dealRoomId) return;
    const channel = supabase
      .channel(`qa-${dealRoomId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "deal_room_qa", filter: `deal_room_id=eq.${dealRoomId}` },
        (payload: any) => {
          setQaMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId]);

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [qaMessages]);

  // ── Load meetings ──
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["qa-meetings", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_meetings")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("scheduled_at", { ascending: false });
      return data ?? [];
    },
  });

  // ── Send message ──
  const sendMessage = async () => {
    if (!sendText.trim() || !userId) return;
    setSending(true);
    try {
      await supabase.from("deal_room_qa").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        sender_role: isInvestor ? "investor" : "founder",
        sender_name: userName,
        content: sendText.trim(),
        is_question: isQuestion,
        ai_suggested: false,
      });
      setSendText("");
    } catch {
      toast.error("Could not send message");
    } finally {
      setSending(false);
    }
  };

  // ── AI summary ──
  const generateSummary = async () => {
    if (!userId || qaMessages.length === 0) return;
    setSummarising(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Not authenticated"); return; }
      const threadText = qaMessages.map((m: any) => `${m.sender_role}: ${m.content}`).join("\n");
      const resp = await fetch(
        `https://ldimninnjlvxozubheib.supabase.co/functions/v1/ai-router`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            task_type: "dd_report",
            user_id: userId,
            system_prompt: "You are summarizing a Q&A thread from a deal room between a startup founder and an investor. Be concise and factual.",
            messages: [{ role: "user", content: `Summarize this Q&A thread:\n\n${threadText}` }],
          }),
        },
      );
      const result = await resp.json();
      const content = result?.content ?? result?.reply ?? result?.message ?? "No summary generated.";
      await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        title: "AI Q&A Summary",
        content,
        visibility: "private",
        ai_generated: true,
      });
      toast.success("Summary saved to your notes");
    } catch {
      toast.error("Could not generate summary");
    } finally {
      setSummarising(false);
    }
  };

  // ── AI prep notes for a meeting ──
  const generatePrepNotes = async (meeting: any) => {
    if (!userId) return;
    setPrepNotesId(meeting.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Not authenticated"); return; }
      const resp = await fetch(
        `https://ldimninnjlvxozubheib.supabase.co/functions/v1/ai-router`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            task_type: "coaching",
            user_id: userId,
            system_prompt: "You are helping an investor prepare for a deal meeting. Generate 5 specific questions to ask based on the meeting context and deal stage.",
            messages: [{ role: "user", content: `Meeting: ${meeting.meeting_type}. Agenda: ${meeting.notes_shared ?? "none"}. Generate prep questions.` }],
          }),
        },
      );
      const result = await resp.json();
      const content = result?.content ?? result?.reply ?? result?.message ?? "Could not generate prep notes.";
      setPrepText((prev) => ({ ...prev, [meeting.id]: content }));
    } catch {
      toast.error("Could not generate prep notes");
    } finally {
      setPrepNotesId(null);
    }
  };

  // ── Schedule meeting ──
  const scheduleMeeting = async () => {
    if (!meetDate || !meetTime || !dealRoomId) return;
    setMeetSaving(true);
    try {
      const scheduledAt = new Date(`${meetDate}T${meetTime}`).toISOString();
      await supabase.from("deal_room_meetings").insert({
        deal_room_id: dealRoomId,
        scheduled_at: scheduledAt,
        duration_minutes: parseInt(meetDuration),
        meeting_type: meetType,
        notes_shared: meetNotes.trim() || null,
      });
      setMeetTitle(""); setMeetDate(""); setMeetTime(""); setMeetDuration("60"); setMeetType("intro_call"); setMeetNotes("");
      setShowMeetForm(false);
      await refetchMeetings();
      toast.success("Meeting scheduled");
    } catch {
      toast.error("Could not schedule meeting");
    } finally {
      setMeetSaving(false);
    }
  };

  // ── Save investor private notes on blur ──
  const saveInvestorNote = async (meetingId: string, value: string) => {
    await supabase.from("deal_room_meetings").update({ notes_investor: value }).eq("id", meetingId);
  };

  const meetingStatus = (m: any) => {
    if (m.completed_at) return { label: "Completed", cls: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" };
    if (new Date(m.scheduled_at) < new Date()) return { label: "Overdue", cls: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" };
    return { label: "Scheduled", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" };
  };

  return (
    <div className="space-y-6">
      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Q&A Thread (60%) ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>Q&A</span>
                {qaMessages.length > 0 && (
                  <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {qaMessages.length}
                  </span>
                )}
              </div>
              <button
                onClick={generateSummary}
                disabled={summarising || qaMessages.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 disabled:opacity-40"
                data-testid="qa-ai-summary-btn"
              >
                {summarising ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate AI summary
              </button>
            </div>

            {/* Thread */}
            <div
              ref={threadRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              style={{ maxHeight: 480 }}
              data-testid="qa-thread"
            >
              {qaMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessagesSquare className="h-10 w-10 text-gray-200 dark:text-zinc-700 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet. Start the Q&A by asking the first question.</p>
                  <button
                    onClick={() => console.log("AI suggestions — not yet wired")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Ask AI for suggested questions
                  </button>
                </div>
              ) : (
                qaMessages.map((msg: any) => {
                  const isMine = msg.sender_role === (isInvestor ? "investor" : "founder");
                  const isInv = msg.sender_role === "investor";
                  const parentMsg = msg.parent_id ? qaMessages.find((m: any) => m.id === msg.parent_id) : null;

                  return (
                    <div key={msg.id} className={cn("flex gap-2.5", isInv ? "flex-row-reverse" : "flex-row")}>
                      {/* Avatar */}
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                        isInv ? "bg-blue-500" : "bg-[#7C3AED]",
                      )}>
                        {isInv ? "I" : "F"}
                      </div>

                      <div className={cn("flex flex-col max-w-[78%]", isInv ? "items-end" : "items-start")}>
                        {/* Parent quote */}
                        {parentMsg && (
                          <div className="mb-1 rounded-lg px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-l-2 border-[#7C3AED] bg-gray-50 dark:bg-zinc-800 italic">
                            {parentMsg.content.slice(0, 80)}{parentMsg.content.length > 80 ? "…" : ""}
                          </div>
                        )}

                        {/* Sender name + time */}
                        <div className={cn("flex items-center gap-1.5 mb-1", isInv ? "flex-row-reverse" : "flex-row")}>
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {msg.sender_name || (isInv ? "Investor" : "Founder")}
                          </span>
                          {msg.is_question && (
                            <span className="rounded-full bg-[#7C3AED]/10 px-1.5 py-px text-[9px] font-semibold text-[#7C3AED]">Q</span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div className={cn(
                          "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                          isInv
                            ? "bg-[#7C3AED] text-white"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white",
                          msg.ai_suggested && "italic",
                        )}>
                          {msg.ai_suggested && <span className="mr-1 not-italic">✦</span>}
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send bar */}
            <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 bg-gray-50 dark:bg-zinc-800/40">
              <textarea
                value={sendText}
                onChange={(e) => setSendText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
                placeholder={isInvestor ? "Ask a question..." : "Reply or add information..."}
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
                style={{ maxHeight: 96 }}
                data-testid="qa-send-textarea"
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={isQuestion}
                    onChange={(e) => setIsQuestion(e.target.checked)}
                    className="rounded"
                  />
                  Mark as question
                </label>
                <button
                  onClick={sendMessage}
                  disabled={!sendText.trim() || sending}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ background: "#7C3AED" }}
                  data-testid="qa-send-btn"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Meetings (40%) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>Meetings</span>
              <button
                onClick={() => setShowMeetForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "#7C3AED" }}
                data-testid="schedule-meeting-btn"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule meeting
              </button>
            </div>

            {/* Meeting form */}
            {showMeetForm && (
              <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-3">
                <input
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                  placeholder="Title / purpose"
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={meetDate}
                    onChange={(e) => setMeetDate(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7C3AED]"
                  />
                  <input
                    type="time"
                    value={meetTime}
                    onChange={(e) => setMeetTime(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-[#7C3AED]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={meetDuration}
                    onChange={(e) => setMeetDuration(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
                  >
                    {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                  <select
                    value={meetType}
                    onChange={(e) => setMeetType(e.target.value)}
                    className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
                  >
                    {MEETING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <textarea
                  value={meetNotes}
                  onChange={(e) => setMeetNotes(e.target.value)}
                  rows={2}
                  placeholder="Agenda or topics to cover — visible to both parties"
                  className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowMeetForm(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Cancel
                  </button>
                  <button
                    onClick={scheduleMeeting}
                    disabled={!meetDate || !meetTime || meetSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "#7C3AED" }}
                    data-testid="confirm-schedule-btn"
                  >
                    {meetSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Schedule"}
                  </button>
                </div>
              </div>
            )}

            {/* Meeting list */}
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {(meetings as any[]).length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Calendar className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No meetings scheduled yet</p>
                </div>
              ) : (
                (meetings as any[]).map((m: any) => {
                  const status = meetingStatus(m);
                  const typeLabel = MEETING_TYPES.find((t) => t.value === m.meeting_type)?.label ?? m.meeting_type;
                  const hasPrepNotes = !!prepText[m.id];

                  return (
                    <div key={m.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {m.scheduled_at ? format(new Date(m.scheduled_at), "MMM d, yyyy · h:mm a") : "—"}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-gray-500 dark:text-gray-400 font-medium">{typeLabel}</span>
                            {m.duration_minutes && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">{m.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                        <span className={cn("shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5", status.cls)}>
                          {status.label}
                        </span>
                      </div>

                      {m.notes_shared && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{m.notes_shared}</p>
                      )}

                      {isInvestor && (
                        <div className="mt-3 space-y-2">
                          <button
                            onClick={() => hasPrepNotes
                              ? setPrepText((prev) => { const n = { ...prev }; delete n[m.id]; return n; })
                              : generatePrepNotes(m)
                            }
                            disabled={prepNotesId === m.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 disabled:opacity-40"
                            data-testid="ai-prep-notes-btn"
                          >
                            {prepNotesId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {hasPrepNotes ? "Hide prep notes" : "AI prep notes"}
                          </button>

                          {hasPrepNotes && (
                            <div className="rounded-lg bg-[#7C3AED]/5 border border-[#7C3AED]/15 px-3 py-3">
                              <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{prepText[m.id]}</p>
                            </div>
                          )}

                          {m.completed_at && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-1">My notes from this meeting</div>
                              <textarea
                                value={investorNotes[m.id] ?? (m.notes_investor ?? "")}
                                onChange={(e) => setInvestorNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                onBlur={(e) => saveInvestorNote(m.id, e.target.value)}
                                rows={3}
                                placeholder="Private notes about this meeting..."
                                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Next Stage / Decision ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-5">
        {showDecision ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Submit a decision</div>
            <select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
            >
              {["Pass", "Withdraw", "Pause"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDecision(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Cancel</button>
              <button
                onClick={() => { console.log("submitDecision qa:", decisionOutcome, decisionReason); setShowDecision(false); setDecisionReason(""); }}
                disabled={!decisionReason.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
              className="rounded-lg border border-red-200 dark:border-red-900/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              Decision
            </button>
            <button
              onClick={onRequestNextStage}
              disabled={stageRequesting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#7C3AED" }}
              data-testid="qa-next-stage"
            >
              {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request next stage →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Due Diligence Panel ────────────────────────────────────────────

const DD_CATEGORY_COLORS: Record<string, string> = {
  Team: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Market: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Financials: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Legal: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  Product: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  Traction: "bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400",
};

const DD_STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "complete",
  complete: "pending",
  flagged: "pending",
};

function DueDiligencePanel({
  dealRoomId, startupId, isInvestor, userId, userName, startup, onRequestNextStage, stageRequesting,
}: {
  dealRoomId: string;
  startupId: string;
  isInvestor: boolean;
  userId: string;
  userName: string;
  startup: any;
  onRequestNextStage: () => Promise<void>;
  stageRequesting: boolean;
}) {
  const queryClient = useQueryClient();

  // ── Investor workstation state ──
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

  // ── Collapsible section state (research) ──
  const [qaSummaryOpen, setQaSummaryOpen] = useState(false);
  const [vaultNotesOpen, setVaultNotesOpen] = useState(false);

  // ── Load templates ──
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

  // ── Load goals ──
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

  // ── Founder reads all goals for the room ──
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

  // ── Q&A summary note ──
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

  // ── Vault notes (investor manual notes) ──
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

  // ── DD AI analysis note (for founder view) ──
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

  // Sync local note/date state when goals load
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

  // Determine if onboarding should show
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

  // ── Seed standard goals ──
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

  // ── Cycle goal status ──
  const cycleStatus = async (goal: any) => {
    const next = DD_STATUS_CYCLE[goal.status] ?? "pending";
    const update: any = { status: next };
    if (next === "complete") update.completed_at = new Date().toISOString();
    else update.completed_at = null;
    await supabase.from("deal_room_dd_goals").update(update).eq("id", goal.id);
    await refetchGoals();
  };

  // ── Flag goal ──
  const flagGoal = async (goal: any) => {
    await supabase.from("deal_room_dd_goals").update({ status: "flagged" }).eq("id", goal.id);
    await refetchGoals();
  };

  // ── Save note on blur ──
  const saveNote = async (goalId: string, value: string) => {
    setSavingNoteId(goalId);
    await supabase.from("deal_room_dd_goals").update({ notes: value }).eq("id", goalId);
    setSavingNoteId(null);
  };

  // ── Save due date ──
  const saveDueDate = async (goalId: string, value: string) => {
    await supabase.from("deal_room_dd_goals").update({ due_by: value || null }).eq("id", goalId);
    await refetchGoals();
  };

  // ── Mark complete ──
  const markComplete = async (goalId: string) => {
    await supabase.from("deal_room_dd_goals").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", goalId);
    await refetchGoals();
    setExpandedGoalId(null);
  };

  // ── Delete goal ──
  const deleteGoal = async (goalId: string) => {
    await supabase.from("deal_room_dd_goals").delete().eq("id", goalId);
    await refetchGoals();
  };

  // ── Add custom goal ──
  const addCustomGoal = async () => {
    if (!newGoalText.trim() || !userId) return;
    setAddingGoal(true);
    try {
      await supabase.from("deal_room_dd_goals").insert({
        deal_room_id: dealRoomId,
        investor_id: userId,
        category: newGoalCategory,
        goal_text: newGoalText.trim(),
        is_standard: false,
        status: "pending",
      });
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

  // ── Run AI analysis ──
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
      await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        title: "DD AI Analysis",
        content: JSON.stringify(parsed),
        visibility: "private",
        ai_generated: true,
      });
      toast.success("Analysis saved to your notes");
    } catch {
      toast.error("Analysis failed — try again");
    } finally {
      setRunningAnalysis(false);
    }
  };

  // ── Status circle helper ──
  const StatusCircle = ({ status }: { status: string }) => {
    if (status === "complete") return (
      <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <Check className="h-3.5 w-3.5 text-white" />
      </div>
    );
    if (status === "in_progress") return (
      <div className="h-6 w-6 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 shrink-0" />
    );
    if (status === "flagged") return (
      <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
        <AlertCircle className="h-3.5 w-3.5 text-white" />
      </div>
    );
    return <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-zinc-600 shrink-0" />;
  };

  // ══════════════════════════════════════════════
  // FOUNDER VIEW
  // ══════════════════════════════════════════════
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
      <div className="space-y-6">
        {fGoals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-200 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">The investor has not started due diligence yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">You will see their diligence goals and progress here once they begin.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>Diligence Report</h2>
              {lastUpdated && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Updated by investor · {lastUpdated}</p>}
            </div>

            {/* Progress summary */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-5">
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <span className="rounded-full bg-gray-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">{fTotal} total goals</span>
                <span className="rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">{fCompleted} complete</span>
                {fFlagged > 0 && <span className="rounded-full bg-red-50 dark:bg-red-900/20 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400">{fFlagged} flagged</span>}
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-2 rounded-full transition-all" style={{ width: `${fPct}%`, background: "#7C3AED" }} />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{fPct}% complete</p>
            </div>

            {/* Goals by category */}
            {fCategories.map((cat) => {
              const catGoals = fGoals.filter((g: any) => g.category === cat);
              return (
                <div key={cat} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>{cat}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", DD_CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-600")}>{catGoals.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {catGoals.map((g: any) => (
                      <div key={g.id} className="flex items-center gap-3 px-5 py-3">
                        <StatusCircle status={g.status} />
                        <span className={cn("text-sm flex-1", g.status === "complete" ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white")}>{g.goal_text}</span>
                        {g.status === "flagged" && <span className="text-[10px] rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-red-600 dark:text-red-400 font-medium">Flagged</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* AI Analysis */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-5">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>AI Analysis</div>
              {analysisShared && ddAnalysisParsed ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold",
                      ddAnalysisParsed.risk_level === "low" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                      ddAnalysisParsed.risk_level === "high" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                    )}>
                      {ddAnalysisParsed.risk_level?.toUpperCase() ?? "—"} RISK
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{ddAnalysisParsed.summary}</p>
                  <div style={{ borderLeft: "3px solid #7C3AED" }} className="pl-4 py-1">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Recommendation</div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{ddAnalysisParsed.recommendation}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Investor analysis not shared yet.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Investors can choose to share their analysis with you.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // INVESTOR VIEW
  // ══════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ── SECTION A: Onboarding card ── */}
      {showOnboarding && (
        <div className="bg-white dark:bg-zinc-900 border border-[#7C3AED]/20 rounded-xl px-6 py-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(124,58,237,0.08)" }}>
            <ClipboardList className="h-6 w-6 text-[#7C3AED]" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Set up your diligence goals</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-5">
            Choose from standard goals or add your own. Goals guide your diligence and generate a structured report.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={seedStandardGoals}
              disabled={seedingStandard}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#7C3AED" }}
              data-testid="dd-use-standard-goals-btn"
            >
              {seedingStandard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Use standard goals
            </button>
            <button
              onClick={() => { setOnboardingDone(true); setShowOnboarding(false); }}
              className="rounded-lg border border-gray-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start from scratch
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION B: Goal Workstation (shown when goals exist or onboarding dismissed) ── */}
      {(!showOnboarding || onboardingDone) && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          {/* Category tabs */}
          <div className="flex items-center gap-0 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto px-4 pt-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeCategory === cat
                    ? "border-[#7C3AED] text-[#7C3AED]"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{completedCount} / {totalCount} goals complete</span>
                <span className="text-xs font-semibold text-[#7C3AED]">{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#7C3AED" }} />
              </div>
            </div>
          )}

          {/* Goal list */}
          <div className="px-4 py-3 space-y-2">
            {filteredGoals.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No goals in this category yet</p>
              </div>
            )}

            {filteredGoals.map((goal: any) => {
              const isExpanded = expandedGoalId === goal.id;
              return (
                <div key={goal.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {/* Status circle (clickable) */}
                    <button
                      onClick={() => cycleStatus(goal)}
                      className="mt-0.5 shrink-0 focus:outline-none"
                      title="Click to cycle status"
                      data-testid={`dd-goal-status-${goal.id}`}
                    >
                      <StatusCircle status={goal.status} />
                    </button>

                    {/* Goal info */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-medium", DD_CATEGORY_COLORS[goal.category] ?? "bg-gray-100 text-gray-600", "rounded-full px-2 py-0.5 text-[10px]")}>{goal.category}</span>
                          {goal.is_standard && <span className="text-[10px] rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-gray-500 dark:text-gray-400">Standard</span>}
                          {goal.due_by && <span className="text-[10px] text-gray-400 dark:text-gray-500">Due {format(new Date(goal.due_by), "MMM d")}</span>}
                        </div>
                        <p className={cn("mt-1 text-sm", goal.status === "complete" ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white")}>
                          {goal.goal_text}
                        </p>
                      </button>

                      {/* Expanded body */}
                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={goalNotes[goal.id] ?? ""}
                            onChange={(e) => setGoalNotes((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                            onBlur={(e) => saveNote(goal.id, e.target.value)}
                            rows={3}
                            placeholder="Notes..."
                            className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
                          />
                          {savingNoteId === goal.id && <span className="text-[10px] text-gray-400">Saving…</span>}
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Due date</label>
                            <input
                              type="date"
                              value={goalDueDates[goal.id] ?? ""}
                              onChange={(e) => setGoalDueDates((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                              onBlur={(e) => saveDueDate(goal.id, e.target.value)}
                              className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none"
                            />
                          </div>
                          {goal.status !== "complete" && (
                            <button
                              onClick={() => markComplete(goal.id)}
                              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                              style={{ background: "#10B981" }}
                            >
                              Mark complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => flagGoal(goal)}
                        title="Flag"
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add custom goal */}
            {addGoalOpen ? (
              <div className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/3 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="col-span-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm outline-none"
                  >
                    {["Team", "Market", "Financials", "Legal", "Product", "Traction"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="Describe the goal..."
                    className="col-span-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
                    onKeyDown={(e) => { if (e.key === "Enter") addCustomGoal(); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddGoalOpen(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                  <button
                    onClick={addCustomGoal}
                    disabled={!newGoalText.trim() || addingGoal}
                    className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: "#7C3AED" }}
                    data-testid="dd-add-goal-confirm-btn"
                  >
                    {addingGoal ? "Adding…" : "Add goal"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddGoalOpen(true)}
                className="w-full rounded-xl border border-dashed border-gray-300 dark:border-zinc-600 py-3 text-sm text-gray-500 dark:text-gray-400 hover:border-[#7C3AED] hover:text-[#7C3AED] flex items-center justify-center gap-2"
                data-testid="dd-add-goal-btn"
              >
                <Plus className="h-4 w-4" /> Add custom goal
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION C: AI Analysis ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setAnalysisOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>AI Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); runAnalysis(); }}
              disabled={runningAnalysis || allGoals.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 disabled:opacity-40"
              data-testid="dd-run-analysis-btn"
            >
              {runningAnalysis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Run analysis
            </button>
            {analysisOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {analysisOpen && (
          <div className="border-t border-gray-100 dark:border-zinc-800 px-5 py-5">
            {!analysisResult && !runningAnalysis && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Click "Run analysis" to generate an AI diligence report based on your goals and Q&A thread.</p>
            )}
            {runningAnalysis && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Analysing…</span>
              </div>
            )}
            {analysisResult && !runningAnalysis && (
              <div className="space-y-5">
                {/* Risk badge */}
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-bold",
                    analysisResult.risk_level === "low" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                    analysisResult.risk_level === "high" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" :
                    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  )}>
                    {(analysisResult.risk_level ?? "medium").toUpperCase()} RISK
                  </span>
                </div>
                {/* Summary */}
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{analysisResult.summary}</p>
                {/* 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Strengths", items: analysisResult.strengths ?? [], color: "text-green-600 dark:text-green-400", dot: "bg-green-500" },
                    { label: "Risks", items: analysisResult.risks ?? [], color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
                    { label: "Flags", items: analysisResult.flags ?? [], color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
                  ].map(({ label, items, color, dot }) => (
                    <div key={label}>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{label}</div>
                      {(items as string[]).length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">None identified</p>
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
                {/* Recommendation */}
                <div style={{ borderLeft: "3px solid #7C3AED" }} className="pl-4 py-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Recommendation</div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{analysisResult.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION D: Research from previous stages ── */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs" style={{ fontFamily: "Syne, sans-serif" }}>Research from previous stages</div>

        {/* Q&A Summary */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setQaSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Q&A Summary</span>
            {qaSummaryOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {qaSummaryOpen && (
            <div className="border-t border-gray-100 dark:border-zinc-800 px-5 py-4">
              {qaSummaryNote ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{qaSummaryNote.content}</p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">Q&A summary not generated yet. Go to the Q&A stage to generate one.</p>
              )}
            </div>
          )}
        </div>

        {/* Vault notes */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setVaultNotesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Notes from Information Vault</span>
            {vaultNotesOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {vaultNotesOpen && (
            <div className="border-t border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
              {(vaultNotes as any[]).length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">No notes from the information vault yet.</p>
              ) : (
                (vaultNotes as any[]).map((note: any) => (
                  <div key={note.id} className="px-5 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">{note.title}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{note.content?.slice(0, 100)}{(note.content?.length ?? 0) > 100 ? "…" : ""}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Next Stage / Decision ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-5">
        {showDecision ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Submit a decision</div>
            <select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
            >
              {["Pass", "Withdraw", "Pause"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDecision(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Cancel</button>
              <button
                onClick={() => { console.log("submitDecision dd:", decisionOutcome, decisionReason); setShowDecision(false); setDecisionReason(""); }}
                disabled={!decisionReason.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
              className="rounded-lg border border-red-200 dark:border-red-900/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              Decision
            </button>
            <button
              onClick={onRequestNextStage}
              disabled={stageRequesting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "#7C3AED" }}
              data-testid="dd-next-stage"
            >
              {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request next stage →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NdaStagePanel({ dealRoomId, room, memberList, isInvestor, isFounder }: { dealRoomId: string; room: any; memberList: any[]; isInvestor: boolean; isFounder: boolean }) {
  const startup = room?.startups;
  const { data: ndaRows = [] } = useQuery({
    queryKey: ["nda-stage-acceptances", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("user_id, role, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .order("accepted_at", { ascending: true });
      return data ?? [];
    },
  });
  const founderRow = (memberList as any[]).find((m) => m.role === "founder");
  const investorRow = (memberList as any[]).find((m) => m.role === "investor");

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>NDA & Profiles</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>{companyNameOf(room)}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted-foreground)" }}>Both parties signed the NDA. Profiles are shared.</p>
      </div>

      <DarkCard>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "rgba(16,185,129,0.12)" }}>
            <Shield className="h-5 w-5" style={{ color: "#10B981" }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">NDA signed by all parties</div>
            <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
              {(ndaRows as any[]).length > 0 && (ndaRows as any[])[0].accepted_at
                ? `First accepted ${new Date((ndaRows as any[])[0].accepted_at).toLocaleDateString()}`
                : "Confidentiality terms in effect"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </span>
        </div>
      </DarkCard>

      <div className="grid sm:grid-cols-2 gap-4">
        <DarkCard>
          <Eyebrow>Startup</Eyebrow>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl overflow-hidden text-white font-bold" style={{ background: "#7C3AED" }}>
              {startup?.logo_url ? <img src={startup.logo_url} alt="" className="h-full w-full object-cover" /> : (startup?.company_name?.[0] ?? "S")}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{startup?.company_name ?? "Company"}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{[startup?.stage, startup?.sector].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          </div>
          {founderRow?.users?.full_name && (
            <div className="mt-3 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Founder: {founderRow.users.full_name}</div>
          )}
        </DarkCard>
        <DarkCard>
          <Eyebrow>Investor</Eyebrow>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl text-white font-bold" style={{ background: "rgba(16,185,129,0.18)", color: "#10B981" }}>
              {((room as any)?.investor_company || (room as any)?.investor_name || investorRow?.users?.full_name || "V")[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{(room as any)?.investor_company || (room as any)?.investor_name || investorRow?.users?.full_name || "Investor"}</div>
              <div className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{investorRow?.users?.full_name || (room as any)?.investor_name || "—"}</div>
            </div>
          </div>
          {isInvestor && (
            <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "#10B981" }}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Verification details visible to founder
            </div>
          )}
        </DarkCard>
      </div>

      <div className="rounded-lg px-4 py-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
        {isFounder ? (
          <div className="text-sm" style={{ color: "var(--color-foreground)" }}>
            <div className="font-semibold text-white">Upload your Stage 1 documents</div>
            <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Add your deck and key materials. They appear in the investor's Stage 1 review when the investor opens it.</p>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--color-foreground)" }}>
            <div className="font-semibold text-white">Waiting on the founder</div>
            <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Stage 1 review opens once the founder shares their documents.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function companyNameOf(room: any) {
  return room?.startups?.company_name ?? (room as any)?.investor_company ?? "Deal Room";
}


// ── New Term Sheet Panel (DR-4) ────────────────────────────────────

const TS_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400",
  sent: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  counter_proposed: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  accepted: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
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

function NewTermSheetPanel({
  dealRoomId, startupId, isInvestor, userId, userName, startup, onRequestNextStage, stageRequesting,
}: {
  dealRoomId: string;
  startupId: string;
  isInvestor: boolean;
  userId: string;
  userName: string;
  startup: any;
  onRequestNextStage: () => Promise<void>;
  stageRequesting: boolean;
}) {
  const queryClient = useQueryClient();

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

  // ── Load term sheets ──
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

  const allSheets = termSheets as any[];
  const nextVersion = allSheets.length > 0 ? (allSheets[0].version ?? 0) + 1 : 1;

  // Visible to founder: only non-draft
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
        await supabase.from("deal_room_term_sheets").update({ terms: tsForm, notes: tsNotes, status: "draft" }).eq("id", editingVersion.id);
      } else {
        await supabase.from("deal_room_term_sheets").insert({ deal_room_id: dealRoomId, created_by: userId, version: nextVersion, terms: tsForm, notes: tsNotes, status: "draft" });
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
        await supabase.from("deal_room_term_sheets").update({ terms: tsForm, notes: tsNotes, status: "sent", sent_at: new Date().toISOString() }).eq("id", editingVersion.id);
      } else {
        await supabase.from("deal_room_term_sheets").insert({ deal_room_id: dealRoomId, created_by: userId, version: nextVersion, terms: tsForm, notes: tsNotes, status: "sent", sent_at: new Date().toISOString() });
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
      await supabase.from("deal_room_term_sheets").update({ status, responded_at: new Date().toISOString() }).eq("id", sheetId);
      await refetchTS();
      toast.success(status === "accepted" ? "Term sheet accepted" : status === "rejected" ? "Term sheet rejected" : "Status updated");
    } catch { toast.error("Could not update term sheet"); }
    finally { setRespondingId(null); }
  };

  const submitCounter = async (sheetId: string, version: number) => {
    if (!counterText.trim() || !userId) return;
    setRespondingId(sheetId);
    try {
      await supabase.from("deal_room_term_sheets").update({ status: "counter_proposed", responded_at: new Date().toISOString() }).eq("id", sheetId);
      await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId, user_id: userId,
        title: `Counter-offer: Term Sheet v${version}`,
        content: counterText.trim(), visibility: "deal_room", ai_generated: false,
      });
      await refetchTS();
      setCounterOpen(null);
      setCounterText("");
      toast.success("Counter-offer submitted");
    } catch { toast.error("Could not submit counter-offer"); }
    finally { setRespondingId(null); }
  };

  const TermInput = ({ label, field, type = "text", placeholder = "" }: { label: string; field: keyof typeof tsForm; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={tsForm[field]}
        onChange={(e) => setTsForm((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
      />
    </div>
  );

  const TermSelect = ({ label, field, options }: { label: string; field: keyof typeof tsForm; options: string[] }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <select
        value={tsForm[field]}
        onChange={(e) => setTsForm((p) => ({ ...p, [field]: e.target.value }))}
        className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Editor ── */}
      {editorOpen && isInvestor && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Term Sheet v{editingVersion ? editingVersion.version : nextVersion}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={aiDraftTerms}
                disabled={aiDrafting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#7C3AED]/30 px-3 py-1.5 text-xs font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 disabled:opacity-40"
                data-testid="ai-draft-term-sheet-btn"
              >
                {aiDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate with AI
              </button>
              <button onClick={() => setEditorOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600">
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
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Conditions precedent</label>
              <textarea
                value={tsForm.conditions_precedent}
                onChange={(e) => setTsForm((p) => ({ ...p, conditions_precedent: e.target.value }))}
                rows={2}
                placeholder="e.g. Completion of legal audit..."
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Additional notes</label>
              <textarea
                value={tsNotes}
                onChange={(e) => setTsNotes(e.target.value)}
                rows={2}
                placeholder="Any other terms or conditions..."
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={saveDraft}
                disabled={savingDraft}
                className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                {savingDraft ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={sendToFounder}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#7C3AED" }}
                data-testid="send-term-sheet-btn"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send to founder →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding (investor, no sheets yet) ── */}
      {isInvestor && !editorOpen && allSheets.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-[#7C3AED]/20 rounded-xl px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(124,58,237,0.08)" }}>
            <FileText className="h-6 w-6 text-[#7C3AED]" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Draft a term sheet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-5">Create the investment terms to share with the founder. You can save a draft before sending.</p>
          <button
            onClick={() => openEditor()}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "#7C3AED" }}
            data-testid="draft-term-sheet-btn"
          >
            <Plus className="h-4 w-4" /> Draft term sheet
          </button>
        </div>
      )}

      {/* ── Version list (investor) ── */}
      {isInvestor && !editorOpen && allSheets.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>Term sheets</h3>
            <button onClick={() => openEditor()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ background: "#7C3AED" }}>
              <Plus className="h-3.5 w-3.5" /> New version
            </button>
          </div>
          <div className="space-y-3">
            {allSheets.map((sheet: any) => (
              <div key={sheet.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Term Sheet v{sheet.version}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TS_STATUS_COLORS[sheet.status] ?? "bg-gray-100 text-gray-600")}>
                        {sheet.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    {sheet.sent_at && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sent {formatDistanceToNow(new Date(sheet.sent_at), { addSuffix: true })}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => openEditor(sheet)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">View / Edit</button>
                    {sheet.status === "sent" && (
                      <>
                        <button
                          onClick={() => updateStatus(sheet.id, "accepted")}
                          disabled={respondingId === sheet.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                          style={{ background: "#10B981" }}
                        >
                          Mark accepted
                        </button>
                        <button
                          onClick={() => updateStatus(sheet.id, "rejected")}
                          disabled={respondingId === sheet.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40"
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

      {/* ── Founder view ── */}
      {!isInvestor && (
        <>
          {visibleSheets.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-10 text-center">
              <FileText className="h-10 w-10 text-gray-200 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No term sheet received yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">The investor will send one when ready.</p>
            </div>
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
                  <div key={sheet.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Term Sheet v{sheet.version}</span>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", TS_STATUS_COLORS[sheet.status] ?? "bg-gray-100 text-gray-600")}>
                          {sheet.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {sheet.sent_at && <span className="text-xs text-gray-400 dark:text-gray-500">{formatDistanceToNow(new Date(sheet.sent_at), { addSuffix: true })}</span>}
                    </div>

                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      {TERM_LABELS.filter(([k]) => terms[k]).map(([k, label]) => (
                        <div key={k} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
                          <span className="text-sm text-gray-900 dark:text-white text-right">{String(terms[k])}</span>
                        </div>
                      ))}
                    </div>

                    {sheet.notes && (
                      <div className="px-5 pb-4">
                        <div className="rounded-lg bg-gray-50 dark:bg-zinc-800 px-3 py-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Additional notes</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{sheet.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Counter & Accept actions */}
                    {sheet.status === "sent" && (
                      <div className="px-5 pb-5 space-y-3">
                        {counterOpen === sheet.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={counterText}
                              onChange={(e) => setCounterText(e.target.value)}
                              rows={3}
                              placeholder="Describe your counter-offer terms in plain language..."
                              className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => { setCounterOpen(null); setCounterText(""); }} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                              <button
                                onClick={() => submitCounter(sheet.id, sheet.version)}
                                disabled={!counterText.trim() || respondingId === sheet.id}
                                className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                style={{ background: "#7C3AED" }}
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
                              className="rounded-lg border border-amber-200 dark:border-amber-900/40 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400"
                              data-testid="counter-offer-btn"
                            >
                              Submit counter-offer
                            </button>
                            <button
                              onClick={() => setAcceptConfirmId(sheet.id)}
                              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
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
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
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

      {/* Investor: advance to Closing */}
      {isInvestor && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Ready to close?</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Request to advance to the Closing stage when terms are agreed.</div>
          </div>
          <button
            onClick={onRequestNextStage}
            disabled={stageRequesting}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 shrink-0"
            style={{ background: "#7C3AED" }}
            data-testid="term-sheet-next-stage"
          >
            {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request next stage →
          </button>
        </div>
      )}

      {/* Accept confirm dialog */}
      {acceptConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Accept this term sheet?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This will mark the term sheet as accepted. The investor will be notified. Review with a lawyer before accepting.</p>
            <div className="flex gap-2">
              <button onClick={() => setAcceptConfirmId(null)} className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500">Cancel</button>
              <button
                onClick={async () => { await updateStatus(acceptConfirmId, "accepted"); setAcceptConfirmId(null); }}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white"
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

// ── New Closing Panel (DR-5) ───────────────────────────────────────

const CLOSING_STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "complete",
  complete: "pending",
  blocked: "pending",
};

const CLOSING_OWNER_COLORS: Record<string, string> = {
  founder: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  investor: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  both: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400",
  lawyer: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
};

const EXIT_REASON_CATEGORIES = [
  "Valuation disagreement",
  "Due diligence findings",
  "Market conditions",
  "Terms disagreement",
  "Timing",
  "Other",
];

function NewClosingPanel({
  dealRoomId, startupId, isInvestor, userId, userName,
}: {
  dealRoomId: string;
  startupId: string;
  isInvestor: boolean;
  userId: string;
  userName: string;
}) {
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

  // ── Load closing items ──
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

  // ── Load accepted term sheet ──
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

  // Sync local state when items load
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
      await supabase.from("deal_room_closing_items").insert(rows);
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
    await supabase.from("deal_room_closing_items").update(update).eq("id", item.id);
    await refetchItems();
  };

  const markItemComplete = async (itemId: string) => {
    setItemStatuses((p) => ({ ...p, [itemId]: "complete" }));
    await supabase.from("deal_room_closing_items").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", itemId);
    await refetchItems();
    setExpandedItemId(null);
  };

  const saveItemNote = async (itemId: string, value: string) => {
    await supabase.from("deal_room_closing_items").update({ notes: value }).eq("id", itemId);
  };

  const saveItemDueDate = async (itemId: string, value: string) => {
    await supabase.from("deal_room_closing_items").update({ due_by: value || null }).eq("id", itemId);
  };

  const changeItemStatus = async (itemId: string, status: string) => {
    setItemStatuses((p) => ({ ...p, [itemId]: status }));
    await supabase.from("deal_room_closing_items").update({ status }).eq("id", itemId);
    await refetchItems();
  };

  const closeDeal = async () => {
    if (!userId) return;
    setClosingDeal(true);
    try {
      await supabase.from("deal_room_closure_reports").insert({
        deal_room_id: dealRoomId, closed_by: userId,
        outcome: "invested", reason_detail: finalNotes || null, ai_summary: null,
      });
      await supabase.from("deal_rooms").update({ status: "closed" }).eq("id", dealRoomId);
      console.log("Email closing report to both parties — Claude Code will wire email");
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
      await supabase.from("deal_room_closure_reports").insert({
        deal_room_id: dealRoomId, closed_by: userId,
        outcome: exitOutcome.toLowerCase(),
        reason_category: exitReasonCat,
        reason_detail: exitReasonDetail.trim() || null,
        ai_summary: null,
      });
      await supabase.from("deal_rooms").update({ status: "closed" }).eq("id", dealRoomId);
      setExitDone(true);
      setExitOpen(false);
    } catch { toast.error("Could not close deal room"); }
    finally { setExiting(false); }
  };

  const ItemStatusCircle = ({ status }: { status: string }) => {
    if (status === "complete") return (
      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <Check className="h-3 w-3 text-white" />
      </div>
    );
    if (status === "in_progress") return <div className="h-5 w-5 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 shrink-0" />;
    if (status === "blocked") return (
      <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
        <X className="h-3 w-3 text-white" />
      </div>
    );
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-zinc-600 shrink-0" />;
  };

  if (dealClosed || exitDone) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: dealClosed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
          <CheckCircle2 className={cn("h-7 w-7", dealClosed ? "text-green-500" : "text-red-400")} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
          {dealClosed ? "Deal closed successfully" : "Deal room closed"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {dealClosed ? "Both parties will receive a closing report." : "A report has been sent to both parties."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── SECTION 1: Closing Checklist ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: "Syne, sans-serif" }}>Closing Checklist</h3>
          {items.length === 0 && (
            <button
              onClick={seedChecklist}
              disabled={seedingChecklist}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "#7C3AED" }}
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
              <span className="text-xs text-gray-500 dark:text-gray-400">{completedCount} / {totalCount} items complete</span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#10B981" }} />
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <ClipboardList className="h-8 w-8 text-gray-200 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Load the standard closing checklist to get started.</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-4">
            {categories.map((cat) => {
              const catItems = items.filter((i: any) => i.category === cat);
              return (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2">{cat}</div>
                  <div className="space-y-2">
                    {catItems.map((item: any) => {
                      const isExpanded = expandedItemId === item.id;
                      const currentStatus = itemStatuses[item.id] ?? item.status;
                      return (
                        <div key={item.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <button onClick={() => cycleItemStatus(item)} className="mt-0.5 focus:outline-none" title="Click to cycle status">
                              <ItemStatusCircle status={currentStatus} />
                            </button>
                            <button onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="flex-1 text-left">
                              <span className={cn("text-sm", currentStatus === "complete" ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white")}>
                                {item.item_text}
                              </span>
                            </button>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", CLOSING_OWNER_COLORS[item.owner] ?? "bg-gray-100 text-gray-600")}>
                              {item.owner}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pl-8 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => changeItemStatus(item.id, e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
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
                                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-500 dark:text-gray-400">Due date</label>
                                <input
                                  type="date"
                                  value={itemDueDates[item.id] ?? ""}
                                  onChange={(e) => setItemDueDates((p) => ({ ...p, [item.id]: e.target.value }))}
                                  onBlur={(e) => saveItemDueDate(item.id, e.target.value)}
                                  className="rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                                />
                              </div>
                              {currentStatus !== "complete" && (
                                <button
                                  onClick={() => markItemComplete(item.id)}
                                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
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

      {/* ── SECTION 2: Deal Summary ── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-5 py-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4" style={{ fontFamily: "Syne, sans-serif" }}>Deal Summary</h3>
        {!acceptedTS ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No accepted term sheet yet. Complete the Term Sheet stage first.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              ["Investment", (acceptedTS as any).terms?.investment_amount],
              ["Valuation", (acceptedTS as any).terms?.valuation],
              ["Equity", (acceptedTS as any).terms?.equity_percentage],
              ["Instrument", (acceptedTS as any).terms?.investment_type],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 dark:bg-zinc-800 px-3 py-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{value || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3: Close Deal (investor only) ── */}
      {isInvestor && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-5 py-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Close this deal</h3>

          {!closeDealOpen ? (
            <div className="space-y-3">
              {!allComplete && !overrideClose && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 px-4 py-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">{totalCount - completedCount} closing items still pending. Complete all items before closing.</p>
                </div>
              )}
              <button
                onClick={() => setCloseDealOpen(true)}
                disabled={!allComplete && !overrideClose && items.length > 0}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "#10B981" }}
              >
                <CheckCircle2 className="h-4 w-4" /> Close this deal
              </button>
              {!allComplete && items.length > 0 && (
                <div>
                  <button
                    onClick={() => setOverrideClose(true)}
                    className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                  >
                    Close deal anyway →
                  </button>
                  {overrideClose && (
                    <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-4 py-3">
                      <p className="text-sm text-red-700 dark:text-red-400">{totalCount - completedCount} items still pending. Proceed anyway?</p>
                      <button
                        onClick={() => setCloseDealOpen(true)}
                        className="mt-2 rounded-lg px-4 py-1.5 text-sm font-medium text-white"
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
              <p className="text-sm text-gray-700 dark:text-gray-300">This will mark the deal as closed and notify both parties.</p>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                rows={3}
                placeholder="Final notes (optional)..."
                className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setCloseDealOpen(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500">Cancel</button>
                <button
                  onClick={closeDeal}
                  disabled={closingDeal}
                  className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
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

      {/* ── SECTION 4: Exit deal ── */}
      <div className="pt-2">
        {!exitOpen ? (
          <button
            onClick={() => setExitOpen(true)}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
            data-testid="exit-deal-btn"
          >
            Exit deal →
          </button>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/30 rounded-xl px-5 py-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Exit this deal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Outcome</label>
                <select
                  value={exitOutcome}
                  onChange={(e) => setExitOutcome(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option>Pass</option>
                  <option>Withdraw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reason category</label>
                <select
                  value={exitReasonCat}
                  onChange={(e) => setExitReasonCat(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
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
              className="w-full resize-none rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setExitOpen(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-500">Cancel</button>
              <button
                onClick={exitDeal}
                disabled={exiting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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


// ── Documents ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Pitch Deck": "bg-brand/10 text-brand",
  "Financials": "bg-success/10 text-success",
  "Legal": "bg-violet/10 text-violet",
  "Market Research": "bg-warning/10 text-warning",
  "Team": "bg-brand/10 text-brand",
  "Product": "bg-violet/10 text-violet",
  "Other": "bg-accent text-gray-500 dark:text-gray-400",
};

const TEXT_EXTS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "csv", "pptx", "ppt", "txt"]);

function getFileTypeStyle(ext: string): { bg: string; color: string; Icon: any } {
  if (ext === "pdf") return { bg: "bg-red-500/10", color: "text-red-500", Icon: FileText };
  if (["docx", "doc"].includes(ext)) return { bg: "bg-blue-500/10", color: "text-blue-500", Icon: FileText };
  if (["xlsx", "xls", "csv"].includes(ext)) return { bg: "bg-green-500/10", color: "text-green-500", Icon: FileText };
  if (["pptx", "ppt"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: FileText };
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { bg: "bg-purple-500/10", color: "text-purple-500", Icon: Image };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return { bg: "bg-orange-500/10", color: "text-orange-500", Icon: Film };
  return { bg: "bg-accent", color: "text-gray-500 dark:text-gray-400", Icon: FileText };
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CAT_BORDER: Record<string, string> = {
  "Pitch Deck": "border-l-purple-500",
  "Financials": "border-l-green-500",
  "Legal": "border-l-red-500",
  "Market Research": "border-l-violet-500",
  "Team": "border-l-blue-500",
  "Product": "border-l-orange-500",
  "Other": "border-l-muted-foreground/40",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function Documents({ dealRoomId, isFounder, isInvestor, userId, startupId }: { dealRoomId: string; isFounder: boolean; isInvestor: boolean; userId?: string; startupId?: string }) {
  const queryClient = useQueryClient();
  const [showLibrary, setShowLibrary] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [activeVaultTab, setActiveVaultTab] = useState<"documents" | "links">("documents");
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addingFromLib, setAddingFromLib] = useState<string | null>(null);
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [summaryEdits, setSummaryEdits] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const summaryExpandedRef = useRef<Record<string, boolean>>({});
  const [summaryExpandedTick, setSummaryExpandedTick] = useState(0);
  const [activeDocTab, setActiveDocTab] = useState("All");
  const isSummaryExpanded = (docId: string) => summaryExpandedRef.current[docId] ?? false;
  const toggleSummary = (docId: string) => {
    summaryExpandedRef.current[docId] = !summaryExpandedRef.current[docId];
    setSummaryExpandedTick((t) => t + 1);
  };
  const expandSummary = (docId: string) => {
    summaryExpandedRef.current[docId] = true;
    setSummaryExpandedTick((t) => t + 1);
  };

  async function trackDocumentView(params: {
    documentId?: string;
    founderDocumentId?: string;
  }) {
    if (!isInvestor) return;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("investor_profiles")
        .select("your_name, fund_name")
        .eq("user_id", authUser.id)
        .maybeSingle();
      const viewerName = profile?.your_name ?? profile?.fund_name ?? "Investor";
      await supabase.from("document_views").insert({
        document_id: params.documentId ?? null,
        founder_document_id: params.founderDocumentId ?? null,
        deal_room_id: dealRoomId,
        startup_id: startupId,
        viewer_id: authUser.id,
        viewer_role: "investor",
        viewer_name: viewerName,
      });
    } catch (e) {
      console.error("[trackDocumentView]", e);
    }
  }

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", dealRoomId],
    enabled: !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
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
        .neq("deal_room_id", dealRoomId) // exclude docs already in THIS room
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: dealRoomLinks = [] } = useQuery({
    queryKey: ["deal-room-links", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_links")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Investor documents — uploaded by investor into this deal room
  const { data: investorDocs = [] } = useQuery({
    queryKey: ["investor-documents", dealRoomId, userId],
    enabled: !!userId && !!dealRoomId,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*, uploader:uploader_id(full_name, avatar_url)")
        .eq("deal_room_id", dealRoomId)
        .eq("uploaded_by_role", "investor")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Platform documents from founder_documents (deal_room visibility)
  console.log("[platform-docs] startupId:", startupId, "isFounder:", isFounder, "isInvestor:", isInvestor);
  const { data: platformDocs = [] } = useQuery({
    queryKey: ["platform-docs", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      console.log("[platform-docs] queryFn firing for startupId:", startupId);
      const { data, error } = await supabase
        .from("founder_documents")
        .select(`id, template_slug, title, status, content, completeness_score, ai_feedback, visibility, updated_at, document_templates ( name, category )`)
        .eq("startup_id", startupId!)
        .eq("visibility", "deal_room")
        .in("status", ["complete", "ai_extracted", "needs_review"])
        .order("updated_at", { ascending: false });
      if (error) console.error("[platform-docs] error:", error);
      console.log("[platform-docs] data:", data);
      return data ?? [];
    },
  });

  // Stage 2 gate — fetch directly from deal_rooms
  const { data: drStageData } = useQuery({
    queryKey: ["dr-stage-gate", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("workflow_stage, stage2_unlocked")
        .eq("id", dealRoomId)
        .maybeSingle();
      return data ?? null;
    },
  });
  const stage2Unlocked = drStageData?.stage2_unlocked ?? false;
  const workflowStage = drStageData?.workflow_stage ?? "nda_signed";

  // For investor: split platform docs into stage 1 and stage 2
  const platformDocsSplit = isInvestor
    ? {
        stage1: (platformDocs as any[]).filter((d) => !d.deal_room_stage || d.deal_room_stage === 1),
        stage2: (platformDocs as any[]).filter((d) => d.deal_room_stage === 2),
      }
    : { stage1: platformDocs as any[], stage2: [] };

  // Founder sees investor docs marked shared; investor sees all their own
  const visibleInvestorDocs = isFounder
    ? (investorDocs as any[]).filter((d) => d.visibility !== "private")
    : investorDocs;

  const [investorDocVisibility, setInvestorDocVisibility] = useState<Record<string, "shared" | "private">>({});

  const updateDocVisibility = async (docId: string, visibility: "shared" | "private") => {
    setInvestorDocVisibility((prev) => ({ ...prev, [docId]: visibility }));
    await supabase.from("documents").update({ visibility }).eq("id", docId);
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
  };

  const removeInvestorDoc = async (docId: string) => {
    await supabase.from("documents").update({ deal_room_id: null }).eq("id", docId);
    queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
    toast.success("Document removed");
  };

  const addLink = async () => {
    if (!linkName.trim() || !linkUrl.trim() || !userId) return;
    setAddingLink(true);
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    await supabase.from("deal_room_links").insert({
      deal_room_id: dealRoomId,
      uploader_id: userId,
      name: linkName.trim(),
      url,
      visibility: "shared",
    });
    queryClient.invalidateQueries({ queryKey: ["deal-room-links", dealRoomId] });
    setLinkName(""); setLinkUrl(""); setShowAddLink(false); setAddingLink(false);
    toast.success("Link added");
  };

  const removeLink = async (linkId: string) => {
    await supabase.from("deal_room_links").delete().eq("id", linkId);
    queryClient.invalidateQueries({ queryKey: ["deal-room-links", dealRoomId] });
    toast.success("Link removed");
  };

  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);

  const handleDownload = async (storagePath: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDocRemove = (doc: any) => {
    queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
      (old ?? []).filter((d) => d.id !== doc.id)
    );
    const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
    const displayName = rawName.replace(/^\d{13}-/, "");
    let toastId: string | number;
    const timer = setTimeout(async () => {
      await supabase.from("documents").update({ deal_room_id: null }).eq("id", doc.id);
      queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    }, 5000);
    toastId = toast(`"${displayName}" removed`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
          toast.dismiss(toastId);
        },
      },
      duration: 5000,
    });
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
      const { data: signedData, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 60);
      if (signedError || !signedData?.signedUrl) {
        toast.error("Could not access file");
        return;
      }

      const response = await fetch(signedData.signedUrl);
      if (!response.ok) {
        toast.error("File download failed");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileName = doc.file_name ||
        doc.storage_path?.split("/").pop()?.replace(/^\d{13}-/, "") || "";

      // Use the unified extractor — handles PDF, DOCX, PPTX, XLSX, CSV, TXT
      const textContent = await extractDocumentText(arrayBuffer, fileName);
      console.log(`[generateSummary] ${fileName}: extracted ${textContent.length} chars`);

      // Quality gate — still send to AI even if content is sparse; the fallback message
      // from the extractor already explains the situation when text couldn't be read.
      if (!textContent || textContent.length < 30) {
        const honestMessage = `Could not extract readable text from this file.\n\nTo review: Click Preview or Download to open locally.`;
        await supabase.from("documents").update({ ai_summary: honestMessage }).eq("id", doc.id);
        queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
          (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: honestMessage } : d)
        );
        queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
        expandSummary(doc.id);
        toast.success("Document processed");
        return;
      }

      const aiData = await withTimeout(generateDocSummary({
        data: {
          userId: userId || "",
          documentContent: textContent.slice(0, 3000),
          fileName,
          category: doc.category,
        }
      }));
      if (aiData.error === "usage_limit") {
        toast.error(aiData.reply || "Daily AI limit reached");
        return;
      }
      const summary = aiData.reply || "";
      if (!summary) {
        toast.error("AI returned empty response — check Cloudflare logs");
        return;
      }

      await supabase.from("documents").update({ ai_summary: summary }).eq("id", doc.id);
      queryClient.setQueryData(["documents", dealRoomId], (old: any[]) =>
        (old ?? []).map((d: any) => d.id === doc.id ? { ...d, ai_summary: summary } : d)
      );
      queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
      expandSummary(doc.id);
      toast.success("Summary generated");
    } catch (err) {
      console.error("Summary error:", err);
      toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : (err instanceof Error ? err.message : "Summary failed"));
    } finally {
      setGeneratingSummaryId(null);
    }
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

  const DOC_CATEGORIES = ["All", "Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Product", "Other"] as const;

  const DEAL_ROOM_EXPECTED_DOCS = [
    { category: "Pitch Deck", name: "Pitch Deck (PDF or PPTX)" },
    { category: "Pitch Deck", name: "Executive Summary / One-pager" },
    { category: "Financials", name: "Last 3 years P&L" },
    { category: "Financials", name: "Revenue projections (3 years)" },
    { category: "Financials", name: "Cap table" },
    { category: "Legal", name: "Certificate of incorporation" },
    { category: "Legal", name: "Shareholder agreement" },
    { category: "Team", name: "Founder CVs / LinkedIn" },
    { category: "Product", name: "Product roadmap" },
    { category: "Market Research", name: "TAM/SAM/SOM analysis" },
  ];

  // Pitch deck always pinned first
  const pitchDeckDoc = (docs as any[]).find((d) =>
    d.category === "Pitch Deck" || /(pitch.?deck|pitch|deck)/i.test(d.file_name || d.storage_path || "")
  );
  const filteredDocs = activeDocTab === "All"
    ? [
        ...(pitchDeckDoc ? [pitchDeckDoc] : []),
        ...(docs as any[]).filter((d) => d.id !== pitchDeckDoc?.id),
      ]
    : (docs as any[]).filter((d: any) => (d.category || "Other") === activeDocTab);

  const expectedForTab = activeDocTab !== "All"
    ? DEAL_ROOM_EXPECTED_DOCS.filter((e) => e.category === activeDocTab)
    : [];

  // Count per category for tab badges
  const catCounts = (docs as any[]).reduce((acc: Record<string, number>, d) => {
    const cat = d.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100/50 p-1">
          <button
            onClick={() => setActiveVaultTab("documents")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "documents" ? "bg-brand text-brand-foreground shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-foreground"
            )}
          >
            📁 Documents
            <span className="ml-1.5 text-[10px] text-gray-500 dark:text-gray-400">({(docs as any[]).length})</span>
          </button>
          <button
            onClick={() => setActiveVaultTab("links")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "links" ? "bg-brand text-brand-foreground shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-foreground"
            )}
          >
            🔗 Links
            <span className="ml-1.5 text-[10px] text-gray-500 dark:text-gray-400">({(dealRoomLinks as any[]).length})</span>
          </button>
        </div>
        <div className="flex gap-2">
          {activeVaultTab === "documents" && isFounder && (
            <button
              onClick={() => setShowLibrary(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-sm hover:bg-brand/10"
            >
              <Plus className="h-4 w-4" /> Add from library
            </button>
          )}
          {activeVaultTab === "links" && (
            <button
              onClick={() => setShowAddLink(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
            >
              <Plus className="h-4 w-4" /> Add link
            </button>
          )}
        </div>
      </div>

      {activeVaultTab === "documents" && (<>

      {/* Platform documents section */}
      {(platformDocs as any[]).length > 0 && (
        <div className="mt-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">Platform Documents</h3>
            <span className="text-xs bg-[#7C3AED]/15 text-[#7C3AED] px-2 py-0.5 rounded-full">
              {(platformDocs as any[]).length} structured
            </span>
          </div>
          {/* Stage 2 gate — investor only */}
          {isInvestor && <Stage2Gate stage2Unlocked={stage2Unlocked} />}
          {/* Stage 1 docs */}
          {isInvestor && platformDocsSplit.stage1.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-semibold">Stage 1 — Initial review</div>
              <div className="space-y-2">
                {platformDocsSplit.stage1.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {doc.document_templates?.category
                            ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                            : "Document"}
                          {" · "}Updated {formatRelativeTime(doc.updated_at)}
                          {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                        {doc.status === "complete" ? "✓ Complete" : "In progress"}
                      </span>
                      <button
                        onClick={() => {
                          setViewingDoc(doc);
                          trackDocumentView({ founderDocumentId: doc.id });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#7C3AED]/15 text-[#7C3AED] hover:bg-[#7C3AED]/25 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Stage 2 docs — gated */}
          {isInvestor && platformDocsSplit.stage2.length > 0 && stage2Unlocked && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-semibold">Stage 2 — Full diligence</div>
              <div className="space-y-2">
                {platformDocsSplit.stage2.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {doc.document_templates?.category
                            ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                            : "Document"}
                          {" · "}Updated {formatRelativeTime(doc.updated_at)}
                          {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                        {doc.status === "complete" ? "✓ Complete" : "In progress"}
                      </span>
                      <button
                        onClick={() => {
                          setViewingDoc(doc);
                          trackDocumentView({ founderDocumentId: doc.id });
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#7C3AED]/15 text-[#7C3AED] hover:bg-[#7C3AED]/25 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Founder view (not split, no gate) */}
          {!isInvestor && (
          <div className="space-y-2">
            {(platformDocs as any[]).map((doc: any) => (
              <div key={doc.id}
                className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-accent transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {doc.document_templates?.category
                        ? doc.document_templates.category.charAt(0).toUpperCase() + doc.document_templates.category.slice(1)
                        : "Document"}
                      {" · "}Updated {formatRelativeTime(doc.updated_at)}
                      {doc.completeness_score > 0 && <> · {doc.completeness_score}% complete</>}
                      {" · "}
                      <span className="font-medium text-[#7C3AED]">
                        Stage {(doc.deal_room_stage ?? 1) === 2 ? "2 — Full diligence" : "1 — Initial review"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", doc.status === "complete" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400")}>
                    {doc.status === "complete" ? "✓ Complete" : "In progress"}
                  </span>
                  <button
                    onClick={() => {
                      setViewingDoc(doc);
                      trackDocumentView({ founderDocumentId: doc.id });
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#7C3AED]/15 text-[#7C3AED] hover:bg-[#7C3AED]/25 transition-colors">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Divider between platform docs and uploaded files */}
      {(platformDocs as any[]).length > 0 && (docs as any[]).length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded files</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
      )}

      {isFounder && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg bg-gray-100/40 border border-gray-200 dark:border-zinc-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>💡 <strong>Documents shared here are visible to the investor</strong> and appear in their Workstation automatically.</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                { ext: "PDF", color: "text-red-600 bg-red-500/10" },
                { ext: "PPTX", color: "text-orange-600 bg-orange-500/10" },
                { ext: "DOCX", color: "text-blue-600 bg-blue-500/10" },
                { ext: "XLSX", color: "text-green-600 bg-green-500/10" },
                { ext: "CSV",  color: "text-green-600 bg-green-500/10" },
                { ext: "PNG/JPG", color: "text-purple-600 bg-purple-500/10" },
              ].map(({ ext, color }) => (
                <span key={ext} className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", color)}>{ext}</span>
              ))}
              <span className="text-[10px] text-gray-500 dark:text-gray-400 self-center">· Max 50MB per file</span>
            </div>
          </div>
          <Dropzone
            dealRoomId={dealRoomId}
            activeDocTab={activeDocTab !== "All" ? activeDocTab : undefined}
            onUploadComplete={(fileName) => {
              queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
              if (fileName && userId) {
                triggerDocumentUploadedEmail({
                  data: { dealRoomId, documentName: fileName, uploaderUserId: userId },
                }).catch(() => {});
                supabase
                  .from("deal_room_members")
                  .select("user_id")
                  .eq("deal_room_id", dealRoomId)
                  .then(({ data: members }) => {
                    const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                    if (investorMembers.length > 0) {
                      supabase.from("notifications").insert(
                        investorMembers.map((m: any) => ({
                          user_id: m.user_id,
                          kind: "deal_activity",
                          title: "New document in this deal room",
                          body: `"${fileName}" has been shared with you for review.`,
                          read: false,
                          action_url: `/app/investor/deal-rooms`,
                          meta: { deal_room_id: dealRoomId },
                        }))
                      ).then(({ error: nErr }) => {
                        if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                      });
                    }
                  });
              }
            }}
          />
        </div>
      )}

      {/* Category tabs with count badges */}
      <div className="flex gap-1 mt-5 pb-2 overflow-x-auto border-b border-gray-200 dark:border-zinc-700">
        {DOC_CATEGORIES.map((cat) => {
          const count = cat === "All" ? (docs as any[]).length : (catCounts[cat] ?? 0);
          return (
            <button
              key={cat}
              onClick={() => setActiveDocTab(cat)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors",
                activeDocTab === cat
                  ? "bg-brand text-brand-foreground"
                  : "border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
              )}
            >
              {cat}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", activeDocTab === cat ? "bg-background/20" : "bg-accent text-gray-500 dark:text-gray-400")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Library modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowLibrary(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-zinc-700 bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-sm font-semibold">Add from document library</div>
              <button
                onClick={() => setShowLibrary(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {libLoading && <div className="text-sm text-gray-500 dark:text-gray-400 p-3 animate-pulse">Loading…</div>}
              {!libLoading && (libraryDocs as any[]).length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3 text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  No documents to add. Upload documents from the main Documents page first.
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
                    {doc.category && <div className="text-xs text-gray-500 dark:text-gray-400">{doc.category}</div>}
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
          <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">System generated</div>
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-card shadow-card divide-y divide-border/60">
            {ndaDocs.map((d) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-3">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-success/10"><Shield className="h-4 w-4 text-success" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Auto-generated NDA · {new Date(d.createdAt).toLocaleDateString()}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Signed by all</span>
                <button className="text-gray-500 dark:text-gray-400 hover:text-foreground"><Download className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredDocs.length > 0 && (
        <div className="mt-5 space-y-3">
          {filteredDocs.map((doc) => {
            const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
            const displayName = rawName.replace(/^\d{13}-/, "");
            const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
            const hasSummary = !!doc.ai_summary;
            const isGenerating = generatingSummaryId === doc.id;
            const isEditing = editingSummaryId === doc.id;
            const supportsAI = TEXT_EXTS.has(ext);
            const catColor = CATEGORY_COLORS[doc.category] ?? "bg-accent text-gray-500 dark:text-gray-400";
            const catBorder = CAT_BORDER[doc.category] ?? "border-l-muted-foreground/40";
            const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);
            const fileSize = formatFileSize(doc.file_size ?? null);

            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-xl bg-card shadow-card overflow-hidden border border-gray-200 dark:border-zinc-700 border-l-4",
                  catBorder
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
                      {activeDocTab === "All" && pitchDeckDoc?.id === doc.id && (
                        <span className="shrink-0 text-[9px] font-bold bg-brand/20 text-brand px-1.5 py-0.5 rounded-full">📌 PINNED</span>
                      )}
                      {doc.category && (
                        <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium", catColor)}>
                          {doc.category}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{doc.uploader?.full_name ?? "Unknown"}</span>
                      <span>·</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      {fileSize && <><span>·</span><span>{fileSize}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setPreviewDoc(doc);
                        trackDocumentView({ documentId: doc.id });
                      }}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {isFounder && (
                      <button
                        onClick={() => handleDocRemove(doc)}
                        title="Remove from deal room"
                        className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Summary section — only for text-based files */}
                {supportsAI && (
                  <div className="border-t border-gray-200 dark:border-zinc-700/40">
                    {hasSummary ? (
                      <div className="px-4 py-2.5">
                        <button
                          onClick={() => toggleSummary(doc.id)}
                          className="flex items-center gap-1.5 text-xs text-brand hover:underline w-full text-left"
                        >
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1">AI Summary</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-medium",
                            doc.summary_edited ? "bg-brand/10 text-brand" : "bg-muted/60 text-gray-500 dark:text-gray-400"
                          )}>
                            {doc.summary_edited ? "Edited" : "AI"}
                          </span>
                          {isSummaryExpanded(doc.id)
                            ? <ChevronUp className="h-3 w-3 shrink-0" />
                            : <ChevronDown className="h-3 w-3 shrink-0" />}
                        </button>
                        {isSummaryExpanded(doc.id) && (
                          <div className="mt-2 rounded-lg border-l-2 border-brand/40 bg-gray-100/30 px-3 py-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={summaryEdits[doc.id] ?? ""}
                                  onChange={(e) => setSummaryEdits((s) => ({ ...s, [doc.id]: e.target.value }))}
                                  rows={4}
                                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:border-brand/50"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingSummaryId(null)}
                                    className="text-[10px] border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const text = summaryEdits[doc.id]?.trim();
                                      if (!text) return;
                                      const { error } = await supabase.from("documents")
                                        .update({ ai_summary: text, summary_edited: true })
                                        .eq("id", doc.id);
                                      if (error) { toast.error("Failed to save summary"); return; }
                                      queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                                      queryClient.invalidateQueries({ queryKey: ["dd-docs", dealRoomId] });
                                      setEditingSummaryId(null);
                                      setSummaryEdits((s) => { const n = { ...s }; delete n[doc.id]; return n; });
                                      toast.success("Summary saved");
                                    }}
                                    className="text-[10px] bg-gradient-brand text-brand-foreground rounded px-2 py-1"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-900 dark:text-white/90 leading-relaxed whitespace-pre-line">
                                  {doc.ai_summary}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => generateSummary(doc)}
                                    disabled={isGenerating}
                                    className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-foreground border border-gray-200 dark:border-zinc-700 rounded px-2 py-0.5 hover:bg-accent disabled:opacity-50"
                                  >
                                    {isGenerating ? "Regenerating…" : "Regenerate"}
                                  </button>
                                  {isFounder && (
                                    <button
                                      onClick={() => {
                                        setEditingSummaryId(doc.id);
                                        setSummaryEdits((s) => ({ ...s, [doc.id]: doc.ai_summary! }));
                                      }}
                                      className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-foreground border border-gray-200 dark:border-zinc-700 rounded px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No summary yet — compact generate row */
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="text-xs font-medium text-brand flex-1">AI Summary</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic mr-2">Not generated yet</span>
                        <button
                          onClick={() => generateSummary(doc)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1 rounded-md bg-brand text-brand-foreground px-2.5 py-1 text-xs font-medium shadow-sm disabled:opacity-50"
                        >
                          {isGenerating
                            ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                            : <><Sparkles className="h-3 w-3" /> Generate</>}
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

      {filteredDocs.length === 0 && activeDocTab === "All" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted mx-auto mb-4">
            <FolderOpen className="h-7 w-7 text-gray-500 dark:text-gray-400/50" />
          </div>
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            {isFounder
              ? "Upload your pitch deck and key documents to share with investors."
              : "The founder hasn't shared any documents yet."}
          </p>
          {isFounder && (
            <label className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm cursor-pointer shadow-sm">
              <Upload className="h-4 w-4" /> Upload first document
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !userId) return;
                  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); e.target.value = ""; return; }
                  if (file.size > MAX_UPLOAD_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); e.target.value = ""; return; }
                  const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
                  const { error } = await supabase.storage.from("documents").upload(path, file);
                  if (error) { toast.error("Upload failed"); return; }
                  await supabase.from("documents").insert({
                    deal_room_id: dealRoomId,
                    uploader_id: userId,
                    storage_path: path,
                    file_name: file.name,
                    file_size: file.size,
                    category: "Other",
                  });
                  queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                  toast.success("Uploaded!");
                  e.target.value = "";
                  const { data: members } = await supabase
                    .from("deal_room_members")
                    .select("user_id")
                    .eq("deal_room_id", dealRoomId);
                  const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                  if (investorMembers.length > 0) {
                    supabase.from("notifications").insert(
                      investorMembers.map((m: any) => ({
                        user_id: m.user_id,
                        kind: "deal_activity",
                        title: "New document in this deal room",
                        body: `"${file.name}" has been shared with you for review.`,
                        read: false,
                        action_url: `/app/investor/deal-rooms`,
                        meta: { deal_room_id: dealRoomId },
                      }))
                    ).then(({ error: nErr }) => {
                      if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                    });
                  }
                }}
              />
            </label>
          )}
        </div>
      )}

      {/* Expected docs for active category */}
      {activeDocTab !== "All" && expectedForTab.length > 0 && (
        <div className="pb-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">
            Recommended for this category
          </div>
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 divide-y divide-border/40 overflow-hidden">
            {expectedForTab.map((expected) => (
              <div key={expected.name} className="flex items-center gap-3 px-4 py-3 bg-gray-100/20">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted shrink-0">
                  <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{expected.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400/60 mt-0.5">Not uploaded yet</div>
                </div>
                {isFounder && (
                  <label className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 text-brand px-3 py-1.5 text-xs cursor-pointer hover:bg-brand/5 transition-colors shrink-0">
                    <Upload className="h-3 w-3" /> Upload
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !userId) return;
                        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
                        if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); e.target.value = ""; return; }
                        if (file.size > MAX_UPLOAD_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); e.target.value = ""; return; }
                        const path = `${dealRoomId}/${userId}/${Date.now()}-${file.name}`;
                        const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
                        if (upErr) { toast.error("Upload failed"); return; }
                        await supabase.from("documents").insert({
                          deal_room_id: dealRoomId,
                          uploader_id: userId,
                          storage_path: path,
                          category: expected.category,
                          file_name: file.name,
                          file_size: file.size,
                        });
                        queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
                        toast.success(`${file.name} uploaded`);
                        e.target.value = "";
                        const { data: members } = await supabase
                          .from("deal_room_members")
                          .select("user_id")
                          .eq("deal_room_id", dealRoomId);
                        const investorMembers = (members ?? []).filter((m: any) => m.user_id !== userId);
                        if (investorMembers.length > 0) {
                          supabase.from("notifications").insert(
                            investorMembers.map((m: any) => ({
                              user_id: m.user_id,
                              kind: "deal_activity",
                              title: "New document in this deal room",
                              body: `"${file.name}" has been shared with you for review.`,
                              read: false,
                              action_url: `/app/investor/deal-rooms`,
                              meta: { deal_room_id: dealRoomId },
                            }))
                          ).then(({ error: nErr }) => {
                            if (nErr) console.warn("[notification] deal_activity insert failed:", nErr.message);
                          });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Investor Documents Section */}
      {(isInvestor || (isFounder && visibleInvestorDocs.length > 0)) && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 text-success px-2 py-0.5 text-[11px] font-semibold">
                  🔒 Investor Documents
                </span>
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isInvestor
                  ? "Only you can upload here. Choose visibility per document."
                  : "Documents shared with you by the investor."}
              </p>
            </div>
          </div>

          {/* Investor upload dropzone — only investor sees this */}
          {isInvestor && (
            <div className="mb-4">
              <Dropzone
                dealRoomId={dealRoomId}
                uploadedByRole="investor"
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["investor-documents", dealRoomId, userId] });
                }}
              />
            </div>
          )}

          {/* Investor doc list */}
          {visibleInvestorDocs.length === 0 && isInvestor && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 p-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No investor documents yet. Upload above.</p>
            </div>
          )}

          <div className="space-y-2">
            {visibleInvestorDocs.map((doc: any) => {
              const rawName = doc.name || doc.storage_path?.split("/").pop() || "Document";
              const displayName = rawName.replace(/^\d{13}-/, "");
              const ext = displayName.split(".").pop()?.toLowerCase() ?? "";
              const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);
              const currentVisibility = investorDocVisibility[doc.id] ?? doc.visibility ?? "shared";

              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-card px-4 py-3 shadow-card border-l-4 border-l-success/60">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", iconBg)}>
                    <FileIcon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.uploader?.full_name ?? "Investor"} · {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Visibility toggle — investor only */}
                  {isInvestor && (
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100/60 p-0.5 shrink-0">
                      {(["shared", "private"] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => updateDocVisibility(doc.id, v)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                            currentVisibility === v
                              ? v === "shared"
                                ? "bg-success text-success-foreground shadow-sm"
                                : "bg-warning text-warning-foreground shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-foreground"
                          )}
                        >
                          {v === "shared" ? "🌐 Shared" : "🔒 Private"}
                        </button>
                      ))}
                    </div>
                  )}
                  {isFounder && (
                    <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                      🌐 Shared
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc.storage_path)}
                      className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {isInvestor && (
                      <button
                        onClick={() => removeInvestorDoc(doc.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/10"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>)}

      {/* Links Tab */}
      {activeVaultTab === "links" && (
        <div className="mt-5 space-y-3">
          {(dealRoomLinks as any[]).length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 p-10 text-center">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium">No links yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add product videos, Loom recordings, external documents, or any URL</p>
              <button
                onClick={() => setShowAddLink(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
              >
                <Plus className="h-4 w-4" /> Add first link
              </button>
            </div>
          )}
          {(dealRoomLinks as any[]).map((link: any) => (
            <div key={link.id} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-card px-4 py-3 shadow-card">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 shrink-0">
                <LinkIcon className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{link.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{link.url}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"
                  title="Open link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {link.uploader_id === userId && (
                  <button
                    onClick={() => removeLink(link.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/10"
                    title="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLink && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowAddLink(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-700 bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-sm font-semibold">Add a link</div>
              <button onClick={() => setShowAddLink(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Link name</label>
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Product Demo Video, Financial Model..."
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowAddLink(false)} className="px-4 py-2 rounded-md border border-gray-200 dark:border-zinc-700 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button
                  onClick={addLink}
                  disabled={!linkName.trim() || !linkUrl.trim() || addingLink}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50"
                >
                  {addingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Platform document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewingDoc(null)}>
          <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/8">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>{viewingDoc.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {viewingDoc.completeness_score}% complete · Updated {formatRelativeTime(viewingDoc.updated_at)}
                </p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-gray-500 dark:text-gray-400 hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {viewingDoc.content && Object.entries(viewingDoc.content as Record<string, string>)
                .filter(([, v]) => v && String(v).trim())
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                  </div>
                ))
              }
              {(!viewingDoc.content || Object.keys(viewingDoc.content).length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No content available</p>
              )}
            </div>
            {viewingDoc.ai_feedback && (viewingDoc.ai_feedback as Record<string, unknown>).overall_score && (
              <div className="border-t border-white/8 p-4 flex items-center gap-3 bg-white/[0.02]">
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                  (viewingDoc.ai_feedback as Record<string, unknown>).signal === "strong"
                    ? "border-green-500 text-green-400" : "border-amber-500 text-amber-400"
                )}>
                  {String((viewingDoc.ai_feedback as Record<string, unknown>).overall_score)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  AI score: {String((viewingDoc.ai_feedback as Record<string, unknown>).summary ?? "").substring(0, 120)}...
                </p>
              </div>
            )}
          </div>
        </div>
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
  const isPdf = ext === "pdf";
  const isOffice = ["pptx", "docx", "xlsx", "ppt", "doc", "xls"].includes(ext);

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
        className="w-full max-w-4xl rounded-2xl border border-gray-200 dark:border-zinc-700 bg-card shadow-elev overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="text-sm font-semibold truncate">{displayName}</div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          {!url ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          ) : isImage ? (
            <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg" />
          ) : isPdf ? (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-zinc-700"
              title={displayName}
            />
          ) : isOffice ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-zinc-700"
              title={displayName}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
                <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available for this file type.</p>
              <a
                href={url}
                download={displayName}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm"
              >
                <Download className="h-4 w-4" /> Download to view
              </a>
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
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-card shadow-card p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand" /> Participants</div>
          <button className="text-xs inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-foreground"><UserPlus className="h-3.5 w-3.5" /> Invite</button>
        </div>
        {list.length === 0 ? (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">No participants yet.</div>
        ) : (
          <div className="mt-4 divide-y divide-border/60">
            {list.map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 py-3 items-center text-sm">
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0">{p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</div>
                  <span className="font-medium truncate">{p.name}</span>
                </div>
                <div className="col-span-3 text-gray-500 dark:text-gray-400 truncate">{p.email}</div>
                <div className="col-span-2 text-gray-500 dark:text-gray-400 truncate">{p.role}</div>
                <div className="col-span-2 text-gray-500 dark:text-gray-400 truncate">{p.company || "—"}</div>
                <div className="col-span-1"><span className={cn("text-[10px] px-2 py-0.5 rounded", statusColor(p.status))}>{p.status}</span></div>
                <div className="col-span-1 text-right text-xs text-gray-500 dark:text-gray-400">{p.dateJoined ?? "—"}</div>
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
          appUrl: import.meta.env.VITE_APP_URL || "https://hockystick.app",
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
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-700 bg-card shadow-elev p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-semibold">Invite investor to deal room</div>
            <button
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-accent hover:text-foreground"
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
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Or share this link directly</div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={sentLink}
                    className="flex-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-1.5 text-xs font-mono text-gray-500 dark:text-gray-400 focus:outline-none min-w-0"
                  />
                  <button
                    onClick={copyLink}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800"
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
                <label className="text-xs text-gray-500 dark:text-gray-400">Investor email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@firm.com"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Personal message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Hi, I'd love to share our deal room with you…"
                  className="mt-1 w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
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
  const [noteVisibility, setNoteVisibility] = useState<"public" | "team" | "private">("public");
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
        .insert({ deal_room_id: dealRoomId, author_id: userId, body: body.trim(), private: noteVisibility === "private", visibility: noteVisibility });
      if (error) throw error;
      await logActivity(dealRoomId, userId, "Added a note");
      queryClient.invalidateQueries({ queryKey: ["notes", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["activities-overview", dealRoomId] });
      setBody("");
      setNoteVisibility("public");
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

      <form onSubmit={submit} className="mt-5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-card p-4 shadow-card space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note…"
          rows={3}
          className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="flex items-center gap-1 rounded-lg bg-gray-100/60 p-0.5">
              {(["public", "team", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNoteVisibility(v)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    noteVisibility === v
                      ? v === "public"
                        ? "bg-brand text-brand-foreground shadow-sm"
                        : v === "team"
                        ? "bg-blue-500 text-gray-900 dark:text-white shadow-sm"
                        : "bg-warning text-warning-foreground shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-foreground"
                  )}
                >
                  {v === "public" ? "🌐 Public" : v === "team" ? "👥 Team" : "🔒 Private"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {noteVisibility === "public" ? "Visible to all deal room members" : noteVisibility === "team" ? "Visible to your role only (founder or investor)" : "Only visible to you"}
            </span>
          </label>
          <button type="submit" disabled={!body.trim() || saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50">
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save note
          </button>
        </div>
      </form>

      {isError && <p className="mt-4 text-sm text-destructive">Could not load data. Please refresh.</p>}
      {isLoading && <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading…</div>}

      <div className="mt-5 grid gap-3">
        {(notes as any[]).map((n) => (
          <div key={n.id} className={`rounded-xl border border-gray-200 dark:border-zinc-700 p-4 shadow-card ${n.private ? "bg-warning/5 border-warning/30" : "bg-white dark:bg-zinc-900"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{n.author_id === userId ? "You" : (n.users?.full_name ?? "Unknown")}</span>
              <span className="text-gray-500 dark:text-gray-400">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
              {(n.private || n.visibility === "private") && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">🔒 Private</span>
                    )}
                    {n.visibility === "team" && !n.private && (
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">👥 Team</span>
                    )}
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
        .from("activity_log")
        .select("id, actor_name, action_type, target_label, detail, created_at")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const _dotColor = (action: string) => {
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
      {isLoading && <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading…</div>}
      {!isLoading && !isError && events.length === 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No activity yet. Activity is recorded automatically as the deal room is used.</p>
      )}
      {events.length > 0 && (
        <div className="mt-6 relative pl-6">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
          {(events as any[]).map((e) => (
            <div key={e.id} className="relative pb-6 last:pb-0">
              <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-brand ring-4 ring-white dark:ring-zinc-900" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">{e.action_type ?? e.target_label ?? "Activity"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {e.actor_name ? `${e.actor_name} · ` : ""}
                {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
        const result = await withTimeout(getQASuggestions({
          data: {
            question: text,
            startupName: companyName || "the startup",
            sector: sector || "tech",
            previousQuestions: msgs.filter((m) => m.is_qa).map((m) => m.body).slice(-5),
          },
        }));
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
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Structured diligence questions stay separate from the live discussion.</p>
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

        <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-card shadow-card">
          <div className="border-b border-gray-200 dark:border-zinc-700 p-5">
            <div className="text-sm font-semibold">Structured Q&amp;A</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Investor questions and founder answers, organized as expandable cards.</div>
          </div>

          {isInvestor && (
            <div className="border-b border-gray-200 dark:border-zinc-700 p-5">
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
                className="w-full resize-none rounded-md border border-gray-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
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
            {loading && <div className="p-5 text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading…</div>}
            {loadError && <p className="p-5 text-sm text-destructive">Could not load data. Please refresh.</p>}
            {!loading && !loadError && structured.length === 0 && (
              <div className="p-5 text-sm text-gray-500 dark:text-gray-400">No structured questions yet.</div>
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
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Asked by {author} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={cn("rounded-full px-2 py-1 text-[11px] font-medium", answer ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                        {answer ? `${words} words` : "Awaiting answer"}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform", open && "rotate-180")} />
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-gray-200 dark:border-zinc-700 bg-background/60 px-5 py-4">
                      {answer ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Founder answer</span>
                            <span>{words} words</span>
                          </div>
                          <p className="text-sm leading-relaxed">{answer}</p>
                          {item.metadata?.answeredAt && (
                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
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
                            className="w-full resize-none rounded-md border border-gray-200 dark:border-zinc-700 bg-card px-3 py-2 text-sm outline-none focus:border-brand/50"
                          />
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{countWords(answerDrafts[item.id] ?? "")} words</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  if (!userId || draftingAiReplyId === item.id) return;
                                  setDraftingAiReplyId(item.id);
                                  try {
                                    const aiResp = await withTimeout(secureAICall({
                                      data: {
                                        userId: userId || "",
                                        systemPrompt: "You are a startup founder assistant. Write a clear, professional answer to an investor due-diligence question. Return only the answer text, under 120 words, no markdown symbols.",
                                        userMessage: `Investor question: "${item.body}"\n\nWrite a founder's answer.`,
                                        maxTokens: 300,
                                      }
                                    }));
                                    const draft = (aiResp.reply ?? "").trim();
                                    if (draft) setAnswerDrafts((d) => ({ ...d, [item.id]: draft }));
                                  } catch (err) {
                                    toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "AI draft failed");
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
                        <div className="text-sm text-gray-500 dark:text-gray-400">The founder has not answered this question yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-card shadow-card">
          <div className="border-b border-gray-200 dark:border-zinc-700 p-5">
            <div className="text-sm font-semibold">Live discussion</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Informal back-and-forth for quick clarifications.</div>
          </div>

          <div ref={scrollRef} className="max-h-[360px] overflow-y-auto px-5 py-4 space-y-3">
            {loading && <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading…</div>}
            {!loading && !loadError && discussion.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">No live discussion yet.</div>
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
                        <span className="text-gray-500 dark:text-gray-400">{format(new Date(m.created_at), "h:mm a")}</span>
                      </div>
                    )}
                    <div className={cn("rounded-2xl px-3.5 py-2 text-sm", isMe ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-gray-100 dark:bg-zinc-800 rounded-tl-sm")}>
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 dark:border-zinc-700 bg-background px-5 py-4">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-card px-3 py-2 transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10">
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

// ── Overview Panel ──────────────────────────────────────────────────────────
function OverviewPanel({
  dealRoom,
  startup,
  investorProfile,
  currentUserId,
  pendingTransition,
  isApprover: _isApprover,
  stageRequesting,
  stageApproving: _stageApproving,
  onRequestNextStage,
  onApproveTransition: _onApproveTransition,
  onRejectTransition: _onRejectTransition,
}: {
  dealRoom: DealRoomRecord;
  startup: StartupRecord;
  investorProfile?: InvestorProfileRecord;
  currentUserId: string;
  pendingTransition: any;
  isApprover: boolean;
  stageRequesting: boolean;
  stageApproving: boolean;
  onRequestNextStage: () => Promise<void>;
  onApproveTransition: (id: string) => Promise<void>;
  onRejectTransition: (id: string) => Promise<void>;
}) {
  const companyName = startup?.company_name ?? "Unknown";
  const companyInitial = companyName[0]?.toUpperCase() ?? "D";
  const daysOpen = dealRoom?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(dealRoom.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : "—";

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["deal-room-overview-team", startup?.id],
    enabled: !!startup?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("*").eq("startup_id", startup.id);
      return data ?? [];
    },
  });

  const { data: dealBrief } = useQuery({
    queryKey: ["deal-room-overview-brief", startup?.id, dealRoom?.investor_user_id],
    enabled: !!startup?.id && !!dealRoom?.investor_user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_briefs")
        .select("match_score,headline")
        .eq("startup_id", startup.id)
        .eq("investor_id", dealRoom.investor_user_id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["deal-room-overview-activity", startup?.id, dealRoom?.id],
    enabled: !!startup?.id && !!dealRoom?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id,actor_name,action_type,target_label,created_at")
        .or(`account_id.eq.${startup.id},target_id.eq.${dealRoom.id}`)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  function initials(name?: string | null) {
    return (name ?? "?")
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  }

  function formatMoney(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "number") return `$${value.toLocaleString()}`;
    const text = String(value);
    return text.startsWith("$") ? text : `$${text}`;
  }

  function formatValue(value: unknown, suffix = "") {
    if (value === null || value === undefined || value === "") return "—";
    return `${value}${suffix}`;
  }

  const sectors = Array.isArray(investorProfile?.sectors)
    ? investorProfile?.sectors.join(", ")
    : investorProfile?.sectors;
  const workflowRank = stageRank(dealRoom?.workflow_stage);
  const progressStages = [
    { key: "overview" as DealRoomStageKey, label: "Overview" },
    { key: "information_vault" as DealRoomStageKey, label: "Info Vault" },
    { key: "qa" as DealRoomStageKey, label: "Q&A" },
    { key: "due_diligence" as DealRoomStageKey, label: "Due Diligence" },
    { key: "term_sheet" as DealRoomStageKey, label: "Term Sheet" },
    { key: "closing" as DealRoomStageKey, label: "Closing" },
  ];

  return (
    <div className="w-full px-6 py-6">
      <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-bold text-white">
              {companyInitial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">{companyName.toUpperCase()}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {startup?.stage && (
                  <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-xs font-medium text-[#7C3AED]">
                    {startup.stage}
                  </span>
                )}
                {startup?.sector && <span className="text-sm text-gray-500 dark:text-gray-400">{startup.sector}</span>}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <div className="flex flex-wrap gap-6">
              {[
                ["Days open", daysOpen],
                ["Workflow", workflowStageLabel(dealRoom?.workflow_stage)],
                ["Match score", dealBrief?.match_score ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-[92px]">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {[dealRoom?.investor_name, dealRoom?.investor_company].filter(Boolean).join(" · ") || "Investor not assigned"}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">TRACTION METRICS</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Revenue", formatValue(startup?.revenue)],
            ["Burn rate", formatMoney(startup?.burn_rate)],
            ["Runway", formatValue(startup?.runway_months, "mo")],
            ["Team size", formatValue(startup?.team_size)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-4">
        <h3 className="mb-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">TEAM</h3>
        {teamMembers.length === 0 ? (
          <p className="text-gray-400 text-sm">Team members not added yet</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {(teamMembers as any[]).map((member) => (
              <article key={member.id ?? member.name} className="min-w-[180px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
                {member.photo_url ? (
                  <img src={member.photo_url} alt="" className="w-12 h-12 rounded-full object-cover mb-2" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-lg font-bold mb-2">
                    {initials(member.name)}
                  </div>
                )}
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{member.name ?? "Team member"}</div>
                {member.title && <div className="text-xs text-gray-500 dark:text-gray-400">{member.title}</div>}
                {member.bio && <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{member.bio}</p>}
                {member.linkedin_url && (
                  <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-gray-500 hover:text-[#7C3AED] dark:text-gray-400">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">FOUNDER</div>
          <div className="font-semibold text-gray-900 dark:text-white">{companyName}</div>
          {startup?.country && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{startup.country}</div>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Founded: {formatValue(startup?.founded_year)}</span>
            <span>Team: {formatValue(startup?.team_size)}</span>
          </div>
          {startup?.description && <p className="mt-3 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{startup.description}</p>}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">INVESTOR</div>
          {dealRoom?.investor_name ? (
            <>
              <div className="font-semibold text-gray-900 dark:text-white">{dealRoom.investor_name}</div>
              {dealRoom?.investor_company && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dealRoom.investor_company}</div>}
              {investorProfile?.thesis && <p className="mt-3 text-sm line-clamp-2 text-gray-600 dark:text-gray-300">{investorProfile.thesis}</p>}
              {investorProfile?.thesis_statement && !investorProfile?.thesis && (
                <p className="mt-3 text-sm line-clamp-2 text-gray-600 dark:text-gray-300">{investorProfile.thesis_statement}</p>
              )}
              {sectors && <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">{sectors}</div>}
              {dealBrief?.match_score !== undefined && (
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Match score: <span className="font-semibold text-gray-900 dark:text-white">{dealBrief.match_score}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No investor in this deal room yet</p>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 mb-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">RECENT ACTIVITY</h3>
        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {(recentActivity as any[]).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">{activity.actor_name ?? "Someone"}</span>
                  <span> · {activity.action_type ?? activity.target_label ?? "Activity"}</span>
                </div>
                <div className="ml-auto whitespace-nowrap text-xs text-gray-400">
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4" data-testid="stage-progress-bar">
        <div className="flex items-start">
          {progressStages.map((stage, index) => {
            const rank = UI_STAGE_ORDER.indexOf(stage.key);
            const isCurrent = rank === workflowRank;
            const isComplete = rank < workflowRank;
            const dotClass = isCurrent
              ? "bg-[#7C3AED] text-white"
              : isComplete
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-gray-500 dark:bg-zinc-700 dark:text-gray-400";
            const lineClass = rank < workflowRank ? "bg-green-500" : "bg-gray-200 dark:bg-zinc-700";
            return (
              <div key={stage.key} className="flex flex-1 items-start last:flex-none">
                <div className="flex min-w-[64px] flex-col items-center gap-2">
                  <div className={`h-4 w-4 rounded-full ${dotClass}`} data-testid={`stage-progress-dot-${stage.key}`} />
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">{stage.label}</div>
                </div>
                {index < progressStages.length - 1 && <div className={`mt-2 h-0.5 flex-1 ${lineClass}`} />}
              </div>
            );
          })}
        </div>
        {stageRank(dealRoom?.workflow_stage) !== stageRank("closing") && (
          <div className="mt-5 flex justify-end">
            {pendingTransition ? (
              <span className="text-xs text-amber-600 dark:text-amber-400 px-3 py-2">Stage advance pending approval…</span>
            ) : (
              <button
                onClick={onRequestNextStage}
                disabled={stageRequesting}
                className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                data-testid="request-next-stage"
              >
                {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Request next stage →
              </button>
            )}
          </div>
        )}
      </section>
      <span className="sr-only">Overview loaded for {currentUserId}</span>
    </div>
  );
}
