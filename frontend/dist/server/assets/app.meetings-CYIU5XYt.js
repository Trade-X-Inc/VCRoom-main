import { jsxs, jsx } from "react/jsx-runtime";
import { Calendar } from "lucide-react";
function Meetings() {
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Meetings" }),
    /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Upcoming investor meetings with prep notes." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-xl border border-border/60 bg-card shadow-card p-10 flex flex-col items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-full bg-accent", children: /* @__PURE__ */ jsx(Calendar, { className: "h-5 w-5 text-muted-foreground" }) }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No meetings scheduled" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground text-center max-w-xs", children: "Schedule meetings with investors directly from a deal room or use the button below." }),
      /* @__PURE__ */ jsxs("button", { className: "mt-2 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }),
        " Schedule a meeting"
      ] })
    ] })
  ] });
}
export {
  Meetings as component
};
