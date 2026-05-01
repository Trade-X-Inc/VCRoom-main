import { T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { L as Link } from "./router-BGpvLWsf.js";
import { M as Mail } from "./mail-zergbGIc.js";
import { A as ArrowUpRight } from "./arrow-up-right-Dc9hXNh8.js";
import { S as Sparkles } from "./sparkles-D9nEshzh.js";
import { C as CircleCheck } from "./circle-check-CZw26OL2.js";
import { F as FileText } from "./file-text-D9XXuUkz.js";
import { C as Calendar } from "./calendar-CONuaO2E.js";
import { B as Briefcase } from "./briefcase-BOwxSwyG.js";
import { C as Clock } from "./clock-DFBy3ftC.js";
import { T as TrendingUp } from "./trending-up-Dbu2Hunq.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
function Stat({
  label,
  value,
  sub,
  trend,
  accent
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-card ${accent ? "" : ""}`, children: [
    accent && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-brand opacity-20 blur-2xl" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex items-baseline gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-2xl font-semibold tracking-tight", children: value }),
      trend && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-success inline-flex items-center gap-0.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { className: "h-3 w-3" }),
        " ",
        trend
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: sub })
  ] });
}
function Overview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Good morning, Jordan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "mt-1 text-2xl font-semibold tracking-tight", children: "Atlas Robotics — Series A" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/email", className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-4 w-4" }),
          " Compose"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/leads", className: "rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow inline-flex items-center gap-1.5", children: [
          "Add lead ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3.5 w-3.5" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-[0.05]" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex flex-wrap items-end justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Round progress" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-3xl font-semibold tracking-tight", children: "$3.2M" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "of $8M target" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-6 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Soft circled" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "$1.4M" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Lead" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "In diligence" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Close" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: "~6 weeks" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-5 h-2.5 rounded-full bg-muted overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-0 w-[40%] bg-gradient-brand rounded-full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-y-0 left-[40%] w-[18%] bg-brand/30" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-2 flex justify-between text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "$0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "$2M" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "$4M" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "$6M" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "$8M" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Active VCs", value: "47", sub: "in pipeline", trend: "+8 this week", accent: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Reply rate", value: "34%", sub: "vs 22% benchmark", trend: "+5%" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Meetings", value: "18", sub: "scheduled" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stat, { label: "Deal rooms", value: "4", sub: "2 hot" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-5 border-b border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Pipeline at a glance" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Last 30 days" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/leads", className: "text-xs text-brand inline-flex items-center gap-1", children: [
            "Open pipeline ",
            /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3 w-3" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-5 grid grid-cols-7 gap-2", children: [["New", 12, "bg-muted-foreground/40"], ["Contact", 18, "bg-foreground/40"], ["Replied", 9, "bg-brand"], ["Meeting", 5, "bg-violet"], ["Interest", 3, "bg-warning"], ["DR", 4, "bg-success"], ["Pass", 7, "bg-destructive/60"]].map(([l, n, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground truncate", children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${c}` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-lg font-semibold", children: n }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-2 h-1 rounded-full ${c} opacity-50`, style: {
            width: `${Math.min(100, n * 8)}%`
          } })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "AI Advisor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "3 actions for you" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 space-y-2", children: [{
          t: "Follow up with Marcus Vale (a16z)",
          d: "Replied 4 days ago, no follow-up sent"
        }, {
          t: "Send weekly update",
          d: "8 investors expecting it"
        }, {
          t: "Add cap table v2",
          d: "Sara Khan (NEA) requested it"
        }].map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3 hover:bg-accent transition-colors cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: a.t }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: a.d })
        ] }, a.t)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Recent activity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Live" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: [{
          i: CircleCheck,
          c: "text-success",
          t: "Sara Khan (NEA) signed NDA",
          s: "2m ago"
        }, {
          i: FileText,
          c: "text-brand",
          t: "Marcus Vale viewed pitch deck v3",
          s: "12m ago"
        }, {
          i: Mail,
          c: "text-violet",
          t: "Reply from Hana Ito (Index)",
          s: "1h ago"
        }, {
          i: Calendar,
          c: "text-warning",
          t: "Meeting scheduled with Greylock",
          s: "3h ago"
        }, {
          i: Briefcase,
          c: "text-success",
          t: "Deal room opened for Lightspeed",
          s: "1d ago"
        }].map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(a.i, { className: `h-4 w-4 ${a.c}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 text-sm", children: a.t }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
            " ",
            a.s
          ] })
        ] }, a.t)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Hot deal rooms" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app/deal-rooms", className: "text-xs text-brand", children: "View all" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: [{
          n: "NEA",
          s: "Diligence",
          p: 78,
          st: "success"
        }, {
          n: "Kleiner Perkins",
          s: "Q&A",
          p: 52,
          st: "warning"
        }, {
          n: "Lightspeed",
          s: "Onboarding",
          p: 18,
          st: "brand"
        }, {
          n: "Bessemer",
          s: "Decision",
          p: 92,
          st: "success"
        }].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/deal-room/dr_001", className: "flex items-center gap-3 px-5 py-3 hover:bg-accent/40", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-md bg-gradient-soft text-xs font-semibold border border-border/60", children: r.n.split(" ").map((s) => s[0]).join("").slice(0, 2) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: r.n }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: r.s })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-20", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-full bg-${r.st === "success" ? "success" : r.st === "warning" ? "warning" : "brand"}`, style: {
              width: `${r.p}%`
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-muted-foreground text-right mt-0.5", children: [
              r.p,
              "%"
            ] })
          ] })
        ] }, r.n)) })
      ] })
    ] })
  ] });
}
export {
  Overview as component
};
