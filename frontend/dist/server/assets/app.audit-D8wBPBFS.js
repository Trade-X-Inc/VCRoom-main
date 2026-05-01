import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { b as auditLog } from "./mock-UGcEIF7y.js";
import { S as ShieldCheck } from "./shield-check-BOlOV-LA.js";
import { D as Download } from "./download-DbFsf-9O.js";
import { A as Activity } from "./activity-CG4Faa3o.js";
import { T as TriangleAlert } from "./triangle-alert-DQs0Aakr.js";
import { S as Search } from "./search-BIDKGnWi.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
const cats = ["All", "Auth", "Document", "Deal Room", "Invite", "Settings", "AI"];
const sevTint = (s) => s === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" : s === "warn" ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground border-border/60";
const catDot = (c) => ({
  Auth: "bg-foreground/40",
  Document: "bg-brand",
  "Deal Room": "bg-success",
  Invite: "bg-warning",
  Settings: "bg-muted-foreground/50",
  AI: "bg-violet"
})[c];
function AuditPage() {
  const [q, setQ] = reactExports.useState("");
  const [cat, setCat] = reactExports.useState("All");
  const list = reactExports.useMemo(() => {
    let xs = auditLog;
    if (cat !== "All") xs = xs.filter((e) => e.category === cat);
    if (q) xs = xs.filter((e) => (e.actor + e.action + e.target + e.ip).toLowerCase().includes(q.toLowerCase()));
    return xs;
  }, [q, cat]);
  const critical = auditLog.filter((e) => e.severity === "critical").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Activity audit log" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Immutable record of every action taken across your workspace and deal rooms." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }),
        " Export CSV"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Total events", auditLog.length.toString(), Activity, "text-foreground"], ["Last 24h", "9", Activity, "text-foreground"], ["Sign-ins", auditLog.filter((e) => e.category === "Auth").length.toString(), ShieldCheck, "text-brand"], ["Critical", critical.toString(), TriangleAlert, critical ? "text-destructive" : "text-muted-foreground"]].map(([l, v, I, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: l }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: `h-3.5 w-3.5 ${c}` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `mt-1 text-xl font-semibold tabular-nums ${c}`, children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1 min-w-[200px] max-w-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Filter by user, action, IP…", className: "w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1", children: cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setCat(c), className: `rounded-full px-3 py-1.5 text-xs transition-colors ${cat === c ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"}`, children: c }, c)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_1.6fr_1fr_140px_120px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Actor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Action" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Category" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "IP address" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-right", children: "When" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: list.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1fr_1.6fr_1fr_140px_120px] gap-4 px-5 py-3.5 items-center text-sm hover:bg-accent/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0", children: e.initials }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "truncate font-medium", children: e.actor })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: e.action }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: e.target })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${catDot(e.category)}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs", children: e.category }),
          e.severity !== "info" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${sevTint(e.severity)}`, children: e.severity === "critical" ? "Critical" : "Warn" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground tabular-nums truncate", children: e.ip }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground text-right tabular-nums", children: e.time })
      ] }, e.id)) })
    ] })
  ] });
}
export {
  AuditPage as component
};
