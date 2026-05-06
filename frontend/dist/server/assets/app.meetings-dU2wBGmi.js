import { U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { C as Calendar } from "./calendar-BqAUqDh3.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  [
    "path",
    {
      d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
      key: "ftymec"
    }
  ],
  ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2", key: "158x01" }]
];
const Video = createLucideIcon("video", __iconNode);
const meetings = [{
  d: "Today",
  t: "2:00 PM",
  w: "Marcus Vale (a16z)",
  k: "Discovery",
  color: "bg-brand"
}, {
  d: "Today",
  t: "4:30 PM",
  w: "Hana Ito (Index)",
  k: "Follow-up",
  color: "bg-violet"
}, {
  d: "Tomorrow",
  t: "10:00 AM",
  w: "Sara Khan (NEA)",
  k: "Diligence",
  color: "bg-success"
}, {
  d: "Wed",
  t: "1:00 PM",
  w: "Tom Reid (Kleiner)",
  k: "Partner meeting",
  color: "bg-warning"
}, {
  d: "Fri",
  t: "11:00 AM",
  w: "Noah Bell (Bessemer)",
  k: "Term sheet",
  color: "bg-success"
}];
function Meetings() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Meetings" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Upcoming investor meetings with prep notes." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-[1fr_280px] gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: meetings.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[80px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-border/60 last:border-0 hover:bg-accent/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: m.d }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: m.t })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-2 w-2 rounded-full ${m.color}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: m.w }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
              m.k,
              " · 30 min"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { className: "h-3.5 w-3.5" }),
          " Join"
        ] })
      ] }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "This week" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 grid grid-cols-7 gap-1", children: ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: d }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 grid place-items-center h-8 rounded-md text-xs ${i === 1 ? "bg-gradient-brand text-brand-foreground font-semibold" : "bg-accent/40"}`, children: i + 11 })
        ] }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 text-xs text-muted-foreground", children: "5 meetings · 2h 30m total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "mt-4 w-full rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "h-4 w-4 inline mr-1.5" }),
          " Schedule"
        ] })
      ] })
    ] })
  ] });
}
export {
  Meetings as component
};
