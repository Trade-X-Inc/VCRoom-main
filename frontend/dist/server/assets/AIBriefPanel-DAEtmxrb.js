import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { Brain, X, CheckCircle2, AlertTriangle, Shield, ArrowRight } from "lucide-react";
import { c as cn } from "./utils-H80jjgLf.js";
function AIBriefPanel({ data, onClose, onOpenDealRoom }) {
  if (!data) return null;
  const score = data.thesisMatch;
  const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const scoreBg = score >= 80 ? "bg-success/10" : score >= 60 ? "bg-warning/10" : "bg-destructive/10";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxs("aside", { className: "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-background border-l border-border/60 shadow-elev flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-5 border-b border-border/60 flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Brain, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: "AI Brief" }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground truncate", children: [
            data.company,
            data.tagline ? ` · ${data.tagline}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-5 space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: cn("rounded-2xl p-4 flex items-center gap-4", scoreBg), children: [
          /* @__PURE__ */ jsx("div", { className: cn("text-3xl font-semibold tabular-nums", scoreColor), children: score }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Thesis match score" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs mt-0.5", children: score >= 80 ? "Strong fit with your thesis." : score >= 60 ? "Partial fit — worth a closer look." : "Limited fit with your current thesis." })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Section, { icon: CheckCircle2, title: "Strengths", tone: "text-success", items: data.strengths }),
        /* @__PURE__ */ jsx(Section, { icon: AlertTriangle, title: "Risks", tone: "text-destructive", items: data.risks }),
        /* @__PURE__ */ jsx(Section, { icon: Shield, title: "Mitigants", tone: "text-brand", items: data.mitigants }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-accent/30 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Suggested next action" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm", children: data.nextAction })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-t border-border/60 p-4", children: /* @__PURE__ */ jsxs("button", { onClick: onOpenDealRoom, className: "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm shadow-glow", children: [
        "Open full deal room ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) })
    ] })
  ] });
}
function Section({ icon: Icon, title, tone, items }) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold mb-2", tone), children: [
      /* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5" }),
      " ",
      title
    ] }),
    /* @__PURE__ */ jsx("ul", { className: "space-y-1.5", children: items.map((s, i) => /* @__PURE__ */ jsxs("li", { className: "text-sm flex gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: cn("mt-2 h-1 w-1 rounded-full shrink-0", tone.replace("text-", "bg-")) }),
      /* @__PURE__ */ jsx("span", { children: s })
    ] }, i)) })
  ] });
}
export {
  AIBriefPanel as A
};
