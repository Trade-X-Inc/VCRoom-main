import { U as jsxRuntimeExports } from "./worker-entry-4qtpAlX3.js";
import { L as Link } from "./router-DliDWiY8.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
  /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Rooms" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "12 active · sorted by recency" }),
  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [{
    id: "dr_001",
    n: "Atlas Robotics",
    s: "Diligence · 78%",
    risk: "Low"
  }, {
    id: "dr_002",
    n: "Quanta Labs",
    s: "Q&A · 52%",
    risk: "Medium"
  }, {
    id: "dr_003",
    n: "Vertex",
    s: "Decision · 92%",
    risk: "Low"
  }, {
    id: "dr_004",
    n: "Helix Bio",
    s: "Onboarding · 18%",
    risk: "High"
  }].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app/deal-room/$id", params: {
    id: r.id
  }, className: "rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold", children: r.n[0] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: r.n }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: r.s })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `text-xs rounded-full px-2 py-0.5 ${r.risk === "Low" ? "bg-success/15 text-success" : r.risk === "Medium" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`, children: [
      r.risk,
      " risk"
    ] })
  ] }) }, r.id)) })
] });
export {
  SplitComponent as component
};
