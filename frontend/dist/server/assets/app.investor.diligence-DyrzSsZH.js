import { U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { s as supabase } from "./router-DUHyCcO4.js";
import { C as CircleCheck } from "./circle-check-O5LqB_cu.js";
import { C as Clock } from "./clock-Bv0RxpY4.js";
import { C as Circle } from "./circle-B2wPxkrm.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./createLucideIcon-ByQ9CEis.js";
function Diligence() {
  const {
    data: items = []
  } = useQuery({
    queryKey: ["due-diligence"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("due_diligence_items").select("id, section, status").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const sections = Object.entries(items.reduce((acc, item) => {
    const key = item.section || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      label: item.section || "Item",
      done: String(item.status).toLowerCase().includes("done")
    });
    return acc;
  }, {})).map(([t, list]) => ({
    t,
    items: list.map((i) => [i.label, i.done])
  }));
  const total = sections.flatMap((s) => s.items).length;
  const doneCount = sections.flatMap((s) => s.items).filter(([, done]) => done).length;
  const progress = total ? Math.round(doneCount / total * 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Due Diligence" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Atlas Robotics · Series A · Lead" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Overall progress" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm tabular-nums", children: [
          progress,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand", style: {
        width: `${progress}%`
      } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-4 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5 text-success" }),
          " ",
          doneCount,
          " done"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3.5 w-3.5 text-warning" }),
          " ",
          Math.max(0, total - doneCount),
          " open"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-3.5 w-3.5" }),
          " ",
          total,
          " total"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-4", children: sections.map((s) => {
      const done = s.items.filter(([_, d]) => d).length;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-b border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: s.t }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
            done,
            "/",
            s.items.length
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: s.items.map(([label, done2]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
          done2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-success" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Circle, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-sm ${done2 ? "text-muted-foreground line-through" : ""}`, children: label })
        ] }, label)) })
      ] }, s.t);
    }) })
  ] });
}
export {
  Diligence as component
};
