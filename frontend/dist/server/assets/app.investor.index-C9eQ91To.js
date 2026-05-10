import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Info, Clock, AlertCircle, ArrowRight, Inbox, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-DvYvv7LG.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { A as AIBriefPanel } from "./AIBriefPanel-DAEtmxrb.js";
import { c as createSsrRpc } from "./createSsrRpc-l1y8KE69.js";
import { c as createServerFn } from "../server.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const tone = {
  urgent: { border: "border-l-destructive", icon: AlertCircle, color: "text-destructive" },
  soon: { border: "border-l-warning", icon: Clock, color: "text-warning" },
  info: { border: "border-l-brand", icon: Info, color: "text-brand" }
};
function AttentionStrip({ items, onAct }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = items.filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-success/30 bg-success/5 px-5 py-4 flex items-center gap-3 text-sm", children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "h-5 w-5 text-success" }),
      /* @__PURE__ */ jsx("span", { className: "font-medium text-success", children: "You're all caught up ✓" })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x", children: visible.map((item) => {
    const t = tone[item.level];
    const Icon = item.icon ?? t.icon;
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: cn(
          "snap-start min-w-[300px] max-w-[340px] rounded-2xl border border-border/60 bg-card shadow-card p-4 border-l-4 flex flex-col gap-3",
          t.border
        ),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2.5", children: [
            /* @__PURE__ */ jsx(Icon, { className: cn("h-4 w-4 mt-0.5 shrink-0", t.color) }),
            /* @__PURE__ */ jsx("div", { className: "text-sm leading-snug", children: item.title })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-auto flex justify-end", children: /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                onAct?.(item.id);
                setDismissed((d) => [...d, item.id]);
              },
              className: "inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline",
              children: [
                "Act now ",
                /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
              ]
            }
          ) })
        ]
      },
      item.id
    );
  }) });
}
const generateDealBrief = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("56f68b50d6d653ae4f4287eb005bbb35fecea7fa7ce69a4b2a6cc974383a502e"));
const STAGES = ["Sourced", "Reviewing", "Diligence", "Partner", "Term Sheet", "Closed"];
const DB_STATUS_TO_STAGE = {
  under_review: "Reviewing",
  info_requested: "Diligence",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Closed",
  exited: "Closed"
};
function InvestorDashboard() {
  const {
    user
  } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString(void 0, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const greet = (() => {
    const h = (/* @__PURE__ */ new Date()).getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
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
      } = await supabase.from("deal_rooms").select("id, created_at, updated_at, startup_id, startups(company_name, sector, stage, funding_target)").in("id", roomIds);
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
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3).toISOString();
  const {
    data: recentActivity = []
  } = useQuery({
    queryKey: ["founder-activity", roomIds.join(","), user?.id],
    enabled: roomIds.length > 0 && !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("activities").select("id, action, deal_room_id, created_at, actor_id").in("deal_room_id", roomIds).neq("actor_id", user.id).gt("created_at", threeDaysAgo).order("created_at", {
        ascending: false
      }).limit(10);
      return data ?? [];
    }
  });
  const latestStatus = {};
  for (const d of decisionsData) {
    if (!(d.deal_room_id in latestStatus)) latestStatus[d.deal_room_id] = d.status;
  }
  const stageCounts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const room of roomsData) {
    const status = latestStatus[room.id] ?? null;
    const stage = DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced";
    if (stage in stageCounts) stageCounts[stage]++;
  }
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString();
  const now = /* @__PURE__ */ new Date();
  const decisionsThisMonth = decisionsData.filter((d) => {
    if (!d.created_at) return false;
    const dt = new Date(d.created_at);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const inDiligence = roomsData.filter((r) => {
    const s = latestStatus[r.id] ?? null;
    return DB_STATUS_TO_STAGE[s ?? ""] === "Diligence";
  }).length;
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
    queryFn: async () => generateDealBrief({
      data: {
        dealRoomId: selectedRoomId,
        userId: user.id
      }
    })
  });
  const aiBriefData = selectedRoomId && briefResult ? {
    company: selectedRoom?.startups?.company_name ?? "Deal",
    thesisMatch: briefResult.matchScore,
    strengths: briefResult.strengths,
    risks: briefResult.risks,
    mitigants: briefResult.mitigants,
    nextAction: briefResult.nextAction,
    dealRoomId: selectedRoomId
  } : null;
  const [insights] = useState(["Connect your inbox to start sourcing deals automatically.", "Invite your partner to collaborate on diligence.", "Set your investment thesis to enable AI scoring."]);
  const activityFeed = recentActivity.map((act) => {
    const room = roomsData.find((r) => r.id === act.deal_room_id);
    return {
      id: act.id,
      company: room?.startups?.company_name ?? "Deal",
      action: act.action,
      time: new Date(act.created_at).toLocaleDateString()
    };
  });
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-semibold tracking-tight", children: [
          greet,
          ", ",
          user?.fullName?.split(" ")[0] ?? "there"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: today })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "How it works" })
    ] }),
    /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "Today's attention" }),
      /* @__PURE__ */ jsx(AttentionStrip, { items: attentionItems })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [{
      l: "Active deals",
      v: `${roomIds.length}`,
      s: roomIds.length !== 1 ? "deal rooms" : "deal room"
    }, {
      l: "In diligence",
      v: `${inDiligence}`,
      s: "—"
    }, {
      l: "Decisions this month",
      v: `${decisionsThisMonth}`,
      s: "—"
    }, {
      l: "Avg deal score",
      v: "—",
      s: "—"
    }].map((k) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: k.l }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: k.v }),
      /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: k.s })
    ] }, k.l)) }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "px-5 py-3 border-b border-border/60 text-sm font-semibold", children: "Deal flow by stage" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-border/60", children: STAGES.map((s) => /* @__PURE__ */ jsxs(Link, { to: "/app/investor/deal-flow", className: "px-4 py-4 hover:bg-accent/40 transition-colors", children: [
        /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground", children: s }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-lg font-semibold tabular-nums", children: stageCounts[s] ?? 0 })
      ] }, s)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-[1fr_400px] gap-5", children: [
      /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "px-5 py-3 border-b border-border/60 text-sm font-semibold", children: "Recent activity" }),
        activityFeed.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "p-10 text-center text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Inbox, { className: "mx-auto h-8 w-8 opacity-40" }),
          /* @__PURE__ */ jsx("div", { className: "mt-2", children: "No recent activity" })
        ] }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: activityFeed.map((a) => /* @__PURE__ */ jsxs("div", { className: "px-5 py-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: a.company }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: a.action })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: a.time })
        ] }, a.id)) })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "rounded-2xl bg-gradient-to-br from-brand to-violet text-brand-foreground p-6 relative overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 noise opacity-20" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 text-xs font-medium opacity-90", children: [
            /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }),
            " AI Weekly Brief"
          ] }),
          /* @__PURE__ */ jsx("h3", { className: "mt-2 text-lg font-semibold", children: "Your week in deals" }),
          /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-2 text-sm opacity-95", children: insights.map((s, i) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 mt-0.5 shrink-0 opacity-80" }),
            /* @__PURE__ */ jsx("span", { children: s })
          ] }, i)) }),
          /* @__PURE__ */ jsx("button", { className: "mt-5 inline-flex items-center gap-1.5 rounded-[10px] bg-background/15 hover:bg-background/25 px-3 py-1.5 text-xs", children: "Regenerate" })
        ] })
      ] })
    ] }),
    briefLoading && selectedRoomId && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-card p-8 shadow-elev text-sm text-muted-foreground animate-pulse", children: "Generating AI brief…" }) }),
    /* @__PURE__ */ jsx(AIBriefPanel, { data: aiBriefData, onClose: () => setSelectedRoomId(null), onOpenDealRoom: () => {
      if (selectedRoomId) window.location.href = `/app/deal-room/${selectedRoomId}`;
    } })
  ] });
}
export {
  InvestorDashboard as component
};
