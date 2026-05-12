import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Kanban, List, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-D87oKCVm.js";
import { formatDistanceToNow } from "date-fns";
import { c as cn } from "./utils-H80jjgLf.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
const DB_STATUS_TO_STAGE = {
  under_review: "Reviewing",
  info_requested: "Diligence",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Closed",
  exited: "Closed",
  accept: "Term Sheet",
  invest: "Term Sheet",
  pass: "Closed",
  hold: "Reviewing"
};
const STAGES = [{
  k: "Sourced",
  color: "bg-muted/60",
  dot: "bg-muted-foreground"
}, {
  k: "Reviewing",
  color: "bg-brand/5",
  dot: "bg-brand"
}, {
  k: "Diligence",
  color: "bg-warning/5",
  dot: "bg-warning"
}, {
  k: "Partner",
  color: "bg-violet/5",
  dot: "bg-violet"
}, {
  k: "Term Sheet",
  color: "bg-success/5",
  dot: "bg-success"
}, {
  k: "Closed",
  color: "bg-destructive/5",
  dot: "bg-destructive"
}];
function PipelinePage() {
  const {
    user
  } = useAuth();
  const [view, setView] = useState("kanban");
  const {
    data: rooms = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["investor-pipeline", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(company_name, sector, stage, funding_target)
          )
        `).eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.deal_room_id,
        updatedAt: r.deal_rooms?.updated_at,
        dbStatus: r.deal_rooms?.status,
        company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
        sector: r.deal_rooms?.startups?.sector,
        startupStage: r.deal_rooms?.startups?.stage,
        fundingTarget: r.deal_rooms?.startups?.funding_target,
        pipelineStage: DB_STATUS_TO_STAGE[r.deal_rooms?.status ?? ""] ?? "Sourced"
      })).filter((r) => !!r.id).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
  });
  const byStage = Object.fromEntries(STAGES.map((s) => [s.k, rooms.filter((r) => r.pipelineStage === s.k)]));
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-64 rounded bg-muted/60 animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 flex gap-3", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsx("div", { className: "w-[280px] h-64 rounded-2xl border border-border/60 bg-card animate-pulse shrink-0" }, i)) })
    ] });
  }
  if (isError) {
    return /* @__PURE__ */ jsx("div", { className: "p-6 lg:p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "My Pipeline" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
          rooms.length,
          " deal",
          rooms.length !== 1 ? "s" : "",
          " across ",
          STAGES.length,
          " stages"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setView("kanban"), className: cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md", view === "kanban" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"), children: [
          /* @__PURE__ */ jsx(Kanban, { className: "h-3.5 w-3.5" }),
          " Kanban"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setView("list"), className: cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md", view === "list" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"), children: [
          /* @__PURE__ */ jsx(List, { className: "h-3.5 w-3.5" }),
          " List"
        ] })
      ] })
    ] }),
    view === "kanban" ? /* @__PURE__ */ jsx("div", { className: "mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-4", children: /* @__PURE__ */ jsx("div", { className: "flex gap-3 min-w-max", children: STAGES.map((s) => {
      const cards = byStage[s.k] ?? [];
      return /* @__PURE__ */ jsxs("div", { className: "w-[280px] shrink-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-1 mb-3 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: cn("h-2 w-2 rounded-full", s.dot) }),
          /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold", children: s.k }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: cards.length })
        ] }),
        /* @__PURE__ */ jsx("div", { className: cn("rounded-2xl border border-border/60 min-h-[200px] p-2 space-y-2", s.color), children: cards.length === 0 ? /* @__PURE__ */ jsx("div", { className: "grid place-items-center h-[160px] text-xs text-muted-foreground/60", children: "No deals here" }) : cards.map((room) => /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
          id: room.id
        }, className: "block rounded-xl border border-border/60 bg-card p-3 hover:shadow-card transition-shadow", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0", children: room.company[0] }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: room.company }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: room.sector || "—" })
            ] })
          ] }),
          room.fundingTarget && /* @__PURE__ */ jsx("div", { className: "mt-2 text-[11px] text-brand font-medium", children: room.fundingTarget }),
          room.updatedAt && /* @__PURE__ */ jsxs("div", { className: "mt-1 flex items-center gap-1 text-[10px] text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-2.5 w-2.5" }),
            formatDistanceToNow(new Date(room.updatedAt), {
              addSuffix: true
            })
          ] })
        ] }, room.id)) })
      ] }, s.k);
    }) }) }) : /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60", children: [
        /* @__PURE__ */ jsx("div", { className: "col-span-4", children: "Company" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Stage" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Pipeline" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Ask" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Last activity" })
      ] }),
      rooms.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-5 py-12 text-sm text-muted-foreground text-center", children: "No deals in your pipeline yet." }) : rooms.map((room) => {
        const stageInfo = STAGES.find((s) => s.k === room.pipelineStage);
        return /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
          id: room.id
        }, className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "col-span-4 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0", children: room.company[0] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-medium", children: room.company }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: room.sector || "—" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: room.startupStage || "—" }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxs("span", { className: cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5"), children: [
            /* @__PURE__ */ jsx("span", { className: cn("h-1.5 w-1.5 rounded-full", stageInfo?.dot) }),
            room.pipelineStage
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: room.fundingTarget || "—" }),
          /* @__PURE__ */ jsx("div", { className: "col-span-2 text-xs text-muted-foreground", children: room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), {
            addSuffix: true
          }) : "—" })
        ] }, room.id);
      })
    ] })
  ] });
}
export {
  PipelinePage as component
};
