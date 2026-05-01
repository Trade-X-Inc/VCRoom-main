import { T as jsxRuntimeExports, r as reactExports } from "./worker-entry-Cd_qZNvB.js";
import { A as AppShell } from "./AppShell-CM86ChrN.js";
import { d as deals, p as pipelineStages } from "./mock-UGcEIF7y.js";
import { c as useI18n } from "./router-BGpvLWsf.js";
import { a as cn } from "./utils-BYfsx3cX.js";
import { F as Funnel } from "./funnel-Ds56QBR_.js";
import { P as Plus } from "./plus-BQ1Om6Fn.js";
import { F as Flame } from "./flame-DfHhb6bW.js";
import { C as Clock } from "./clock-DFBy3ftC.js";
import { A as ArrowUpRight } from "./arrow-up-right-Dc9hXNh8.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./Logo-BwaV5-7_.js";
import "./bell-C-AkfEyM.js";
import "./createLucideIcon-3NIsAiHL.js";
import "./settings-CX-qH6Dy.js";
import "./user-plus-BBTKWlNs.js";
import "./sparkles-D9nEshzh.js";
import "./message-square-B3FYF4Hj.js";
import "./briefcase-BOwxSwyG.js";
import "./user-b_Q8iwAJ.js";
import "./users-D4EiXx1L.js";
import "./shield-check-BOlOV-LA.js";
import "./LangSwitcher-CXAkmc3B.js";
import "./globe-B2cmhj34.js";
import "./building-2-DUkGSJjT.js";
import "./brain-BWEPLY4p.js";
import "./list-checks-1Ejb0VFu.js";
import "./layout-grid-DdF8o8R7.js";
import "./mail-zergbGIc.js";
import "./file-text-D9XXuUkz.js";
import "./calendar-CONuaO2E.js";
import "./search-BIDKGnWi.js";
const stageTint = {
  "Sourced": "bg-muted-foreground/40",
  "Qualified": "bg-foreground/40",
  "Pitched": "bg-brand",
  "Diligence": "bg-violet",
  "Term Sheet": "bg-warning",
  "Closed": "bg-success"
};
function Pipeline() {
  const {
    t
  } = useI18n();
  const [deals$1, setDeals] = reactExports.useState(deals);
  const [dragId, setDragId] = reactExports.useState(null);
  const [overStage, setOverStage] = reactExports.useState(null);
  const byStage = reactExports.useMemo(() => {
    const m = {
      Sourced: [],
      Qualified: [],
      Pitched: [],
      Diligence: [],
      "Term Sheet": [],
      Closed: []
    };
    deals$1.forEach((d) => m[d.stage].push(d));
    return m;
  }, [deals$1]);
  const totalValue = (xs) => xs.reduce((sum, d) => {
    const n = parseFloat(d.check.replace(/[^0-9.]/g, "")) || 0;
    return sum + n;
  }, 0);
  const onDrop = (stage) => {
    if (!dragId) return;
    setDeals((ds) => ds.map((d) => d.id === dragId ? {
      ...d,
      stage
    } : d));
    setDragId(null);
    setOverStage(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("pipeline.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t("pipeline.subtitle") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-4 w-4" }),
          " Filters"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " ",
          t("pipeline.newDeal")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Total deals", String(deals$1.length), "across pipeline"], ["Pipeline value", `$${totalValue(deals$1).toFixed(0)}M`, "uncommitted"], ["Hot deals", String(deals$1.filter((d) => d.signal === "hot").length), "need follow-up"], ["Closed", `$${totalValue(byStage.Closed).toFixed(0)}M`, "this quarter"]].map(([l, v, s]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
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
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pipeline, {}) });
export {
  SplitComponent as component
};
