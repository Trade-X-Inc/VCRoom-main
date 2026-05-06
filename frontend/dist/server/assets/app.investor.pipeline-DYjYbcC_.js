import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Kanban, List } from "lucide-react";
const stages = [{
  k: "Sourced",
  color: "bg-muted-foreground"
}, {
  k: "Reviewing",
  color: "bg-brand"
}, {
  k: "Diligence",
  color: "bg-warning"
}, {
  k: "Partner Review",
  color: "bg-violet"
}, {
  k: "Term Sheet",
  color: "bg-success"
}, {
  k: "Closed/Passed",
  color: "bg-destructive"
}];
function PipelinePage() {
  const [view, setView] = useState("kanban");
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "My Pipeline" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Your personal deal tracking" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => setView("kanban"), className: `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === "kanban" ? "bg-accent text-foreground font-medium" : "text-muted-foreground"}`, children: [
          /* @__PURE__ */ jsx(Kanban, { className: "h-3.5 w-3.5" }),
          " Kanban"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setView("list"), className: `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === "list" ? "bg-accent text-foreground font-medium" : "text-muted-foreground"}`, children: [
          /* @__PURE__ */ jsx(List, { className: "h-3.5 w-3.5" }),
          " List"
        ] })
      ] })
    ] }),
    view === "kanban" ? /* @__PURE__ */ jsx("div", { className: "mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-4", children: /* @__PURE__ */ jsx("div", { className: "flex gap-3 min-w-max", children: stages.map((s) => /* @__PURE__ */ jsxs("div", { className: "w-[280px] shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-1 mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: `h-2 w-2 rounded-full ${s.color}` }),
        /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold", children: s.k }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "0 · $0" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 min-h-[200px] grid place-items-center text-xs text-muted-foreground", children: "No deals here" })
    ] }, s.k)) }) }) : /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60", children: [
        /* @__PURE__ */ jsx("div", { className: "col-span-4", children: "Company" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Stage" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-1", children: "Score" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Ask" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-2", children: "Last activity" }),
        /* @__PURE__ */ jsx("div", { className: "col-span-1 text-right", children: "Actions" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "px-5 py-12 text-sm text-muted-foreground text-center", children: "No deals in your pipeline yet." })
    ] })
  ] });
}
export {
  PipelinePage as component
};
