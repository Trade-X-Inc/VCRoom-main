import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-3WmBSyta.js";
import { Loader2, Users, Plus, Filter, Flame, ArrowUpRight } from "lucide-react";
import { c as cn } from "./utils-H80jjgLf.js";
import { L as LeadDrawer } from "./LeadDrawer-D4nnqM1O.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
import "./createSsrRpc-l1y8KE69.js";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const pipelineStages = ["Sourced", "Contacted", "Meeting", "Interested", "Deal Room", "Passed"];
const STATUS_TO_STAGE = {
  "New": "Sourced",
  "Shortlisted": "Sourced",
  "Contacted": "Contacted",
  "Replied": "Contacted",
  "Follow Up": "Contacted",
  "Meeting Booked": "Meeting",
  "Interested": "Interested",
  "Deal Room Created": "Deal Room",
  "Rejected": "Passed"
};
const STAGE_TO_STATUS = {
  "Sourced": "New",
  "Contacted": "Contacted",
  "Meeting": "Meeting Booked",
  "Interested": "Interested",
  "Deal Room": "Deal Room Created",
  "Passed": "Rejected"
};
const STAGE_PROBABILITY = {
  "Sourced": 10,
  "Contacted": 25,
  "Meeting": 45,
  "Interested": 65,
  "Deal Room": 80,
  "Passed": 0
};
const stageTint = {
  "Sourced": "bg-muted-foreground/40",
  "Contacted": "bg-foreground/40",
  "Meeting": "bg-brand",
  "Interested": "bg-violet",
  "Deal Room": "bg-warning",
  "Passed": "bg-destructive/60"
};
const stageBarColor = {
  "Sourced": "bg-muted-foreground/50",
  "Contacted": "bg-foreground/50",
  "Meeting": "bg-brand",
  "Interested": "bg-violet",
  "Deal Room": "bg-warning",
  "Passed": "bg-destructive/60"
};
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function leadToDeal(lead) {
  const stage = STATUS_TO_STAGE[lead.status] ?? "Sourced";
  const name = lead.investor_name ?? "";
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2 ? ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase() : name.slice(0, 2).toUpperCase();
  return {
    id: lead.id,
    firm: lead.firm_name ?? "—",
    partner: lead.investor_name,
    initials,
    check: lead.ticket_size ?? "—",
    stage,
    probability: STAGE_PROBABILITY[stage],
    lastTouch: timeAgo(lead.updated_at),
    isHot: lead.status === "Interested",
    thesis: lead.sector ?? "—"
  };
}
function Pipeline() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const {
    data: rawLeads = [],
    isLoading
  } = useQuery({
    queryKey: ["pipeline-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("vc_leads").select("*").eq("founder_id", user.id).order("updated_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const deals = useMemo(() => rawLeads.map(leadToDeal), [rawLeads]);
  const byStage = useMemo(() => {
    const m = {
      Sourced: [],
      Contacted: [],
      Meeting: [],
      Interested: [],
      "Deal Room": [],
      Passed: []
    };
    deals.forEach((d) => m[d.stage].push(d));
    return m;
  }, [deals]);
  const onDrop = async (stage) => {
    if (!dragId || !user?.id) return;
    const newStatus = STAGE_TO_STATUS[stage];
    setDragId(null);
    setOverStage(null);
    queryClient.setQueryData(["pipeline-leads", user.id], (old) => (old ?? []).map((l) => l.id === dragId ? {
      ...l,
      status: newStatus
    } : l));
    await supabase.from("vc_leads").update({
      status: newStatus,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", dragId).eq("founder_id", user.id);
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 flex items-center justify-center min-h-64", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground" }) });
  }
  if (deals.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-end justify-between flex-wrap gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Pipeline" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage your investor relationships as a visual pipeline." })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-16 flex flex-col items-center gap-4 text-center", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-12 w-12 text-muted-foreground/30" }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-medium", children: "Your pipeline is empty." }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground max-w-sm", children: "Add VC leads to see them appear here. Leads are mapped to pipeline stages based on their status." }),
        /* @__PURE__ */ jsxs(Link, { to: "/app/leads", className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
          " Add VC leads"
        ] })
      ] })
    ] });
  }
  const maxCount = Math.max(...pipelineStages.map((s) => byStage[s].length), 1);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Pipeline" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage your investor relationships as a visual pipeline." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsx(Filter, { className: "h-4 w-4" }),
          " Filters"
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-5 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Total leads", String(deals.length), "across all stages"], ["Hot deals", String(deals.filter((d) => d.isHot).length), "Interested investors"], ["Deal rooms", String(byStage["Deal Room"].length), "active diligence"], ["Passed", String(byStage["Passed"].length), "this round"]].map(([l, v, s]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: l }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v }),
        /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground", children: s })
      ] }, l)) }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-4", children: pipelineStages.map((stage) => {
        const items = byStage[stage];
        const isOver = overStage === stage;
        return /* @__PURE__ */ jsxs("div", { onDragOver: (e) => {
          e.preventDefault();
          setOverStage(stage);
        }, onDragLeave: () => setOverStage((s) => s === stage ? null : s), onDrop: () => onDrop(stage), className: cn("flex flex-col rounded-xl border bg-muted/30 transition-colors min-h-[400px]", isOver ? "border-brand bg-brand/5" : "border-border/60"), children: [
          /* @__PURE__ */ jsx("div", { className: "px-3 py-2.5 border-b border-border/60 flex items-center justify-between", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: cn("h-2 w-2 rounded-full", stageTint[stage]) }),
            /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold uppercase tracking-wider", children: stage }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: items.length })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 p-2 space-y-2", children: [
            items.map((d) => /* @__PURE__ */ jsx(DealCard, { deal: d, onDragStart: () => setDragId(d.id), onClick: () => {
              const raw = rawLeads.find((l) => l.id === d.id);
              if (raw) setSelectedLead(raw);
            } }, d.id)),
            items.length === 0 && /* @__PURE__ */ jsx("div", { className: "py-8 text-center text-[11px] text-muted-foreground", children: "Drop leads here" })
          ] })
        ] }, stage);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-4", children: "Pipeline distribution" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-3", children: pipelineStages.map((stage) => {
          const count = byStage[stage].length;
          const barPct = Math.round(count / maxCount * 100);
          return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "w-24 text-xs text-muted-foreground shrink-0", children: stage }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 h-6 rounded-md bg-muted/40 overflow-hidden relative", children: [
              /* @__PURE__ */ jsx("div", { className: cn("h-full rounded-md transition-all duration-500", stageBarColor[stage]), style: {
                width: `${barPct}%`
              } }),
              count > 0 && /* @__PURE__ */ jsxs("div", { className: "absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-foreground/70", children: [
                count,
                " lead",
                count !== 1 ? "s" : ""
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-5 text-xs text-right tabular-nums text-muted-foreground shrink-0", children: count })
          ] }, stage);
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(LeadDrawer, { open: !!selectedLead, lead: selectedLead, onClose: () => setSelectedLead(null), onSaved: () => {
      setSelectedLead(null);
      queryClient.invalidateQueries({
        queryKey: ["pipeline-leads", user?.id]
      });
    } })
  ] });
}
function DealCard({
  deal,
  onDragStart,
  onClick
}) {
  return /* @__PURE__ */ jsxs("div", { draggable: true, onDragStart, onClick, className: "group rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card hover:border-brand/40 transition-all cursor-grab active:cursor-grabbing", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0", children: deal.initials }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold truncate", children: deal.firm }),
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground truncate", children: deal.partner })
        ] })
      ] }),
      deal.isHot && /* @__PURE__ */ jsx(Flame, { className: "h-3.5 w-3.5 text-warning shrink-0" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-2 text-[11px] text-muted-foreground", children: deal.thesis }),
    /* @__PURE__ */ jsxs("div", { className: "mt-2.5 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("span", { className: "text-xs font-medium tabular-nums", children: deal.check }),
      /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: deal.lastTouch })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1 h-1 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand", style: {
        width: `${deal.probability}%`
      } }) }),
      /* @__PURE__ */ jsxs("span", { className: "text-[10px] tabular-nums text-muted-foreground", children: [
        deal.probability,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-2 w-full inline-flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: [
      "Open ",
      /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3 w-3" })
    ] })
  ] });
}
export {
  Pipeline as component
};
