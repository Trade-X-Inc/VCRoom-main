import { T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { L as Link } from "./router-BGpvLWsf.js";
import { s as stages, l as leads, c as stageColor } from "./mock-UGcEIF7y.js";
import { F as Funnel } from "./funnel-Ds56QBR_.js";
import { U as Upload } from "./upload-Cq9av_Er.js";
import { P as Plus } from "./plus-BQ1Om6Fn.js";
import { E as Ellipsis } from "./ellipsis-C8uyG72t.js";
import { F as Flame } from "./flame-DfHhb6bW.js";
import { M as Mail } from "./mail-zergbGIc.js";
import { C as Calendar } from "./calendar-CONuaO2E.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
function Leads() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4 max-w-[1600px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "VC Leads" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "47 investors · 18 active conversations" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-4 w-4" }),
          " Filter"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-4 w-4" }),
          " Import CSV"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Add lead"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-3 min-w-max", children: stages.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(Column, { stage: s }, s)) }) })
  ] });
}
function Column({
  stage
}) {
  const items = leads.filter((l) => l.stage === stage);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[280px] flex-shrink-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-1 mb-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${stageColor[stage]}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: stage }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: items.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]", children: [
      items.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { l }, l.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "w-full rounded-md border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-3.5 w-3.5" }),
        " Add"
      ] })
    ] })
  ] });
}
function Card({
  l
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/lead/$id", params: {
    id: l.id
  }, className: "block rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0", children: l.initials }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: l.name }),
          l.hot && /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "h-3 w-3 text-warning shrink-0" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: l.firm })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2.5 flex items-center gap-1 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-full bg-accent px-1.5 py-0.5 text-foreground/80", children: l.check }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-full bg-accent px-1.5 py-0.5 text-foreground/80", children: l.thesis })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 opacity-0 group-hover:opacity-100 transition-opacity", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "h-3.5 w-3.5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-3.5 w-3.5" }) })
    ] })
  ] });
}
export {
  Leads as component
};
