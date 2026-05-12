import { jsxs, jsx } from "react/jsx-runtime";
import { S as SiteHeader, B as Button, a as SiteFooter } from "./SiteFooter-uXYMh1zr.js";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import "./Logo-CIkq6vsm.js";
import "react";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "./utils-H80jjgLf.js";
import "clsx";
import "tailwind-merge";
import "./LangSwitcher-F8OxBFA2.js";
import "./router-3WmBSyta.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
function About() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsx("main", { className: "mx-auto max-w-7xl px-6 py-24 md:py-32", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl", children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Our Mission" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-tight", children: "Building the operating system for the next generation of venture." }),
      /* @__PURE__ */ jsx("p", { className: "mt-8 text-lg md:text-xl text-muted-foreground leading-relaxed", children: "Venture Room was born out of a simple observation: fundraising is the most critical part of a startup's journey, yet it remains one of the most fragmented and unstructured processes." }),
      /* @__PURE__ */ jsx("p", { className: "mt-6 text-lg text-muted-foreground leading-relaxed", children: "We're building a platform that bridges the gap between founders and investors, providing a structured, secure, and AI-enhanced workspace where deals don't just get discussed—they get decided." }),
      /* @__PURE__ */ jsx("div", { className: "mt-12", children: /* @__PURE__ */ jsx(Link, { to: "/sign-up", children: /* @__PURE__ */ jsxs(Button, { size: "lg", className: "gap-2", children: [
        "Join the journey ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) }) })
    ] }) }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
export {
  About as component
};
