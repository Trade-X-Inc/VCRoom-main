import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { u as useAuth, a as useNavigate } from "./router-DUHyCcO4.js";
import { S as Shield } from "./shield-QHmdsR0s.js";
import { S as Smartphone } from "./smartphone-DGPUMUbA.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { T as TriangleAlert } from "./triangle-alert-11Lnv70t.js";
import { T as Trash2 } from "./trash-2-CcYLBnzw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
const __iconNode = [
  ["path", { d: "m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4", key: "g0fldk" }],
  ["path", { d: "m21 2-9.6 9.6", key: "1j0ho8" }],
  ["circle", { cx: "7.5", cy: "15.5", r: "5.5", key: "yqb3hr" }]
];
const Key = createLucideIcon("key", __iconNode);
function Security() {
  const {
    signOut
  } = useAuth();
  const nav = useNavigate();
  const [twoFA, setTwoFA] = reactExports.useState(true);
  const [sessionTimeout, setSessionTimeout] = reactExports.useState(true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-4 w-4 text-brand" }),
        " Authentication"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: Smartphone, title: "Two-factor authentication", sub: "Required for all admin actions.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { checked: twoFA, onChange: setTwoFA }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { icon: Key, title: "Auto-logout after 30 min inactivity", sub: "Recommended for shared devices.", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { checked: sessionTimeout, onChange: setSessionTimeout }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: "Active sessions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 divide-y divide-border/60", children: [{
        dev: "MacBook Pro · Chrome",
        loc: "San Francisco, US",
        current: true
      }, {
        dev: "iPhone 15 · Safari",
        loc: "San Francisco, US"
      }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between py-3 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium", children: [
            s.dev,
            " ",
            s.current && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5 ml-1", children: "This device" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: s.loc })
        ] }),
        !s.current && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-xs text-muted-foreground hover:text-destructive", children: "Revoke" })
      ] }, s.dev)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-destructive/30 bg-destructive/5 p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold inline-flex items-center gap-2 text-destructive", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-4 w-4" }),
        " Danger zone"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: "Sign out of all devices" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Ends every active session." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          signOut();
          nav({
            to: "/sign-in",
            search: {
              redirect: "/app"
            }
          });
        }, className: "rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm hover:bg-destructive/10 inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }),
          " Sign out everywhere"
        ] })
      ] })
    ] })
  ] });
}
function Row({
  icon: Icon,
  title,
  sub,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-md bg-accent text-foreground/70 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: sub })
      ] })
    ] }),
    children
  ] });
}
function Toggle({
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(!checked), className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-gradient-brand" : "bg-muted border border-border/60"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}` }) });
}
export {
  Security as component
};
