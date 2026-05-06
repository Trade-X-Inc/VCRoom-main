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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*, startups(company_name)")
        .eq("id", dealRoomId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: memberRow } = useQuery({
    queryKey: ["deal-room-member", dealRoomId, user?.id],
    enabled: !!user?.id,
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

  const isInvestor = memberRow ? (memberRow.role === "investor" || memberRow.role === "viewer") : user?.appRole === "investor";
  const isFounder = memberRow ? memberRow.role === "founder" : user?.appRole !== "investor";

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
    }).select("id").single();
    queryClient.invalidateQueries({ queryKey: ["deal-room-qa", dealRoomId] });
    return data?.id;
  };

  const handleSaveAnswer = async (questionId: string, answer: string) => {
    const { data: existing } = await supabase.from("messages").select("metadata").eq("id", questionId).single();
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
          <>
            {isInvestor ? <InvestorOverview companyName={companyName} /> : <FounderOverview />}
            <ParticipantsSection dealRoomId={dealRoomId} />
          </>
        )}
        {tab === "documents" && <Documents dealRoomId={dealRoomId} />}
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

// ── Founder overview ──────────────────────────────────────────────
function FounderOverview() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Deal room</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Active Investor Review</h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">Active diligence in progress.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"><Plus className="h-4 w-4" /> Invite</button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Send className="h-4 w-4" /> Send update</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Stage", "Diligence", TrendingUp, "brand"],
          ["Probability", "65%", Target, "success"],
          ["Days open", "12", Clock, "violet"],
          ["Open items", "4", AlertCircle, "warning"],
        ].map(([l, v, I, c]: any) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{l}</span><I className={`h-3.5 w-3.5 text-${c}`} /></div>
            <div className="mt-2 text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Investor activity</div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-3">
            {[
              ["Investor opened Cohort analysis v2.pdf", "12m ago", "brand"],
              ["Investor viewed pitch deck (4th time)", "1h ago", "violet"],
              ["Investor asked a question in Q&A", "2h ago", "warning"],
              ["NDA signed", "yesterday", "success"],
            ].map(([t, d, c]: any, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`h-1.5 w-1.5 rounded-full bg-${c}`} />
                <span className="flex-1">{t}</span>
                <span className="text-xs text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold">Next steps</div>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /><span>Customer ref calls scheduled</span></div>
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 text-warning mt-0.5" /><span>Cap table review by Fri</span></div>
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 text-warning mt-0.5" /><span>Forecast model 2026</span></div>
            <div className="flex items-start gap-2"><AlertCircle className="h-4 w-4 text-destructive mt-0.5" /><span>SOC2 evidence (blocked)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Investor overview ─────────────────────────────────────────────
function InvestorOverview({ companyName }: { companyName: string }) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Reviewing</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{companyName}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">Active deal room — review documents, Q&A, and checklist.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 text-success px-3 py-2 text-sm hover:bg-success/15">
            <ThumbsUp className="h-4 w-4" /> Accept
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-sm hover:bg-warning/15">
            <HelpCircle className="h-4 w-4" /> Request info
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm hover:bg-destructive/15">
            <ThumbsDown className="h-4 w-4" /> Pass
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["ARR", "$4.2M", "+318% YoY", DollarSign, "success"],
          ["Customers", "12", "F500: 4", Users, "brand"],
          ["Net retention", "134%", "Best-in-class", TrendingUp, "violet"],
          ["Runway", "18mo", "post-raise", Shield, "warning"],
        ].map(([l, v, d, I, c]: any) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{l}</span><I className={`h-3.5 w-3.5 text-${c}`} /></div>
            <div className="mt-2 text-xl font-semibold">{v}</div>
            <div className="text-[11px] text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-brand" /> Round details</div>
          <div className="mt-3 space-y-2.5 text-sm">
            {[["Round", "Series A"], ["Target", "$8M"], ["Soft circled", "$3.2M"], ["Lead", "Open"], ["Valuation", "$48M post"], ["Close", "~6 weeks"]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand/5 to-violet/5 p-5 shadow-card">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /> AI decision summary</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-start gap-2"><span className="text-success mt-0.5">+</span><span>Strong NRR (134%) and F500 traction (4/12 customers).</span></div>
            <div className="flex items-start gap-2"><span className="text-success mt-0.5">+</span><span>Founders with deep domain expertise — proven shippers.</span></div>
            <div className="flex items-start gap-2"><span className="text-warning mt-0.5">!</span><span>Hardware GM concentration: top 3 customers = 41% ARR.</span></div>
            <div className="flex items-start gap-2"><span className="text-destructive mt-0.5">−</span><span>Capex-heavy. Watch BOM trajectory before Y2.</span></div>
          </div>
          <button className="mt-4 text-xs text-brand hover:underline">Generate full investment memo →</button>
        </div>
      </div>
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────
const sampleDocs = [
  { name: "Pitch deck v3.pdf", category: "Strategy" },
  { name: "Financial model Q4.xlsx", category: "Finance" },
  { name: "Cap table current.xlsx", category: "Legal" },
  { name: "Product roadmap 2025.pdf", category: "Product" },
];

function Documents({ dealRoomId }: { dealRoomId: string }) {
  const queryClient = useQueryClient();
  const { data: docs = [] } = useQuery({
    queryKey: ["documents", dealRoomId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("deal_room_id", dealRoomId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);

  const handleDownload = async (storagePath: string) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">Request document</button>
      </div>
      <div className="mt-5">
        <Dropzone
          dealRoomId={dealRoomId}
          onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["documents", dealRoomId] })}
        />
      </div>

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

      {docs.length > 0 && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
          {(docs as any[]).map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-accent"><FileText className="h-4 w-4 text-brand" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{doc.storage_path?.split("/").pop() ?? "Document"}</div>
                <div className="text-xs text-muted-foreground">{doc.category ?? "General"}</div>
              </div>
              {doc.status === "ready" ? (
                <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Review</span>
              )}
              <button onClick={() => handleDownload(doc.storage_path)} className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {docs.length === 0 && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sample documents</div>
          <div className="rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
            {sampleDocs.map((doc) => (
              <div key={doc.name} className="flex items-center gap-3 px-5 py-3 opacity-50">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-accent"><FileText className="h-4 w-4 text-brand" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.category}</div>
                </div>
                <span className="inline-flex items-center gap-1 text-warning text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Review</span>
                <button disabled className="text-muted-foreground/40"><Download className="h-4 w-4" /></button>
              </div>
            ))}
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
            const { data } = await supabase.from("users").select("full_name").eq("id", msg.sender_id).single();
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
      .single();
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
