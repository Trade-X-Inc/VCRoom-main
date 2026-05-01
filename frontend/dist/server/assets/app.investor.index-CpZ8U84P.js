import { T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { P as Plus } from "./plus-BQ1Om6Fn.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
const stages = ["Sourced", "Screen", "Meeting", "Diligence", "Decision", "Pass"];
const startups = [{
  stage: "Sourced",
  n: "Atlas Robotics",
  s: "Series A · Robotics",
  check: "$5M",
  score: 87
}, {
  stage: "Sourced",
  n: "Lumen AI",
  s: "Seed · Dev tools",
  check: "$2M",
  score: 76
}, {
  stage: "Screen",
  n: "Helix Bio",
  s: "Series A · Biotech",
  check: "$8M",
  score: 91
}, {
  stage: "Screen",
  n: "Northwind",
  s: "Seed · Climate",
  check: "$1.5M",
  score: 68
}, {
  stage: "Meeting",
  n: "Quanta Labs",
  s: "Series A · AI",
  check: "$10M",
  score: 94
}, {
  stage: "Meeting",
  n: "Forge",
  s: "Seed · Fintech",
  check: "$3M",
  score: 72
}, {
  stage: "Diligence",
  n: "Vertex",
  s: "Series B · SaaS",
  check: "$15M",
  score: 89
}, {
  stage: "Decision",
  n: "Mira Health",
  s: "Series A · Health",
  check: "$7M",
  score: 85
}, {
  stage: "Pass",
  n: "Pulse",
  s: "Seed · Consumer",
  check: "—",
  score: 42
}];
function InvestorPipeline() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Pipeline" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "128 sourced · 12 in active diligence · 4 decisions this week" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Source deal"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 min-w-max", children: stages.map((s) => {
      const items = startups.filter((x) => x.stage === s);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[300px] flex-shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 mb-2.5 flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-medium", children: [
          s,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: items.length })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]", children: items.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: c.n }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: c.s })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-[11px] font-mono tabular-nums rounded-md px-1.5 py-0.5 ${c.score >= 85 ? "bg-success/15 text-success" : c.score >= 70 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`, children: c.score })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between text-[11px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Ask" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: c.check })
          ] })
        ] }, c.n)) })
      ] }, s);
    }) }) })
  ] });
}
export {
  InvestorPipeline as component
};
