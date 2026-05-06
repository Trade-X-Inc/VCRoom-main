import { jsxs, jsx } from "react/jsx-runtime";
const GRADIENT_ID = "vr-logo-panel-g";
function Logo({ withWordmark = true }) {
  return /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2", children: [
    /* @__PURE__ */ jsxs(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 32 32",
        className: "h-8 w-8 shrink-0",
        "aria-hidden": "true",
        children: [
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: GRADIENT_ID, x1: "0", y1: "0", x2: "0.5", y2: "1", children: [
            /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#7B8FFF" }),
            /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#4F62F0" })
          ] }) }),
          /* @__PURE__ */ jsx("rect", { width: "32", height: "32", rx: "7", fill: "#0D1933" }),
          /* @__PURE__ */ jsx("path", { d: "M13 7 h8 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 h-8", fill: "#1A3050" }),
          /* @__PURE__ */ jsx("rect", { x: "4", y: "7", width: "12", height: "18", rx: "2.5", fill: `url(#${GRADIENT_ID})` }),
          /* @__PURE__ */ jsx("circle", { cx: "18.5", cy: "16", r: "1.4", fill: "#7B8FFF" })
        ]
      }
    ),
    withWordmark && /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold tracking-tight", children: "Venture Room" })
  ] });
}
export {
  Logo as L
};
