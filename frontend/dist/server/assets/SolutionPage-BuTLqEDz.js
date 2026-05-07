import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { S as SiteHeader, B as Button, a as SiteFooter } from "./SiteFooter-vi4LhQky.js";
import { A as AppPreview } from "./AppPreview-BtsG-qZV.js";
import { ArrowRight, Check } from "lucide-react";
function SolutionPage({ eyebrow, title, sub, Icon, features }) {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-hero" }),
      /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl px-6 pt-20 pb-16", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs", children: [
          /* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5 text-brand" }),
          " ",
          eyebrow
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]", children: title }),
        /* @__PURE__ */ jsx("p", { className: "mt-5 text-lg text-muted-foreground max-w-xl", children: sub }),
        /* @__PURE__ */ jsxs("div", { className: "mt-7 flex gap-3", children: [
          /* @__PURE__ */ jsx(Link, { to: "/app", children: /* @__PURE__ */ jsxs(Button, { variant: "brand", size: "lg", className: "gap-2", children: [
            "Get started ",
            /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
          ] }) }),
          /* @__PURE__ */ jsx(Link, { to: "/pricing", children: /* @__PURE__ */ jsx(Button, { variant: "outline", size: "lg", children: "View pricing" }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "mx-auto max-w-7xl px-6 pb-16", children: /* @__PURE__ */ jsx(AppPreview, {}) }),
    /* @__PURE__ */ jsx("section", { className: "mx-auto max-w-7xl px-6 py-20", children: /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-3 gap-5", children: features.map(([t, d]) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-7 shadow-card", children: [
      /* @__PURE__ */ jsx(Check, { className: "h-5 w-5 text-brand" }),
      /* @__PURE__ */ jsx("div", { className: "mt-4 text-base font-semibold", children: t }),
      /* @__PURE__ */ jsx("div", { className: "mt-1.5 text-sm text-muted-foreground", children: d })
    ] }, t)) }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
export {
  SolutionPage as S
};
