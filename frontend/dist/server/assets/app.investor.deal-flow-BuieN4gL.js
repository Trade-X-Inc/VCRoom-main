import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Search, Filter, ArrowDownUp, Inbox } from "lucide-react";
import { A as AIBriefPanel } from "./AIBriefPanel-DAEtmxrb.js";
import "./utils-H80jjgLf.js";
import "clsx";
import "tailwind-merge";
function DealFlowPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [brief, setBrief] = useState(null);
  const deals = [];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-end justify-between flex-wrap gap-3", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Flow" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        deals.length,
        " new deals this week"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "mt-5 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-md", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search deals…", className: "w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsx(Filter, { className: "h-4 w-4" }),
        " Filter"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsx(ArrowDownUp, { className: "h-4 w-4" }),
        " Sort"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4 inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card", children: ["all", "new", "hot", "needs"].map((k) => /* @__PURE__ */ jsx("button", { onClick: () => setTab(k), className: `px-3 py-1.5 text-xs rounded-md ${tab === k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`, children: k === "all" ? "All" : k === "new" ? "New" : k === "hot" ? "Hot" : "Needs action" }, k)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: deals.length === 0 ? /* @__PURE__ */ jsx(EmptyDealFlow, {}) : null }),
    /* @__PURE__ */ jsx(AIBriefPanel, { data: brief, onClose: () => setBrief(null) })
  ] });
}
function EmptyDealFlow() {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Inbox, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No deals yet" }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "Deal rooms will appear here when founders invite you. New invitations show up automatically." })
  ] });
}
export {
  DealFlowPage as component
};
