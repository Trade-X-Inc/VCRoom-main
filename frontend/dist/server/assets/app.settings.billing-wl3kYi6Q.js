import { jsxs, jsx } from "react/jsx-runtime";
import { CreditCard, Check, Download } from "lucide-react";
function Billing() {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(CreditCard, { className: "h-4 w-4 text-brand" }),
        " Plan"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 grid sm:grid-cols-3 gap-3", children: [{
        name: "Starter",
        price: "Free",
        features: ["1 deal room", "5 documents", "Basic Q&A"]
      }, {
        name: "Growth",
        price: "$49/mo",
        features: ["Unlimited rooms", "100 docs", "AI advisor"],
        current: true
      }, {
        name: "Fund",
        price: "$199/mo",
        features: ["Unlimited rooms", "Custom domain", "API access"]
      }].map((p) => /* @__PURE__ */ jsxs("div", { className: `rounded-xl border p-4 ${p.current ? "border-brand bg-brand/5" : "border-border/60"}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: p.name }),
          p.current && /* @__PURE__ */ jsx("span", { className: "text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5", children: "Current" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold mt-1", children: p.price }),
        /* @__PURE__ */ jsx("ul", { className: "mt-3 space-y-1.5 text-xs text-muted-foreground", children: p.features.map((f) => /* @__PURE__ */ jsxs("li", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 text-success" }),
          " ",
          f
        ] }, f)) }),
        /* @__PURE__ */ jsx("button", { className: `mt-4 w-full rounded-md py-2 text-sm ${p.current ? "border border-border/60" : "bg-gradient-brand text-brand-foreground shadow-glow"}`, children: p.current ? "Manage" : "Upgrade" })
      ] }, p.name)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: "Invoices" }),
      /* @__PURE__ */ jsx("div", { className: "mt-3 divide-y divide-border/60", children: ["May 2026", "Apr 2026", "Mar 2026"].map((m) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between py-3 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: m }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "$49.00 · Paid" })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground", children: [
          /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }),
          " PDF"
        ] })
      ] }, m)) })
    ] })
  ] });
}
export {
  Billing as component
};
