import { U as jsxRuntimeExports } from "./worker-entry-Dz_cryAq.js";
import { G as Globe } from "./globe-DAjxjmXb.js";
import { U as Users } from "./users-Dy1T1nNp.js";
import { C as Calendar } from "./calendar-DRyWGfH0.js";
import { B as Building2 } from "./building-2-SZPemSWy.js";
import { U as Upload } from "./upload-BF_6UqKn.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-BWyo4Tuv.js";
function Profile() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Startup Profile" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "This is what investors see when they enter your deal room." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: "Save changes" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-32 bg-gradient-mesh relative", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 noise opacity-40" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 pb-6 -mt-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-2xl font-semibold border-4 border-background shadow-elev", children: "A" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold", children: "Atlas Robotics" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Industrial robotics powered by physical AI" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [[Globe, "HQ", "San Francisco"], [Users, "Team", "23"], [Calendar, "Founded", "2022"], [Building2, "Stage", "Series A"]].map(([I, l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-background/40 p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground mt-1.5", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: v })
        ] }, l)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 grid lg:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Company info" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-4", children: [["Tagline", "We make industrial robots that learn from one demonstration."], ["Sector", "Robotics · Industrial automation · Physical AI"], ["Business model", "Hardware + SaaS · Per-robot license"], ["Pitch", "Atlas builds general-purpose industrial robots that adapt to new tasks via demonstration learning, replacing fixed-function automation."]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm mt-1", children: v })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-6 shadow-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Key metrics" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-3", children: [["ARR", "$4.2M", "+318% YoY"], ["Customers", "12", "+5"], ["Burn", "$280K/mo", "stable"], ["Runway", "18 mo", ""]].map(([l, v, d]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium", children: [
              v,
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success text-[10px]", children: d })
            ] })
          ] }, l)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border-2 border-dashed border-border/80 bg-card p-6 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "h-5 w-5 text-muted-foreground mx-auto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium mt-2", children: "Pitch deck v3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: "Replace · 12 slides · 4.2 MB" })
        ] })
      ] })
    ] })
  ] });
}
export {
  Profile as component
};
