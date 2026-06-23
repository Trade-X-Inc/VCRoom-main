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
import { generateDealBrief, type DealBriefResult } from "@/lib/deal-brief-fn";
import {
  advanceDealStage, skipMeeting, completeMeeting, updateMeetingNotes,
  sendTermSheet, respondToTermSheet, createDocumentRequest, respondToDocumentRequest, passDeal,
  DEAL_STAGES, type DealStage,
} from "@/lib/deal-room-fn";

export const Route = createFileRoute("/app/deal-room/$id")({
  component: DealRoom,
});

const STAGE_SHORT: Record<DealStage, string> = {
  nda_signed: "NDA & Profiles",
  initial_review: "Stage 1 Review",
  diligence: "Diligence",
  term_sheet: "Term Sheet",
  closed: "Closed",
};

const STAGE_UNLOCK_HINT: Record<DealStage, string> = {
  nda_signed: "available now",
  initial_review: "the investor opens Stage 1 review",
  diligence: "the investor advances to diligence",
  term_sheet: "the investor sends a term sheet",
  closed: "the deal closes",
};

function DealRoom() {
  const { id: dealRoomId } = Route.useParams();
  const [aiOpen, setAiOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [viewStage, setViewStage] = useState<DealStage | null>(null);
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
        <div className="text-sm text-muted-foreground animate-pulse">Verifying access…</div>
      </div>
    );
  }

  // Team member access gate (A2)
  if (isTeamMember && !teamAssignmentLoading && teamAssignment === null) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-muted/30">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <div className="font-semibold">Access restricted</div>
          <div className="mt-1 text-sm text-muted-foreground max-w-sm">
            You haven't been assigned to this deal room. Ask your team admin to give you access.
          </div>
        </div>
        <Link to="/app/deal-rooms" className="mt-2 text-sm text-brand hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to deal rooms
        </Link>
      </div>
    );
  }

  const activeStage = viewStage ?? currentStage;
  const viewingHistory = viewStage !== null && DEAL_STAGES.indexOf(viewStage) < currentIndex;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
      {/* ── Top header bar ─────────────────────────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{ background: "#111114", borderColor: "rgba(255,255,255,0.08)" }}
        data-testid="deal-stage-bar"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Left: back + company chip */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to={"/app/deal-rooms" as any}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 shrink-0"
              title="All deal rooms"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="grid h-8 w-8 place-items-center rounded-lg shrink-0 font-semibold text-white"
              style={{ background: "#7C3AED" }}>
              {companyName[0] ?? "D"}
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: "Syne, sans-serif" }}>{companyName}</div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{isInvestor ? "Founder · Deal Room" : "Investor · Deal Room"}</div>
            </div>
          </div>

          {/* Center: stage pills */}
          <StageBar
            currentIndex={currentIndex}
            activeStage={activeStage}
            onSelect={(stage, idx) => {
              if (idx <= currentIndex) setViewStage(stage === currentStage ? null : stage);
            }}
          />

          {/* Right: activity + AI */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setActivityOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/5"
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
      <main key={activeStage} className="flex-1 overflow-y-auto min-h-0" style={{ background: "#0A0A0B" }}>
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
          viewingHistory={viewingHistory}
          onAddQuestion={handleAddQuestion}
          onSaveAnswer={handleSaveAnswer}
        />
      </main>

      {/* ── Activity drawer ─────────────────────────────────────── */}
      {activityOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setActivityOpen(false)} />
          <aside
            className="fixed top-0 bottom-0 right-0 z-40 w-full sm:w-[420px] border-l flex flex-col"
            style={{ background: "#0A0A0B", borderColor: "rgba(255,255,255,0.08)" }}
            data-testid="activity-drawer"
          >
            <div className="h-14 border-b flex items-center justify-between px-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Activity</div>
              <button onClick={() => setActivityOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-white/50 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
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
          <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col" data-testid="ai-panel">
            <div className="h-14 border-b border-border/60 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Deal Room AI</div>
                  <div className="text-[10px] text-muted-foreground">{companyName}</div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" data-testid="close-ai"><X className="h-4 w-4" /></button>
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
  currentIndex,
  activeStage,
  onSelect,
}: {
  currentIndex: number;
  activeStage: DealStage;
  onSelect: (stage: DealStage, index: number) => void;
}) {
  const [tip, setTip] = useState<DealStage | null>(null);
  return (
    <div className="relative" data-testid="stage-pills">
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {DEAL_STAGES.map((stage, idx) => {
          const isCurrent = stage === activeStage;
          const isPast = idx < currentIndex;
          const isFuture = idx > currentIndex;
          const navigable = idx <= currentIndex;
          return (
            <div key={stage} className="shrink-0">
              <button
                onClick={() => {
                  if (navigable) onSelect(stage, idx);
                  else setTip((t) => (t === stage ? null : stage));
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap transition-colors"
                style={
                  isCurrent
                    ? { background: "#7C3AED", color: "#fff", fontWeight: 600 }
                    : isFuture
                      ? { color: "rgba(255,255,255,0.25)", cursor: "default" }
                      : { color: "rgba(255,255,255,0.5)" }
                }
                data-testid={`stage-pill-${stage}`}
                data-state={isCurrent ? "current" : isPast ? "past" : "future"}
              >
                {isPast && <Check className="h-3 w-3" style={{ color: "#10B981" }} />}
                {isFuture && <Lock className="h-3 w-3" />}
                {STAGE_SHORT[stage]}
              </button>
            </div>
          );
        })}
      </nav>
      {/* tooltip rendered outside overflow-x-auto so it isn't clipped */}
      {tip !== null && (
        <div
          className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] pointer-events-none"
          style={{ background: "#18181C", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          Unlocks when {STAGE_UNLOCK_HINT[tip]}
        </div>
      )}
    </div>
  );
}

// ── Reusable dark UI atoms ─────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: "#111114",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
};
function DarkCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ ...CARD, padding: "20px 24px", ...style }}>
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
    <div className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Syne, sans-serif" }}>
      {children}
    </div>
  );
}

// ── Staged deal room — renders the panel for the active stage ──────
function StagedDealRoom({
  dealRoomId, room, memberList, isInvestor, isFounder, userId, userName,
  companyName, currentStage, activeStage, viewingHistory, onAddQuestion, onSaveAnswer,
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
  viewingHistory: boolean;
  onAddQuestion: (q: QAQuestion) => Promise<string | undefined>;
  onSaveAnswer: (questionId: string, answer: string) => Promise<void>;
}) {
  const startup = room?.startups;
  const sector = startup?.sector ?? "";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {viewingHistory && (
        <div className="mb-5 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", color: "rgba(255,255,255,0.7)" }}>
          <Clock className="h-3.5 w-3.5" style={{ color: "#A855F7" }} />
          Viewing {STAGE_SHORT[activeStage]} history. This stage is complete — current stage is {STAGE_SHORT[currentStage]}.
        </div>
      )}

      {activeStage === "nda_signed" && (
        <NdaStagePanel dealRoomId={dealRoomId} room={room} memberList={memberList} isInvestor={isInvestor} isFounder={isFounder} />
      )}
      {activeStage === "initial_review" && (
        <InitialReviewPanel
          dealRoomId={dealRoomId} room={room} isInvestor={isInvestor} isFounder={isFounder}
          userId={userId} userName={userName} companyName={companyName} sector={sector}
          readOnly={viewingHistory}
        />
      )}
      {activeStage === "diligence" && (
        <DiligencePanel
          dealRoomId={dealRoomId} room={room} isInvestor={isInvestor} isFounder={isFounder}
          userId={userId} readOnly={viewingHistory}
        />
      )}
      {activeStage === "term_sheet" && (
        <TermSheetPanel dealRoomId={dealRoomId} room={room} isInvestor={isInvestor} isFounder={isFounder} userId={userId} readOnly={viewingHistory} />
      )}
      {activeStage === "closed" && (
        <ClosedPanel room={room} isInvestor={isInvestor} />
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
      <div className="w-full max-w-md rounded-2xl" style={{ ...CARD, padding: 0 }} onClick={(e) => e.stopPropagation()} data-testid="pass-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Pass on this deal</div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-white/50 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Eyebrow>Reason</Eyebrow>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="pass-reason"
            >
              {PASS_REASONS.map((r) => <option key={r} value={r} style={{ background: "#18181C" }}>{r}</option>)}
            </select>
          </div>
          <div>
            <Eyebrow>Context for founder (optional)</Eyebrow>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              placeholder="One or two sentences the founder will see."
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-white/25"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          <div>
            <Eyebrow>Reconsider if (optional)</Eyebrow>
            <input
              value={reconsider}
              onChange={(e) => setReconsider(e.target.value)}
              placeholder="e.g. you reach $50K MRR"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
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
      <div className="w-full max-w-sm rounded-2xl" style={{ ...CARD, padding: 0 }} onClick={(e) => e.stopPropagation()} data-testid={testid}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>{title}</div>
        </div>
        <div className="p-5 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{body}</div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
          <PrimaryButton onClick={onConfirm} disabled={busy} testid={testid ? `${testid}-confirm` : undefined} className="!px-4 !py-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ── NDA stage panel ────────────────────────────────────────────────
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
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Both parties signed the NDA. Profiles are shared.</p>
      </div>

      <DarkCard>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "rgba(16,185,129,0.12)" }}>
            <Shield className="h-5 w-5" style={{ color: "#10B981" }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">NDA signed by all parties</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
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
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{[startup?.stage, startup?.sector].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          </div>
          {founderRow?.users?.full_name && (
            <div className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Founder: {founderRow.users.full_name}</div>
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
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{investorRow?.users?.full_name || (room as any)?.investor_name || "—"}</div>
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
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            <div className="font-semibold text-white">Upload your Stage 1 documents</div>
            <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Add your deck and key materials. They appear in the investor's Stage 1 review when the investor opens it.</p>
          </div>
        ) : (
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            <div className="font-semibold text-white">Waiting on the founder</div>
            <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Stage 1 review opens once the founder shares their documents.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function companyNameOf(room: any) {
  return room?.startups?.company_name ?? (room as any)?.investor_company ?? "Deal Room";
}

// ── Initial review panel ───────────────────────────────────────────
function InitialReviewPanel({
  dealRoomId, room, isInvestor, isFounder, userId, userName, companyName, sector, readOnly,
}: {
  dealRoomId: string; room: any; isInvestor: boolean; isFounder: boolean;
  userId?: string; userName: string; companyName: string; sector: string; readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState<DealBriefResult | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const startupId = (room as any)?.startup_id ?? null;

  const loadBrief = async () => {
    if (!userId) return;
    setBriefLoading(true);
    try {
      const result = await generateDealBrief({ data: { dealRoomId, userId } });
      setBrief(result);
    } catch {
      toast.error("Could not generate brief");
    } finally {
      setBriefLoading(false);
    }
  };

  const doAdvance = async () => {
    if (!userId) return;
    setAdvancing(true);
    try {
      const res = await advanceDealStage({ data: { deal_room_id: dealRoomId, to_stage: "diligence", actor_user_id: userId } });
      if (!res.ok) { toast.error("Could not advance"); return; }
      await queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success("Advanced to Diligence");
      setShowAdvance(false);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Stage 1 Review</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>Initial review</h2>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          {isInvestor ? "Review the deal brief and Stage 1 documents, then decide." : "The investor is reviewing your Stage 1 materials."}
        </p>
      </div>

      {isInvestor && (
        <DarkCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4" style={{ color: "#A855F7" }} /> AI deal brief
            </div>
            {!brief && (
              <button onClick={loadBrief} disabled={briefLoading} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" style={{ background: "#7C3AED" }} data-testid="generate-brief">
                {briefLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate
              </button>
            )}
          </div>
          {brief ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: "rgba(124,58,237,0.12)", color: "#A855F7" }}>{brief.matchScore}/100 · {brief.matchLabel}</span>
              </div>
              <BriefList label="Strengths" items={brief.strengths} color="#10B981" />
              <BriefList label="Risks" items={brief.risks} color="#F59E0B" />
              <div>
                <Eyebrow>Suggested next action</Eyebrow>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>{brief.nextAction}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Generate an AI brief summarizing fit, strengths, and risks for this deal.</p>
          )}
        </DarkCard>
      )}

      <DarkCard style={{ padding: 0 }}>
        <div className="px-6 pt-5">
          <Eyebrow>Stage 1 documents</Eyebrow>
        </div>
        <div className="-mt-2">
          <Documents dealRoomId={dealRoomId} isFounder={isFounder} isInvestor={isInvestor} userId={userId} startupId={startupId} />
        </div>
      </DarkCard>

      <DarkCard style={{ padding: 0 }}>
        <QA dealRoomId={dealRoomId} userId={userId} userName={userName} isInvestor={isInvestor} isFounder={isFounder} companyName={companyName} sector={sector} />
      </DarkCard>

      {isInvestor && !readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={() => setShowAdvance(true)} testid="advance-to-diligence">Advance to Diligence</PrimaryButton>
          <button
            onClick={() => setShowPass(true)}
            data-testid="pass-deal"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
          >
            <ThumbsDown className="h-4 w-4" /> Pass
          </button>
        </div>
      )}

      {showAdvance && (
        <ConfirmModal
          title="Advance to Diligence"
          body="This opens the diligence stage for both parties — meetings, document requests, and the DD checklist. The founder will see the change."
          confirmLabel="Advance"
          busy={advancing}
          testid="advance-confirm-modal"
          onConfirm={doAdvance}
          onClose={() => setShowAdvance(false)}
        />
      )}
      {showPass && <PassModal dealRoomId={dealRoomId} userId={userId} onClose={() => setShowPass(false)} />}
    </div>
  );
}

function BriefList({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: color }} /> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Diligence panel (3 sub-tabs) ───────────────────────────────────
function DiligencePanel({ dealRoomId, room, isInvestor, isFounder, userId, readOnly }: { dealRoomId: string; room: any; isInvestor: boolean; isFounder: boolean; userId?: string; readOnly: boolean }) {
  const [sub, setSub] = useState<"meetings" | "requests" | "checklist">("meetings");
  const subs = [
    { k: "meetings" as const, l: "Meetings", i: Calendar },
    { k: "requests" as const, l: "Document Requests", i: FolderOpen },
    { k: "checklist" as const, l: "DD Checklist", i: ClipboardList },
  ];
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Diligence</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>Due diligence</h2>
      </div>

      <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)" }} data-testid="diligence-subtabs">
        {subs.map((s) => (
          <button
            key={s.k}
            onClick={() => setSub(s.k)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={sub === s.k ? { background: "#7C3AED", color: "#fff" } : { color: "rgba(255,255,255,0.5)" }}
            data-testid={`diligence-sub-${s.k}`}
          >
            <s.i className="h-3.5 w-3.5" /> {s.l}
          </button>
        ))}
      </div>

      {sub === "meetings" && <MeetingsSubTab dealRoomId={dealRoomId} room={room} isInvestor={isInvestor} isFounder={isFounder} userId={userId} readOnly={readOnly} />}
      {sub === "requests" && <DocumentRequestsSubTab dealRoomId={dealRoomId} isInvestor={isInvestor} isFounder={isFounder} userId={userId} readOnly={readOnly} />}
      {sub === "checklist" && (
        <DarkCard style={{ padding: 0 }}>
          <DDWorkstation dealRoomId={dealRoomId} userId={userId} isInvestor={isInvestor} isFounder={isFounder} />
        </DarkCard>
      )}
    </div>
  );
}

// ── Meetings sub-tab ───────────────────────────────────────────────
function MeetingsSubTab({ dealRoomId, room, isInvestor, isFounder, userId, readOnly }: { dealRoomId: string; room: any; isInvestor: boolean; isFounder: boolean; userId?: string; readOnly: boolean }) {
  const queryClient = useQueryClient();
  const [busyNum, setBusyNum] = useState<number | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { type: string; scheduled: string }>>({});

  const { data: meetings = [], refetch } = useQuery({
    queryKey: ["dr-stage-meetings", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_meetings")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("meeting_number", { ascending: true });
      return data ?? [];
    },
  });

  const byNumber = (n: number) => (meetings as any[]).find((m) => m.meeting_number === n);
  const anyDone = (meetings as any[]).some((m) => m.completed_at);

  const markDone = async (n: number) => {
    if (!userId) return;
    setBusyNum(n);
    try {
      const d = drafts[n];
      await completeMeeting({ data: { deal_room_id: dealRoomId, meeting_number: n, actor_user_id: userId, meeting_type: d?.type === "in_person" ? "in_person" : "video", scheduled_at: d?.scheduled ? new Date(d.scheduled).toISOString() : undefined } });
      await refetch();
      toast.success(`Meeting ${n} marked done`);
    } finally { setBusyNum(null); }
  };

  const doSkip = async (n: number) => {
    if (!userId) return;
    setBusyNum(n);
    try {
      await skipMeeting({ data: { deal_room_id: dealRoomId, meeting_number: n, actor_user_id: userId } });
      await refetch();
      toast.success(`Meeting ${n} skipped`);
    } finally { setBusyNum(null); }
  };

  const saveNotes = async (n: number, notes_shared?: string, notes_investor?: string) => {
    await updateMeetingNotes({ data: { deal_room_id: dealRoomId, meeting_number: n, notes_shared, notes_investor } });
    await refetch();
    toast.success("Notes saved");
  };

  const doAdvance = async () => {
    if (!userId) return;
    setAdvancing(true);
    try {
      const res = await advanceDealStage({ data: { deal_room_id: dealRoomId, to_stage: "term_sheet", actor_user_id: userId } });
      if (!res.ok) { toast.error("Could not advance"); return; }
      await queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success("Advanced to Term Sheet");
      setShowAdvance(false);
    } finally { setAdvancing(false); }
  };

  return (
    <div className="space-y-4">
      {[1, 2, 3].map((n) => {
        const m = byNumber(n);
        const skipped = m?.meeting_type === "skipped";
        const done = !!m?.completed_at;
        const status = skipped ? "Skipped" : done ? "Done" : "Scheduled";
        const draft = drafts[n] ?? { type: m?.meeting_type === "in_person" ? "in_person" : "video", scheduled: "" };
        return (
          <DarkCard key={n}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">Meeting {n}</div>
              <span className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={skipped
                  ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }
                  : done
                    ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
                    : { background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
                data-testid={`meeting-status-${n}`}>
                {status}
              </span>
            </div>

            {!done && !skipped && !readOnly && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {(["video", "in_person"] as const).map((t) => (
                    <button key={t} onClick={() => setDrafts((s) => ({ ...s, [n]: { ...draft, type: t } }))}
                      className="rounded-md px-2.5 py-1 text-xs font-medium"
                      style={draft.type === t ? { background: "#7C3AED", color: "#fff" } : { color: "rgba(255,255,255,0.5)" }}>
                      {t === "video" ? "Online" : "In-person"}
                    </button>
                  ))}
                </div>
                <input type="datetime-local" value={draft.scheduled}
                  onChange={(e) => setDrafts((s) => ({ ...s, [n]: { ...draft, scheduled: e.target.value } }))}
                  className="rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            {m?.scheduled_at && (
              <div className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{format(new Date(m.scheduled_at), "EEE, d MMM · h:mm a")}</div>
            )}

            {isInvestor && !done && !skipped && !readOnly && (
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => markDone(n)} disabled={busyNum === n} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "#7C3AED" }} data-testid={`meeting-done-${n}`}>
                  {busyNum === n ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Mark as done
                </button>
                <button onClick={() => doSkip(n)} disabled={busyNum === n} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid={`meeting-skip-${n}`}>
                  Skip this meeting
                </button>
              </div>
            )}

            {/* Notes */}
            <div className="mt-3 space-y-2">
              <div>
                <Eyebrow>Shared notes</Eyebrow>
                <NotesEditor initial={m?.notes_shared ?? ""} readOnly={readOnly} onSave={(v) => saveNotes(n, v, undefined)} placeholder="Visible to both parties" />
              </div>
              {isInvestor && (
                <div>
                  <Eyebrow>Investor-only notes</Eyebrow>
                  <NotesEditor initial={m?.notes_investor ?? ""} readOnly={readOnly} onSave={(v) => saveNotes(n, undefined, v)} placeholder="Private to your team" />
                </div>
              )}
            </div>
          </DarkCard>
        );
      })}

      {isInvestor && anyDone && !readOnly && (
        <div>
          <PrimaryButton onClick={() => setShowAdvance(true)} testid="advance-to-term-sheet">Advance to Term Sheet</PrimaryButton>
        </div>
      )}
      {showAdvance && (
        <ConfirmModal
          title="Advance to Term Sheet"
          body="This moves the deal to the term sheet stage. The founder will see the change."
          confirmLabel="Advance"
          busy={advancing}
          testid="advance-ts-confirm-modal"
          onConfirm={doAdvance}
          onClose={() => setShowAdvance(false)}
        />
      )}
    </div>
  );
}

function NotesEditor({ initial, onSave, readOnly, placeholder }: { initial: string; onSave: (v: string) => void; readOnly: boolean; placeholder?: string }) {
  const [val, setVal] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setVal(initial); setDirty(false); }, [initial]);
  if (readOnly) {
    return <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{initial || "—"}</p>;
  }
  return (
    <div className="flex items-start gap-2">
      <textarea
        value={val}
        onChange={(e) => { setVal(e.target.value); setDirty(true); }}
        rows={2}
        placeholder={placeholder}
        className="flex-1 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-white/25"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      />
      {dirty && (
        <button onClick={() => { onSave(val); setDirty(false); }} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white shrink-0" style={{ background: "#7C3AED" }}>Save</button>
      )}
    </div>
  );
}

// ── Document requests sub-tab ──────────────────────────────────────
const DOC_REQ_CATEGORIES: { value: string; label: string }[] = [
  { value: "general",    label: "General documents" },
  { value: "financial",  label: "Financial documents" },
  { value: "legal",      label: "Legal documents" },
  { value: "commercial", label: "Commercial / contracts" },
  { value: "team",       label: "Team & HR documents" },
];

function DocumentRequestsSubTab({ dealRoomId, isInvestor, isFounder, userId, readOnly }: { dealRoomId: string; isInvestor: boolean; isFounder: boolean; userId?: string; readOnly: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("general");
  const [creating, setCreating] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { data: requests = [], refetch } = useQuery({
    queryKey: ["doc-requests", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_document_requests")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("is_blocked", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const otherPartyId = async () => {
    const { data } = await supabase
      .from("deal_room_members")
      .select("user_id, role")
      .eq("deal_room_id", dealRoomId);
    const target = (data ?? []).find((m: any) => m.user_id !== userId);
    return target?.user_id ?? userId;
  };

  const submit = async () => {
    if (!name.trim() || !desc.trim() || !userId) return;
    setBlockedMsg(null);
    setCreating(true);
    try {
      const requestedFrom = await otherPartyId();
      const res = await createDocumentRequest({
        data: {
          deal_room_id: dealRoomId,
          requested_by: userId,
          requested_from: requestedFrom,
          document_name: name.trim(),
          document_description: desc.trim(),
          category,
        },
      });
      if (res.blocked) {
        setBlockedMsg(res.blocked_reason ?? "This category cannot be requested.");
        return;
      }
      setName(""); setDesc(""); setCategory("general");
      await refetch();
      toast.success("Document requested");
    } finally {
      setCreating(false);
    }
  };

  const respond = async (req: any, response: "provided" | "declined" | "partial", extra: { decline_reason?: string; partial_explanation?: string; document_path?: string }) => {
    if (!userId) return;
    setRespondingId(req.id);
    try {
      await respondToDocumentRequest({ data: { request_id: req.id, deal_room_id: dealRoomId, actor_user_id: userId, response, ...extra } });
      await refetch();
      toast.success("Response sent");
    } finally { setRespondingId(null); }
  };

  const statusPill = (status: string) => {
    if (status === "provided") return { label: "Provided", style: { background: "rgba(16,185,129,0.12)", color: "#10B981" } };
    if (status === "declined") return { label: "Declined", style: { background: "rgba(239,68,68,0.12)", color: "#EF4444" } };
    if (status === "partial") return { label: "Partial", style: { background: "rgba(245,158,11,0.12)", color: "#F59E0B" } };
    return { label: "Pending", style: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" } };
  };

  return (
    <div className="space-y-4">
      {isInvestor && !readOnly && (
        <DarkCard>
          <Eyebrow>Request a document</Eyebrow>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Document name (required)" className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="doc-req-name" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What you need and why (required)" className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-white/25" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="doc-req-desc" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="doc-req-category">
              {DOC_REQ_CATEGORIES.map((c) => <option key={c.value} value={c.value} style={{ background: "#18181C" }}>{c.label}</option>)}
            </select>
            <div className="rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", color: "rgba(255,255,255,0.5)" }} data-testid="doc-req-boundary-callout">
              <span className="font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>What we don't facilitate:</span> Hockystick does not support requests for source code, technical IP, personal employee data, or customer PII. These protect both parties.
            </div>
            <div className="flex justify-end">
              <PrimaryButton onClick={submit} disabled={!name.trim() || !desc.trim() || creating} testid="doc-req-submit" className="!px-4 !py-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Request
              </PrimaryButton>
            </div>
          </div>
        </DarkCard>
      )}

      {(requests as any[]).length === 0 ? (
        <DarkCard><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>No document requests yet.</p></DarkCard>
      ) : (
        (requests as any[]).map((req) => {
          const pill = statusPill(req.status);
          const canRespond = isFounder && req.requested_from === userId && req.status === "pending" && !readOnly;
          return (
            <DarkCard key={req.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{req.document_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{req.document_description}</div>
                  <div className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>{DOC_REQ_CATEGORIES.find((c) => c.value === req.category)?.label ?? req.category}</div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-medium shrink-0" style={pill.style}>{pill.label}</span>
              </div>
              {req.decline_reason && <p className="text-xs" style={{ color: "#EF4444" }}>Declined: {req.decline_reason}</p>}
              {req.partial_explanation && <p className="text-xs" style={{ color: "#F59E0B" }}>Partial: {req.partial_explanation}</p>}
              {canRespond && (
                <DocRequestActions req={req} busy={respondingId === req.id} onRespond={respond} />
              )}
            </DarkCard>
          );
        })
      )}
    </div>
  );
}

function DocRequestActions({ req, busy, onRespond }: { req: any; busy: boolean; onRespond: (req: any, r: "provided" | "declined" | "partial", extra: any) => void }) {
  const [mode, setMode] = useState<"none" | "decline" | "partial">("none");
  const [text, setText] = useState("");
  return (
    <div className="pt-1">
      {mode === "none" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onRespond(req, "provided", { document_path: `requests/${req.id}` })} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "#7C3AED" }} data-testid="doc-provide">
            {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Provide"}
          </button>
          <button onClick={() => setMode("partial")} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>Partial</button>
          <button onClick={() => setMode("decline")} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>Decline</button>
        </div>
      )}
      {mode !== "none" && (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={mode === "decline" ? "Reason for declining" : "What you can share, and what's missing"} className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-white/25" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div className="flex gap-2">
            <button onClick={() => setMode("none")} className="rounded-lg px-3 py-1.5 text-xs" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
            <button
              onClick={() => onRespond(req, mode === "decline" ? "declined" : "partial", mode === "decline" ? { decline_reason: text } : { partial_explanation: text, document_path: `requests/${req.id}` })}
              disabled={busy || !text.trim()}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "#7C3AED" }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Term sheet panel ───────────────────────────────────────────────
const TERM_EXPLAIN: Record<string, string> = {
  valuation: "The agreed worth of your company before this investment.",
  investment_amount: "How much the investor will put in.",
  equity_pct: "The share of the company the investor receives.",
  instrument_type: "The legal form of the investment (SAFE, equity, note).",
  pro_rata: "The investor's right to keep their ownership % in future rounds.",
  board_seat: "Whether the investor takes a seat on your board.",
};

function TermSheetPanel({ dealRoomId, room, isInvestor, isFounder, userId, readOnly }: { dealRoomId: string; room: any; isInvestor: boolean; isFounder: boolean; userId?: string; readOnly: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ valuation: "", investment_amount: "", equity_pct: "", instrument_type: "safe", pro_rata: false, board_seat: false });
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);

  const sent = !!(room as any)?.term_sheet_sent_at;
  const status = (room as any)?.term_sheet_status as string | null;

  const doSend = async () => {
    if (!userId) return;
    setSending(true);
    try {
      const res = await sendTermSheet({
        data: {
          deal_room_id: dealRoomId, actor_user_id: userId,
          valuation: form.valuation ? Number(form.valuation) : null,
          investment_amount: form.investment_amount ? Number(form.investment_amount) : null,
          equity_pct: form.equity_pct ? Number(form.equity_pct) : null,
          instrument_type: form.instrument_type,
          pro_rata: form.pro_rata, board_seat: form.board_seat,
        },
      });
      if (!res.ok) { toast.error("Could not send"); return; }
      await queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success("Term sheet sent");
      setShowSend(false);
    } finally { setSending(false); }
  };

  const respond = async (response: "accepted" | "countered" | "rejected") => {
    if (!userId) return;
    setResponding(true);
    try {
      const res = await respondToTermSheet({ data: { deal_room_id: dealRoomId, actor_user_id: userId, response } });
      if (!res.ok) { toast.error("Could not respond"); return; }
      await queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success(response === "accepted" ? "Term sheet accepted" : response === "countered" ? "Counter requested" : "Term sheet flagged");
    } finally { setResponding(false); }
  };

  const inputStyle: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Term Sheet</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>Term sheet</h2>
      </div>

      {isInvestor && !sent && !readOnly && (
        <DarkCard className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Eyebrow>Pre-money valuation (USD)</Eyebrow>
              <input type="number" value={form.valuation} onChange={(e) => setForm((f) => ({ ...f, valuation: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={inputStyle} data-testid="ts-valuation" />
            </div>
            <div>
              <Eyebrow>Investment amount (USD)</Eyebrow>
              <input type="number" value={form.investment_amount} onChange={(e) => setForm((f) => ({ ...f, investment_amount: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={inputStyle} data-testid="ts-amount" />
            </div>
            <div>
              <Eyebrow>Equity %</Eyebrow>
              <input type="number" value={form.equity_pct} onChange={(e) => setForm((f) => ({ ...f, equity_pct: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={inputStyle} data-testid="ts-equity" />
            </div>
            <div>
              <Eyebrow>Instrument</Eyebrow>
              <select value={form.instrument_type} onChange={(e) => setForm((f) => ({ ...f, instrument_type: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={inputStyle} data-testid="ts-instrument">
                <option value="safe" style={{ background: "#18181C" }}>SAFE</option>
                <option value="convertible_note" style={{ background: "#18181C" }}>Convertible Note</option>
                <option value="equity" style={{ background: "#18181C" }}>Equity</option>
                <option value="priced" style={{ background: "#18181C" }}>Priced Round</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              <input type="checkbox" checked={form.pro_rata} onChange={(e) => setForm((f) => ({ ...f, pro_rata: e.target.checked }))} style={{ accentColor: "#7C3AED" }} /> Pro-rata rights
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              <input type="checkbox" checked={form.board_seat} onChange={(e) => setForm((f) => ({ ...f, board_seat: e.target.checked }))} style={{ accentColor: "#7C3AED" }} /> Board seat
            </label>
          </div>
          <div className="flex justify-end">
            <PrimaryButton onClick={() => setShowSend(true)} testid="send-term-sheet">Send term sheet</PrimaryButton>
          </div>
        </DarkCard>
      )}

      {sent && (
        <DarkCard className="space-y-3" data-testid="term-sheet-display">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Proposed terms</div>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>{status ?? "sent"}</span>
          </div>
          {([
            ["valuation", "Pre-money valuation", (room as any)?.term_sheet_valuation],
            ["investment_amount", "Investment amount", (room as any)?.term_sheet_investment_amount],
            ["equity_pct", "Equity %", (room as any)?.term_sheet_equity_pct],
            ["instrument_type", "Instrument", (room as any)?.term_sheet_type],
            ["pro_rata", "Pro-rata rights", (room as any)?.term_sheet_pro_rata ? "Yes" : "No"],
            ["board_seat", "Board seat", (room as any)?.term_sheet_board_seat ? "Yes" : "No"],
          ] as const).map(([k, label, value]) => (
            <div key={k} className="flex items-center justify-between gap-3 group" title={TERM_EXPLAIN[k]}>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
              <span className="text-sm text-white">{value === null || value === undefined || value === "" ? "—" : String(value)}</span>
            </div>
          ))}

          {isFounder && status === "sent" && !readOnly && (
            <div className="flex flex-wrap gap-2 pt-2">
              <PrimaryButton onClick={() => respond("accepted")} disabled={responding} testid="ts-accept" className="!px-4 !py-2">Accept</PrimaryButton>
              <button onClick={() => respond("countered")} disabled={responding} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="ts-counter">Counter</button>
              <button onClick={() => respond("rejected")} disabled={responding} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }} data-testid="ts-flag">Flag</button>
            </div>
          )}

          {isFounder && (
            <p className="pt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              This summary is not legal advice. Review the full term sheet with a lawyer before signing.
            </p>
          )}
        </DarkCard>
      )}

      {!isInvestor && !sent && (
        <DarkCard><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>The investor is preparing a term sheet.</p></DarkCard>
      )}

      {showSend && (
        <ConfirmModal
          title="Send term sheet"
          body="The founder will see these terms immediately and can accept, counter, or flag them."
          confirmLabel="Send"
          busy={sending}
          testid="send-ts-confirm-modal"
          onConfirm={doSend}
          onClose={() => setShowSend(false)}
        />
      )}
    </div>
  );
}

// ── Closed panel ───────────────────────────────────────────────────
function ClosedPanel({ room, isInvestor }: { room: any; isInvestor: boolean }) {
  const accepted = (room as any)?.term_sheet_status === "accepted";
  const amount = (room as any)?.term_sheet_investment_amount;
  const closedAt = (room as any)?.closed_at_workflow;
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Closed</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: "Syne, sans-serif" }}>Deal closed</h2>
      </div>
      <DarkCard>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: accepted ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)" }}>
            {accepted ? <CheckCircle2 className="h-5 w-5" style={{ color: "#10B981" }} /> : <X className="h-5 w-5" style={{ color: "rgba(255,255,255,0.4)" }} />}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{accepted ? "Deal closed — term sheet accepted" : "Deal closed"}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{closedAt ? new Date(closedAt).toLocaleDateString() : "This deal room is now read-only."}</div>
          </div>
        </div>
        {isInvestor && accepted && amount != null && (
          <div className="mt-4 rounded-lg px-4 py-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <Eyebrow>Investment recorded</Eyebrow>
            <div className="text-lg font-semibold text-white">{formatMoney(amount)}</div>
          </div>
        )}
        {!isInvestor && (
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            {accepted ? "Congratulations — the investment is confirmed." : "This deal has closed. Reach out to your investor for next steps."}
          </p>
        )}
      </DarkCard>
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
  const n = Number(value);
  if (isNaN(n) || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: n >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: n >= 1000000 ? 1 : 0,
  }).format(n);
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

      const aiData = await generateDocSummary({
        data: {
          userId: userId || "",
          documentContent: textContent.slice(0, 3000),
          fileName,
          category: doc.category,
        }
      });
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
      toast.error(err instanceof Error ? err.message : "Summary failed");
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
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setActiveVaultTab("documents")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "documents" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            📁 Documents
            <span className="ml-1.5 text-[10px] text-muted-foreground">({(docs as any[]).length})</span>
          </button>
          <button
            onClick={() => setActiveVaultTab("links")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeVaultTab === "links" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            🔗 Links
            <span className="ml-1.5 text-[10px] text-muted-foreground">({(dealRoomLinks as any[]).length})</span>
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
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Stage 1 — Initial review</div>
              <div className="space-y-2">
                {platformDocsSplit.stage1.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Stage 2 — Full diligence</div>
              <div className="space-y-2">
                {platformDocsSplit.stage2.map((doc: any) => (
                  <div key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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
                className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center text-[#7C3AED] text-sm shrink-0">≡</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Uploaded files</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
      )}

      {isFounder && (
        <div className="mt-5 space-y-3">
          <div className="rounded-lg bg-muted/40 border border-border/60 px-4 py-3 text-xs text-muted-foreground space-y-1">
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
              <span className="text-[10px] text-muted-foreground self-center">· Max 50MB per file</span>
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
                          title: `New document in ${companyName} deal room`,
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
      <div className="flex gap-1 mt-5 pb-2 overflow-x-auto border-b border-border/60">
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
                  : "border border-border/60 hover:bg-accent"
              )}
            >
              {cat}
              {count > 0 && (
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", activeDocTab === cat ? "bg-background/20" : "bg-accent text-muted-foreground")}>
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
                <div className="text-sm text-muted-foreground p-3 text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
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
            const catColor = CATEGORY_COLORS[doc.category] ?? "bg-accent text-muted-foreground";
            const catBorder = CAT_BORDER[doc.category] ?? "border-l-muted-foreground/40";
            const { bg: iconBg, color: iconColor, Icon: FileIcon } = getFileTypeStyle(ext);
            const fileSize = formatFileSize(doc.file_size ?? null);

            return (
              <div
                key={doc.id}
                className={cn(
                  "rounded-xl bg-card shadow-card overflow-hidden border border-border/60 border-l-4",
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
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
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
                    {isFounder && (
                      <button
                        onClick={() => handleDocRemove(doc)}
                        title="Remove from deal room"
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Summary section — only for text-based files */}
                {supportsAI && (
                  <div className="border-t border-border/40">
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
                            doc.summary_edited ? "bg-brand/10 text-brand" : "bg-muted/60 text-muted-foreground"
                          )}>
                            {doc.summary_edited ? "Edited" : "AI"}
                          </span>
                          {isSummaryExpanded(doc.id)
                            ? <ChevronUp className="h-3 w-3 shrink-0" />
                            : <ChevronDown className="h-3 w-3 shrink-0" />}
                        </button>
                        {isSummaryExpanded(doc.id) && (
                          <div className="mt-2 rounded-lg border-l-2 border-brand/40 bg-muted/30 px-3 py-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={summaryEdits[doc.id] ?? ""}
                                  onChange={(e) => setSummaryEdits((s) => ({ ...s, [doc.id]: e.target.value }))}
                                  rows={4}
                                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:border-brand/50"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingSummaryId(null)}
                                    className="text-[10px] border border-border/60 rounded px-2 py-1 hover:bg-accent"
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
                                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                                  {doc.ai_summary}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => generateSummary(doc)}
                                    disabled={isGenerating}
                                    className="text-[10px] text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-0.5 hover:bg-accent disabled:opacity-50"
                                  >
                                    {isGenerating ? "Regenerating…" : "Regenerate"}
                                  </button>
                                  {isFounder && (
                                    <button
                                      onClick={() => {
                                        setEditingSummaryId(doc.id);
                                        setSummaryEdits((s) => ({ ...s, [doc.id]: doc.ai_summary! }));
                                      }}
                                      className="text-[10px] text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-0.5 hover:bg-accent"
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
                        <span className="text-xs text-muted-foreground italic mr-2">Not generated yet</span>
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
            <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
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
                        title: `New document in ${companyName} deal room`,
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
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
            Recommended for this category
          </div>
          <div className="rounded-xl border border-dashed border-border/60 divide-y divide-border/40 overflow-hidden">
            {expectedForTab.map((expected) => (
              <div key={expected.name} className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground">{expected.name}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">Not uploaded yet</div>
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
                              title: `New document in ${companyName} deal room`,
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
              <p className="text-[10px] text-muted-foreground mt-0.5">
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
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No investor documents yet. Upload above.</p>
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
                <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-card border-l-4 border-l-success/60">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", iconBg)}>
                    <FileIcon className={cn("h-4 w-4", iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.uploader?.full_name ?? "Investor"} · {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Visibility toggle — investor only */}
                  {isInvestor && (
                    <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5 shrink-0">
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
                              : "text-muted-foreground hover:text-foreground"
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
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {isInvestor && (
                      <button
                        onClick={() => removeInvestorDoc(doc.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
            <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
              <LinkIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm font-medium">No links yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add product videos, Loom recordings, external documents, or any URL</p>
              <button
                onClick={() => setShowAddLink(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
              >
                <Plus className="h-4 w-4" /> Add first link
              </button>
            </div>
          )}
          {(dealRoomLinks as any[]).map((link: any) => (
            <div key={link.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-card">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 shrink-0">
                <LinkIcon className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{link.name}</div>
                <div className="text-xs text-muted-foreground truncate">{link.url}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Open link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {link.uploader_id === userId && (
                  <button
                    onClick={() => removeLink(link.id)}
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div className="text-sm font-semibold">Add a link</div>
              <button onClick={() => setShowAddLink(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Link name</label>
                <input
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Product Demo Video, Financial Model..."
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowAddLink(false)} className="px-4 py-2 rounded-md border border-border/60 text-sm hover:bg-accent">
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
                <p className="text-xs text-white/40 mt-1">
                  {viewingDoc.completeness_score}% complete · Updated {formatRelativeTime(viewingDoc.updated_at)}
                </p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {viewingDoc.content && Object.entries(viewingDoc.content as Record<string, string>)
                .filter(([, v]) => v && String(v).trim())
                .map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{String(value)}</p>
                  </div>
                ))
              }
              {(!viewingDoc.content || Object.keys(viewingDoc.content).length === 0) && (
                <p className="text-white/30 text-sm text-center py-8">No content available</p>
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
                <p className="text-xs text-white/50 flex-1">
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
        className="w-full max-w-4xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden"
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
          {!url ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isImage ? (
            <img src={url} alt={displayName} className="max-w-full max-h-[60vh] object-contain mx-auto rounded-lg" />
          ) : isPdf ? (
            <iframe
              src={url}
              className="w-full h-[70vh] rounded-lg border border-border/60"
              title={displayName}
            />
          ) : isOffice ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
              className="w-full h-[70vh] rounded-lg border border-border/60"
              title={displayName}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
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
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
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
                        ? "bg-blue-500 text-foreground shadow-sm"
                        : "bg-warning text-warning-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v === "public" ? "🌐 Public" : v === "team" ? "👥 Team" : "🔒 Private"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
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
      {isLoading && <div className="mt-4 text-sm text-muted-foreground animate-pulse">Loading…</div>}

      <div className="mt-5 grid gap-3">
        {(notes as any[]).map((n) => (
          <div key={n.id} className={`rounded-xl border border-border/60 p-4 shadow-card ${n.private ? "bg-warning/5 border-warning/30" : "bg-card"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{n.author_id === userId ? "You" : (n.users?.full_name ?? "Unknown")}</span>
              <span className="text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
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
                                    const aiResp = await secureAICall({
                                      data: {
                                        userId: userId || "",
                                        systemPrompt: "You are a startup founder assistant. Write a clear, professional answer to an investor due-diligence question. Return only the answer text, under 120 words, no markdown symbols.",
                                        userMessage: `Investor question: "${item.body}"\n\nWrite a founder's answer.`,
                                        maxTokens: 300,
                                      }
                                    });
                                    const draft = (aiResp.reply ?? "").trim();
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
