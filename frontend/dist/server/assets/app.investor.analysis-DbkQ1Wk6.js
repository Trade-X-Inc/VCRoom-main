import { U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { B as Brain } from "./brain-BNqMdY5D.js";
import { T as TrendingUp } from "./trending-up-DgeIFwuL.js";
import { T as TriangleAlert } from "./triangle-alert-11Lnv70t.js";
import { S as Shield } from "./shield-QHmdsR0s.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-ByQ9CEis.js";
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Brain, { className: "h-5 w-5" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "AI Analysis" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Atlas Robotics — automated risk and opportunity summary" })
    ] })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-[0.06]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Investment thesis match" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-baseline gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-5xl font-semibold tracking-tight", children: "87" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: "/ 100 · strong fit for AI infra thesis" })
      ] })
    ] })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid md:grid-cols-3 gap-4", children: [{
    i: TrendingUp,
    c: "text-success",
    t: "Strengths",
    b: ["318% ARR growth YoY", "F500 customer concentration < 30%", "Technical moat in physical AI"]
  }, {
    i: TriangleAlert,
    c: "text-warning",
    t: "Risks",
    b: ["Hardware capex intensity", "Long sales cycle (9–12 mo)", "Competing with NVIDIA's Isaac stack"]
  }, {
    i: Shield,
    c: "text-brand",
    t: "Mitigants",
    b: ["SaaS-led pricing covers BOM", "Enterprise pilots auto-convert at 78%", "Defensible demonstration-learning IP"]
  }].map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(b.i, { className: `h-5 w-5 ${b.c}` }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-sm font-semibold", children: b.t }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-3 space-y-2 text-sm text-muted-foreground", children: b.b.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground/30", children: "·" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: x })
    ] }, x)) })
  ] }, b.t)) })
] });
export {
  SplitComponent as component
};
