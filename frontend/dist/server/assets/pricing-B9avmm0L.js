import { U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { L as Link } from "./router-DUHyCcO4.js";
import { S as SiteHeader, B as Button, a as SiteFooter } from "./SiteFooter-ko0XRERz.js";
import { A as ArrowRight } from "./arrow-right-UEn806qT.js";
import { C as Check } from "./check-CokXn3MG.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./Logo-DAWquX1K.js";
import "./utils-Bz4m9VPB.js";
import "./LangSwitcher-CtmoKmV5.js";
import "./createLucideIcon-ByQ9CEis.js";
import "./globe-C2Bd-UgU.js";
const tiers = [{
  name: "Founder",
  price: "$0",
  period: "free during raise",
  desc: "For founders actively raising.",
  features: ["Up to 100 VC leads", "AI email assistant", "1 active deal room", "Document vault"],
  cta: "Start free"
}, {
  name: "Founder Pro",
  price: "$49",
  period: "/month",
  desc: "For serious raises.",
  features: ["Unlimited leads", "Unlimited deal rooms", "AI advisor", "Custom NDA flow", "Priority support"],
  cta: "Start trial",
  featured: true
}, {
  name: "Fund",
  price: "Custom",
  period: "talk to sales",
  desc: "For VC funds and angel networks.",
  features: ["Investor pipeline", "Team seats", "AI deal analysis", "SSO + SOC 2", "Dedicated CSM"],
  cta: "Contact sales"
}];
function Pricing() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-6 pt-20 pb-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center max-w-2xl mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Pricing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.03em]", children: [
          "Honest pricing.",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "No surprises."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-muted-foreground", children: "Start free. Upgrade when your raise demands it." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-14 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto", children: tiers.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-2xl border p-7 ${t.featured ? "border-brand/50 bg-card shadow-elev relative" : "border-border/60 bg-card shadow-card"}`, children: [
        t.featured && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider bg-gradient-brand text-brand-foreground px-2.5 py-0.5 rounded-full", children: "Most popular" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: t.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-baseline gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-4xl font-semibold tracking-tight", children: t.price }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: t.period })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-sm text-muted-foreground", children: t.desc }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app", className: "block mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "w-full", variant: t.featured ? "brand" : "outline", size: "lg", children: [
          t.cta,
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-7 space-y-3", children: t.features.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex items-start gap-2.5 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4 text-brand shrink-0 mt-0.5" }),
          " ",
          f
        ] }, f)) })
      ] }, t.name)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteFooter, {})
  ] });
}
export {
  Pricing as component
};
