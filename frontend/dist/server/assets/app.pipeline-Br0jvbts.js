import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Dz_cryAq.js";
import { d as useI18n, u as useAuth, c as useQueryClient, s as supabase, L as Link } from "./router-DDxKVwv8.js";
import { u as useQuery } from "./useQuery-BKQDWNmV.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { L as LoaderCircle } from "./loader-circle-c8DltT_E.js";
import { U as Users } from "./users-Dy1T1nNp.js";
import { P as Plus } from "./plus-CYFkjbiX.js";
import { F as Funnel } from "./funnel-BvZDtokU.js";
import { F as Flame } from "./flame-DCnylIx-.js";
import { C as Clock } from "./clock-BH5geKPN.js";
import { A as ArrowUpRight } from "./arrow-up-right-DmYLCMB0.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./createLucideIcon-BWyo4Tuv.js";
const pipelineStages = ["Sourced", "Qualified", "Pitched", "Diligence", "Term Sheet", "Closed"];
const STATUS_TO_STAGE = {
  "New": "Sourced",
  "Shortlisted": "Sourced",
  "Contacted": "Qualified",
  "Replied": "Qualified",
  "Follow Up": "Qualified",
  "Meeting Booked": "Pitched",
  "Interested": "Diligence",
  "Deal Room Created": "Term Sheet",
  "Rejected": "Closed"
};
const STAGE_TO_STATUS = {
  "Sourced": "New",
  "Qualified": "Contacted",
  "Pitched": "Meeting Booked",
  "Diligence": "Interested",
  "Term Sheet": "Deal Room Created",
  "Closed": null
};
const STAGE_PROBABILITY = {
  "Sourced": 10,
  "Qualified": 25,
  "Pitched": 40,
  "Diligence": 60,
  "Term Sheet": 80,
  "Closed": 100
};
const stageTint = {
  "Sourced": "bg-muted-foreground/40",
  "Qualified": "bg-foreground/40",
  "Pitched": "bg-brand",
  "Diligence": "bg-violet",
  "Term Sheet": "bg-warning",
  "Closed": "bg-success"
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
  let signal;
  if (lead.follow_up_date) {
    const fup = /* @__PURE__ */ new Date(lead.follow_up_date + "T12:00:00");
    if (fup <= /* @__PURE__ */ new Date()) signal = "hot";
  }
  return {
    id: lead.id,
    firm: lead.firm_name ?? "—",
    partner: lead.investor_name,
    initials,
    check: lead.ticket_size ?? "—",
    stage,
    probability: STAGE_PROBABILITY[stage],
    lastTouch: timeAgo(lead.updated_at),
    signal,
    thesis: lead.sector ?? "—"
  };
}
function Pipeline() {
  const {
    t
  } = useI18n();
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [dragId, setDragId] = reactExports.useState(null);
  const [overStage, setOverStage] = reactExports.useState(null);
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
      } = await supabase.from("vc_leads").select("id, investor_name, firm_name, ticket_size, status, sector, updated_at, follow_up_date").eq("founder_id", user.id).order("updated_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const deals = reactExports.useMemo(() => rawLeads.map(leadToDeal), [rawLeads]);
  const byStage = reactExports.useMemo(() => {
    const m = {
      Sourced: [],
      Qualified: [],
      Pitched: [],
      Diligence: [],
      "Term Sheet": [],
      Closed: []
    };
    deals.forEach((d) => m[d.stage].push(d));
    return m;
  }, [deals]);
  const totalValue = (xs) => xs.reduce((sum, d) => {
    const n = parseFloat(d.check.replace(/[^0-9.]/g, "")) || 0;
    return sum + n;
  }, 0);
  const onDrop = async (stage) => {
    if (!dragId || !user?.id) return;
    const newStatus = STAGE_TO_STATUS[stage];
    setDragId(null);
    setOverStage(null);
    if (!newStatus) return;
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 flex items-center justify-center min-h-64", children: /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-6 w-6 animate-spin text-muted-foreground" }) });
  }
  if (deals.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end justify-between flex-wrap gap-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("pipeline.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t("pipeline.subtitle") })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-16 flex flex-col items-center gap-4 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-12 w-12 text-muted-foreground/30" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-medium", children: "Your pipeline is empty." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground max-w-sm", children: "Add VC leads to see them appear here. Leads are mapped to pipeline stages based on their status." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/leads", className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Add VC leads"
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("pipeline.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t("pipeline.subtitle") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-4 w-4" }),
        " Filters"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Total deals", String(deals.length), "across pipeline"], ["Pipeline value", `$${totalValue(deals).toFixed(0)}M`, "uncommitted"], ["Hot deals", String(deals.filter((d) => d.signal === "hot").length), "need follow-up"], ["Closed", `$${totalValue(byStage.Closed).toFixed(0)}M`, "this quarter"]].map(([l, v, s]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: s })
    ] }, l)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3 overflow-x-auto pb-4", children: pipelineStages.map((stage) => {
      const items = byStage[stage];
      const isOver = overStage === stage;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onDragOver: (e) => {
        e.preventDefault();
        setOverStage(stage);
      }, onDragLeave: () => setOverStage((s) => s === stage ? null : s), onDrop: () => onDrop(stage), className: cn("flex flex-col rounded-xl border bg-muted/30 transition-colors min-h-[400px]", isOver ? "border-brand bg-brand/5" : "border-border/60"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2.5 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("h-2 w-2 rounded-full", stageTint[stage]) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold uppercase tracking-wider", children: stage }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: items.length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground tabular-nums", children: [
            "$",
            totalValue(items).toFixed(0),
            "M"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 p-2 space-y-2", children: [
          items.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(DealCard, { deal: d, onDragStart: () => setDragId(d.id) }, d.id)),
          items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-8 text-center text-[11px] text-muted-foreground", children: "Drop deals here" })
        ] })
      ] }, stage);
    }) })
  ] });
}
function DealCard({
  deal,
  onDragStart
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { draggable: true, onDragStart, className: "group rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card hover:border-brand/40 transition-all cursor-grab active:cursor-grabbing", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0", children: deal.initials }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold truncate", children: deal.firm }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground truncate", children: deal.partner })
        ] })
      ] }),
      deal.signal === "hot" && /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-3.5 w-3.5 text-warning shrink-0" }),
      deal.signal === "stale" && /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-[11px] text-muted-foreground", children: deal.thesis }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2.5 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium tabular-nums", children: deal.check }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: deal.lastTouch })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-1 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand", style: {
        width: `${deal.probability}%`
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] tabular-nums text-muted-foreground", children: [
        deal.probability,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "mt-2 w-full inline-flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity", children: [
      "Open ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-3 w-3" })
    ] })
  ] });
}
export {
  Pipeline as component
};
