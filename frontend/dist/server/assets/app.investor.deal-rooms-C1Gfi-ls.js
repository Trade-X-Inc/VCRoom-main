import { jsxs, jsx } from "react/jsx-runtime";
import { Briefcase } from "lucide-react";
const SplitComponent = () => /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
  /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Rooms" }),
  /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Active deal rooms you've been invited to." }),
  /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Briefcase, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No active deal rooms" }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Founders' deal room invitations appear here." })
  ] })
] });
export {
  SplitComponent as component
};
