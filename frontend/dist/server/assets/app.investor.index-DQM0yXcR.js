import { r as reactExports, U as jsxRuntimeExports, $ as createServerFn } from "./worker-entry-4qtpAlX3.js";
import { u as useQuery } from "./useQuery-DpzAgrXP.js";
import { u as useAuth, s as supabase } from "./router-DliDWiY8.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { C as CircleCheck } from "./circle-check-DyneNPE7.js";
import { c as createLucideIcon } from "./createLucideIcon-amrEyyxI.js";
import { C as Clock } from "./clock-BBI7bQC-.js";
import { C as CircleAlert } from "./circle-alert-BI46EZKb.js";
import { A as ArrowRight } from "./arrow-right-BoBYgBgI.js";
import { B as Brain } from "./brain-CqyGjta7.js";
import { X } from "./x-BlXb_k0x.js";
import { T as TriangleAlert } from "./triangle-alert-WS6THD8c.js";
import { S as Shield } from "./shield-BRGhSbl-.js";
import { c as createSsrRpc } from "./createSsrRpc-Zi8Ta5UA.js";
import { P as Plus } from "./plus-BBLhLYXs.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
];
const Info = createLucideIcon("info", __iconNode);
const tone = {
  urgent: { border: "border-l-destructive", icon: CircleAlert, color: "text-destructive" },
  soon: { border: "border-l-warning", icon: Clock, color: "text-warning" },
  info: { border: "border-l-brand", icon: Info, color: "text-brand" }
};
function AttentionStrip({ items, onAct }) {
  const [dismissed, setDismissed] = reactExports.useState([]);
  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-success/30 bg-success/5 px-5 py-4 flex items-center gap-3 text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-5 w-5 text-success" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-success", children: "You're all caught up ✓" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x", children: visible.map((item) => {
    const t = tone[item.level];
    const Icon = item.icon ?? t.icon;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cn(
          "snap-start min-w-[300px] max-w-[340px] rounded-2xl border border-border/60 bg-card shadow-card p-4 border-l-4 flex flex-col gap-3",
          t.border
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: cn("h-4 w-4 mt-0.5 shrink-0", t.color) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm leading-snug", children: item.title })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-auto flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                onAct?.(item.id);
                setDismissed((d) => [...d, item.id]);
              },
              className: "inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline",
              children: [
                "Act now ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3 w-3" })
              ]
            }
          ) })
        ]
      },
      item.id
    );
  }) });
}
function AIBriefPanel({ data, onClose, onOpenDealRoom }) {
  if (!data) return null;
  const score = data.thesisMatch;
  const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const scoreBg = score >= 80 ? "bg-success/10" : score >= 60 ? "bg-warning/10" : "bg-destructive/10";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-background border-l border-border/60 shadow-elev flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60 flex items-start gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "AI Brief" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground truncate", children: [
            data.company,
            data.tagline ? ` · ${data.tagline}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto p-5 space-y-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("rounded-2xl p-4 flex items-center gap-4", scoreBg), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-3xl font-semibold tabular-nums", scoreColor), children: score }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Thesis match score" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs mt-0.5", children: score >= 80 ? "Strong fit with your thesis." : score >= 60 ? "Partial fit — worth a closer look." : "Limited fit with your current thesis." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { icon: CircleCheck, title: "Strengths", tone: "text-success", items: data.strengths }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { icon: TriangleAlert, title: "Risks", tone: "text-destructive", items: data.risks }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { icon: Shield, title: "Mitigants", tone: "text-brand", items: data.mitigants }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-accent/30 p-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Suggested next action" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm", children: data.nextAction })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: onOpenDealRoom, className: "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm shadow-glow", children: [
        "Open full deal room ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) })
    ] })
  ] });
}
function Section({ icon: Icon, title, tone: tone2, items }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold mb-2", tone2), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5" }),
      " ",
      title
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-1.5", children: items.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-sm flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("mt-2 h-1 w-1 rounded-full shrink-0", tone2.replace("text-", "bg-")) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: s })
    ] }, i)) })
  ] });
}
const generateDealBrief = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("56f68b50d6d653ae4f4287eb005bbb35fecea7fa7ce69a4b2a6cc974383a502e"));
const KANBAN_STAGES = ["Sourced", "Diligence", "Info Req.", "Partner", "Term Sheet", "Pass"];
const DB_STATUS_TO_STAGE = {
  under_review: "Diligence",
  info_requested: "Info Req.",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Pass",
  exited: "Pass"
};
function InvestorPipeline() {
  const {
    user
  } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = reactExports.useState(null);
  const {
    data: memberData
  } = useQuery({
    queryKey: ["my-room-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("deal_room_id").eq("user_id", user.id);
      return data ?? [];
    }
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];
  const {
    data: roomsData = []
  } = useQuery({
    queryKey: ["investor-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_rooms").select("id, created_at, startup_id, startups(company_name, sector, stage, funding_target)").in("id", roomIds);
      return data ?? [];
    }
  });
  const {
    data: decisionsData = []
  } = useQuery({
    queryKey: ["investor-decisions", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("decisions").select("deal_room_id, status, created_at").in("deal_room_id", roomIds).order("created_at", {
        ascending: false
      });
      return data ?? [];
    }
  });
  const latestStatus = {};
  for (const d of decisionsData) {
    if (!(d.deal_room_id in latestStatus)) latestStatus[d.deal_room_id] = d.status;
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString();
  const {
    data: recentActivity = []
  } = useQuery({
    queryKey: ["founder-activity", roomIds.join(","), user?.id],
    enabled: roomIds.length > 0 && !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("activities").select("id, action, deal_room_id, created_at").in("deal_room_id", roomIds).neq("actor_id", user.id).gt("created_at", threeDaysAgo).order("created_at", {
        ascending: false
      }).limit(5);
      return data ?? [];
    }
  });
  const attentionItems = [];
  for (const room of roomsData) {
    const status = latestStatus[room.id] ?? null;
    const isEarlyStage = !status || status === "under_review";
    if (isEarlyStage && room.created_at < sevenDaysAgo) {
      const name = room.startups?.company_name ?? "Deal";
      attentionItems.push({
        id: `overdue-${room.id}`,
        level: "urgent",
        title: `${name}: no decision update in 7+ days`,
        href: `/app/deal-room/${room.id}`
      });
    }
  }
  for (const act of recentActivity.slice(0, 3)) {
    attentionItems.push({
      id: `act-${act.id}`,
      level: "info",
      title: `Founder activity: ${act.action}`,
      href: `/app/deal-room/${act.deal_room_id}`
    });
  }
  const selectedRoom = roomsData.find((r) => r.id === selectedRoomId);
  const {
    data: briefResult,
    isLoading: briefLoading
  } = useQuery({
    queryKey: ["ai-brief", selectedRoomId, user?.id],
    enabled: !!selectedRoomId && !!user?.id,
    staleTime: 30 * 60 * 1e3,
    queryFn: async () => {
      return generateDealBrief({
        data: {
          dealRoomId: selectedRoomId,
          userId: user.id
        }
      });
    }
  });
  const realCards = roomsData.map((room) => {
    const startup = room.startups;
    const status = latestStatus[room.id] ?? null;
    return {
      id: room.id,
      stage: DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced",
      n: startup?.company_name ?? "Unnamed deal",
      s: [startup?.stage, startup?.sector].filter(Boolean).join(" · ") || "—",
      check: startup?.funding_target ? `$${startup.funding_target}` : "—",
      score: 0
    };
  });
  const useReal = realCards.length > 0;
  const cards = useReal ? realCards : MOCK_CARDS;
  const aiBriefData = selectedRoomId && briefResult ? {
    company: selectedRoom?.startups?.company_name ?? "Deal",
    thesisMatch: briefResult.matchScore,
    strengths: briefResult.strengths,
    risks: briefResult.risks,
    mitigants: briefResult.mitigants,
    nextAction: briefResult.nextAction,
    dealRoomId: selectedRoomId
  } : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4 mb-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Pipeline" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: useReal ? `${roomIds.length} active deal room${roomIds.length !== 1 ? "s" : ""}` : "128 sourced · 12 in active diligence · 4 decisions this week" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Source deal"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AttentionStrip, { items: attentionItems }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "-mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 min-w-max", children: KANBAN_STAGES.map((stage) => {
      const stageCards = cards.filter((c) => c.stage === stage);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[300px] flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 mb-2.5 flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-medium", children: [
          stage,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: stageCards.length })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]", children: stageCards.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => c.id ? setSelectedRoomId(c.id) : void 0, className: "w-full text-left rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: c.n }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: c.s })
            ] }),
            c.score > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-[11px] font-mono tabular-nums rounded-md px-1.5 py-0.5 ${c.score >= 85 ? "bg-success/15 text-success" : c.score >= 70 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`, children: c.score })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Ask" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: c.check })
          ] })
        ] }, c.id ?? c.n)) })
      ] }, stage);
    }) }) }),
    briefLoading && selectedRoomId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl bg-card p-8 shadow-elev text-sm text-muted-foreground animate-pulse", children: "Generating AI brief…" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AIBriefPanel, { data: aiBriefData, onClose: () => setSelectedRoomId(null), onOpenDealRoom: () => {
      if (selectedRoomId) window.location.href = `/app/deal-room/${selectedRoomId}`;
    } })
  ] });
}
const MOCK_CARDS = [{
  id: null,
  stage: "Sourced",
  n: "Atlas Robotics",
  s: "Series A · Robotics",
  check: "$5M",
  score: 87
}, {
  id: null,
  stage: "Sourced",
  n: "Lumen AI",
  s: "Seed · Dev tools",
  check: "$2M",
  score: 76
}, {
  id: null,
  stage: "Diligence",
  n: "Helix Bio",
  s: "Series A · Biotech",
  check: "$8M",
  score: 91
}, {
  id: null,
  stage: "Diligence",
  n: "Northwind",
  s: "Seed · Climate",
  check: "$1.5M",
  score: 68
}, {
  id: null,
  stage: "Partner",
  n: "Quanta Labs",
  s: "Series A · AI",
  check: "$10M",
  score: 94
}, {
  id: null,
  stage: "Info Req.",
  n: "Forge",
  s: "Seed · Fintech",
  check: "$3M",
  score: 72
}, {
  id: null,
  stage: "Term Sheet",
  n: "Vertex",
  s: "Series B · SaaS",
  check: "$15M",
  score: 89
}, {
  id: null,
  stage: "Pass",
  n: "Pulse",
  s: "Seed · Consumer",
  check: "—",
  score: 42
}];
export {
  InvestorPipeline as component
};
