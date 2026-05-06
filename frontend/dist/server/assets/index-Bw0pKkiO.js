import { U as jsxRuntimeExports } from "./worker-entry-4qtpAlX3.js";
import { L as Link } from "./router-DliDWiY8.js";
import { S as SiteHeader, a as SiteFooter, B as Button } from "./SiteFooter-DkNoLrOk.js";
import { A as AppPreview } from "./AppPreview-UG0flS_B.js";
import { A as ArrowRight } from "./arrow-right-BoBYgBgI.js";
import { T as TriangleAlert } from "./triangle-alert-WS6THD8c.js";
import { U as Users } from "./users-B4gkQn5o.js";
import { S as Sparkles } from "./sparkles-DVrSr6Sk.js";
import { B as Briefcase } from "./briefcase-B4COjR_G.js";
import { S as ShieldCheck } from "./shield-check-5eViWcoV.js";
import { F as FileText } from "./file-text-AooM6BWu.js";
import { L as ListChecks } from "./list-checks-D84OOO8y.js";
import { L as Layers } from "./layers-B60U2037.js";
import { C as CircleCheck } from "./circle-check-DyneNPE7.js";
import { M as MessageSquare } from "./message-square-CFHAruJW.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./Logo-D6dspbRM.js";
import "./utils-Bz4m9VPB.js";
import "./LangSwitcher-WD19H3AP.js";
import "./createLucideIcon-amrEyyxI.js";
import "./globe-BuWKFBTI.js";
import "./layout-grid-B1CM5Vx9.js";
import "./search-CV2-VOeA.js";
import "./bell-DuuhWqqD.js";
import "./trending-up-9mYxMVFY.js";
import "./chevron-right-DAhPHPMx.js";
import "./arrow-up-right-CQYgbfED.js";
function Landing() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background text-foreground", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Hero, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(LogoCloud, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Problem, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Solution, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Features, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Preview, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(HowItWorks, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FinalCTA, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteFooter, {})
  ] });
}
function Hero() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-hero" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent_70%)]" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "inline-block h-1.5 w-1.5 rounded-full bg-gradient-brand" }),
        "New · AI Email Assistant for founders",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3 w-3" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "mt-6 text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1.02]", children: [
        "Where deals",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-gradient-brand", children: "get decided." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mx-auto mt-6 max-w-xl text-base md:text-lg text-muted-foreground", children: "Manage your entire fundraise — from first investor email to final decision — in one structured platform built for founders and VCs." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-col sm:flex-row items-center justify-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "brand", size: "lg", className: "gap-2", children: [
          "Start as Founder ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app/investor", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "lg", children: "For Investors" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-xs text-muted-foreground", children: "No credit card · 14-day trial · SOC 2 Type II" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative mt-16", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -inset-x-10 -top-10 -bottom-10 -z-10 bg-gradient-mesh opacity-50 blur-3xl" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AppPreview, {})
      ] })
    ] })
  ] });
}
function LogoCloud() {
  const logos = ["Sequoia", "a16z", "Index", "Accel", "Lightspeed", "Bessemer", "Greylock"];
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "border-y border-border/60 bg-gradient-soft py-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-xs uppercase tracking-wider text-muted-foreground", children: "Trusted by founders raising from" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-x-8 gap-y-4 place-items-center", children: logos.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium text-muted-foreground/80 tracking-tight", children: l }, l)) })
  ] }) });
}
function Problem() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-6 py-24", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-2xl text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "The problem" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]", children: "Fundraising is broken on both sides." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-14 grid md:grid-cols-2 gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-8 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium", children: "For founders" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-xl font-semibold", children: "You're flying blind." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-5 space-y-3 text-sm text-muted-foreground", children: ["Messy outreach across spreadsheets and inboxes", "No tracking on who replied, when, or why", "Decks, NDAs, and updates scattered everywhere", "No idea which investor is actually serious"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4 text-warning shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t })
        ] }, t)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-8 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium", children: "For VCs" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-4 text-xl font-semibold", children: "You're drowning in deals." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mt-5 space-y-3 text-sm text-muted-foreground", children: ["Hundreds of decks per month, no structure", "Diligence lives in 6 different tools", "Partners can't see deal status at a glance", "Decisions take weeks instead of days"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "flex gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4 text-warning shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t })
        ] }, t)) })
      ] })
    ] })
  ] });
}
function Solution() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-soft" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto max-w-7xl px-6 py-24", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid md:grid-cols-2 gap-16 items-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "The solution" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]", children: [
          "One platform.",
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          "The whole fundraise."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-muted-foreground text-base max-w-md", children: "Venture Room combines a purpose-built CRM, a structured deal room, and an AI assistant that drafts, tracks, and analyzes every interaction." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8 grid grid-cols-3 gap-3 max-w-md", children: [{
          k: "CRM",
          v: "Pipeline"
        }, {
          k: "Deal Room",
          v: "Diligence"
        }, {
          k: "AI",
          v: "Assistant"
        }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase text-muted-foreground tracking-wider", children: s.k }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium mt-0.5", children: s.v })
        ] }, s.k)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card shadow-elev p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl bg-gradient-mesh p-8 min-h-[360px] flex items-center justify-center relative overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 noise opacity-60" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "relative grid grid-cols-2 gap-3 w-full max-w-sm", children: [{
          i: Users,
          l: "VC CRM",
          c: "47 leads"
        }, {
          i: Sparkles,
          l: "AI drafts",
          c: "12 ready"
        }, {
          i: Briefcase,
          l: "Deal rooms",
          c: "4 active"
        }, {
          i: ShieldCheck,
          l: "NDA",
          c: "Auto"
        }].map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card/90 backdrop-blur p-4 shadow-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(b.i, { className: "h-4 w-4 text-brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-sm font-medium", children: b.l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: b.c })
        ] }, b.l)) })
      ] }) }) })
    ] }) })
  ] });
}
function Features() {
  const feats = [{
    i: Users,
    t: "VC Lead CRM",
    d: "Kanban pipeline from first email to term sheet. Notes, follow-ups, intros."
  }, {
    i: Sparkles,
    t: "AI Email Assistant",
    d: "Draft cold emails, follow-ups, and updates in your voice — in seconds."
  }, {
    i: Briefcase,
    t: "Deal Room",
    d: "Structured rooms with documents, Q&A, checklist, decision board."
  }, {
    i: FileText,
    t: "Document Vault",
    d: "Versioned, watermarked, permissioned. Know exactly who viewed what."
  }, {
    i: ShieldCheck,
    t: "NDA Flow",
    d: "Auto-filled, click-to-sign NDAs that gate access in one step."
  }, {
    i: ListChecks,
    t: "Due Diligence",
    d: "Templated checklists across legal, financial, technical, market."
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-6 py-24", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Features" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]", children: [
        "Everything you need.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "Nothing you don't."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60", children: feats.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card p-7 hover:bg-accent/40 transition-colors group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground shadow-glow", children: /* @__PURE__ */ jsxRuntimeExports.jsx(f.i, { className: "h-5 w-5" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 text-base font-semibold", children: f.t }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 text-sm text-muted-foreground", children: f.d }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors", children: [
        "Learn more ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3 w-3" })
      ] })
    ] }, f.t)) })
  ] });
}
function Preview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "relative border-y border-border/60", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-soft" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-7xl px-6 py-24", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Product preview" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]", children: "A workspace that respects your time." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid lg:grid-cols-3 gap-5", children: [{
        t: "Dashboard",
        d: "Real-time fundraising progress.",
        c: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniDashboard, {})
      }, {
        t: "Pipeline",
        d: "Drag, drop, decide.",
        c: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniPipeline, {})
      }, {
        t: "Deal Room",
        d: "Where decisions happen.",
        c: /* @__PURE__ */ jsxRuntimeExports.jsx(MiniDealRoom, {})
      }].map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: b.t }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: b.d })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-gradient-soft min-h-[220px]", children: b.c })
      ] }, b.t)) })
    ] })
  ] });
}
function MiniDashboard() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-card p-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase text-muted-foreground tracking-wider", children: "Raised" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-semibold", children: "$3.2M" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-success", children: "+12%" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full w-[40%] bg-gradient-brand" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 gap-2", children: [["Investors", "47"], ["Meetings", "18"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-card p-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: l }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: v })
    ] }, l)) })
  ] });
}
function MiniPipeline() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-3 gap-2 h-full", children: [["Replied", 9, "bg-brand"], ["Meeting", 5, "bg-violet"], ["DR", 4, "bg-success"]].map(([l, n, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-card p-2 flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground", children: l }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${c}` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: n }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 space-y-1 flex-1", children: Array.from({
      length: 3
    }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 rounded bg-muted/70" }, i)) })
  ] }, l)) });
}
function MiniDealRoom() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-card p-2.5 flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "h-3.5 w-3.5 text-brand" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-medium flex-1", children: "Atlas Robotics — Series A" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded-full bg-success/15 text-success px-1.5 py-0.5", children: "Active" })
    ] }),
    [["Pitch deck v3", CircleCheck, "text-success"], ["Cap table", CircleCheck, "text-success"], ["Financial model", TriangleAlert, "text-warning"], ["Q&A · 12 open", MessageSquare, "text-muted-foreground"]].map(([l, I, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-md border border-border/60 bg-card p-2.5 flex items-center gap-2 text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: `h-3.5 w-3.5 ${c}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: l })
    ] }, l))
  ] });
}
function HowItWorks() {
  const steps = [{
    n: "01",
    t: "Add leads",
    d: "Import a CSV or let AI build your list from your sector and stage."
  }, {
    n: "02",
    t: "Reach out",
    d: "AI drafts personalized cold emails. You approve. We track every reply."
  }, {
    n: "03",
    t: "Open deal room",
    d: "One-click structured room with NDA, docs, Q&A, and decision board."
  }];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mx-auto max-w-7xl px-6 py-24", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "How it works" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]", children: "From zero to closed in three moves." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-12 grid md:grid-cols-3 gap-5", children: steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-2xl border border-border/60 bg-card p-7 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-mono text-brand", children: s.n }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-lg font-semibold", children: s.t }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-sm text-muted-foreground", children: s.d }),
      i < steps.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 bg-background rounded-full p-0.5" })
    ] }, s.n)) })
  ] });
}
function FinalCTA() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mx-auto max-w-7xl px-6 pb-24", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative overflow-hidden rounded-3xl border border-border/60 bg-primary text-primary-foreground p-12 md:p-20 text-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-30" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 noise opacity-40" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-4xl md:text-6xl font-semibold tracking-[-0.03em]", children: [
        "Run your fundraise",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "like a pro."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-5 text-base md:text-lg opacity-70 max-w-lg mx-auto", children: "Join the founders and investors making decisions faster, with more clarity." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-8 flex flex-col sm:flex-row items-center justify-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "brand", size: "lg", className: "gap-2", children: [
          "Start free ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app/investor", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "lg", className: "bg-background/10 text-primary-foreground hover:bg-background/20 border border-primary-foreground/20", children: "For Investors" }) })
      ] })
    ] })
  ] }) });
}
export {
  Landing as component
};
