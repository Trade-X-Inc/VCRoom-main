import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { B as Bell } from "./bell-nx3hwQdI.js";
import { C as CheckCheck } from "./check-check-8biRxx43.js";
import { S as Search } from "./search-BdeIBPuN.js";
import { S as Settings } from "./settings-BnDFnI-4.js";
import { U as UserPlus } from "./user-plus-SO3V9bS7.js";
import { S as Sparkles } from "./sparkles-D86DPdwE.js";
import { M as MessageSquare } from "./message-square-BXZGe1sQ.js";
import { B as Briefcase } from "./briefcase-Z_tlIkyK.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-ByQ9CEis.js";
const notifications = [];
const iconFor = (k) => ({
  deal: Briefcase,
  message: MessageSquare,
  ai: Sparkles,
  invite: UserPlus,
  system: Settings
})[k];
const tintFor = (k) => ({
  deal: "bg-success/10 text-success",
  message: "bg-brand/10 text-brand",
  ai: "bg-violet/10 text-violet",
  invite: "bg-warning/10 text-warning",
  system: "bg-muted text-muted-foreground"
})[k];
const filters = [{
  k: "all",
  l: "All"
}, {
  k: "unread",
  l: "Unread"
}, {
  k: "deal",
  l: "Deals"
}, {
  k: "message",
  l: "Messages"
}, {
  k: "ai",
  l: "AI"
}, {
  k: "invite",
  l: "Invites"
}];
function NotificationsPage() {
  const [items, setItems] = reactExports.useState(notifications);
  const [filter, setFilter] = reactExports.useState("all");
  const [q, setQ] = reactExports.useState("");
  const list = reactExports.useMemo(() => {
    let xs = items;
    if (filter === "unread") xs = xs.filter((n) => n.unread);
    else if (filter !== "all") xs = xs.filter((n) => n.kind === filter);
    if (q) xs = xs.filter((n) => (n.title + n.body).toLowerCase().includes(q.toLowerCase()));
    return xs;
  }, [items, filter, q]);
  const unread = items.filter((n) => n.unread).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-4xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Notifications" }),
          unread > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] rounded-full bg-brand/10 text-brand px-1.5 py-0.5 font-medium", children: [
            unread,
            " unread"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Everything happening across your raise — investor activity, documents, and AI insights." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setItems((xs) => xs.map((n) => ({
        ...n,
        unread: false
      }))), className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { className: "h-4 w-4" }),
        " Mark all read"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search notifications…", className: "w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: filters.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setFilter(f.k), className: `rounded-full px-3 py-1.5 text-xs transition-colors ${filter === f.k ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"}`, children: f.l }, f.k)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden", children: list.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground", children: "No notifications match." }) : list.map((n) => {
      const Icon = iconFor(n.kind);
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-4 px-5 py-4 hover:bg-accent/40 transition-colors ${n.unread ? "bg-brand/[0.02]" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid h-10 w-10 place-items-center rounded-lg shrink-0 ${tintFor(n.kind)}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: n.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-sm text-muted-foreground", children: n.body })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            n.unread && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-2 w-2 rounded-full bg-brand" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground tabular-nums", children: n.time })
          ] })
        ] }) })
      ] }, n.id);
    }) })
  ] });
}
export {
  NotificationsPage as component
};
