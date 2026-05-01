import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { c as useI18n, L as Link } from "./router-BGpvLWsf.js";
import { A as AIChat } from "./AIChat-DPAPE_DP.js";
import { f as dealRoomChat, g as dealRoomMembers, a as ddChecklist } from "./mock-UGcEIF7y.js";
import { a as cn } from "./utils-BYfsx3cX.js";
import { U as Users } from "./users-D4EiXx1L.js";
import { c as createLucideIcon } from "./createLucideIcon-3NIsAiHL.js";
import { S as Send } from "./backend-DBVD7Jg1.js";
import { P as Plus } from "./plus-BQ1Om6Fn.js";
import { F as Funnel } from "./funnel-Ds56QBR_.js";
import { T as TriangleAlert } from "./triangle-alert-DQs0Aakr.js";
import { C as Circle } from "./circle-CIlDWJ0Z.js";
import { C as Clock } from "./clock-DFBy3ftC.js";
import { C as CircleCheck } from "./circle-check-CZw26OL2.js";
import { D as Dropzone } from "./Dropzone-BRJUO67O.js";
import { L as LayoutGrid } from "./layout-grid-DdF8o8R7.js";
import { F as FileText } from "./file-text-D9XXuUkz.js";
import { M as MessageSquare } from "./message-square-B3FYF4Hj.js";
import { L as ListChecks } from "./list-checks-1Ejb0VFu.js";
import { A as Activity } from "./activity-CG4Faa3o.js";
import { C as Calendar } from "./calendar-CONuaO2E.js";
import { L as Lock } from "./lock-DLWe3QQr.js";
import { S as Sparkles } from "./sparkles-D9nEshzh.js";
import { X } from "./x-BIY2iyG1.js";
import { D as Download } from "./download-DbFsf-9O.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./user-b_Q8iwAJ.js";
import "./loader-circle-D99H4vV_.js";
import "./upload-Cq9av_Er.js";
const __iconNode$5 = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$5);
const __iconNode$4 = [
  ["path", { d: "m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381", key: "pgg06f" }],
  ["path", { d: "m16 16 6-6", key: "vzrcl6" }],
  ["path", { d: "m21.5 10.5-8-8", key: "a17d9x" }],
  ["path", { d: "m8 8 6-6", key: "18bi4p" }],
  ["path", { d: "m8.5 7.5 8 8", key: "1oyaui" }]
];
const Gavel = createLucideIcon("gavel", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    {
      d: "M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
      key: "1n2ejm"
    }
  ],
  [
    "path",
    {
      d: "M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",
      key: "1qfcsi"
    }
  ]
];
const MessagesSquare = createLucideIcon("messages-square", __iconNode$3);
const __iconNode$2 = [
  [
    "path",
    {
      d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
      key: "1miecu"
    }
  ]
];
const Paperclip = createLucideIcon("paperclip", __iconNode$2);
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2", key: "1y1vjs" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9", key: "yxxnd0" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9", key: "1p4y9e" }]
];
const Smile = createLucideIcon("smile", __iconNode$1);
const __iconNode = [
  [
    "path",
    {
      d: "M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z",
      key: "1dfntj"
    }
  ],
  ["path", { d: "M15 3v5a1 1 0 0 0 1 1h5", key: "6s6qgf" }]
];
const StickyNote = createLucideIcon("sticky-note", __iconNode);
function DealRoomChat() {
  const { t } = useI18n();
  const [messages, setMessages] = reactExports.useState(dealRoomChat);
  const [draft, setDraft] = reactExports.useState("");
  const [typing, setTyping] = reactExports.useState(false);
  const scrollRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((xs) => [...xs, { id: crypto.randomUUID(), author: "Jordan Reeves", initials: "JR", role: "Founder", text, time: now, me: true }]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((xs) => [...xs, {
        id: crypto.randomUUID(),
        author: "Sara Khan",
        initials: "SK",
        role: "Investor",
        text: "Got it — let me sync with the partnership and circle back today.",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      }]);
    }, 1800);
  };
  const onlineCount = dealRoomMembers.filter((m) => m.online).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex -space-x-2", children: dealRoomMembers.slice(0, 4).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-[10px] font-semibold ring-2 ring-card", children: m.initials }),
        m.online && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-card" })
      ] }, m.name)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Atlas × NEA — Deal Chat" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-3 w-3" }),
          " ",
          dealRoomMembers.length,
          " members · ",
          onlineCount,
          " ",
          t("chat.online")
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-5 py-4 space-y-3", children: [
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped = prev && prev.author === m.author;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex gap-3", m.me ? "flex-row-reverse" : ""), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-8 w-8 shrink-0", grouped && "invisible"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"), children: m.initials }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("max-w-[72%]", m.me && "items-end flex flex-col"), children: [
            !grouped && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex items-center gap-2 mb-1 text-[11px]", m.me && "flex-row-reverse"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: m.author }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
                "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                m.role === "Investor" ? "bg-brand/10 text-brand" : m.role === "Founder" ? "bg-success/10 text-success" : "bg-violet/10 text-violet"
              ), children: m.role }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: m.time })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
              "rounded-2xl px-3.5 py-2 text-sm",
              m.me ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"
            ), children: m.text })
          ] })
        ] }, m.id);
      }),
      typing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent text-[10px] font-semibold", children: "SK" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl bg-accent px-4 py-3 inline-flex gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow", style: { animationDelay: "0.15s" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow", style: { animationDelay: "0.3s" } })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 border-t border-border/60 bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Smile, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: send, disabled: !draft.trim(), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }),
        " ",
        t("chat.send")
      ] })
    ] }) })
  ] });
}
const statusMeta = {
  done: { label: "Done", icon: CircleCheck, tint: "text-success" },
  in_progress: { label: "In progress", icon: Clock, tint: "text-brand" },
  todo: { label: "To do", icon: Circle, tint: "text-muted-foreground" },
  blocked: { label: "Blocked", icon: TriangleAlert, tint: "text-warning" }
};
const cycle = { todo: "in_progress", in_progress: "done", done: "todo", blocked: "todo" };
function DDChecklist() {
  const { t } = useI18n();
  const [items, setItems] = reactExports.useState(ddChecklist);
  const [filter, setFilter] = reactExports.useState("all");
  const filtered = reactExports.useMemo(() => filter === "all" ? items : items.filter((i) => i.status === filter), [items, filter]);
  const byCategory = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    filtered.forEach((i) => {
      if (!m.has(i.category)) m.set(i.category, []);
      m.get(i.category).push(i);
    });
    return Array.from(m.entries());
  }, [filtered]);
  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const overall = Math.round(done / total * 100);
  const cycleStatus = (id) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, status: cycle[x.status] } : x));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: t("checklist.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " ",
        t("checklist.add")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${overall}%` } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-3.5 w-3.5 text-muted-foreground" }),
      ["all", "todo", "in_progress", "done", "blocked"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-4", children: byCategory.map(([cat, list]) => {
      const catDone = list.filter((i) => i.status === "done").length;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: cat }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
            catDone,
            "/",
            list.length
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: list.map((i) => {
          const M = statusMeta[i.status];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 items-center px-5 py-3 hover:bg-accent/30 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => cycleStatus(i.id), className: cn("col-span-1", M.tint), title: M.label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(M.icon, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-6 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-sm font-medium truncate", i.status === "done" && "text-muted-foreground line-through"), children: i.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-[11px] mt-0.5", M.tint), children: M.label })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-3 flex items-center gap-2 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0", children: i.ownerInitials }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: i.owner })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-end text-xs text-muted-foreground tabular-nums", children: i.due })
          ] }, i.id);
        }) })
      ] }, cat);
    }) })
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
  k: "chat",
  l: "Team chat",
  i: MessagesSquare
}, {
  k: "qa",
  l: "Q&A",
  i: MessageSquare
}, {
  k: "checklist",
  l: "Checklist",
  i: ListChecks
}, {
  k: "notes",
  l: "Notes",
  i: StickyNote
}, {
  k: "timeline",
  l: "Timeline",
  i: Activity
}, {
  k: "meetings",
  l: "Meetings",
  i: Calendar
}, {
  k: "decision",
  l: "Decision",
  i: Gavel
}];
function DealRoom() {
  const [tab, setTab] = reactExports.useState("overview");
  const [aiOpen, setAiOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[calc(100vh-4rem)] relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-[260px] border-r border-border/60 bg-sidebar flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/deal-rooms", className: "text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3 w-3" }),
          " All deal rooms"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold", children: "A" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold truncate", children: "Atlas Robotics" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: "NEA · Series A" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 inline-flex items-center gap-1.5 text-[11px] text-success", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" }),
          " Active · NDA signed"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 p-2 space-y-0.5 overflow-y-auto", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.k), className: `w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(t.i, { className: `h-4 w-4 ${tab === t.k ? "text-brand" : ""}` }),
        t.l
      ] }, t.k)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-border/60 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3 inline mr-1" }),
        " Encrypted · watermarked"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 overflow-y-auto", children: [
      tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsx(Overview, {}),
      tab === "documents" && /* @__PURE__ */ jsxRuntimeExports.jsx(Documents, {}),
      tab === "chat" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DealRoomChat, {}) }),
      tab === "qa" && /* @__PURE__ */ jsxRuntimeExports.jsx(QA, {}),
      tab === "checklist" && /* @__PURE__ */ jsxRuntimeExports.jsx(DDChecklist, {}),
      tab === "notes" && /* @__PURE__ */ jsxRuntimeExports.jsx(Notes, {}),
      tab === "timeline" && /* @__PURE__ */ jsxRuntimeExports.jsx(Timeline, {}),
      tab === "meetings" && /* @__PURE__ */ jsxRuntimeExports.jsx(MeetingsTab, {}),
      tab === "decision" && /* @__PURE__ */ jsxRuntimeExports.jsx(Decision, {})
    ] }),
    !aiOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setAiOpen(true), className: "absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }),
      " Ask AI"
    ] }),
    aiOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm", onClick: () => setAiOpen(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold leading-tight", children: "Deal Room AI" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: "Atlas Robotics" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setAiOpen(false), className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AIChat, { compact: true, scope: "the Atlas Robotics deal room", initialAssistant: "I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything.", starters: ["Summarize this deal in 3 bullets.", "What diligence items are still open?", "Draft a follow-up to Sara Khan.", "Flag the top 3 risks."] }) })
      ] })
    ] })
  ] });
}
function Overview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Atlas Robotics" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-2xl", children: "Industrial robots that learn from one demonstration. Replacing fixed-function automation across F500 manufacturing." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["ARR", "$4.2M", "+318%"], ["Customers", "12", "F500: 4"], ["Burn", "$280K", "/mo"], ["Runway", "18mo", "post-raise"]].map(([l, v, d]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xl font-semibold", children: v }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: d })
    ] }, l)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Founders" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-3", children: [["Jordan Reeves", "CEO · ex-Tesla Autopilot"], ["Mei Tan", "CTO · ex-Google Brain"], ["Sam Cole", "CPO · ex-Stripe"]].map(([n, r]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold", children: n.split(" ").map((s) => s[0]).join("") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: n }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: r })
          ] })
        ] }, n)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Round details" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-2.5 text-sm", children: [["Round", "Series A"], ["Target", "$8M"], ["Soft circled", "$3.2M"], ["Lead", "Open"], ["Valuation", "$48M post"], ["Close", "~6 weeks"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: v })
        ] }, l)) })
      ] })
    ] })
  ] });
}
function Documents() {
  const items = [["Pitch deck v3.pdf", "Pitch", "ok"], ["Financial model.xlsx", "Financials", "ok"], ["Cohort analysis v2.pdf", "Financials", "ok"], ["Cap table.xlsx", "Legal", "review"], ["Customer references.pdf", "Market", "ok"], ["Architecture overview.pdf", "Technical", "ok"]];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Documents" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Request document" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Dropzone, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: items.map(([n, c, st]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: n }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: c })
      ] }),
      st === "ok" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }),
        " Ready"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }),
        " Review"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) })
    ] }, n)) })
  ] });
}
function QA() {
  const msgs = [{
    me: false,
    w: "Sara Khan",
    t: "Can you walk through your retention curve at the cohort level?"
  }, {
    me: true,
    w: "Jordan",
    t: "Yes — gross retention is 96% over 24 months. Net is 134% driven by SaaS attach. Cohort doc just dropped under Financials."
  }, {
    me: false,
    w: "Sara Khan",
    t: "Great. What's the largest customer concentration risk?"
  }, {
    me: true,
    w: "Jordan",
    t: "Top customer is 18% of ARR; top 3 are 41%. Diversification target is <30% top-1 by year-end."
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Q&A" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "12 questions · 8 answered" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-3", children: msgs.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 ${m.me ? "flex-row-reverse" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold shrink-0 ${m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`, children: m.w.split(" ").map((s) => s[0]).join("") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `max-w-[75%] rounded-2xl px-4 py-2.5 ${m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-[11px] mb-0.5 ${m.me ? "text-brand-foreground/70" : "text-muted-foreground"}`, children: m.w }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: m.t })
      ] })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { placeholder: "Ask a question…", className: "flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md bg-gradient-brand text-brand-foreground px-4 text-sm", children: "Send" })
    ] })
  ] });
}
function Notes() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Note"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid gap-3", children: [{
      p: false,
      w: "Sara Khan",
      d: "2h ago",
      t: "Strong technical team. Concerned about hardware capex — need to dig into BOM and gross margin trajectory."
    }, {
      p: true,
      w: "Private · me",
      d: "yesterday",
      t: "Lead is between us and Bessemer. We move fast or we lose it."
    }, {
      p: false,
      w: "Mark Lin (partner)",
      d: "2d ago",
      t: "Like the founder. Want to see Q4 cohort before partner meeting."
    }].map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border border-border/60 p-4 shadow-card ${n.p ? "bg-warning/5 border-warning/30" : "bg-card"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: n.w }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: n.d }),
        n.p && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] uppercase tracking-wider text-warning", children: "Private" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-sm", children: n.t })
    ] }, i)) })
  ] });
}
function Timeline() {
  const events = [["NDA signed by Sara Khan", "2m ago", "success"], ["Cohort analysis v2 uploaded", "1h ago", "brand"], ["Q&A: 'retention curve' answered", "3h ago", "violet"], ["Partner meeting scheduled — Wed 1PM", "1d ago", "warning"], ["Deal room opened by Jordan", "3d ago", "muted-foreground"]];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Timeline" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 relative pl-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 bottom-2 w-px bg-border" }),
      events.map(([t, d, c], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative pb-6 last:pb-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-${c} ring-4 ring-background` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: t }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
          " ",
          d
        ] })
      ] }, i))
    ] })
  ] });
}
function MeetingsTab() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Meetings" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-3", children: [{
      d: "Wed · 1:00 PM",
      w: "Partner meeting · NEA",
      n: "Discuss Q4 cohort, term sheet shape"
    }, {
      d: "Mon · 10:00 AM",
      w: "Tech deep-dive",
      n: "Architecture walkthrough with NEA tech advisor"
    }].map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: m.w }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: m.d })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm text-muted-foreground", children: m.n })
    ] }, i)) })
  ] });
}
function Decision() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Decision" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Set status, risk level, and partner notes." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Status" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid grid-cols-3 gap-2", children: [["Accept", "success", true], ["Hold", "warning", false], ["Pass", "destructive", false]].map(([l, c, sel]) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${sel ? `border-${c} bg-${c}/10 text-${c}` : "border-border/60 hover:bg-accent"}`, children: l }, l)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Risk level" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 flex gap-2", children: ["Low", "Medium", "High"].map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `flex-1 rounded-md border px-3 py-2 text-sm ${i === 0 ? "border-success bg-success/10 text-success" : "border-border/60 hover:bg-accent"}`, children: r }, r)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { defaultValue: "Strong founding team with deep domain expertise. Lead Series A at $48M post, $5M check. Conditional on completing Q4 cohort review and finalizing customer references.", className: "mt-3 w-full min-h-[120px] rounded-md border border-border/60 bg-background p-3 text-sm focus:outline-none focus:border-brand/50" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent", children: "Save draft" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow", children: "Submit decision" })
      ] })
    ] })
  ] });
}
export {
  DealRoom as component
};
