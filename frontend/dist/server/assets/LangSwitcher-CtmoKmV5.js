import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { e as useTheme, d as useI18n, f as LANGUAGES } from "./router-DUHyCcO4.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { G as Globe } from "./globe-C2Bd-UgU.js";
const __iconNode$2 = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2", key: "48i651" }],
  ["line", { x1: "8", x2: "16", y1: "21", y2: "21", key: "1svkeh" }],
  ["line", { x1: "12", x2: "12", y1: "17", y2: "21", key: "vw1qmm" }]
];
const Monitor = createLucideIcon("monitor", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
      key: "kfwtm"
    }
  ]
];
const Moon = createLucideIcon("moon", __iconNode$1);
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
];
const Sun = createLucideIcon("sun", __iconNode);
function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const [open, setOpen] = reactExports.useState(false);
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const opts = [
    { v: "light", label: "Light", icon: Sun },
    { v: "dark", label: "Dark", icon: Moon },
    { v: "system", label: "System", icon: Monitor }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground",
        "aria-label": "Toggle theme",
        children: resolved === "dark" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "h-4 w-4" })
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute end-0 mt-2 w-40 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50", children: opts.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => {
          setTheme(o.v);
          setOpen(false);
        },
        className: cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
          theme === o.v && "bg-accent text-foreground font-medium"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(o.icon, { className: "h-3.5 w-3.5" }),
          " ",
          o.label
        ]
      },
      o.v
    )) })
  ] });
}
function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = reactExports.useState(false);
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const cur = LANGUAGES.find((l) => l.code === lang);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-border/60 hover:bg-accent transition-colors text-xs text-muted-foreground hover:text-foreground",
        "aria-label": "Change language",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-3.5 w-3.5" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium uppercase", children: cur.code })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute end-0 mt-2 w-48 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50", children: LANGUAGES.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => {
          setLang(l.code);
          setOpen(false);
        },
        className: cn(
          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
          lang === l.code && "bg-accent font-medium"
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: l.flag }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 text-start", children: l.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-muted-foreground uppercase", children: l.code })
        ]
      },
      l.code
    )) })
  ] });
}
export {
  LangSwitcher as L,
  ThemeToggle as T
};
