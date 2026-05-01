import { T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { A as AIChat } from "./AIChat-DPAPE_DP.js";
import { S as Sparkles } from "./sparkles-D9nEshzh.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./backend-DBVD7Jg1.js";
import "./createLucideIcon-3NIsAiHL.js";
import "./user-b_Q8iwAJ.js";
import "./loader-circle-D99H4vV_.js";
function Advisor() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-[calc(100vh-4rem)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 lg:px-8 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto flex items-center gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-semibold tracking-tight", children: "AI Advisor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Strategic assistant trained on fundraising, term sheets & diligence." })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AIChat, { starters: ["What should I focus on this week?", "Draft an update email for stalled investors.", "Explain the term sheet Bessemer is likely to offer.", "What's missing from my data room before partner meetings?"] }) })
  ] });
}
export {
  Advisor as component
};
