import { jsxs, jsx } from "react/jsx-runtime";
import { LayoutGrid, Users, FileText, MessageSquare, Sparkles, Search, Bell, TrendingUp, ChevronRight, ArrowUpRight } from "lucide-react";
function AppPreview() {
  return /* @__PURE__ */ jsxs("div", { className: "relative rounded-2xl border border-border/80 bg-card shadow-elev overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-border/60 bg-gradient-soft px-4 py-2.5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
        /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-destructive/70" }),
        /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-warning/80" }),
        /* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-success/70" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "ml-3 flex-1 max-w-md mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-md bg-background/60 border border-border/60 px-2.5 py-1 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { className: "text-success", children: "●" }),
        " app.ventureroom.com/app"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 min-h-[460px]", children: [
      /* @__PURE__ */ jsxs("aside", { className: "col-span-3 border-r border-border/60 bg-sidebar p-3 hidden md:block", children: [
        /* @__PURE__ */ jsx("div", { className: "px-2 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Workspace" }),
        [
          { icon: LayoutGrid, label: "Overview", active: true },
          { icon: Users, label: "VC Leads", badge: "128" },
          { icon: FileText, label: "Documents" },
          { icon: MessageSquare, label: "Deal Rooms", badge: "4" },
          { icon: Sparkles, label: "AI Advisor" }
        ].map((i) => /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${i.active ? "bg-accent text-foreground" : "text-muted-foreground"}`, children: [
          /* @__PURE__ */ jsx(i.icon, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "flex-1", children: i.label }),
          i.badge && /* @__PURE__ */ jsx("span", { className: "text-[10px] rounded bg-background px-1.5 py-0.5 border border-border/60", children: i.badge })
        ] }, i.label))
      ] }),
      /* @__PURE__ */ jsxs("main", { className: "col-span-12 md:col-span-9 p-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Founder workspace" }),
            /* @__PURE__ */ jsx("div", { className: "text-lg font-semibold tracking-tight", children: "Series A · Atlas Robotics" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "hidden sm:flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground", children: [
              /* @__PURE__ */ jsx(Search, { className: "h-3.5 w-3.5" }),
              " Search"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md border border-border/60", children: /* @__PURE__ */ jsx(Bell, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-5 grid grid-cols-3 gap-3", children: [
          { l: "Raised", v: "$3.2M", d: "of $8M", trend: "+12%" },
          { l: "Active VCs", v: "47", d: "in pipeline", trend: "+8" },
          { l: "Deal rooms", v: "4", d: "open", trend: "2 hot" }
        ].map((s) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-3", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: s.l }),
          /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xl font-semibold", children: s.v }),
            /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-success inline-flex items-center", children: [
              /* @__PURE__ */ jsx(TrendingUp, { className: "h-3 w-3" }),
              s.trend
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: s.d })
        ] }, s.l)) }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-lg border border-border/60 bg-card", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border/60 px-4 py-2.5", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "Pipeline" }),
            /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground inline-flex items-center gap-1", children: [
              "View all ",
              /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-2 p-3", children: [
            { stage: "Contacted", count: 18, color: "bg-muted-foreground/40" },
            { stage: "Replied", count: 9, color: "bg-brand" },
            { stage: "Meeting", count: 5, color: "bg-violet" },
            { stage: "Deal Room", count: 4, color: "bg-success" }
          ].map((c) => /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border/60 bg-background/60 p-2.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground", children: c.stage }),
              /* @__PURE__ */ jsx("span", { className: `h-1.5 w-1.5 rounded-full ${c.color}` })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 text-base font-semibold", children: c.count }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-1", children: Array.from({ length: 2 }).map((_, i) => /* @__PURE__ */ jsx("div", { className: "h-5 rounded bg-muted/60" }, i)) })
          ] }, c.stage)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-gradient-soft p-3", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("div", { className: "text-[13px] font-medium", children: "3 warm intros suggested by AI" }),
            /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: "Based on your stage, sector, and recent investor activity" })
          ] }),
          /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-4 w-4 text-muted-foreground" })
        ] })
      ] })
    ] })
  ] });
}
export {
  AppPreview as A
};
