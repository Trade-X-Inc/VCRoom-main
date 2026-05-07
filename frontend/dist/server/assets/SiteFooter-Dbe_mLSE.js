import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { L as Logo } from "./Logo-CIkq6vsm.js";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { c as cn } from "./utils-H80jjgLf.js";
import { ArrowRight } from "lucide-react";
import { L as LangSwitcher, T as ThemeToggle } from "./LangSwitcher-CgmFD5iF.js";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        brand: "bg-gradient-brand text-brand-foreground shadow-glow hover:opacity-95",
        soft: "bg-accent text-foreground hover:bg-accent/70 border border-border/60"
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-7 text-[15px]",
        xl: "h-14 rounded-xl px-8 text-base",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const nav = [
  { label: "Product", to: "/" },
  { label: "Founders", to: "/founders" },
  { label: "Investors", to: "/investors" },
  { label: "Pricing", to: "/pricing" },
  { label: "Solutions", to: "/solutions/fundraising-crm" }
];
function SiteHeader() {
  return /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-40 w-full", children: [
    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 -z-10 backdrop-blur-xl bg-background/70 border-b border-border/60" }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto flex h-16 max-w-7xl items-center justify-between px-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-10", children: [
        /* @__PURE__ */ jsx(Link, { to: "/", children: /* @__PURE__ */ jsx(Logo, {}) }),
        /* @__PURE__ */ jsx("nav", { className: "hidden md:flex items-center gap-1", children: nav.map((n) => /* @__PURE__ */ jsx(
          Link,
          {
            to: n.to,
            className: "px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md",
            activeProps: { className: "text-foreground" },
            children: n.label
          },
          n.label
        )) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(LangSwitcher, {}),
        /* @__PURE__ */ jsx(ThemeToggle, {}),
        /* @__PURE__ */ jsx(Link, { to: "/sign-in", search: { redirect: "/app" }, className: "hidden sm:inline-flex", children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", children: "Sign in" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/sign-up", search: { role: "founder" }, children: /* @__PURE__ */ jsxs(Button, { variant: "brand", size: "sm", className: "gap-1.5", children: [
          "Get started ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5" })
        ] }) })
      ] })
    ] })
  ] });
}
function SiteFooter() {
  const cols = [
    {
      title: "Product",
      links: [
        ["For Founders", "/founders"],
        ["For Investors", "/investors"],
        ["Sign in", "/sign-in"],
        ["Pricing", "/pricing"]
      ]
    },
    {
      title: "Solutions",
      links: [
        ["Fundraising CRM", "/solutions/fundraising-crm"],
        ["VC Deal Room", "/solutions/vc-deal-room"],
        ["Due Diligence", "/solutions/due-diligence"],
        ["Investor Pipeline", "/solutions/investor-pipeline"],
        ["Raise your first $1M", "/solutions/raise-1m"]
      ]
    },
    {
      title: "Company",
      links: [
        ["About", "/"],
        ["Customers", "/"],
        ["Careers", "/"],
        ["Contact", "/"]
      ]
    },
    {
      title: "Resources",
      links: [
        ["Changelog", "/"],
        ["Security", "/"],
        ["Terms", "/terms"],
        ["Privacy", "/privacy"]
      ]
    }
  ];
  return /* @__PURE__ */ jsx("footer", { className: "border-t border-border/60 bg-gradient-soft", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-6 py-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-10 md:grid-cols-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "col-span-2", children: [
        /* @__PURE__ */ jsx(Logo, {}),
        /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-xs text-sm text-muted-foreground", children: "The investor-grade platform where deals get decided." })
      ] }),
      cols.map((c) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-foreground/80", children: c.title }),
        /* @__PURE__ */ jsx("ul", { className: "mt-4 space-y-2.5", children: c.links.map(([label, to]) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, { to, className: "text-sm text-muted-foreground hover:text-foreground transition-colors", children: label }) }, label)) })
      ] }, c.title))
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 md:flex-row md:items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " Venture Room, Inc. All rights reserved."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" }),
        "All systems operational"
      ] })
    ] })
  ] }) });
}
export {
  Button as B,
  SiteHeader as S,
  SiteFooter as a
};
