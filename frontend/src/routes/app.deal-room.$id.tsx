import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  LayoutGrid, FileText, MessageSquare, ListChecks, StickyNote, Activity,
  Calendar, Gavel, Download, CheckCircle2, AlertTriangle, Clock, Plus,
  ArrowLeft, Lock, Sparkles, X, MessagesSquare, ThumbsUp, ThumbsDown,
  HelpCircle, Building2, TrendingUp, Users, DollarSign, Target, Shield,
  Send, AlertCircle, Eye, UserPlus, Loader2, ExternalLink,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AIChat } from "@/components/ai/AIChat";
import { DealRoomChat } from "@/components/app/DealRoomChat";
import { DDChecklist } from "@/components/app/DDChecklist";
import { Dropzone } from "@/components/app/Dropzone";
import { InterviewRoom } from "@/components/app/InterviewRoom";
import { useAuth } from "@/lib/auth";
import { supabase, logActivity, createNotification } from "@/lib/supabase";
import { ReviewTab } from "@/components/app/ReviewTab";
import {
  useParticipants, useGeneratedNdaDocs,
  participantsStore, qaStore,
  type QAQuestion, type Participant,
} from "@/lib/store";
import { cn } from "@/lib/utils";

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
  { k: "decision", l: "Review", i: Gavel },
];

function DealRoom() {
  const { id: dealRoomId } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userName = user?.name ?? "User";

  // ── Supabase queries ──────────────────────────────────────────
  const { data: room } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("*, startups(*)")
        .eq("id", dealRoomId)
        .maybeSingle();
      return data ?? null;
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
    if (isInvestor) return ["overview", "documents", "qa", "notes", "decision"].includes(t.k);
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

  try { return (
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
              onClick={() => setTab(t.k)}
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
        {tab === "chat" && <div className="h-full"><DealRoomChat /></div>}
        {tab === "qa" && <QA dealRoomId={dealRoomId} userId={user?.id} userName={userName} />}
        {tab === "checklist" && <DDChecklist />}
        {tab === "notes" && <Notes dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "timeline" && <Timeline dealRoomId={dealRoomId} />}
        {tab === "meetings" && <MeetingsTab dealRoomId={dealRoomId} userId={user?.id} />}
        {tab === "decision" && (
          <ReviewTab
            dealRoomId={dealRoomId}
            currentUserRole={isFounder ? "founder" : "investor"}
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
  ); } catch (error) {
    console.error("DealRoom render error:", error);
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">Something went wrong loading this deal room.</p>
        <button
          onClick={() => window.location.reload()}
          className="text-brand underline text-sm"
        >
          Reload
        </button>
      </div>
    );
  }
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
  const [showProblem, setShowProblem] = useState(false);

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["activities-overview", dealRoomId],
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

  const daysOpen = room?.created_at
    ? Math.floor((Date.now() - new Date(room.created_at).getTime()) / 86400000)
    : 0;
  const lastActivity = (recentActivity as any[])[0]?.created_at;

  const memberStatusColor = (accepted: boolean) =>
    accepted ? "bg-success/10 text-success" : "bg-warning/10 text-warning";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isInvestor ? "Reviewing" : "Deal Room"}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {startup?.company_name ?? "Deal Room"}
          </h2>
          {startup?.tagline && (
            <p className="mt-1 text-sm text-muted-foreground">{startup.tagline}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isFounder ? (
            <>
              <button
                onClick={() => onTabChange("documents")}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" /> Invite
              </button>
              <button
                onClick={() => onTabChange("chat")}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
              >
                <Send className="h-4 w-4" /> Send update
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onTabChange("qa")}
                className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-sm hover:bg-warning/15"
              >
                <HelpCircle className="h-4 w-4" /> Request info
              </button>
              <button
                onClick={() => onTabChange("decision")}
                className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 text-success px-3 py-2 text-sm hover:bg-success/15"
              >
                <ThumbsUp className="h-4 w-4" /> Submit review
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout: 60% left / 40% right */}
      <div className="grid md:grid-cols-5 gap-5">
        {/* LEFT — company summary + participants */}
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-bold text-sm">
                {startup?.company_name?.[0] ?? "D"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{startup?.company_name ?? "Company"}</div>
                {startup?.tagline && (
                  <div className="text-xs text-muted-foreground mt-0.5">{startup.tagline}</div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {startup?.stage && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                      {startup.stage}
                    </span>
                  )}
                  {startup?.sector && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                      {startup.sector}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {startup?.funding_target && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Raising</div>
                  <div className="text-sm font-semibold mt-0.5">{startup.funding_target}</div>
                </div>
              )}
              {startup?.revenue && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">ARR</div>
                  <div className="text-sm font-semibold mt-0.5">{startup.revenue}</div>
                </div>
              )}
              {startup?.team_size && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Team size</div>
                  <div className="text-sm font-semibold mt-0.5">{startup.team_size}</div>
                </div>
              )}
              {startup?.website && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Website</div>
                  <a
                    href={startup.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-brand mt-0.5 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Visit
                  </a>
                </div>
              )}
            </div>

            {(startup?.problem || startup?.solution) && (
              <div className="mt-3 border-t border-border/60 pt-3">
                <button
                  onClick={() => setShowProblem((v) => !v)}
                  className="text-xs text-brand hover:underline"
                >
                  {showProblem ? "Hide" : "Show"} problem / solution
                </button>
                {showProblem && (
                  <div className="mt-2 space-y-3">
                    {startup.problem && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Problem</div>
                        <div className="text-sm mt-1">{startup.problem}</div>
                      </div>
                    )}
                    {startup.solution && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Solution</div>
                        <div className="text-sm mt-1">{startup.solution}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <Users className="h-4 w-4 text-brand" /> Participants
              </div>
              {isFounder && (
                <button className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <UserPlus className="h-3.5 w-3.5" /> Invite
                </button>
              )}
            </div>
            {memberList.length === 0 ? (
              <div className="text-xs text-muted-foreground">No participants yet.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {(memberList as any[]).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0">
                      {(m.users?.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.users?.full_name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.users?.email ?? ""}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] capitalize text-muted-foreground">{m.role}</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded", memberStatusColor(!!m.accepted_at))}>
                        {m.accepted_at ? "NDA Accepted" : "Invited"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — deal status + recent activity */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Deal status</div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stage</span>
                <span className="font-medium capitalize">{room?.status ?? "Active"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Days open</span>
                <span className="font-medium">{daysOpen}</span>
              </div>
              {lastActivity && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last activity</span>
                  <span className="font-medium">{formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}</span>
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Quick actions</div>
              <div className="space-y-1.5">
                {isFounder ? (
                  <>
                    <button
                      onClick={() => onTabChange("documents")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-brand" /> Upload document
                    </button>
                    <button
                      onClick={() => onTabChange("meetings")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <Calendar className="h-3.5 w-3.5 text-brand" /> Schedule meeting
                    </button>
                    <button
                      onClick={() => onTabChange("chat")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <Send className="h-3.5 w-3.5 text-brand" /> Send investor update
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onTabChange("documents")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-brand" /> Request document
                    </button>
                    <button
                      onClick={() => onTabChange("qa")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-brand" /> Ask a question
                    </button>
                    <button
                      onClick={() => onTabChange("decision")}
                      className="w-full text-left text-sm px-3 py-2 rounded-md border border-border/60 hover:bg-accent flex items-center gap-2"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 text-success" /> Submit review
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Recent activity</div>
            {(recentActivity as any[]).length === 0 ? (
              <div className="text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <div className="space-y-2.5">
                {(recentActivity as any[]).map((e) => (
                  <div key={e.id} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{e.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
  "Other": "bg-accent text-muted-foreground",
};

function Documents({ dealRoomId, isFounder, userId }: { dealRoomId: string; isFounder: boolean; userId?: string }) {
  const queryClient = useQueryClient();
  const [showLibrary, setShowLibrary] = useState(false);
  const [addingFromLib, setAddingFromLib] = useState<string | null>(null);

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", dealRoomId],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
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

  const removeFromRoom = async (docId: string) => {
    await supabase.from("documents").update({ deal_room_id: null }).eq("id", docId);
    queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] });
    toast.success("Removed from deal room");
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
        <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
          {(docs as any[]).map((doc) => {
            const catColor = CATEGORY_COLORS[doc.category] ?? "bg-accent text-muted-foreground";
            return (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-accent">
                  <FileText className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {doc.name || (doc.storage_path?.split("/").pop() ?? "Document")}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {doc.category && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", catColor)}>{doc.category}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {doc.users?.full_name ?? "Unknown"} · {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {doc.status === "ready" ? (
                  <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Review</span>
                )}
                <button
                  onClick={() => handleDownload(doc.storage_path)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isFounder && (
                  <button
                    onClick={() => removeFromRoom(doc.id)}
                    title="Remove from deal room"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
    </div>
  );
}

// ── Participants ───────────────────────────────────────────────────
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

// ── Notes ─────────────────────────────────────────────────────────
function Notes({ dealRoomId, userId }: { dealRoomId: string; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: notes = [], isLoading, isError } = useQuery({
    queryKey: ["notes", dealRoomId],
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
      await supabase.from("notes").insert({ deal_room_id: dealRoomId, author_id: userId, body: body.trim(), private: isPrivate });
      await logActivity(dealRoomId, userId, "Added a note");
      queryClient.invalidateQueries({ queryKey: ["notes", dealRoomId] });
      setBody("");
      setIsPrivate(false);
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
      await supabase.from("meetings").insert({
        deal_room_id: dealRoomId,
        title: f.title,
        scheduled_at: new Date(f.scheduledAt).toISOString(),
        meeting_link: f.meetingLink || null,
        notes: f.notes || null,
        created_by: userId,
      });
      await logActivity(dealRoomId, userId, "Scheduled a meeting");
      queryClient.invalidateQueries({ queryKey: ["meetings", dealRoomId] });
      setF({ title: "", scheduledAt: "", meetingLink: "", notes: "" });
      setShowForm(false);
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

// ── Q&A real-time chat ────────────────────────────────────────────
function QA({ dealRoomId, userId, userName }: { dealRoomId: string; userId: string | undefined; userName: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, users(full_name)")
        .eq("deal_room_id", dealRoomId)
        .eq("private_to_org", false)
        .order("created_at", { ascending: true });
      if (error) setLoadError(true);
      else setMsgs(data ?? []);
      setLoading(false);
    })();
  }, [dealRoomId]);

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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, userId, userName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || !userId) return;
    setSending(true);
    const optId = crypto.randomUUID();
    setMsgs((xs) => [...xs, { id: optId, sender_id: userId, body: text, created_at: new Date().toISOString(), private_to_org: false, users: { full_name: userName }, _opt: true }]);
    setInput("");
    const { data } = await supabase
      .from("messages")
      .insert({ deal_room_id: dealRoomId, sender_id: userId, body: text, private_to_org: false })
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
    <div className="flex flex-col h-full">
      <div className="px-8 pt-6 pb-4 border-b border-border/60 shrink-0">
        <h2 className="text-xl font-semibold tracking-tight">Q&amp;A Discussion</h2>
        <p className="mt-1 text-sm text-muted-foreground">Public deal room discussion thread.</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
        {loading && <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>}
        {loadError && <p className="text-sm text-destructive">Could not load data. Please refresh.</p>}
        {!loading && !loadError && msgs.length === 0 && (
          <div className="text-sm text-muted-foreground">No messages yet. Start the conversation.</div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.sender_id === userId;
          const name = isMe ? userName : (m.users?.full_name ?? "Unknown");
          const prev = msgs[i - 1];
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
                  <div className={cn("flex items-center gap-2 mb-1 text-[11px]", isMe && "flex-row-reverse")}>
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

      <div className="px-8 py-4 border-t border-border/60 bg-background shrink-0">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question or leave a comment…"
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1"
          />
          <button
            onClick={send}
            disabled={!input.trim() || !userId || sending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
