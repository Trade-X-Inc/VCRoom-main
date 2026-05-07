import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import "sonner";
import { User, Sparkles, Loader2, Send, Users, Paperclip, Smile, Plus, Filter, AlertTriangle, Circle, Clock, CheckCircle2, ChevronDown, ChevronRight, Download, FileQuestion, FileCheck, XCircle, LogOut, Search, ArrowLeft, ArrowRight, ZoomOut, ZoomIn, Printer, FileText, Star, LayoutGrid, MessageSquare, ListChecks, MessagesSquare, StickyNote, Activity, Calendar, Gavel, Lock, X, ThumbsUp, HelpCircle, ThumbsDown, DollarSign, TrendingUp, Shield, Building2, Target, AlertCircle, Eye, UserPlus, ExternalLink } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { p as postJson } from "./backend-CMfy16B4.js";
import { a as useI18n, u as useAuth, s as supabase, l as logActivity, d as createNotification, e as Route } from "./router-CYnoakuB.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { D as Dropzone } from "./Dropzone-CK_8Hp2M.js";
import { q as qaStore, p as participantsStore, a as useParticipants, b as useGeneratedNdaDocs } from "./store-C2XR0Skj.js";
import "@supabase/supabase-js";
import "clsx";
import "tailwind-merge";
function AIChat({ scope, starters, initialAssistant, className = "", compact = false }) {
  const [msgs, setMsgs] = useState(() => [
    {
      id: "m0",
      role: "assistant",
      content: initialAssistant ?? `I'm your AI advisor${scope ? ` for ${scope}` : ""}. Ask me anything about your raise — investors, term sheets, diligence, outreach.`,
      ts: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);
  const send = async (text) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    setMsgs((xs) => [...xs, { id: `u${Date.now()}`, role: "user", content: t, ts: Date.now() }]);
    setThinking(true);
    const endpoint = scope?.toLowerCase().includes("deal room") ? "/api/ai/memo" : "/api/ai/summary";
    try {
      const response = await postJson(endpoint, { context: `${scope ?? "workspace"}

User prompt: ${t}` });
      const reply = response.memo || response.summary || "No AI response generated.";
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: reply, ts: Date.now() }]);
    } catch (error) {
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: `AI request failed: ${error instanceof Error ? error.message : "unknown error"}`, ts: Date.now() }]);
    }
    setThinking(false);
  };
  const showStarters = msgs.length <= 1 && starters && starters.length > 0;
  return /* @__PURE__ */ jsxs("div", { className: `flex flex-col h-full bg-background ${className}`, children: [
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-6 space-y-5`, children: [
      msgs.map((m) => /* @__PURE__ */ jsxs("div", { className: `flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`, children: [
        /* @__PURE__ */ jsx("div", { className: `grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`, children: m.role === "user" ? /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsx("div", { className: `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`, children: m.content })
      ] }, m.id)),
      thinking && /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-brand animate-pulse" }) }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          " Thinking…"
        ] })
      ] }),
      showStarters && /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 gap-2 pt-2", children: starters.map((s) => /* @__PURE__ */ jsxs("button", { onClick: () => send(s), className: "text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand mb-1.5" }),
        /* @__PURE__ */ jsx("div", { children: s })
      ] }, s)) }),
      /* @__PURE__ */ jsx("div", { ref: endRef })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "border-t border-border/60 bg-background/80 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-3.5`, children: [
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            send(input);
          },
          className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10",
          children: [
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: input,
                onChange: (e) => setInput(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                },
                rows: 1,
                placeholder: `Ask the AI advisor${scope ? ` about ${scope}` : ""}…`,
                className: "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
              }
            ),
            /* @__PURE__ */ jsx("button", { type: "submit", disabled: !input.trim() || thinking, className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40", children: /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }) })
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { className: "mt-1.5 text-[10px] text-muted-foreground text-center", children: "AI may be inaccurate — verify with your legal & finance team." })
    ] }) })
  ] });
}
function DealRoomChat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((xs) => [...xs, { id: crypto.randomUUID(), author: "You", initials: "ME", role: "Founder", text, time: now, me: true }]);
    setDraft("");
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsx("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Team Chat" }),
      /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
        " Deal room team channel"
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-5 py-4 space-y-3", children: [
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped = prev && prev.author === m.author;
        return /* @__PURE__ */ jsxs("div", { className: cn("flex gap-3", m.me ? "flex-row-reverse" : ""), children: [
          /* @__PURE__ */ jsx("div", { className: cn("h-8 w-8 shrink-0", grouped && "invisible"), children: /* @__PURE__ */ jsx("div", { className: cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"), children: m.initials }) }),
          /* @__PURE__ */ jsxs("div", { className: cn("max-w-[72%]", m.me && "items-end flex flex-col"), children: [
            !grouped && /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-2 mb-1 text-[11px]", m.me && "flex-row-reverse"), children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: m.author }),
              /* @__PURE__ */ jsx("span", { className: cn(
                "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                m.role === "Investor" ? "bg-brand/10 text-brand" : m.role === "Founder" ? "bg-success/10 text-success" : "bg-violet/10 text-violet"
              ), children: m.role }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: m.time })
            ] }),
            /* @__PURE__ */ jsx("div", { className: cn(
              "rounded-2xl px-3.5 py-2 text-sm",
              m.me ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"
            ), children: m.text })
          ] })
        ] }, m.id);
      }),
      messages.length === 0 && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No messages yet. Start the team conversation." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-t border-border/60 bg-background", children: /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition", children: [
      /* @__PURE__ */ jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsx(Paperclip, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          rows: 1,
          value: draft,
          onChange: (e) => setDraft(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          },
          placeholder: t("chat.placeholder"),
          className: "flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1"
        }
      ),
      /* @__PURE__ */ jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsx(Smile, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs("button", { onClick: send, disabled: !draft.trim(), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50", children: [
        /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
        " ",
        t("chat.send")
      ] })
    ] }) })
  ] });
}
const statusMeta = {
  done: { label: "Done", icon: CheckCircle2, tint: "text-success" },
  in_progress: { label: "In progress", icon: Clock, tint: "text-brand" },
  todo: { label: "To do", icon: Circle, tint: "text-muted-foreground" },
  blocked: { label: "Blocked", icon: AlertTriangle, tint: "text-warning" }
};
const cycle = { todo: "in_progress", in_progress: "done", done: "todo", blocked: "todo" };
function DDChecklist() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => filter === "all" ? items : items.filter((i) => i.status === filter), [items, filter]);
  const byCategory = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    filtered.forEach((i) => {
      if (!m.has(i.category)) m.set(i.category, []);
      m.get(i.category).push(i);
    });
    return Array.from(m.entries());
  }, [filtered]);
  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const overall = total > 0 ? Math.round(done / total * 100) : 0;
  const cycleStatus = (id) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, status: cycle[x.status] } : x));
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: t("checklist.title") }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
          done,
          " of ",
          total,
          " items ",
          t("checklist.complete").toLowerCase(),
          " · ",
          overall,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
        " ",
        t("checklist.add")
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-3 h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${overall}%` } }) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsx(Filter, { className: "h-3.5 w-3.5 text-muted-foreground" }),
      ["all", "todo", "in_progress", "done", "blocked"].map((f) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setFilter(f),
          className: cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            filter === f ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"
          ),
          children: f === "all" ? "All" : statusMeta[f].label
        },
        f
      ))
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-5 space-y-4", children: byCategory.map(([cat, list]) => {
      const catDone = list.filter((i) => i.status === "done").length;
      return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: cat }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
            catDone,
            "/",
            list.length
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: list.map((i) => {
          const M = statusMeta[i.status];
          return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 items-center px-5 py-3 hover:bg-accent/30 gap-3", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => cycleStatus(i.id), className: cn("col-span-1", M.tint), title: M.label, children: /* @__PURE__ */ jsx(M.icon, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxs("div", { className: "col-span-6 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: cn("text-sm font-medium truncate", i.status === "done" && "text-muted-foreground line-through"), children: i.title }),
              /* @__PURE__ */ jsx("div", { className: cn("text-[11px] mt-0.5", M.tint), children: M.label })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "col-span-3 flex items-center gap-2 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0", children: i.ownerInitials }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: i.owner })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "col-span-2 text-end text-xs text-muted-foreground tabular-nums", children: i.due })
          ] }, i.id);
        }) })
      ] }, cat);
    }) })
  ] });
}
const DOCS = [
  "Pitch deck v3.pdf",
  "Financial model.xlsx",
  "Cohort analysis v2.pdf",
  "Cap table.xlsx",
  "Customer references.pdf",
  "Architecture overview.pdf"
];
const STAGES = ["Deal Sourced", "Under Review", "Partner Review", "Term Sheet", "Closed"];
const SECTION_META = [
  { key: "pitch", label: "Pitch & Narrative", checks: ["Clear problem statement", "Market size defined", "Unique value proposition", "Compelling story"] },
  { key: "financial", label: "Financial Model", checks: ["Revenue projections", "Unit economics", "Burn rate & runway", "Path to profitability"] },
  { key: "team", label: "Team", checks: ["Founder-market fit", "Technical expertise", "Domain experience", "Advisory network"] },
  { key: "meeting", label: "Meeting Notes", checks: ["Key topics covered", "Action items captured", "Follow-up scheduled", "Red flags noted"] },
  { key: "dd", label: "Due Diligence", checks: ["Legal structure", "IP ownership", "Customer references", "Financials verified"] },
  { key: "qa", label: "Q&A", checks: ["All questions answered", "No unanswered concerns", "Founder responsive", "Satisfactory responses"] }
];
const DECISION_TO_DB = {
  "Under Review": "under_review",
  "Request More Info": "info_requested",
  "Move to Partner Review": "partner_review",
  "Term Sheet Ready": "term_sheet",
  "Not Proceeding": "rejected",
  "Exit": "exited"
};
const DB_TO_DECISION = {
  under_review: "Under Review",
  info_requested: "Request More Info",
  partner_review: "Move to Partner Review",
  term_sheet: "Term Sheet Ready",
  rejected: "Not Proceeding",
  exited: "Exit"
};
function decisionTone(status) {
  if (status === "Term Sheet Ready") return "success";
  if (status === "Move to Partner Review") return "violet";
  if (status === "Request More Info") return "warning";
  if (status === "Not Proceeding" || status === "Exit") return "destructive";
  return "brand";
}
function initSections(metadata) {
  const empty = () => ({ status: "Not reviewed", rating: 0, notes: "", checks: {} });
  return {
    pitch: metadata?.["pitch_review"] ?? empty(),
    financial: metadata?.["financial_review"] ?? empty(),
    team: metadata?.["team_review"] ?? empty(),
    meeting: metadata?.["meeting_review"] ?? empty(),
    dd: metadata?.["dd_review"] ?? empty(),
    qa: metadata?.["qa_review"] ?? empty()
  };
}
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function useLatestDecision(dealRoomId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["decision", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("decisions").select("id, status, notes, metadata, created_at").eq("deal_room_id", dealRoomId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    }
  });
}
function ReviewTab({
  dealRoomId,
  currentUserRole,
  startupId
}) {
  return currentUserRole === "investor" ? /* @__PURE__ */ jsx(InvestorReview, { dealRoomId, startupId }) : /* @__PURE__ */ jsx(FounderReview, { dealRoomId });
}
function InvestorReview({ dealRoomId, startupId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: decision } = useLatestDecision(dealRoomId);
  const [sections, setSections] = useState(initSections(null));
  const [activeDoc, setActiveDoc] = useState(DOCS[0]);
  const [docNotes, setDocNotes] = useState({});
  const [reviewedDocs, setReviewedDocs] = useState({});
  const prevIdRef = useRef(void 0);
  useEffect(() => {
    if (decision === void 0) return;
    const newId = decision?.id ?? null;
    if (newId !== prevIdRef.current) {
      prevIdRef.current = newId;
      setSections(initSections(decision?.metadata));
    }
  }, [decision]);
  const completed = Object.values(sections).filter((s) => s.status === "Done").length;
  const ratings = Object.values(sections).map((s) => s.rating).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const handleChange = (key, updated) => {
    setSections((prev) => ({ ...prev, [key]: updated }));
  };
  const handleSave = async (key, updated) => {
    const newSections = { ...sections, [key]: updated };
    setSections(newSections);
    const metaPayload = {};
    for (const k of Object.keys(newSections)) {
      metaPayload[`${k}_review`] = newSections[k];
    }
    if (decision?.id) {
      await supabase.from("decisions").update({ metadata: metaPayload }).eq("id", decision.id);
    } else {
      await supabase.from("decisions").insert({
        deal_room_id: dealRoomId,
        decided_by: user.id,
        status: "under_review",
        metadata: metaPayload
      });
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };
  const handleDecision = async (type, extra) => {
    if (!user?.id) return;
    const metaPayload = {};
    for (const k of Object.keys(sections)) {
      metaPayload[`${k}_review`] = sections[k];
    }
    if (extra?.requestInfo) metaPayload["request_info"] = extra.requestInfo;
    if (extra?.reason) metaPayload["reason"] = extra.reason;
    await supabase.from("decisions").insert({
      deal_room_id: dealRoomId,
      decided_by: user.id,
      status: DECISION_TO_DB[type],
      notes: extra?.message ?? null,
      metadata: metaPayload
    });
    await logActivity(dealRoomId, user.id, `Decision: ${type}`);
    if (startupId) {
      const { data: startup } = await supabase.from("startups").select("founder_id").eq("id", startupId).maybeSingle();
      if (startup?.founder_id) {
        await createNotification(
          startup.founder_id,
          `Deal update: ${type}`,
          extra?.message ?? `An investor updated your deal status to "${type}".`,
          "decision",
          dealRoomId,
          `/app/deal-room/${dealRoomId}`
        );
      }
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };
  const currentDecisionStatus = decision?.status ? DB_TO_DECISION[decision.status] : void 0;
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-5 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Investment Review" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Complete each section before making a final decision." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground mb-1.5", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              completed,
              " of 6 sections reviewed"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              Math.round(completed / 6 * 100),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${completed / 6 * 100}%` } }) })
        ] })
      ] }),
      SECTION_META.map((meta) => /* @__PURE__ */ jsx(
        ReviewSection,
        {
          meta,
          state: sections[meta.key],
          onChange: (updated) => handleChange(meta.key, updated),
          onSave: (updated) => handleSave(meta.key, updated)
        },
        meta.key
      )),
      /* @__PURE__ */ jsx(DecisionZone, { avg, currentStatus: currentDecisionStatus, onDecision: handleDecision })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "lg:sticky lg:top-4 self-start", children: /* @__PURE__ */ jsx(
      DocumentPreview,
      {
        activeDoc,
        setActiveDoc,
        docNotes,
        setDocNotes,
        reviewedDocs,
        setReviewedDocs
      }
    ) })
  ] });
}
function ReviewSection({
  meta,
  state,
  onChange,
  onSave
}) {
  const [open, setOpen] = useState(false);
  const wordCount = state.notes.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = wordCount > 500;
  const done = state.status === "Done";
  const bump = (patch) => {
    const updated = { ...state, ...patch };
    if (updated.status === "Not reviewed") updated.status = "In review";
    onChange(updated);
  };
  return /* @__PURE__ */ jsxs("div", { className: cn("rounded-2xl border bg-card shadow-card overflow-hidden transition-colors", done ? "border-success/40" : "border-border/60"), children: [
    /* @__PURE__ */ jsxs("button", { onClick: () => setOpen((o) => !o), className: cn("w-full flex items-center gap-3 px-5 py-4 text-left", done && "bg-success/5"), children: [
      open ? /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: meta.label }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-0.5", children: [
          state.rating > 0 ? `${state.rating}/5 stars` : "Not rated",
          " · ",
          Object.values(state.checks).filter(Boolean).length,
          "/",
          meta.checks.length,
          " checks"
        ] })
      ] }),
      /* @__PURE__ */ jsx(StatusPill, { status: state.status })
    ] }),
    open && /* @__PURE__ */ jsxs("div", { className: "px-5 pb-5 space-y-4 border-t border-border/60 pt-4", children: [
      /* @__PURE__ */ jsx(StarRating, { value: state.rating, onChange: (v) => bump({ rating: v }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: state.notes,
            onChange: (e) => bump({ notes: e.target.value }),
            placeholder: `Your notes on ${meta.label.toLowerCase()}`,
            className: cn(
              "w-full min-h-[100px] rounded-[10px] border bg-background p-3 text-sm focus:outline-none focus:border-brand/50",
              overLimit ? "border-destructive/60" : "border-border/60"
            )
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: cn("text-[11px] mt-1 flex justify-end", overLimit ? "text-destructive" : "text-muted-foreground"), children: [
          wordCount,
          " / 500 words"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 gap-2", children: meta.checks.map((c) => /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm rounded-md border border-border/60 px-3 py-2 hover:bg-accent/40 cursor-pointer", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: !!state.checks[c],
            onChange: (e) => bump({ checks: { ...state.checks, [c]: e.target.checked } }),
            className: "h-4 w-4 rounded border-border accent-[hsl(var(--brand))]"
          }
        ),
        /* @__PURE__ */ jsx("span", { children: c })
      ] }, c)) }),
      meta.key === "qa" && /* @__PURE__ */ jsxs("button", { className: "text-xs inline-flex items-center gap-1 text-brand hover:underline", children: [
        /* @__PURE__ */ jsx(Download, { className: "h-3 w-3" }),
        " Download Q&A Report"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end pt-2 border-t border-border/40", children: /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => onSave({ ...state, status: "Done" }),
          disabled: overLimit,
          className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
            " Mark as reviewed"
          ]
        }
      ) })
    ] })
  ] });
}
function StatusPill({ status }) {
  const tone = status === "Done" ? "bg-success/15 text-success" : status === "In review" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";
  return /* @__PURE__ */ jsx("span", { className: cn("text-[10px] px-2 py-0.5 rounded-full font-medium", tone), children: status });
}
function StarRating({ value, onChange }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
    [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsx("button", { onClick: () => onChange(n), className: "p-0.5", children: /* @__PURE__ */ jsx(Star, { className: cn("h-5 w-5 transition-colors", n <= value ? "fill-warning text-warning" : "text-muted-foreground/40") }) }, n)),
    /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: value > 0 ? `${value}/5` : "Tap to rate" })
  ] });
}
function DecisionZone({
  avg,
  currentStatus,
  onDecision
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-6 space-y-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5 text-destructive" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Decision Zone" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Your decision will be visible to the founder immediately." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-[10px] bg-card border border-border/60 p-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Overall deal score" }),
        /* @__PURE__ */ jsxs("div", { className: "text-3xl font-semibold mt-1", children: [
          avg.toFixed(1),
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-base text-muted-foreground font-normal", children: "/ 5.0" })
        ] })
      ] }),
      currentStatus && /* @__PURE__ */ jsx("span", { className: `text-xs px-3 py-1.5 rounded-full bg-${decisionTone(currentStatus)}/15 text-${decisionTone(currentStatus)} font-medium`, children: currentStatus })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-2.5", children: [
      /* @__PURE__ */ jsx(DecisionButton, { type: "Under Review", icon: Clock, tone: "brand", label: "Under Review", sub: "Still evaluating", onDecision }),
      /* @__PURE__ */ jsx(DecisionButton, { type: "Request More Info", icon: FileQuestion, tone: "warning", label: "Request More Info", sub: "Ask the founder for specifics", onDecision }),
      /* @__PURE__ */ jsx(DecisionButton, { type: "Move to Partner Review", icon: Users, tone: "violet", label: "Move to Partner Review", sub: "Escalate to your partnership", onDecision }),
      /* @__PURE__ */ jsx(DecisionButton, { type: "Term Sheet Ready", icon: FileCheck, tone: "success", label: "Term Sheet Ready", sub: "Notify founder you're ready to proceed", onDecision }),
      /* @__PURE__ */ jsx(DecisionButton, { type: "Not Proceeding", icon: XCircle, tone: "destructive", label: "Not Proceeding", sub: "Decline with reason", onDecision }),
      /* @__PURE__ */ jsx(DecisionButton, { type: "Exit", icon: LogOut, tone: "muted-foreground", label: "Exit Deal Room", sub: "Remove your access", onDecision })
    ] })
  ] });
}
function DecisionButton({
  type,
  icon: Icon,
  tone,
  label,
  sub,
  onDecision
}) {
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("Stage too early");
  const [message, setMessage] = useState("");
  const [what, setWhat] = useState("");
  const [deadline, setDeadline] = useState("");
  const requiresForm = type === "Request More Info" || type === "Not Proceeding" || type === "Exit";
  const requiresConfirm = type === "Term Sheet Ready";
  const submit = async () => {
    setLoading(true);
    try {
      if (type === "Request More Info") {
        if (!what.trim()) return;
        await onDecision(type, { requestInfo: { what, deadline } });
      } else if (type === "Not Proceeding" || type === "Exit") {
        await onDecision(type, { reason, message });
      } else {
        await onDecision(type);
      }
      setOpenForm(false);
    } finally {
      setLoading(false);
    }
  };
  const handleClick = async () => {
    if (requiresForm || requiresConfirm) {
      setOpenForm(true);
    } else {
      setLoading(true);
      try {
        await onDecision(type);
      } finally {
        setLoading(false);
      }
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: handleClick,
        disabled: loading,
        className: cn(
          "w-full h-12 rounded-[10px] border flex items-center gap-3 px-4 text-left transition-colors disabled:opacity-60",
          `border-${tone}/40 bg-${tone}/10 hover:bg-${tone}/15 text-${tone}`
        ),
        children: [
          /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 shrink-0" }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold leading-tight", children: label }),
            /* @__PURE__ */ jsx("div", { className: "text-[11px] opacity-80", children: sub })
          ] })
        ]
      }
    ),
    openForm && /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-[10px] border border-border/60 bg-card p-4 space-y-3", children: [
      type === "Request More Info" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "What information is needed?" }),
          /* @__PURE__ */ jsx("textarea", { value: what, onChange: (e) => setWhat(e.target.value), className: "mt-1 w-full min-h-[80px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Deadline" }),
          /* @__PURE__ */ jsx("input", { type: "date", value: deadline, onChange: (e) => setDeadline(e.target.value), className: "mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] })
      ] }),
      (type === "Not Proceeding" || type === "Exit") && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Reason" }),
          /* @__PURE__ */ jsx("select", { value: reason, onChange: (e) => setReason(e.target.value), className: "mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm", children: ["Stage too early", "Outside thesis", "Team concerns", "Market concerns", "Financial concerns", "Other"].map((r) => /* @__PURE__ */ jsx("option", { children: r }, r)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Message to founder (optional)" }),
          /* @__PURE__ */ jsx("textarea", { value: message, onChange: (e) => setMessage(e.target.value), className: "mt-1 w-full min-h-[60px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] })
      ] }),
      requiresConfirm && /* @__PURE__ */ jsx("div", { className: "text-sm", children: "This will notify the founder you are ready to proceed to term sheet. Continue?" }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setOpenForm(false), className: "rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxs("button", { onClick: submit, disabled: loading, className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-60", children: [
          /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
          " ",
          requiresConfirm ? "Confirm" : "Send"
        ] })
      ] })
    ] })
  ] });
}
function DocumentPreview({
  activeDoc,
  setActiveDoc,
  docNotes,
  setDocNotes,
  reviewedDocs,
  setReviewedDocs
}) {
  const note = docNotes[activeDoc] ?? "";
  const reviewed = !!reviewedDocs[activeDoc];
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [savedAt, setSavedAt] = useState(null);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setSavedAt((/* @__PURE__ */ new Date()).toLocaleTimeString()), 800);
    return () => clearTimeout(t);
  }, [note]);
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-border/60 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsx("select", { value: activeDoc, onChange: (e) => {
          setActiveDoc(e.target.value);
          setPage(1);
        }, className: "flex-1 rounded-[10px] border border-border/60 bg-background p-2 text-sm", children: DOCS.map((d) => /* @__PURE__ */ jsx("option", { children: d }, d)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 text-xs", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground px-1", children: [
            "Page ",
            page,
            " of 12"
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => setPage((p) => Math.min(12, p + 1)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setZoom((z) => Math.max(50, z - 10)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(ZoomOut, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground px-1", children: [
            zoom,
            "%"
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => setZoom((z) => Math.min(200, z + 10)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(ZoomIn, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => window.print(), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(Printer, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("button", { className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-muted/40 p-6 grid place-items-center min-h-[420px]", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: "bg-background rounded-md shadow-elev w-full max-w-md aspect-[3/4] grid place-items-center text-center p-6",
        style: { transform: `scale(${zoom / 100})`, transformOrigin: "center" },
        children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(FileText, { className: "h-10 w-10 text-muted-foreground/50 mx-auto" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium mt-3", children: activeDoc }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
            "Page ",
            page,
            " preview"
          ] })
        ] })
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-2 border-t border-border/60", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Your notes on this document" }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: savedAt ? `Saved ${savedAt}` : "Auto-saves" })
      ] }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          value: note,
          onChange: (e) => setDocNotes({ ...docNotes, [activeDoc]: e.target.value }),
          placeholder: "Notes for this document only…",
          className: "w-full min-h-[90px] rounded-[10px] border border-border/60 bg-background p-2 text-sm focus:outline-none focus:border-brand/50"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
          note.length,
          " chars"
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: reviewed,
              onChange: (e) => setReviewedDocs({ ...reviewedDocs, [activeDoc]: e.target.checked }),
              className: "h-4 w-4 accent-[hsl(var(--brand))]"
            }
          ),
          /* @__PURE__ */ jsx("span", { children: "Mark this document as reviewed" })
        ] })
      ] })
    ] })
  ] });
}
function FounderReview({ dealRoomId }) {
  const { user } = useAuth();
  const { data: decision, isLoading } = useLatestDecision(dealRoomId);
  const dbStatus = decision?.status ?? null;
  const displayStatus = dbStatus ? DB_TO_DECISION[dbStatus] : null;
  const currentStageIndex = useMemo(() => {
    if (!dbStatus) return 1;
    if (dbStatus === "term_sheet") return 4;
    if (dbStatus === "partner_review") return 3;
    if (dbStatus === "info_requested" || dbStatus === "under_review") return 2;
    if (dbStatus === "rejected" || dbStatus === "exited") return -1;
    return 1;
  }, [dbStatus]);
  const { data: activitiesData } = useQuery({
    queryKey: ["investor-activities", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("id, action, created_at").eq("deal_room_id", dealRoomId).neq("actor_id", user.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    }
  });
  const activities = activitiesData ?? [];
  const sections = initSections(decision?.metadata);
  const decisionForCard = displayStatus ? {
    status: displayStatus,
    updatedAt: decision.created_at,
    requestInfo: decision.metadata?.["request_info"],
    reason: decision.metadata?.["reason"],
    message: decision.notes
  } : null;
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-64 rounded bg-muted/60 animate-pulse" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Deal Progress" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Track where investors are in their review process." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 overflow-x-auto pb-2", children: STAGES.map((stage, i) => {
      const done = currentStageIndex >= 0 && i < currentStageIndex;
      const current = currentStageIndex >= 0 && i === currentStageIndex;
      return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: cn(
            "h-9 w-9 rounded-full grid place-items-center text-xs font-semibold",
            done ? "bg-success/15 text-success" : current ? "bg-violet/15 text-violet ring-2 ring-violet" : "bg-muted text-muted-foreground"
          ), children: done ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }) : i + 1 }),
          /* @__PURE__ */ jsx("div", { className: cn("text-[11px] text-center w-20", current ? "text-violet font-semibold" : "text-muted-foreground"), children: stage })
        ] }),
        i < STAGES.length - 1 && /* @__PURE__ */ jsx("div", { className: cn("h-0.5 w-8", done ? "bg-success" : "bg-border") })
      ] }, stage);
    }) }) }),
    /* @__PURE__ */ jsx(DecisionStatusCard, { decision: decisionForCard }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-4", children: "Review Progress" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: SECTION_META.map((meta) => {
        const s = sections[meta.key];
        const checks = Object.values(s.checks).filter(Boolean).length;
        const total = meta.checks.length;
        const pct = s.status === "Done" ? 100 : Math.round(checks / total * 100);
        return /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: meta.label }),
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: s.status === "Done" ? "Complete ✓" : pct === 0 ? "Not started" : `${pct}% reviewed` })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: cn("h-full transition-all", s.status === "Done" ? "bg-success" : "bg-gradient-brand"), style: { width: `${pct}%` } }) })
        ] }, meta.key);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "Activity" }),
      activities.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground py-6 text-center", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5 text-muted-foreground/40 mx-auto mb-2" }),
        "Investor activity will appear here as they review your deal."
      ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-2.5", children: activities.map((a) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-brand" }),
        /* @__PURE__ */ jsx("span", { className: "flex-1", children: a.action }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: relTime(a.created_at) })
      ] }, a.id)) })
    ] })
  ] });
}
function DecisionStatusCard({ decision }) {
  if (!decision) {
    return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card border-l-4 border-l-brand", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-5 w-5 text-brand" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Awaiting investor review" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1.5", children: "No decisions yet." })
    ] });
  }
  const { status, updatedAt, requestInfo, reason, message } = decision;
  const config = {
    "Under Review": { tone: "brand", emoji: "🔍", title: "Under Review", body: /* @__PURE__ */ jsxs(Fragment, { children: [
      "Last activity: ",
      relTime(updatedAt)
    ] }) },
    "Request More Info": {
      tone: "warning",
      emoji: "⚠️",
      title: "Information Requested",
      body: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Requested:" }),
          " ",
          requestInfo?.what || "—"
        ] }),
        requestInfo?.deadline && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Deadline:" }),
          " ",
          requestInfo.deadline
        ] }),
        /* @__PURE__ */ jsx("button", { className: "mt-2 inline-flex items-center gap-1 text-warning text-xs font-medium hover:underline", children: "Upload requested documents →" })
      ] })
    },
    "Move to Partner Review": { tone: "violet", emoji: "⭐", title: "Advanced to Partner Review", body: /* @__PURE__ */ jsx(Fragment, { children: "Your deal has been escalated. This is a strong positive signal." }) },
    "Term Sheet Ready": { tone: "success", emoji: "🎉", title: "Term Sheet Ready!", body: /* @__PURE__ */ jsx(Fragment, { children: "Congratulations — the investor is ready to proceed. Check your email." }) },
    "Not Proceeding": {
      tone: "muted-foreground",
      emoji: "✕",
      title: "Not Proceeding",
      body: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Reason:" }),
          " ",
          reason || "—"
        ] }),
        message && /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
          '"',
          message,
          '"'
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs italic mt-2", children: "This is not the end. Keep going." })
      ] })
    },
    "Exit": { tone: "muted-foreground", emoji: "←", title: "Investor Exited", body: /* @__PURE__ */ jsx(Fragment, { children: reason || "Investor has left the deal room." }) }
  };
  const c = config[status];
  return /* @__PURE__ */ jsxs("div", { className: `rounded-2xl border bg-card p-6 shadow-card border-l-4 border-l-${c.tone} bg-${c.tone}/5`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xl", children: c.emoji }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: c.title })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground mt-2", children: c.body })
  ] });
}
const tabs = [{
  k: "overview",
  l: "Overview",
  i: LayoutGrid
}, {
  k: "documents",
  l: "Documents",
  i: FileText
}, {
  k: "qa",
  l: "Q&A",
  i: MessageSquare
}, {
  k: "checklist",
  l: "Checklist",
  i: ListChecks
}, {
  k: "chat",
  l: "Team chat",
  i: MessagesSquare
}, {
  k: "notes",
  l: "Notes",
  i: StickyNote
}, {
  k: "timeline",
  l: "Activity",
  i: Activity
}, {
  k: "meetings",
  l: "Meetings",
  i: Calendar
}, {
  k: "decision",
  l: "Review",
  i: Gavel
}];
function DealRoom() {
  const {
    id: dealRoomId
  } = Route.useParams();
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  const {
    user
  } = useAuth();
  useQueryClient();
  const navigate = useNavigate();
  const userName = user?.name ?? "User";
  const {
    data: room
  } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select("*, startups(company_name)").eq("id", dealRoomId).single();
      if (error) throw error;
      return data;
    }
  });
  const {
    data: memberRow
  } = useQuery({
    queryKey: ["deal-room-member", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("*").eq("deal_room_id", dealRoomId).eq("user_id", user.id).maybeSingle();
      return data;
    }
  });
  const {
    data: memberList = []
  } = useQuery({
    queryKey: ["deal-room-members", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("*, users(full_name, email, role)").eq("deal_room_id", dealRoomId);
      return data ?? [];
    }
  });
  const {
    data: qaMessages = []
  } = useQuery({
    queryKey: ["deal-room-qa", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("messages").select("*").eq("deal_room_id", dealRoomId).eq("is_qa", true).order("created_at", {
        ascending: true
      });
      return data ?? [];
    }
  });
  const {
    data: ndaAcceptance,
    isLoading: ndaLoading
  } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("nda_acceptances").select("id, accepted_at").eq("deal_room_id", dealRoomId).eq("user_id", user.id).maybeSingle();
      return data ?? null;
    }
  });
  useEffect(() => {
    if (!ndaLoading && user?.id && !ndaAcceptance) {
      navigate({
        to: "/app/deal-room/$id/nda",
        params: {
          id: dealRoomId
        }
      });
    }
  }, [ndaLoading, ndaAcceptance, user?.id, navigate, dealRoomId]);
  useEffect(() => {
    if (qaMessages.length > 0) {
      const mapped = qaMessages.map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        side: m.metadata?.side ?? "investor-to-founder",
        authorRole: m.metadata?.authorRole ?? "Investor",
        authorName: m.metadata?.authorName ?? "Unknown",
        question: m.body,
        answer: m.metadata?.answer,
        answeredAt: m.metadata?.answeredAt,
        createdAt: m.created_at,
        editedAt: m.metadata?.editedAt
      }));
      qaStore.set(() => mapped);
    }
  }, [qaMessages]);
  useEffect(() => {
    if (memberList.length > 0) {
      const mapped = memberList.map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        name: m.users?.full_name ?? "Unknown",
        email: m.users?.email ?? "",
        role: m.role,
        company: "",
        status: m.accepted_at ? "NDA Accepted" : "Invited",
        dateJoined: m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : void 0
      }));
      participantsStore.set(() => mapped);
    }
  }, [memberList]);
  const isInvestor = memberRow ? memberRow.role === "investor" || memberRow.role === "viewer" : user?.appRole === "investor";
  const isFounder = memberRow ? memberRow.role === "founder" : user?.appRole !== "investor";
  room?.startups?.company_name ? `${room.startups.company_name} — Deal Room` : "Deal Room";
  const companyName = room?.startups?.company_name ?? "Unknown Company";
  const visibleTabs = tabs.filter((t) => {
    if (isInvestor) return ["overview", "documents", "qa", "notes", "decision"].includes(t.k);
    return t.k !== "decision";
  });
  if (!user?.id || ndaLoading || !ndaAcceptance) {
    return /* @__PURE__ */ jsx("div", { className: "flex h-[calc(100vh-4rem)] items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Verifying access…" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100vh-4rem)] relative", children: [
    /* @__PURE__ */ jsxs("aside", { className: "w-[260px] border-r border-border/60 bg-sidebar flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-border/60", children: [
        /* @__PURE__ */ jsxs(Link, { to: "/app/deal-rooms", className: "text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3 w-3" }),
          " All deal rooms"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold", children: companyName[0] ?? "D" }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold truncate", children: companyName }),
            /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: isInvestor ? "Founder · Deal Room" : "Investor · Deal Room" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 inline-flex items-center gap-1.5 text-[11px] text-success", children: [
          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" }),
          " Active · NDA signed"
        ] })
      ] }),
      /* @__PURE__ */ jsx("nav", { className: "flex-1 p-2 space-y-0.5 overflow-y-auto", children: visibleTabs.map((t) => /* @__PURE__ */ jsxs("button", { onClick: () => setTab(t.k), className: `w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: [
        /* @__PURE__ */ jsx(t.i, { className: `h-4 w-4 ${tab === t.k ? "text-brand" : ""}` }),
        t.l
      ] }, t.k)) }),
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-t border-border/60 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3 inline mr-1" }),
        " Encrypted · watermarked"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-y-auto", children: [
      tab === "overview" && /* @__PURE__ */ jsxs(Fragment, { children: [
        isInvestor ? /* @__PURE__ */ jsx(InvestorOverview, { companyName }) : /* @__PURE__ */ jsx(FounderOverview, {}),
        /* @__PURE__ */ jsx(ParticipantsSection, { dealRoomId })
      ] }),
      tab === "documents" && /* @__PURE__ */ jsx(Documents, { dealRoomId }),
      tab === "chat" && /* @__PURE__ */ jsx("div", { className: "h-full", children: /* @__PURE__ */ jsx(DealRoomChat, {}) }),
      tab === "qa" && /* @__PURE__ */ jsx(QA, { dealRoomId, userId: user?.id, userName }),
      tab === "checklist" && /* @__PURE__ */ jsx(DDChecklist, {}),
      tab === "notes" && /* @__PURE__ */ jsx(Notes, { dealRoomId, userId: user?.id }),
      tab === "timeline" && /* @__PURE__ */ jsx(Timeline, { dealRoomId }),
      tab === "meetings" && /* @__PURE__ */ jsx(MeetingsTab, { dealRoomId, userId: user?.id }),
      tab === "decision" && /* @__PURE__ */ jsx(ReviewTab, { dealRoomId, currentUserRole: isFounder ? "founder" : "investor", startupId: room?.startup_id ?? "" })
    ] }),
    !aiOpen && /* @__PURE__ */ jsxs("button", { onClick: () => setAiOpen(true), className: "absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }),
      " Ask AI"
    ] }),
    aiOpen && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm", onClick: () => setAiOpen(false) }),
      /* @__PURE__ */ jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col", children: [
        /* @__PURE__ */ jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold leading-tight", children: "Deal Room AI" }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: companyName })
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => setAiOpen(false), className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsx(AIChat, { compact: true, scope: `the ${companyName} deal room`, initialAssistant: "I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything.", starters: isInvestor ? ["Summarize this deal in 3 bullets.", "What are the top 3 risks?", "How does ARR growth compare to peers?", "Draft my partner meeting memo."] : ["Summarize this deal in 3 bullets.", "What diligence items are still open?", "Draft a follow-up to the investor.", "Flag the top 3 risks."] }) })
      ] })
    ] })
  ] });
}
function FounderOverview() {
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Deal room" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-1 text-2xl font-semibold tracking-tight", children: "Active Investor Review" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-sm text-muted-foreground max-w-2xl", children: "Active diligence in progress." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
          " Invite"
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" }),
          " Send update"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Stage", "Diligence", TrendingUp, "brand"], ["Probability", "65%", Target, "success"], ["Days open", "12", Clock, "violet"], ["Open items", "4", AlertCircle, "warning"]].map(([l, v, I, c]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { children: l }),
        /* @__PURE__ */ jsx(I, { className: `h-3.5 w-3.5 text-${c}` })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-xl font-semibold", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "md:col-span-2 rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Investor activity" }),
          /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children: [["Investor opened Cohort analysis v2.pdf", "12m ago", "brand"], ["Investor viewed pitch deck (4th time)", "1h ago", "violet"], ["Investor asked a question in Q&A", "2h ago", "warning"], ["NDA signed", "yesterday", "success"]].map(([t, d, c], i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: `h-1.5 w-1.5 rounded-full bg-${c}` }),
          /* @__PURE__ */ jsx("span", { className: "flex-1", children: t }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: d })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Next steps" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-success mt-0.5" }),
            /* @__PURE__ */ jsx("span", { children: "Customer ref calls scheduled" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-warning mt-0.5" }),
            /* @__PURE__ */ jsx("span", { children: "Cap table review by Fri" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-4 w-4 text-warning mt-0.5" }),
            /* @__PURE__ */ jsx("span", { children: "Forecast model 2026" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4 text-destructive mt-0.5" }),
            /* @__PURE__ */ jsx("span", { children: "SOC2 evidence (blocked)" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function InvestorOverview({
  companyName
}) {
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Reviewing" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-1 text-2xl font-semibold tracking-tight", children: companyName }),
        /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-sm text-muted-foreground max-w-2xl", children: "Active deal room — review documents, Q&A, and checklist." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 text-success px-3 py-2 text-sm hover:bg-success/15", children: [
          /* @__PURE__ */ jsx(ThumbsUp, { className: "h-4 w-4" }),
          " Accept"
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-sm hover:bg-warning/15", children: [
          /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4" }),
          " Request info"
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm hover:bg-destructive/15", children: [
          /* @__PURE__ */ jsx(ThumbsDown, { className: "h-4 w-4" }),
          " Pass"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["ARR", "$4.2M", "+318% YoY", DollarSign, "success"], ["Customers", "12", "F500: 4", Users, "brand"], ["Net retention", "134%", "Best-in-class", TrendingUp, "violet"], ["Runway", "18mo", "post-raise", Shield, "warning"]].map(([l, v, d, I, c]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { children: l }),
        /* @__PURE__ */ jsx(I, { className: `h-3.5 w-3.5 text-${c}` })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-xl font-semibold", children: v }),
      /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: d })
    ] }, l)) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Building2, { className: "h-4 w-4 text-brand" }),
          " Round details"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-3 space-y-2.5 text-sm", children: [["Round", "Series A"], ["Target", "$8M"], ["Soft circled", "$3.2M"], ["Lead", "Open"], ["Valuation", "$48M post"], ["Close", "~6 weeks"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: l }),
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: v })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-brand/30 bg-gradient-to-br from-brand/5 to-violet/5 p-5 shadow-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-brand" }),
          " AI decision summary"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-success mt-0.5", children: "+" }),
            /* @__PURE__ */ jsx("span", { children: "Strong NRR (134%) and F500 traction (4/12 customers)." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-success mt-0.5", children: "+" }),
            /* @__PURE__ */ jsx("span", { children: "Founders with deep domain expertise — proven shippers." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-warning mt-0.5", children: "!" }),
            /* @__PURE__ */ jsx("span", { children: "Hardware GM concentration: top 3 customers = 41% ARR." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-destructive mt-0.5", children: "−" }),
            /* @__PURE__ */ jsx("span", { children: "Capex-heavy. Watch BOM trajectory before Y2." })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "mt-4 text-xs text-brand hover:underline", children: "Generate full investment memo →" })
      ] })
    ] })
  ] });
}
const sampleDocs = [{
  name: "Pitch deck v3.pdf",
  category: "Strategy"
}, {
  name: "Financial model Q4.xlsx",
  category: "Finance"
}, {
  name: "Cap table current.xlsx",
  category: "Legal"
}, {
  name: "Product roadmap 2025.pdf",
  category: "Product"
}];
function Documents({
  dealRoomId
}) {
  const queryClient = useQueryClient();
  const {
    data: docs = []
  } = useQuery({
    queryKey: ["documents", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("documents").select("*").eq("deal_room_id", dealRoomId).order("created_at", {
        ascending: false
      });
      return data ?? [];
    }
  });
  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);
  const handleDownload = async (storagePath) => {
    const {
      data
    } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Documents" }),
      /* @__PURE__ */ jsx("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Request document" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsx(Dropzone, { dealRoomId, onUploadComplete: () => queryClient.invalidateQueries({
      queryKey: ["documents", dealRoomId]
    }) }) }),
    ndaDocs.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "System generated" }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: ndaDocs.map((d) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-success/10", children: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4 text-success" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: d.name }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            "Auto-generated NDA · ",
            new Date(d.createdAt).toLocaleDateString()
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
          /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5" }),
          " Signed by all"
        ] }),
        /* @__PURE__ */ jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) })
      ] }, d.name)) })
    ] }),
    docs.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: docs.map((doc) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent", children: /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: doc.storage_path?.split("/").pop() ?? "Document" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: doc.category ?? "General" })
      ] }),
      doc.status === "ready" ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5" }),
        " Ready"
      ] }) : /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3.5 w-3.5" }),
        " Review"
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => handleDownload(doc.storage_path), className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) })
    ] }, doc.id)) }),
    docs.length === 0 && /* @__PURE__ */ jsxs("div", { className: "mt-5", children: [
      /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "Sample documents" }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: sampleDocs.map((doc) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-5 py-3 opacity-50", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent", children: /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: doc.name }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: doc.category })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3.5 w-3.5" }),
          " Review"
        ] }),
        /* @__PURE__ */ jsx("button", { disabled: true, className: "text-muted-foreground/40", children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) })
      ] }, doc.name)) })
    ] })
  ] });
}
function ParticipantsSection({
  dealRoomId
}) {
  const all = useParticipants();
  const list = all.filter((p) => p.dealRoomId === dealRoomId);
  const statusColor = (s) => s === "NDA Accepted" || s === "Active" ? "bg-success/10 text-success" : s === "Joined" ? "bg-brand/10 text-brand" : "bg-warning/10 text-warning";
  return /* @__PURE__ */ jsx("div", { className: "px-8 pb-10 max-w-5xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-4 w-4 text-brand" }),
        " Participants"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
        " Invite"
      ] })
    ] }),
    list.length === 0 ? /* @__PURE__ */ jsx("div", { className: "mt-4 text-xs text-muted-foreground", children: "No participants yet." }) : /* @__PURE__ */ jsx("div", { className: "mt-4 divide-y divide-border/60", children: list.map((p) => /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 gap-2 py-3 items-center text-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "col-span-3 flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0", children: p.name.split(" ").map((s) => s[0]).slice(0, 2).join("") }),
        /* @__PURE__ */ jsx("span", { className: "font-medium truncate", children: p.name })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "col-span-3 text-muted-foreground truncate", children: p.email }),
      /* @__PURE__ */ jsx("div", { className: "col-span-2 text-muted-foreground truncate", children: p.role }),
      /* @__PURE__ */ jsx("div", { className: "col-span-2 text-muted-foreground truncate", children: p.company || "—" }),
      /* @__PURE__ */ jsx("div", { className: "col-span-1", children: /* @__PURE__ */ jsx("span", { className: cn("text-[10px] px-2 py-0.5 rounded", statusColor(p.status)), children: p.status }) }),
      /* @__PURE__ */ jsx("div", { className: "col-span-1 text-right text-xs text-muted-foreground", children: p.dateJoined ?? "—" })
    ] }, p.id)) })
  ] }) });
}
function Notes({
  dealRoomId,
  userId
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    data: notes = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["notes", dealRoomId],
    queryFn: async () => {
      const filter = userId ? `private.eq.false,author_id.eq.${userId}` : "private.eq.false";
      const {
        data,
        error
      } = await supabase.from("notes").select("*, users(full_name)").eq("deal_room_id", dealRoomId).or(filter).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setSaving(true);
    try {
      await supabase.from("notes").insert({
        deal_room_id: dealRoomId,
        author_id: userId,
        body: body.trim(),
        private: isPrivate
      });
      await logActivity(dealRoomId, userId, "Added a note");
      queryClient.invalidateQueries({
        queryKey: ["notes", dealRoomId]
      });
      setBody("");
      setIsPrivate(false);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Notes" }),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-5 rounded-xl border border-border/60 bg-card p-4 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsx("textarea", { value: body, onChange: (e) => setBody(e.target.value), placeholder: "Write a note…", rows: 3, className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: isPrivate, onChange: (e) => setIsPrivate(e.target.checked), className: "h-4 w-4 accent-[var(--brand)]" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Private (only visible to me)" })
        ] }),
        /* @__PURE__ */ jsxs("button", { type: "submit", disabled: !body.trim() || saving, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50", children: [
          saving && /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }),
          "Save note"
        ] })
      ] })
    ] }),
    isError && /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    /* @__PURE__ */ jsx("div", { className: "mt-5 grid gap-3", children: notes.map((n) => /* @__PURE__ */ jsxs("div", { className: `rounded-xl border border-border/60 p-4 shadow-card ${n.private ? "bg-warning/5 border-warning/30" : "bg-card"}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: n.author_id === userId ? "You" : n.users?.full_name ?? "Unknown" }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: formatDistanceToNow(new Date(n.created_at), {
          addSuffix: true
        }) }),
        n.private && /* @__PURE__ */ jsx("span", { className: "ml-auto text-[10px] uppercase tracking-wider text-warning", children: "Private" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-sm", children: n.body })
    ] }, n.id)) })
  ] });
}
function Timeline({
  dealRoomId
}) {
  const {
    data: events = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["activities", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("activities").select("*, users(full_name)").eq("deal_room_id", dealRoomId).order("created_at", {
        ascending: false
      }).limit(50);
      if (error) throw error;
      return data ?? [];
    }
  });
  const dotColor = (action) => {
    const a = action?.toLowerCase() ?? "";
    if (a.includes("signed") || a.includes("nda")) return "success";
    if (a.includes("upload") || a.includes("document")) return "brand";
    if (a.includes("message") || a.includes("question")) return "violet";
    if (a.includes("invited") || a.includes("member")) return "warning";
    return "muted-foreground";
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Activity" }),
    isError && /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    !isLoading && !isError && events.length === 0 && /* @__PURE__ */ jsx("p", { className: "mt-6 text-sm text-muted-foreground", children: "No activity yet. Activity is recorded automatically as the deal room is used." }),
    events.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 relative pl-6", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-2 bottom-2 w-px bg-border" }),
      events.map((e) => /* @__PURE__ */ jsxs("div", { className: "relative pb-6 last:pb-0", children: [
        /* @__PURE__ */ jsx("div", { className: `absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-${dotColor(e.action)} ring-4 ring-background` }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: e.action }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
          e.users?.full_name ? `${e.users.full_name} · ` : "",
          formatDistanceToNow(new Date(e.created_at), {
            addSuffix: true
          })
        ] })
      ] }, e.id))
    ] })
  ] });
}
function MeetingsTab({
  dealRoomId,
  userId
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: "",
    scheduledAt: "",
    meetingLink: "",
    notes: ""
  });
  const set = (k, v) => setF((s) => ({
    ...s,
    [k]: v
  }));
  const {
    data: meetings = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["meetings", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("meetings").select("*").eq("deal_room_id", dealRoomId).order("scheduled_at", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const submit = async (e) => {
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
        created_by: userId
      });
      await logActivity(dealRoomId, userId, "Scheduled a meeting");
      queryClient.invalidateQueries({
        queryKey: ["meetings", dealRoomId]
      });
      setF({
        title: "",
        scheduledAt: "",
        meetingLink: "",
        notes: ""
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };
  const now = /* @__PURE__ */ new Date();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now);
  const past = meetings.filter((m) => new Date(m.scheduled_at) < now);
  return /* @__PURE__ */ jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Meetings" }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowForm((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
        " Schedule meeting"
      ] })
    ] }),
    showForm && /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-5 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Title *" }),
        /* @__PURE__ */ jsx("input", { required: true, value: f.title, onChange: (e) => set("title", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Date & Time *" }),
        /* @__PURE__ */ jsx("input", { type: "datetime-local", required: true, value: f.scheduledAt, onChange: (e) => set("scheduledAt", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Meeting link" }),
        /* @__PURE__ */ jsx("input", { type: "url", value: f.meetingLink, onChange: (e) => set("meetingLink", e.target.value), placeholder: "Zoom / Google Meet / Teams link", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Notes" }),
        /* @__PURE__ */ jsx("textarea", { value: f.notes, onChange: (e) => set("notes", e.target.value), rows: 2, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowForm(false), className: "rounded-md border border-border/60 px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsxs("button", { type: "submit", disabled: !f.title || !f.scheduledAt || saving, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm disabled:opacity-50", children: [
          saving && /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }),
          "Add meeting"
        ] })
      ] })
    ] }),
    isError && /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    upcoming.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Upcoming" }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-3", children: upcoming.map((m) => /* @__PURE__ */ jsx(MeetingCard, { m }, m.id)) })
    ] }),
    past.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Past" }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-3 opacity-60", children: past.map((m) => /* @__PURE__ */ jsx(MeetingCard, { m }, m.id)) })
    ] }),
    !isLoading && meetings.length === 0 && !showForm && /* @__PURE__ */ jsx("p", { className: "mt-6 text-sm text-muted-foreground", children: "No meetings scheduled yet." })
  ] });
}
function MeetingCard({
  m
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: m.title }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: format(new Date(m.scheduled_at), "EEE, d MMM · h:mm a") })
    ] }),
    m.notes && /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm text-muted-foreground", children: m.notes }),
    m.meeting_link && /* @__PURE__ */ jsxs("a", { href: m.meeting_link, target: "_blank", rel: "noopener noreferrer", className: "mt-3 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10", children: [
      /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3" }),
      " Join meeting"
    ] })
  ] });
}
function QA({
  dealRoomId,
  userId,
  userName
}) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    (async () => {
      const {
        data,
        error
      } = await supabase.from("messages").select("*, users(full_name)").eq("deal_room_id", dealRoomId).eq("private_to_org", false).order("created_at", {
        ascending: true
      });
      if (error) setLoadError(true);
      else setMsgs(data ?? []);
      setLoading(false);
    })();
  }, [dealRoomId]);
  useEffect(() => {
    const channel = supabase.channel("qa-" + dealRoomId).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: "deal_room_id=eq." + dealRoomId
    }, async (payload) => {
      const msg = payload.new;
      if (msg.private_to_org) return;
      let senderName = userName;
      if (msg.sender_id !== userId) {
        const {
          data
        } = await supabase.from("users").select("full_name").eq("id", msg.sender_id).single();
        senderName = data?.full_name ?? "Unknown";
      }
      setMsgs((xs) => xs.find((x) => x.id === msg.id) ? xs : [...xs, {
        ...msg,
        users: {
          full_name: senderName
        }
      }]);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealRoomId, userId, userName]);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [msgs]);
  const send = async () => {
    const text = input.trim();
    if (!text || !userId) return;
    setSending(true);
    const optId = crypto.randomUUID();
    setMsgs((xs) => [...xs, {
      id: optId,
      sender_id: userId,
      body: text,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      private_to_org: false,
      users: {
        full_name: userName
      },
      _opt: true
    }]);
    setInput("");
    const {
      data
    } = await supabase.from("messages").insert({
      deal_room_id: dealRoomId,
      sender_id: userId,
      body: text,
      private_to_org: false
    }).select("id").single();
    if (data?.id) {
      setMsgs((xs) => xs.map((x) => x.id === optId ? {
        ...x,
        id: data.id,
        _opt: false
      } : x));
      const {
        data: members
      } = await supabase.from("deal_room_members").select("user_id").eq("deal_room_id", dealRoomId).neq("user_id", userId);
      for (const m of members ?? []) {
        await createNotification(m.user_id, "New Q&A message", text.slice(0, 100), "message", dealRoomId, `/app/deal-room/${dealRoomId}`);
      }
    }
    setSending(false);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-8 pt-6 pb-4 border-b border-border/60 shrink-0", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Q&A Discussion" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Public deal room discussion thread." })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-8 py-4 space-y-3", children: [
      loading && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
      loadError && /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: "Could not load data. Please refresh." }),
      !loading && !loadError && msgs.length === 0 && /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No messages yet. Start the conversation." }),
      msgs.map((m, i) => {
        const isMe = m.sender_id === userId;
        const name = isMe ? userName : m.users?.full_name ?? "Unknown";
        const prev = msgs[i - 1];
        const grouped = prev && prev.sender_id === m.sender_id;
        const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("");
        return /* @__PURE__ */ jsxs("div", { className: cn("flex gap-3", isMe ? "flex-row-reverse" : ""), children: [
          /* @__PURE__ */ jsx("div", { className: cn("h-8 w-8 shrink-0", grouped && "invisible"), children: /* @__PURE__ */ jsx("div", { className: cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", isMe ? "bg-gradient-brand text-brand-foreground" : "bg-accent"), children: initials }) }),
          /* @__PURE__ */ jsxs("div", { className: cn("max-w-[72%]", isMe && "items-end flex flex-col"), children: [
            !grouped && /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-2 mb-1 text-[11px]", isMe && "flex-row-reverse"), children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium", children: name }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: format(new Date(m.created_at), "h:mm a") })
            ] }),
            /* @__PURE__ */ jsx("div", { className: cn("rounded-2xl px-3.5 py-2 text-sm", isMe ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"), children: m.body })
          ] })
        ] }, m.id);
      })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "px-8 py-4 border-t border-border/60 bg-background shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition", children: [
      /* @__PURE__ */ jsx("textarea", { rows: 1, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }, placeholder: "Ask a question or leave a comment…", className: "flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1" }),
      /* @__PURE__ */ jsxs("button", { onClick: send, disabled: !input.trim() || !userId || sending, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50", children: [
        sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
        "Send"
      ] })
    ] }) })
  ] });
}
export {
  DealRoom as component
};
