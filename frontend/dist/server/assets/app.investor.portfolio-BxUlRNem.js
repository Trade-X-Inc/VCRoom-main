import { jsxs, jsx } from "react/jsx-runtime";
import { PieChart } from "lucide-react";
function PortfolioPage() {
  const companies = [];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Portfolio" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Track your investments" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6", children: [["Total invested", "$0"], ["Companies", "0"], ["Avg ownership", "—"], ["Best performer", "—"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: companies.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(PieChart, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No portfolio companies yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "Companies appear here after you mark a deal as Invested in the Decisions board." })
    ] }) : null })
  ] });
}
export {
  PortfolioPage as component
};
