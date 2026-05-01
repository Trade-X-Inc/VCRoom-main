import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { a as useNavigate } from "./router-BGpvLWsf.js";
import { L as Logo } from "./Logo-BwaV5-7_.js";
import { C as Check } from "./check-CWsPEI0h.js";
import { A as ArrowRight } from "./arrow-right-D9ZRlUua.js";
import { S as ShieldCheck } from "./shield-check-BOlOV-LA.js";
import { L as Lock } from "./lock-DLWe3QQr.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
function JoinFlow() {
  const [step, setStep] = reactExports.useState(1);
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background grid lg:grid-cols-[1fr_480px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden lg:block relative overflow-hidden bg-primary text-primary-foreground p-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-30" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 noise opacity-40" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-32 max-w-md", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-semibold tracking-[-0.03em] leading-tight", children: "You've been invited to a deal room." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-primary-foreground/70", children: "Atlas Robotics has invited you to evaluate their Series A. Sign the NDA to access documents, Q&A, and the full diligence packet." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-10 space-y-3 text-sm", children: ["Bank-grade encryption", "Watermarked documents", "Audit trail on every action"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-primary-foreground/80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-4 w-4 text-success" }),
            " ",
            t
          ] }, t)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-6 lg:p-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full max-w-md", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:hidden mb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 mb-8", children: [1, 2, 3].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-gradient-brand" : "bg-muted"}` }, s)) }),
      step === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Tell us who you are" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "This information is shared with Atlas Robotics." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 space-y-3", children: [["Full name", "Sara Khan"], ["Designation", "Partner"], ["Company", "NEA"], ["Country", "United States"]].map(([l, p]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { defaultValue: p, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" })
        ] }, l)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStep(2), className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2", children: [
          "Continue ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
        ] })
      ] }),
      step === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-brand" }),
          " Mutual NDA"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-2xl font-semibold tracking-tight", children: "Sign the NDA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Auto-filled with the details you just provided." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card p-5 max-h-[280px] overflow-y-auto text-xs leading-relaxed text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-foreground font-medium mb-2", children: "Mutual Non-Disclosure Agreement" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
            "This Agreement is entered into between ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Atlas Robotics, Inc." }),
            ' ("Discloser") and ',
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-foreground font-medium", children: "Sara Khan, NEA" }),
            ' ("Recipient") as of ',
            (/* @__PURE__ */ new Date()).toLocaleDateString(),
            "."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "The Recipient agrees to hold all Confidential Information in strict confidence, use it solely for the purpose of evaluating a potential investment, and not disclose it to any third party without prior written consent…" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2", children: "This Agreement shall remain in effect for a period of two (2) years from the date of execution." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "mt-4 flex items-start gap-2.5 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", defaultChecked: true, className: "mt-0.5 h-4 w-4 accent-[var(--brand)]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm", children: "I have read and agree to the terms of this NDA. I understand my access is logged." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStep(3), className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2", children: [
          "Sign & enter deal room ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-4 w-4" })
        ] })
      ] }),
      step === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-7 w-7" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-5 text-2xl font-semibold tracking-tight", children: "You're in." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Welcome to the Atlas Robotics deal room." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => navigate({
          to: "/app/deal-room/$id",
          params: {
            id: "dr_001"
          }
        }), className: "mt-6 w-full rounded-md bg-gradient-brand text-brand-foreground py-3 text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2", children: [
          "Enter deal room ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
        ] })
      ] })
    ] }) })
  ] });
}
export {
  JoinFlow as component
};
