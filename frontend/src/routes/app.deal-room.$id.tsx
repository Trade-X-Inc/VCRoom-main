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
import { ReviewTab } from "@/components/app/ReviewTab";
import { DocumentWishlist } from "@/components/app/DocumentWishlist";
import { generateDocSummary, secureAICall } from "@/lib/ai-secure-fn";
import { extractDocumentText } from "@/lib/document-extractor";
import { DealTermsCard } from "@/components/app/DealTermsCard";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import {
  useParticipants, useGeneratedNdaDocs,
  participantsStore, qaStore,
  type QAQuestion, type Participant,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/invite-fn";
import { getQASuggestions } from "@/lib/qa-suggestions-fn";
import { triggerDecisionEmail, triggerMeetingEmail, triggerDocumentUploadedEmail } from "@/lib/email/triggers";

export const Route = createFileRoute("/app/deal-room/$id")({
  component: DealRoom,
});

const tabs = [
  { k: "overview", l: "Overview", i: LayoutGrid },
  { k: "documents", l: "Document Vault", i: FolderOpen },
  { k: "qa", l: "Q&A", i: MessageSquare },
  { k: "checklist", l: "Workstation", i: LayoutGrid },
  { k: "chat", l: "Team chat", i: MessagesSquare },
  { k: "notes", l: "Notes", i: StickyNote },
  { k: "timeline", l: "Activity", i: Activity },
  { k: "meetings", l: "Meetings", i: Calendar },
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

  const dealRoomName = (room as any)?.startups?.company_name
    ? `${(room as any).startups.company_name} — Deal Room`
    : "Deal Room";
  const companyName = (room as any)?.startups?.company_name ?? "Unknown Company";

  const visibleTabs = tabs.filter((t) => {
    if (isInvestor) return ["overview", "documents", "qa", "checklist", "notes", "timeline", "meetings", "decision"].includes(t.k);
    return t.k !== "decision";
  });
  const displayTabs = visibleTabs.map((t) =>
    t.k === "checklist" && isFounder ? { ...t, l: "Deal Report" } : t
  );

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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
      {/* Sidebar — vertical on desktop, header+tabs on mobile */}
      <aside className="md:w-[260px] border-b md:border-b-0 md:border-r border-border/60 bg-sidebar flex flex-col shrink-0">
        {/* Company header — always visible */}
        <div className="px-4 py-3 md:p-5 border-b border-border/60">
          <Link to={"/app/deal-rooms" as any} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> All deal rooms
          </Link>
          <div className="mt-2 md:mt-3 flex items-center gap-2.5">
            <div className="grid h-8 w-8 md:h-9 md:w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
              {companyName[0] ?? "D"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{companyName}</div>
              <div className="text-[11px] text-muted-foreground">{isInvestor ? "Founder · Deal Room" : "Investor · Deal Room"}</div>
            </div>
            <div className="md:hidden inline-flex items-center gap-1 text-[10px] text-success shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
            </div>
          </div>
          <div className="hidden md:flex mt-3 items-center gap-1.5 text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" /> Active · NDA signed
          </div>
        </div>

        {/* Mobile: horizontal scrolling tabs */}
        <nav className="flex md:hidden overflow-x-auto scrollbar-hide gap-1 px-3 py-2 flex-shrink-0">
          {displayTabs.map((t) => (
            <button
              key={t.k}
              onClick={() => { queryClient.invalidateQueries({ predicate: (q) => (q.queryKey as string[]).includes(dealRoomId) }); setTab(t.k); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex-shrink-0 transition-colors ${tab === t.k ? "bg-brand text-brand-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              <t.i className="h-3.5 w-3.5" />
              {t.l}
            </button>
          ))}
        </nav>

        {/* Desktop: vertical nav */}
        <nav className="hidden md:flex flex-1 flex-col p-2 space-y-0.5 overflow-y-auto">
          {displayTabs.map((t) => (
            <button
              key={t.k}
              onClick={() => { queryClient.invalidateQueries({ predicate: (q) => (q.queryKey as string[]).includes(dealRoomId) }); setTab(t.k); }}
              className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              <t.i className={`h-4 w-4 ${tab === t.k ? "text-brand" : ""}`} />
              {t.l}
            </button>
          ))}
        </nav>
        <div className="hidden md:flex p-4 border-t border-border/60 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 inline mr-1" /> Encrypted · watermarked
        </div>
      </aside>

      {/* Main content */}
      <main key={tab} className="flex-1 overflow-y-auto min-h-0">
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
        {tab === "documents" && (
          <div className="flex flex-col h-full">
            <div className="px-4 pt-4">
              <DocumentWishlist
                dealRoomId={dealRoomId}
                isInvestor={isInvestor}
                isFounder={isFounder}
                userId={user?.id}
              />
            </div>
            <div className="flex-1">
              {console.log("[deal-room] room:", room?.id, (room as any)?.startup_id) as any}
              <Documents dealRoomId={dealRoomId} isFounder={isFounder} isInvestor={isInvestor} userId={user?.id} startupId={(room as any)?.startup_id} />
            </div>
          </div>
        )}
        {tab === "chat" && <div className="h-full"><DealRoomChat dealRoomId={dealRoomId} userId={user?.id} userName={userName} /></div>}
        {tab === "qa" && <QA dealRoomId={dealRoomId} userId={user?.id} userName={userName} isInvestor={isInvestor} isFounder={isFounder} companyName={(room as any)?.startups?.company_name ?? ""} sector={(room as any)?.startups?.sector ?? ""} />}
        {tab === "checklist" && <DDWorkstation dealRoomId={dealRoomId} userId={user?.id} isInvestor={isInvestor} isFounder={isFounder} />}
        {tab === "notes" && <Notes dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "timeline" && <Timeline dealRoomId={dealRoomId} />}
        {tab === "meetings" && <MeetingsTab dealRoomId={dealRoomId} userId={user?.id} />}
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
  const [showTutorial, setShowTutorial] = useState(false);

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
    staleTime: 30_000,
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

  const { data: investorMembers = [] } = useQuery({
    queryKey: ["investor-members", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("id, user_id, role, users(full_name, avatar_url)")
        .eq("deal_room_id", dealRoomId)
        .eq("role", "investor");
      return data ?? [];
    },
  });

  const investorUserIds = (investorMembers as any[]).map((m) => m.user_id);

  const { data: investorProfilesInRoom = [] } = useQuery({
    queryKey: ["room-investor-profiles", dealRoomId, investorUserIds.join(",")],
    enabled: !!user?.id && (investorMembers as any[]).length > 0,
    queryFn: async () => {
      if (investorUserIds.length === 0) return [];
      const { data } = await supabase
        .from("investor_profiles")
        .select("user_id, fund_name, your_name, role, fund_size, sectors, stages, check_size_min, check_size_max, geography, linkedin_url, thesis")
        .in("user_id", investorUserIds);
      return data ?? [];
    },
  });

  // Fallback: fetch investor profile by email then name — runs for both founder and investor views
  const roomInvestorName = (room as any)?.investor_name ?? "";
  const roomInvestorEmail = (room as any)?.investor_email ?? "";
  const profileSelect = "user_id, your_name, fund_name, role, sectors, stages, geography, check_size_min, check_size_max, linkedin_url, website, thesis, verification_tier, email";
  const { data: fallbackInvestorProfile } = useQuery({
    queryKey: ["fallback-investor", roomInvestorEmail || roomInvestorName],
    enabled: !!(roomInvestorEmail || roomInvestorName),
    queryFn: async () => {
      console.log("[fallback-investor] searching — email:", roomInvestorEmail, "name:", roomInvestorName);
      // Email is authoritative — try first
      if (roomInvestorEmail) {
        const { data: byEmail, error: emailErr } = await supabase
          .from("investor_profiles")
          .select(profileSelect)
          .eq("email", roomInvestorEmail)
          .maybeSingle();
        console.log("[fallback-investor] email query result:", byEmail, "error:", emailErr?.message);
        if (byEmail) return byEmail;
      }
      // Fallback: match by display name
      if (roomInvestorName) {
        const { data: byName, error: nameErr } = await supabase
          .from("investor_profiles")
          .select(profileSelect)
          .eq("your_name", roomInvestorName)
          .maybeSingle();
        console.log("[fallback-investor] name query result:", byName, "error:", nameErr?.message);
        return byName ?? null;
      }
      return null;
    },
  });

  const investorUserId = (investorProfilesInRoom as any[])[0]?.user_id ?? fallbackInvestorProfile?.user_id;
  const { data: investorVerification } = useQuery({
    queryKey: ["investor-verification", investorUserId],
    enabled: !!investorUserId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_verifications")
        .select("verification_tier, overall_score, website_resolves, linkedin_valid, email_domain_matches, notes")
        .eq("investor_id", investorUserId)
        .maybeSingle();
      return data ?? null;
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
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://hockystick.app";

  const handleCopyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${baseOrigin}/join/${token}`);
    toast.success("Invite link copied");
  };

  const handleCancelInvite = async (token: string) => {
    await supabase.from("invites").delete().eq("token", token);
    void refetchInvites();
    queryClient.invalidateQueries({ queryKey: ["deal-room-members", dealRoomId] });
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
          appUrl: import.meta.env.VITE_APP_URL || "https://hockystick.app",
          founderName: (user as any)?.fullName ?? user?.email ?? "The founder",
          startupName: startup?.company_name ?? "Unknown",
        },
      });
      if (result.success) {
        toast.success("Invite resent");
        void refetchInvites();
        queryClient.invalidateQueries({ queryKey: ["deal-room-members", dealRoomId] });
      }
      else toast.error("Failed to resend");
    } catch {
      toast.error("Failed to resend");
    }
  };

  const summary = startup?.tagline || startup?.description || startup?.traction || "Shared diligence workspace for this investment opportunity.";
  const profileLink = isInvestor ? "/app/investor/startups" : "/app/profile";
  const decisionMeta = DECISION_BADGES[decisionLabel];

  const founderSteps = [
    { title: "Complete your profile", body: "Fill in your startup's profile — stage, sector, funding target, revenue, and team size. Investors read this first." },
    { title: "Upload your pitch deck", body: "Go to the Documents tab and upload your deck. The AI will auto-summarise it for investors." },
    { title: "Answer investor questions", body: "Check the Q&A tab — investors may post questions. Prompt, thorough answers build trust." },
    { title: "Track due diligence", body: "Open the Workstation tab to see which documents the investor needs. Upload them and mark each as fulfilled." },
    { title: "Watch for the decision", body: "The investor will post their decision (Pass / Term Sheet / Investing) in the Decisions tab. You'll be notified." },
  ];
  const investorSteps = [
    { title: "Review the pitch", body: "Start with the Overview tab — company card, funding target, and key metrics at a glance." },
    { title: "Dig into documents", body: "Open the Documents tab to read the deck, financials, and any uploaded files. Use the AI Summary button for a quick brief." },
    { title: "Run due diligence", body: "The Workstation tab has 6 DD categories pre-loaded. Check off items as you review them, set statuses, and add private notes." },
    { title: "Request missing docs", body: "In the Documents tab use 'Documents needed' to tell the founder what you still require. They can mark items as uploaded." },
    { title: "Post your decision", body: "When you're ready, go to the Decisions tab and post a formal decision — Pass, Term Sheet, or Investing." },
  ];
  const tutorialSteps = isFounder ? founderSteps : investorSteps;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* How it works tutorial */}
      <div className="mb-5 rounded-xl border border-brand/20 bg-brand/5 overflow-hidden">
        <button
          onClick={() => setShowTutorial((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-brand shrink-0" />
            <span className="text-sm font-semibold">How it works</span>
            <span className="text-[10px] text-muted-foreground">{isFounder ? "Founder guide" : "Investor guide"}</span>
          </div>
          {showTutorial
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        {showTutorial && (
          <div className="px-4 pb-4 pt-1 border-t border-brand/10">
            <ol className="space-y-3 mt-2">
              {tutorialSteps.map(({ title, body }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{i + 1}</span>
                  <div>
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

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
          <div className="grid sm:grid-cols-2 gap-4">
            {/* STARTUP CARD */}
            <section className="rounded-xl border border-brand/25 bg-card p-5 shadow-card">
              <div className="mb-3"><span className="text-[9px] uppercase tracking-widest font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">Startup</span></div>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-gradient-brand text-base font-bold text-brand-foreground">
                  {startup?.logo_url ? <img src={startup.logo_url} alt={startup?.company_name ?? "Co"} className="h-full w-full object-cover rounded-xl" /> : (startup?.company_name?.[0] ?? "S")}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{startup?.company_name ?? "Company"}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {startup?.stage && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-medium text-brand">{startup.stage}</span>}
                    {startup?.sector && <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] text-muted-foreground">{startup.sector}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <div className="rounded-lg bg-background border border-border/50 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Raise</div>
                  <div className="text-xs font-bold mt-0.5">{formatMoney(startup?.funding_target)}</div>
                </div>
                <div className="rounded-lg bg-background border border-border/50 p-2">
                  <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">ARR</div>
                  <div className="text-xs font-bold mt-0.5">{formatMoney(startup?.revenue)}</div>
                </div>
              </div>
              {startup?.traction && <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2"><span className="font-semibold text-foreground">Traction: </span>{startup.traction}</p>}
              {founderMembers.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                  <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Team</div>
                  {founderMembers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2">
                      {m.users?.avatar_url ? <img src={m.users.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border-2 border-brand/20 shrink-0" /> : <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/15 text-brand text-[9px] font-bold border-2 border-brand/20 shrink-0">{(m.users?.full_name || "F").split(" ").map((s: string) => s[0]).join("").slice(0,2).toUpperCase()}</div>}
                      <div className="min-w-0"><div className="text-[10px] font-semibold truncate">{m.users?.full_name ?? m.users?.email ?? "Founder"}</div><div className="text-[9px] text-muted-foreground">{m.designation || "Founder"}</div></div>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/app/profile" className="mt-3 inline-flex items-center gap-1 text-[10px] text-brand hover:underline">View profile <ExternalLink className="h-3 w-3" /></Link>
            </section>
            {/* INVESTOR CARD */}
            {(() => {
              const invP = (investorProfilesInRoom as any[])[0] ?? fallbackInvestorProfile;
              const hasInvestor = invP || investorMembers.length > 0 || !!roomInvestorName;
              return (
                <section className="rounded-xl border border-success/25 bg-card p-5 shadow-card">
                  <div className="mb-3"><span className="text-[9px] uppercase tracking-widest font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">Investor</span></div>
                  {hasInvestor ? (<>
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-success/10 text-base font-bold text-success">{(invP?.fund_name || roomInvestorName || "V")[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight truncate">{invP?.fund_name ?? roomInvestorName ?? "Investor"}</h3>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {invP?.your_name ?? roomInvestorName ?? ""}
                          {invP?.role ? ` · ${invP.role}` : ""}
                        </div>
                        <div className="mt-1">
                          <VerificationBadge tier={investorVerification?.verification_tier ?? invP?.verification_tier} size="sm" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {invP?.sectors && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success truncate max-w-[100px]">{String(invP.sectors).split(",")[0].trim()}</span>}
                          {invP?.stages && <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] text-muted-foreground">{String(invP.stages).split(",")[0].trim()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <div className="rounded-lg bg-background border border-border/50 p-2">
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Check size</div>
                        <div className="text-[10px] font-bold mt-0.5">
                          {invP?.check_size_min && invP?.check_size_max
                            ? `${invP.check_size_min} – ${invP.check_size_max}`
                            : invP?.check_size_min ?? invP?.check_size_max ?? (roomInvestorName && !invP ? "…" : "—")}
                        </div>
                      </div>
                      <div className="rounded-lg bg-background border border-border/50 p-2">
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Geography</div>
                        <div className="text-[10px] font-bold mt-0.5 truncate">{invP?.geography ?? (roomInvestorName && !invP ? "…" : "—")}</div>
                      </div>
                    </div>
                    {invP?.thesis && <p className="mt-2 text-[10px] text-muted-foreground line-clamp-2"><span className="font-semibold text-foreground">Thesis: </span>{invP.thesis}</p>}
                    {investorMembers.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Team</div>
                        {(investorMembers as any[]).map((m: any) => {
                          const mp = (investorProfilesInRoom as any[]).find((p: any) => p.user_id === m.user_id);
                          return (<div key={m.id} className="flex items-center gap-2">
                            {m.users?.avatar_url ? <img src={m.users.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border-2 border-success/20 shrink-0" /> : <div className="grid h-7 w-7 place-items-center rounded-full bg-success/15 text-success text-[9px] font-bold border-2 border-success/20 shrink-0">{(m.users?.full_name || "I").split(" ").map((s: string) => s[0]).join("").slice(0,2).toUpperCase()}</div>}
                            <div className="min-w-0"><div className="text-[10px] font-semibold truncate">{m.users?.full_name ?? m.users?.email ?? "Investor"}</div><div className="text-[9px] text-muted-foreground">{mp?.role || "Investor"}{mp?.fund_name ? ` · ${mp.fund_name}` : ""}</div></div>
                          </div>);
                        })}
                      </div>
                    )}
                    {invP?.linkedin_url && <a href={invP.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] text-brand hover:underline">LinkedIn <ExternalLink className="h-3 w-3" /></a>}
                  </>) : (<div className="py-6 text-center"><div className="text-xs text-muted-foreground">No investor joined yet.</div></div>)}
                </section>
              );
            })()}
          </div>

          <DealTermsCard dealRoomId={dealRoomId} isFounder={isFounder} isInvestor={isInvestor} />

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
                        completed && "border-success bg-success text-success-foreground",
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

            <form onSubmit={addTask} className="mt-4 flex flex-wrap items-center gap-2 w-full">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Add a shared task"
                className="flex-1 min-w-0 rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-32 shrink-0 rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
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
                className="w-36 shrink-0 rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
              <button
                type="submit"
                disabled={!taskTitle.trim() || savingTask}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground shadow-glow disabled:opacity-50"
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
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Participants
              </div>
              {isFounder && (
                <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1 text-xs shadow-glow">
                  <UserPlus className="h-3 w-3" /> Invite
                </button>
              )}
            </div>
            {founderMembers.length > 0 && (
              <div className="mb-4">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-brand" /> Startup team</div>
                <div className="space-y-2.5">
                  {founderMembers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      {m.users?.avatar_url ? <img src={m.users.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-brand/20 shrink-0" /> : <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-brand text-[10px] font-bold border-2 border-brand/20 shrink-0">{(m.users?.full_name || "F").split(" ").map((s: string) => s[0]).join("").slice(0,2).toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{m.users?.full_name ?? m.users?.email ?? "Founder"}</div><div className="text-[9px] text-muted-foreground">{m.designation || "Founder"}</div></div>
                      <span className="text-[9px] bg-brand/10 text-brand rounded-full px-2 py-0.5 shrink-0">Founder</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {investorMembers.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-success" /> Investor team</div>
                <div className="space-y-2.5">
                  {investorMembers.map((m: any) => {
                    const mp = investorProfilesInRoom.find((p: any) => p.user_id === m.user_id);
                    return (<div key={m.id} className="flex items-center gap-2.5">
                      {m.users?.avatar_url ? <img src={m.users.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-success/20 shrink-0" /> : <div className="grid h-8 w-8 place-items-center rounded-full bg-success/15 text-success text-[10px] font-bold border-2 border-success/20 shrink-0">{(m.users?.full_name || "I").split(" ").map((s: string) => s[0]).join("").slice(0,2).toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{m.users?.full_name ?? m.users?.email ?? "Investor"}</div><div className="text-[9px] text-muted-foreground">{mp?.role || "Investor"}{mp?.fund_name ? ` · ${mp.fund_name}` : ""}</div></div>
                      <span className="text-[9px] bg-success/10 text-success rounded-full px-2 py-0.5 shrink-0">Investor</span>
                    </div>);
                  })}
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
          onSent={() => {
            void refetchInvites();
            queryClient.invalidateQueries({ queryKey: ["deal-room-members", dealRoomId] });
          }}
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
      if (userId) {
        triggerMeetingEmail({
          data: {
            dealRoomId,
            organizerUserId: userId,
            meetingTitle: f.title,
            meetingDate: new Date(f.scheduledAt).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
            meetingLink: f.meetingLink || undefined,
          },
        }).catch(() => {});
      }
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
  // ── Closer state ──────────────────────────────────────────────────
  const [selectedDecision, setSelectedDecision] = useState<"invest" | "hold" | "pass" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closerError, setCloserError] = useState<string | null>(null);
  const [showChangeDecision, setShowChangeDecision] = useState(false);
  const [showTermSheet, setShowTermSheet] = useState(false);
  const [termSheet, setTermSheet] = useState({
    investment_amount: "", valuation_pre_money: "", instrument: "safe",
    board_seat: false, pro_rata_rights: false, information_rights: true, notes: "",
  });
  const [savingTermSheet, setSavingTermSheet] = useState(false);

  // ── Room query (for decision columns) ────────────────────────────
  const { data: roomData, refetch: refetchRoom } = useQuery({
    queryKey: ["closer-room", dealRoomId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, status, decision, decision_reason, decision_at, follow_up_date, startup_id")
        .eq("id", dealRoomId)
        .single();
      return data as any;
    },
  });

  const existingDecision = roomData?.decision as string | null;

  // Auto-calc equity
  const equityPct = termSheet.investment_amount && termSheet.valuation_pre_money
    ? ((Number(termSheet.investment_amount) / (Number(termSheet.valuation_pre_money) + Number(termSheet.investment_amount))) * 100).toFixed(2)
    : "";

  async function handleRecordDecision() {
    if (!selectedDecision) { setCloserError("Select a decision."); return; }
    if (decisionReason.trim().length < 20) { setCloserError("Please provide a specific reason (at least 20 characters)."); return; }
    if (selectedDecision === "hold" && !followUpDate) { setCloserError("Please set a follow-up date for Hold decisions."); return; }
    setIsSubmitting(true);
    setCloserError(null);
    try {
      const { error } = await supabase.from("deal_rooms").update({
        decision: selectedDecision,
        decision_reason: decisionReason.trim(),
        decision_at: new Date().toISOString(),
        follow_up_date: followUpDate || null,
        status: selectedDecision === "pass" ? "closed" : selectedDecision === "invest" ? "closing" : "active",
        closed_at: selectedDecision === "pass" ? new Date().toISOString() : null,
      }).eq("id", dealRoomId);
      if (error) { setCloserError("Failed to record decision. Try again."); setIsSubmitting(false); return; }

      // Notify founder
      if (roomData?.startup_id) {
        const { data: startup } = await supabase.from("startups").select("founder_id").eq("id", roomData.startup_id).maybeSingle();
        if (startup?.founder_id) {
          await supabase.from("notifications").insert({
            user_id: startup.founder_id,
            kind: "deal",
            title: selectedDecision === "invest" ? "Investment interest recorded" : selectedDecision === "hold" ? "Investor has put your deal on hold" : "Investor decision recorded",
            body: selectedDecision === "pass"
              ? `The investor passed on your deal. Their reason: "${decisionReason.substring(0, 100)}"`
              : selectedDecision === "hold"
              ? `The investor is holding the decision until ${followUpDate}. Their note: "${decisionReason.substring(0, 100)}"`
              : `An investor wants to proceed. Check your deal room for next steps.`,
            read: false,
            action_url: "/app/deal-rooms",
          });
        }
      }

      if (selectedDecision === "invest") setShowTermSheet(true);
      refetchRoom();
      queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      toast.success("Decision recorded");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveTermSheet() {
    setSavingTermSheet(true);
    try {
      const { data: startup } = await supabase.from("startups").select("founder_id").eq("id", roomData?.startup_id).maybeSingle();
      await supabase.from("term_sheets").insert({
        deal_room_id: dealRoomId,
        startup_id: roomData?.startup_id,
        investor_id: userId,
        investment_amount: Number(termSheet.investment_amount) || null,
        valuation_pre_money: Number(termSheet.valuation_pre_money) || null,
        equity_percentage: Number(equityPct) || null,
        instrument: termSheet.instrument,
        board_seat: termSheet.board_seat,
        pro_rata_rights: termSheet.pro_rata_rights,
        information_rights: termSheet.information_rights,
        notes: termSheet.notes || null,
        status: "draft",
      });
      if (startup?.founder_id) {
        await supabase.from("notifications").insert({
          user_id: startup.founder_id,
          kind: "deal",
          title: "Term sheet created",
          body: "An investor has created a term sheet for your deal room. Review it now.",
          read: false,
          action_url: "/app/deal-rooms",
        });
      }
      setShowTermSheet(false);
      toast.success("Term sheet saved");
    } finally {
      setSavingTermSheet(false);
    }
  }

  // ── Legacy assessment state ───────────────────────────────────────
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
      const { data } = await supabase.from("deal_rooms").select("investor_decision, investor_scores, investor_notes").eq("id", dealRoomId).single();
      return data;
    },
  });

  useEffect(() => {
    if (decisionData && !loaded) {
      setNotes((decisionData as any).investor_notes ?? "");
      if ((decisionData as any).investor_scores) setScores((s) => ({ ...s, ...((decisionData as any).investor_scores as Record<string, number>) }));
      setLoaded(true);
    }
  }, [decisionData, loaded]);

  const handleSaveAssessment = async () => {
    setSavingAssessment(true);
    try {
      await supabase.from("deal_rooms").update({ investor_notes: notes, investor_scores: scores }).eq("id", dealRoomId);
      await queryClient.invalidateQueries({ queryKey: ["investor-decision-tab", dealRoomId] });
      toast.success("Assessment saved");
    } finally { setSavingAssessment(false); }
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

  const inputCls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#7C3AED]/60";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">

      {/* ── Decision banner (after decision recorded) ─────────────── */}
      {existingDecision === "invest" && !showChangeDecision && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-green-400 font-semibold text-sm">✓ Investment interest recorded</p>
          <p className="text-white/60 text-sm mt-1">Your reason: {roomData?.decision_reason}</p>
          <button onClick={() => setShowTermSheet(true)} className="mt-3 px-4 py-2 bg-[#7C3AED] text-white text-sm rounded-lg hover:bg-[#6d28d9] transition-colors">
            Create term sheet →
          </button>
          <button onClick={() => setShowChangeDecision(true)} className="mt-2 block text-xs text-white/30 hover:text-white/60">Change decision →</button>
        </div>
      )}
      {existingDecision === "hold" && !showChangeDecision && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 font-semibold text-sm">⏸ On hold until {roomData?.follow_up_date}</p>
          <p className="text-white/60 text-sm mt-1">Your reason: {roomData?.decision_reason}</p>
          <button onClick={() => setShowChangeDecision(true)} className="mt-3 text-xs text-white/40 hover:text-white/70">Change decision →</button>
        </div>
      )}
      {existingDecision === "pass" && !showChangeDecision && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/8">
          <p className="text-white/50 font-semibold text-sm">✗ Passed</p>
          <p className="text-white/40 text-sm mt-1">Your reason was shared with the founder: "{roomData?.decision_reason}"</p>
        </div>
      )}

      {/* ── Decision panel (no decision yet, or changing) ─────────── */}
      {(!existingDecision || showChangeDecision) && (
        <div className="rounded-xl border border-white/10 bg-[#111118] p-6">
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Record your decision</h2>
          <p className="text-xs text-white/40 mt-1">Founders receive your stated reason.</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["invest", "hold", "pass"] as const).map((key) => {
              const cfg = {
                invest: { label: "Invest", icon: "✓", base: "bg-green-500/20 text-green-400 border-green-500/40", active: "bg-green-500/40 border-green-400" },
                hold:   { label: "Hold",   icon: "⏸", base: "bg-amber-500/20 text-amber-400 border-amber-500/40", active: "bg-amber-500/40 border-amber-400" },
                pass:   { label: "Pass",   icon: "✗", base: "bg-red-500/20 text-red-400 border-red-500/40",     active: "bg-red-500/40 border-red-400" },
              }[key];
              return (
                <button key={key} onClick={() => setSelectedDecision(key)}
                  className={cn("rounded-xl border px-4 py-4 text-sm font-medium transition-all flex flex-col items-center gap-1.5",
                    selectedDecision === key ? cfg.active : cfg.base)}>
                  <span className="text-lg">{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {selectedDecision === "hold" && (
            <div className="mt-4">
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Follow-up date *</label>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className={inputCls} />
              <p className="text-xs text-white/30 mt-1">We'll remind you on this date to revisit the deal.</p>
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Reason (required) *</label>
            <textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} rows={3}
              placeholder="Be specific. Founders deserve to know why."
              className={cn(inputCls, "resize-none")} />
            <p className="text-[10px] text-white/30 mt-0.5">{decisionReason.length}/20 min characters</p>
          </div>

          {closerError && <p className="mt-2 text-xs text-red-400">{closerError}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleRecordDecision} disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record decision
            </button>
            {showChangeDecision && (
              <button onClick={() => setShowChangeDecision(false)} className="text-sm text-white/40 hover:text-white/70">Cancel</button>
            )}
          </div>
        </div>
      )}

      {/* ── Term sheet modal ──────────────────────────────────────── */}
      {showTermSheet && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowTermSheet(false)}>
          <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/8">
              <div>
                <h2 className="text-base font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Term Sheet</h2>
                <p className="text-xs text-white/40 mt-0.5">A lightweight summary of proposed terms</p>
              </div>
              <button onClick={() => setShowTermSheet(false)} className="text-white/40 hover:text-white text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Investment amount (USD)</label>
                <input type="number" value={termSheet.investment_amount}
                  onChange={(e) => setTermSheet((t) => ({ ...t, investment_amount: e.target.value }))}
                  placeholder="500000" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Pre-money valuation (USD)</label>
                <input type="number" value={termSheet.valuation_pre_money}
                  onChange={(e) => setTermSheet((t) => ({ ...t, valuation_pre_money: e.target.value }))}
                  placeholder="5000000" className={inputCls} />
              </div>
              {equityPct && (
                <div className="px-3 py-2 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20">
                  <p className="text-xs text-[#7C3AED]">Equity: <span className="font-bold">{equityPct}%</span> (auto-calculated)</p>
                </div>
              )}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Instrument</label>
                <select value={termSheet.instrument} onChange={(e) => setTermSheet((t) => ({ ...t, instrument: e.target.value }))}
                  className={inputCls}>
                  <option value="safe">SAFE</option>
                  <option value="convertible_note">Convertible Note</option>
                  <option value="equity">Equity</option>
                  <option value="priced">Priced Round</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-wider block">Rights</label>
                {([
                  { key: "information_rights", label: "Information rights" },
                  { key: "board_seat", label: "Board seat" },
                  { key: "pro_rata_rights", label: "Pro-rata rights" },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={termSheet[key]}
                      onChange={(e) => setTermSheet((t) => ({ ...t, [key]: e.target.checked }))}
                      className="accent-[#7C3AED]" />
                    <span className="text-sm text-white/70">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider block mb-1">Notes / conditions</label>
                <textarea value={termSheet.notes} onChange={(e) => setTermSheet((t) => ({ ...t, notes: e.target.value }))}
                  rows={3} placeholder="Any conditions or special terms…"
                  className={cn(inputCls, "resize-none")} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-2">
              <button onClick={() => setShowTermSheet(false)} className="px-4 py-2 text-sm rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5">Cancel</button>
              <button onClick={saveTermSheet} disabled={savingTermSheet}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#7C3AED] text-white hover:bg-[#6d28d9] disabled:opacity-50 transition-colors">
                {savingTermSheet && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save term sheet
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <input type="file" id="ts-upload" className="hidden" accept=".pdf,.docx,.doc"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !(room as any)?.startup_id) return;
                  const path = `term-sheets/${dealRoomId}/${file.name}`;
                  const { error } = await supabase.storage
                    .from("documents").upload(path, file, { upsert: true });
                  if (!error) {
                    await supabase.from("term_sheets").upsert({
                      deal_room_id: dealRoomId,
                      startup_id: (room as any).startup_id,
                      investor_id: user?.id,
                      status: "draft",
                      notes: `Uploaded: ${file.name}`,
                    }, { onConflict: "deal_room_id" });
                    setShowTermSheet(false);
                    queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
                  }
                }}
              />
              <button onClick={() => document.getElementById("ts-upload")?.click()}
                className="mt-3 w-full py-2.5 border border-white/15 rounded-lg text-sm text-white/50 hover:text-white/80 hover:border-white/30 transition-colors">
                Upload term sheet (PDF or Word)
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold tracking-tight">Investment Decision</h2>
      <p className="-mt-4 text-sm text-muted-foreground">Your confidential assessment of this deal</p>

      {/* Scoring */}
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
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
