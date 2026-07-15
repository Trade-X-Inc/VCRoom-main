import { DealFlowHome } from "@/components/app/DealFlowHome";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Send, Loader2, MoreHorizontal, Trash2,
  TrendingUp, Eye, Clock, AlertCircle, Briefcase,
  ChevronRight, BarChart3, ArrowUpRight, Paperclip, X as XIcon,
} from "lucide-react";
import { Markdown } from "@/components/shared/LazyMarkdown";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getInvestorAdvice } from "@/lib/investor-advisor-fn";
import { getInvestorContext, buildInvestorContextBlock, type InvestorContext } from "@/lib/investor-context-fn";
import { generateInvestorDealBrief, type InvestorDealBrief } from "@/lib/investor-deal-brief-fn";
import { withTimeout, AITimeoutError } from "@/lib/with-timeout";
import { AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { ChatResultCard } from "@/components/app/ChatResultCard";
import { PageGuide } from "@/components/app/PageGuide";
import {
  getInvestorCompleteness,
  getResumeMessage,
  isToolRequest,
  type InvestorProfile,
} from "@/lib/profileCompleteness";

// P5: /app/investor is the 4-step deal-flow home; the chat moved to
// /app/investor/assistant.
export const Route = createFileRoute("/app/investor/")({
  component: DealFlowHome,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type CardPayload =
  | { type: "watchlist"; entries: InvestorContext["watchlist"] }
  | { type: "alerts"; alerts: InvestorContext["thesisAlerts"] }
  | { type: "deal_rooms"; rooms: InvestorContext["activeDealRooms"] }
  | { type: "deal_brief"; brief: InvestorDealBrief };

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  isGateBlock?: boolean;
  isProactive?: boolean;
  card?: CardPayload;
  loading?: boolean;
}

// ── Status badge helper ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Sourcing:  { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA" },
  Reviewing: { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  Diligence: { bg: "rgba(124,58,237,0.12)",  color: "#A855F7" },
  Passed:    { bg: "var(--accent)", color: "var(--muted-foreground)" },
  Invested:  { bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  Watching:  { bg: "rgba(99,102,241,0.12)",  color: "#818CF8" },
};
const VERDICT_COLORS: Record<string, { bg: string; color: string }> = {
  strong:  { bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  neutral: { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  weak:    { bg: "rgba(239,68,68,0.12)",   color: "#EF4444" },
};
function statusBadge(status: string) {
  const s = STATUS_COLORS[status] ?? { bg: "var(--faint)", color: "var(--muted-foreground)" };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
}

// ── Card renderers ─────────────────────────────────────────────────────────────

function WatchlistCard({ entries }: { entries: InvestorContext["watchlist"] }) {
  if (entries.length === 0) {
    return (
      <ChatResultCard icon={<TrendingUp size={14} />} title="Your Watchlist">
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
          No companies on your watchlist yet. Add some from the Startups page.
        </p>
      </ChatResultCard>
    );
  }
  return (
    <ChatResultCard
      icon={<TrendingUp size={14} />}
      title={`Your Watchlist — ${entries.length} compan${entries.length !== 1 ? "ies" : "y"}`}
      fullPageUrl="/app/investor/startups"
      fullPageLabel="Manage watchlist"
    >
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {entries.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.companyName}
              </div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>
                {e.daysOnWatchlist}d on watchlist{e.score != null ? ` · score ${e.score}/10` : ""}
              </div>
            </div>
            {statusBadge(e.status)}
          </div>
        ))}
      </div>
    </ChatResultCard>
  );
}

function AlertsCard({ alerts }: { alerts: InvestorContext["thesisAlerts"] }) {
  if (alerts.length === 0) {
    return (
      <ChatResultCard icon={<AlertCircle size={14} />} title="Thesis Alerts">
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>No thesis alerts yet.</p>
      </ChatResultCard>
    );
  }
  return (
    <ChatResultCard
      icon={<AlertCircle size={14} />}
      title={`Thesis Alerts — ${alerts.length} match${alerts.length !== 1 ? "es" : ""}`}
    >
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
        {alerts.map((a) => {
          const score = a.matchScore;
          const scoreColor = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
          return (
            <div key={a.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{a.startupName}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{score}% thesis fit</span>
              </div>
              {a.matchReasons.length > 0 && (
                <ul style={{ margin: "0 0 4px 14px", padding: 0, listStyle: "disc" }}>
                  {a.matchReasons.slice(0, 3).map((r, i) => (
                    <li key={i} style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{r}</li>
                  ))}
                </ul>
              )}
              {a.profileSlug && (
                <a
                  href={`/p/${a.profileSlug}`}
                  style={{ fontSize: 11, color: "#A855F7", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  View profile <ArrowUpRight size={10} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </ChatResultCard>
  );
}

function DealRoomsCard({ rooms }: { rooms: InvestorContext["activeDealRooms"] }) {
  if (rooms.length === 0) {
    return (
      <ChatResultCard icon={<Briefcase size={14} />} title="Active Deal Rooms">
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
          No active deal rooms. Founders will invite you when they're ready.
        </p>
      </ChatResultCard>
    );
  }
  return (
    <ChatResultCard
      icon={<Briefcase size={14} />}
      title={`Deal Rooms — ${rooms.length} active`}
      fullPageUrl="/app/investor/deal-flow"
      fullPageLabel="View deal flow"
    >
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {rooms.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{r.companyName}</span>
            <a
              href={`/app/deal-rooms/${r.id}`}
              style={{ fontSize: 11, color: "#A855F7", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              Open <ChevronRight size={10} />
            </a>
          </div>
        ))}
      </div>
    </ChatResultCard>
  );
}

function DealBriefCard({ brief }: { brief: InvestorDealBrief }) {
  const vc = VERDICT_COLORS[brief.verdictSignal] ?? VERDICT_COLORS.neutral;
  return (
    <ChatResultCard
      icon={<BarChart3 size={14} />}
      title={`Deal Brief — ${brief.companyName}`}
      footerLabel={brief.fromCache ? "Cached analysis · refresh to regenerate" : "Analysis saved"}
    >
      {/* Header: headline + score + verdict */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", marginBottom: 6, lineHeight: 1.4 }}>
          {brief.headline}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: vc.color }}>{brief.matchScore}</span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>/100 deal quality score</span>
          <span style={{ background: vc.bg, color: vc.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, marginLeft: "auto" }}>
            {brief.verdictSignal.charAt(0).toUpperCase() + brief.verdictSignal.slice(1)} fit
          </span>
        </div>
      </div>

      {/* Key metrics grid */}
      {Object.keys(brief.keyMetrics).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginBottom: 12, background: "var(--accent)", borderRadius: 8, padding: "10px 12px" }}>
          {Object.entries(brief.keyMetrics).slice(0, 6).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{k.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{v || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {brief.strengths.length > 0 && (
        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 14 }}>
            {brief.strengths.map((s, i) => <li key={i} style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Red flags */}
      {brief.redFlags.length > 0 && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Watch points</div>
          <ul style={{ margin: 0, paddingLeft: 14 }}>
            {brief.redFlags.map((r, i) => <li key={i} style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Suggested questions */}
      {brief.suggestedQuestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Questions to ask</div>
          <ol style={{ margin: 0, paddingLeft: 16 }}>
            {brief.suggestedQuestions.map((q, i) => <li key={i} style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 2 }}>{q}</li>)}
          </ol>
        </div>
      )}

      {/* Verdict */}
      {brief.overallVerdict && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          {brief.overallVerdict}
        </div>
      )}
    </ChatResultCard>
  );
}

// ── Suggestion chips ───────────────────────────────────────────────────────────

const SUGGESTION_CHIPS = [
  "What's on my watchlist?",
  "Show my thesis alerts",
  "What deal rooms am I in?",
  "Run a deal brief on Atlas Robotics",
];

// ── Confirm clear dialog ───────────────────────────────────────────────────────

function ConfirmClearDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "28px 28px 24px", maxWidth: 380, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>Clear conversation?</div>
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
          This removes all messages from your saved history. Your investment data and thesis are not affected.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "var(--accent)", color: "var(--muted-foreground)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Clear history</button>
        </div>
      </div>
    </div>
  );
}

// ── Welcome message ────────────────────────────────────────────────────────────

function buildWelcomeMessage(ctx: InvestorContext | null, state: "no-profile" | "no-thesis" | "no-deals" | "active"): string {
  const firstName = ctx?.investorName?.split(" ")[0];
  const greeting = firstName ? `${firstName}, I` : "I";
  if (state === "no-profile") return "I'm your AI investment analyst. Set up your investor profile and I can score deals against your thesis, surface matches, and help you run diligence — takes about 2 minutes.";
  if (state === "no-thesis") return `${greeting}'m your AI investment analyst. Your profile is set up but your investment thesis is blank. Add it and I can score every watchlist company and flag high-fit matches automatically.`;
  if (!ctx) return "I'm your AI investment analyst. Ask me about your pipeline, thesis, or a specific startup.";

  const parts: string[] = [];
  if (ctx.thesisAlerts.length > 0) parts.push(`${ctx.thesisAlerts.length} thesis match${ctx.thesisAlerts.length !== 1 ? "es" : ""} need your attention`);
  if (ctx.watchlist.length > 0) parts.push(`${ctx.watchlist.length} compan${ctx.watchlist.length !== 1 ? "ies" : "y"} on your watchlist`);
  if (ctx.activeDealRooms.length > 0) parts.push(`${ctx.activeDealRooms.length} active deal room${ctx.activeDealRooms.length !== 1 ? "s" : ""}`);
  const summary = parts.length > 0 ? ` You have ${parts.join(", ")}.` : "";
  return `${greeting}'m your AI investment analyst.${summary} Ask me to score a deal, run diligence, or analyse a term sheet.`;
}

// ── Detect tool intent in user message ────────────────────────────────────────

function detectIntent(text: string): "watchlist" | "alerts" | "deal_rooms" | "deal_brief" | "general" {
  const t = text.toLowerCase();
  if (/watchlist|watching|pipeline|sourcing|portfolio companies/.test(t)) return "watchlist";
  if (/alert|match|thesis match|thesis fit/.test(t)) return "alerts";
  if (/deal room|deal flow|active deal/.test(t)) return "deal_rooms";
  if (/deal brief|brief|analysis|analyse|analyze|think of|what do you think|should I look|evaluate|score.*startup|tell me about/.test(t)) return "deal_brief";
  return "general";
}

function extractCompanyFromMessage(text: string, watchlist: InvestorContext["watchlist"], alerts: InvestorContext["thesisAlerts"]): { companyName: string; startupId: string | null } | null {
  // Check against watchlist names
  for (const w of watchlist) {
    if (text.toLowerCase().includes(w.companyName.toLowerCase())) {
      return { companyName: w.companyName, startupId: null };
    }
  }
  // Check against alert startup names
  for (const a of alerts) {
    if (text.toLowerCase().includes(a.startupName.toLowerCase())) {
      return { companyName: a.startupName, startupId: a.startupId };
    }
  }
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InvestorChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Auto-expand textarea — must be after [input] useState so the dependency is initialized
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const [thinking, setThinking] = useState(false);
  const [stillThinking, setStillThinking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const historyApplied = useRef(false);
  const liveCtxRef = useRef<InvestorContext | null>(null);

  // ── Investor profile for completeness gate ─────────────────────────────────
  const { data: investorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["investor-profile-chat", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("fund_name, your_name, thesis, sectors, stages, check_size_min, check_size_max, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as InvestorProfile | null;
    },
  });

  const completeness = getInvestorCompleteness(investorProfile ?? null);

  const firstLoadState: "no-profile" | "no-thesis" | "no-deals" | "active" = (() => {
    if (!investorProfile) return "no-profile";
    if (!investorProfile.thesis) return "no-thesis";
    return "active";
  })();

  // ── Saved history ──────────────────────────────────────────────────────────
  const { data: savedHistory } = useQuery({
    queryKey: ["investor-advisor-messages", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("advisor_messages")
        .select("role, content, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(20);
      return (data ?? []) as Array<{ role: string; content: string; created_at: string }>;
    },
  });

  // ── Apply welcome + history once profile loaded ────────────────────────────
  useEffect(() => {
    if (profileLoading || historyApplied.current) return;
    historyApplied.current = true;

    const welcomeContent = buildWelcomeMessage(null, firstLoadState);
    const welcome: ChatMsg = { id: "m0", role: "assistant", content: welcomeContent };

    if (savedHistory && savedHistory.length > 0) {
      setMsgs([welcome, ...savedHistory.map((m, i) => ({ id: `h${i}`, role: m.role as "user" | "assistant", content: m.content }))]);
    } else {
      setMsgs([welcome]);
    }
  }, [profileLoading, savedHistory, firstLoadState]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch live context (runs on mount once, then on every send) ───────────
  const fetchContext = async (): Promise<InvestorContext | null> => {
    if (!user?.id) return null;
    try {
      const ctx = await getInvestorContext({ data: { investorId: user.id } });
      liveCtxRef.current = ctx;
      return ctx;
    } catch (e) {
      console.error("[investor-chat] context fetch failed:", e);
      return null;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchContext().then((ctx) => {
        if (!ctx) return;
        // Update welcome message with real context
        setMsgs((prev) => {
          if (prev.length === 0) return prev;
          const updatedWelcome: ChatMsg = {
            ...prev[0],
            content: buildWelcomeMessage(ctx, firstLoadState),
          };
          return [updatedWelcome, ...prev.slice(1)];
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── File attachment handler ────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setAttachedFile(f);
    e.target.value = "";
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const send = async (text: string) => {
    const file = attachedFile;
    const t = (text.trim() || (file ? `I've attached a file: ${file.name}` : "")).trim();
    if (!t || thinking || !user?.id || msgs.length === 0) return;

    setInput("");
    setAttachedFile(null);
    setErrorBanner(null);
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: t };
    setMsgs((xs) => [...xs, userMsg]);
    setThinking(true);
    setStillThinking(false);
    const stillThinkingTimer = setTimeout(() => setStillThinking(true), 9000);

    try {
      // Completeness gate
      if (!completeness.isComplete && isToolRequest(t)) {
        const resumeMsg = getResumeMessage(completeness, "investor", investorProfile ?? null);
        setMsgs((xs) => [...xs, { id: `gate${Date.now()}`, role: "assistant", content: resumeMsg, isGateBlock: true }]);
        return;
      }

      // Fetch fresh context on every send
      const ctx = await fetchContext();

      const intent = detectIntent(t);

      // ── Tool: watchlist ──
      if (intent === "watchlist" && ctx) {
        setMsgs((xs) => [...xs, {
          id: `a${Date.now()}`,
          role: "assistant",
          content: ctx.watchlist.length === 0
            ? "Your watchlist is empty — head to **Startups** to add companies you're tracking."
            : `Here's your current watchlist (${ctx.watchlist.length} compan${ctx.watchlist.length !== 1 ? "ies" : "y"}):`,
          card: { type: "watchlist", entries: ctx.watchlist },
        }]);
        if (!completeness.isComplete || true) {
          void supabase.from("advisor_messages").insert({ user_id: user.id, role: "user", content: t });
        }
        return;
      }

      // ── Tool: thesis alerts ──
      if (intent === "alerts" && ctx) {
        setMsgs((xs) => [...xs, {
          id: `a${Date.now()}`,
          role: "assistant",
          content: ctx.thesisAlerts.length === 0
            ? "No thesis alerts yet — they appear when the platform finds startups matching your investment criteria."
            : `You have ${ctx.thesisAlerts.length} thesis match${ctx.thesisAlerts.length !== 1 ? "es" : ""}:`,
          card: { type: "alerts", alerts: ctx.thesisAlerts },
        }]);
        void supabase.from("advisor_messages").insert({ user_id: user.id, role: "user", content: t });
        return;
      }

      // ── Tool: deal rooms ──
      if (intent === "deal_rooms" && ctx) {
        setMsgs((xs) => [...xs, {
          id: `a${Date.now()}`,
          role: "assistant",
          content: ctx.activeDealRooms.length === 0
            ? "You're not in any active deal rooms. Founders invite you when they want to share their full deal room."
            : `You're in ${ctx.activeDealRooms.length} active deal room${ctx.activeDealRooms.length !== 1 ? "s" : ""}:`,
          card: { type: "deal_rooms", rooms: ctx.activeDealRooms },
        }]);
        void supabase.from("advisor_messages").insert({ user_id: user.id, role: "user", content: t });
        return;
      }

      // ── Tool: deal brief ──
      if (intent === "deal_brief" && ctx) {
        const match = extractCompanyFromMessage(t, ctx.watchlist, ctx.thesisAlerts);

        if (!match?.startupId && !match?.companyName) {
          // No specific company identified — fall through to AI
        } else if (match.startupId) {
          // Known startup ID from thesis alerts — generate brief
          const briefLoadId = `brief-loading-${Date.now()}`;
          setMsgs((xs) => [...xs, { id: briefLoadId, role: "assistant", content: `Running deal analysis on **${match.companyName}**…`, loading: true }]);
          const stillWorkingTimer = setTimeout(() => {
            setMsgs((xs) => xs.map((m) => m.id === briefLoadId
              ? { ...m, content: "Still working — this may take a moment…" }
              : m
            ));
          }, 9000);
          try {
            const brief = await withTimeout(generateInvestorDealBrief({ data: { investorId: user.id, startupId: match.startupId } }));
            clearTimeout(stillWorkingTimer);
            setMsgs((xs) => xs.map((m) => m.id === briefLoadId
              ? { ...m, content: `Here's the deal brief for **${brief.companyName}**${brief.fromCache ? " (cached)" : ""}:`, card: { type: "deal_brief", brief }, loading: false }
              : m
            ));
            void supabase.from("advisor_messages").insert({ user_id: user.id, role: "user", content: t });
          } catch (e: any) {
            clearTimeout(stillWorkingTimer);
            setMsgs((xs) => xs.map((m) => m.id === briefLoadId
              ? { ...m, content: e instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : `Could not generate a deal brief: ${e.message ?? "unknown error"}`, loading: false }
              : m
            ));
          }
          return;
        } else {
          // Company name found but no startup_id — check if we have a cached brief by name
          const cached = ctx.lastDealBrief;
          if (cached && match.companyName.toLowerCase().includes(cached.companyName.toLowerCase().split(" ")[0])) {
            // Surface the cached brief context to AI instead
          }
          // Fall through to AI with context
        }
      }

      // ── General AI call with live context injected ──
      const contextBlock = ctx ? buildInvestorContextBlock(ctx) : "";
      const history = msgs.slice(1).filter((m) => !m.loading).map((m) => ({ role: m.role as string, content: m.content }));
      const result = await withTimeout(getInvestorAdvice({ data: { userId: user.id, message: t, history, liveContextBlock: contextBlock } }));

      // Check if AI response warrants proactive treatment
      const isProactive = ctx
        ? (ctx.thesisAlerts.length > 0 && result.reply.toLowerCase().includes(ctx.thesisAlerts[0].startupName.toLowerCase()))
        : false;

      setMsgs((xs) => [...xs, {
        id: `a${Date.now()}`,
        role: "assistant",
        content: result.reply,
        isProactive,
      }]);

      if (result.error === "no_key" || result.error === "missing_key") {
        setErrorBanner("OpenAI API key not configured. Contact your admin.");
      } else if (!result.error) {
        void supabase.from("advisor_messages").insert({ user_id: user.id, role: "user", content: t });
        void supabase.from("advisor_messages").insert({ user_id: user.id, role: "assistant", content: result.reply });
      }
    } catch (err) {
      if (err instanceof AITimeoutError) {
        toast.error(AI_TIMEOUT_MESSAGE);
        setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: AI_TIMEOUT_MESSAGE }]);
      } else {
        toast.error("Request failed. Please try again.");
        setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
      }
    } finally {
      clearTimeout(stillThinkingTimer);
      setThinking(false);
      setStillThinking(false);
    }
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearConversation = async () => {
    setConfirmClear(false);
    if (!user?.id) return;
    const { error } = await supabase.from("advisor_messages").delete().eq("user_id", user.id);
    if (error) { console.error("[advisor] clear failed:", error); toast.error("Could not clear conversation."); return; }
    queryClient.invalidateQueries({ queryKey: ["investor-advisor-messages", user.id] });
    historyApplied.current = false;
    const ctx = liveCtxRef.current;
    setMsgs([{ id: "m0", role: "assistant", content: buildWelcomeMessage(ctx, firstLoadState) }]);
    toast.success("Conversation cleared");
  };

  const showChips = msgs.length <= 1;

  // ── First-load CTA ─────────────────────────────────────────────────────────
  const stateActionButton = (firstLoadState === "no-profile" || firstLoadState === "no-thesis") ? (
    <button
      onClick={() => navigate({ to: "/app/investor/profile" as any })}
      style={{ background: "var(--gradient-brand)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {firstLoadState === "no-profile" ? "Set up my profile" : "Add my investment thesis"} →
    </button>
  ) : null;

  // ── Status badges row (active state, under welcome) ────────────────────────
  const ctx = liveCtxRef.current;
  const statusRow = firstLoadState === "active" && ctx && (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 4 }}>
      {ctx.thesisAlerts.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(245,158,11,0.12)", color: "#F59E0B", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
          <Eye size={11} /> {ctx.thesisAlerts.length} thesis alert{ctx.thesisAlerts.length !== 1 ? "s" : ""}
        </span>
      )}
      {ctx.watchlist.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(124,58,237,0.10)", color: "#A855F7", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
          <TrendingUp size={11} /> {ctx.watchlist.length} on watchlist
        </span>
      )}
      {ctx.activeDealRooms.length > 0 && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.10)", color: "#10B981", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
          <Clock size={11} /> {ctx.activeDealRooms.length} deal room{ctx.activeDealRooms.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "calc(100vh - 4rem)", background: "var(--background)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)", background: "rgba(10,10,11,0.85)", backdropFilter: "blur(16px)", padding: "14px 24px", flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", fontFamily: "Syne, sans-serif" }}>AI Advisor</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 1 }}>Investment analysis — thesis scoring, diligence, term sheets</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PageGuide pageId="investor-home" />
            {errorBanner && <div style={{ fontSize: 11, color: "#EF4444", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", padding: "4px 10px" }}>{errorBanner}</div>}
            <div style={{ position: "relative" as const }} ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{ width: 32, height: 32, borderRadius: 8, background: menuOpen ? "var(--accent)" : "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div style={{ position: "absolute" as const, top: 38, right: 0, background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 4px", minWidth: 180, zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmClear(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "8px 12px", borderRadius: 7, color: "#EF4444", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" as const }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
                  >
                    <Trash2 size={14} /> Clear conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto" as const }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px 8px" }}>
          {msgs.map((m, idx) => {
            const isUser = m.role === "user";
            const isFirstAssistant = idx === 0;
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
                {/* Avatar */}
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isUser ? "var(--gradient-brand)" : "var(--card)", border: isUser ? "none" : "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: isUser ? "#fff" : "var(--brand)" }}>
                  {isUser ? (user?.fullName?.[0]?.toUpperCase() ?? "U") : <Sparkles size={13} />}
                </div>

                {/* Bubble + extras */}
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, maxWidth: "78%", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  {/* Status row under welcome */}
                  {isFirstAssistant && statusRow}

                  {/* Proactive accent */}
                  <div style={m.isProactive ? { borderLeft: "3px solid rgba(16,185,129,0.4)", paddingLeft: 10 } : {}}>
                    <div style={{ borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, background: isUser ? "var(--gradient-brand)" : "var(--card)", color: isUser ? "#fff" : "var(--foreground)", border: isUser ? "none" : "1px solid var(--border)" }}>
                      {isUser ? m.content : (
                        <div className="[&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold">
                          <Markdown>{m.content}</Markdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card */}
                  {m.card && !m.loading && (
                    <div style={{ width: "100%" }}>
                      {m.card.type === "watchlist" && <WatchlistCard entries={m.card.entries} />}
                      {m.card.type === "alerts" && <AlertsCard alerts={m.card.alerts} />}
                      {m.card.type === "deal_rooms" && <DealRoomsCard rooms={m.card.rooms} />}
                      {m.card.type === "deal_brief" && <DealBriefCard brief={m.card.brief} />}
                    </div>
                  )}

                  {/* Gate CTA */}
                  {m.isGateBlock && (
                    <button onClick={() => navigate({ to: "/app/investor/profile" as any })} style={{ background: "var(--gradient-brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                      Complete my profile →
                    </button>
                  )}

                  {/* First-load CTA */}
                  {isFirstAssistant && stateActionButton}
                </div>
              </div>
            );
          })}

          {thinking && (
            <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1A1A1E", border: "1px solid var(--border)", color: "#A855F7" }}>
                <Sparkles size={13} />
              </div>
              <div style={{ borderRadius: "4px 18px 18px 18px", padding: "10px 16px", background: "var(--card)", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {stillThinking ? "Still working — this may take a moment…" : "Thinking…"}
              </div>
            </div>
          )}

          {/* Suggestion chips */}
          {showChips && msgs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", textAlign: "left" as const, cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.35)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--card)"; }}
                >
                  <Sparkles size={12} color="#A855F7" style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{chip}</div>
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div style={{ borderTop: "1px solid var(--border)", background: "rgba(10,10,11,0.85)", backdropFilter: "blur(16px)", flexShrink: 0, padding: "14px 24px 18px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Attached file pill */}
          {attachedFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--muted-foreground)" }}>
                <Paperclip size={11} color="#A855F7" />
                {attachedFile.name}
                <button onClick={() => setAttachedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--muted-foreground)" }}>
                  <XIcon size={12} />
                </button>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.csv,.pdf,.txt" style={{ display: "none" }} onChange={handleFileChange} />
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 10px 8px 10px" }}
            onFocus={(e) => { (e.currentTarget as HTMLFormElement).style.borderColor = "rgba(124,58,237,0.5)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLFormElement).style.borderColor = "var(--border)"; }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 32, height: 32, borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)", flexShrink: 0 }}
            >
              <Paperclip size={15} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask about a deal, thesis fit, or diligence…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none" as const, fontSize: 13, color: "#FAFAFA", lineHeight: 1.5, maxHeight: 160, overflowY: "auto", padding: "4px 0" }}
            />
            <button
              type="submit"
              disabled={(!input.trim() && !attachedFile) || thinking}
              style={{ width: 34, height: 34, borderRadius: 9, background: (input.trim() || attachedFile) && !thinking ? "var(--gradient-brand)" : "var(--accent)", border: "none", cursor: (input.trim() || attachedFile) && !thinking ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
            >
              <Send size={14} color={(input.trim() || attachedFile) && !thinking ? "#fff" : "var(--faint)"} />
            </button>
          </form>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--faint)", textAlign: "center" as const }}>
            AI may be inaccurate — verify with your legal &amp; finance team.
          </div>
        </div>
      </div>

      {confirmClear && <ConfirmClearDialog onConfirm={clearConversation} onCancel={() => setConfirmClear(false)} />}
    </div>
  );
}
