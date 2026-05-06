import { U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { s as supabase } from "./router-DUHyCcO4.js";
import { C as Check } from "./check-CokXn3MG.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { X } from "./x-DEg4i2kq.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
const __iconNode = [
  ["rect", { x: "14", y: "3", width: "5", height: "18", rx: "1", key: "kaeet6" }],
  ["rect", { x: "5", y: "3", width: "5", height: "18", rx: "1", key: "1wsw3u" }]
];
const Pause = createLucideIcon("pause", __iconNode);
function Decisions() {
  const {
    data: decisions = []
  } = useQuery({
    queryKey: ["decisions"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("decisions").select("id, status, notes").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const cols = {
    accept: decisions.filter((d) => String(d.status).toLowerCase() === "accept"),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => String(d.status).toLowerCase() === "pass")
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Decision Board" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Partnership-wide decisions, in one view." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [{
      t: "Accept",
      c: "success",
      i: Check,
      items: cols.accept
    }, {
      t: "Hold",
      c: "warning",
      i: Pause,
      items: cols.hold
    }, {
      t: "Pass",
      c: "destructive",
      i: X,
      items: cols.pass
    }].map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `px-5 py-3 border-b border-border/60 flex items-center gap-2 bg-${col.c}/5`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(col.i, { className: `h-4 w-4 text-${col.c}` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold", children: col.t }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: col.items.length })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3 space-y-2", children: col.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-medium", children: [
          "Decision ",
          item.id.slice(0, 8)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: item.notes || "No notes" })
      ] }, item.id)) })
    ] }, col.t)) })
  ] });
}
export {
  Decisions as component
};
