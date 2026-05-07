import { jsxs, jsx } from "react/jsx-runtime";
import { Moon, Sun, Monitor, Globe } from "lucide-react";
import { b as useTheme, a as useI18n, L as LANGUAGES } from "./router-C0llBC3B.js";
import { useState, useRef, useEffect } from "react";
import { c as cn } from "./utils-H80jjgLf.js";
function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs("div", { className: "relative", ref, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground",
        "aria-label": "Toggle theme",
        children: resolved === "dark" ? /* @__PURE__ */ jsx(Moon, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Sun, { className: "h-4 w-4" })
      }
    ),
    open && /* @__PURE__ */ jsx("div", { className: "absolute end-0 mt-2 w-40 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50", children: opts.map((o) => /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsx(o.icon, { className: "h-3.5 w-3.5" }),
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
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const cur = LANGUAGES.find((l) => l.code === lang);
  return /* @__PURE__ */ jsxs("div", { className: "relative", ref, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setOpen((v) => !v),
        className: "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-border/60 hover:bg-accent transition-colors text-xs text-muted-foreground hover:text-foreground",
        "aria-label": "Change language",
        children: [
          /* @__PURE__ */ jsx(Globe, { className: "h-3.5 w-3.5" }),
          /* @__PURE__ */ jsx("span", { className: "font-medium uppercase", children: cur.code })
        ]
      }
    ),
    open && /* @__PURE__ */ jsx("div", { className: "absolute end-0 mt-2 w-48 rounded-lg border border-border/60 bg-popover shadow-elev p-1 z-50", children: LANGUAGES.map((l) => /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsx("span", { children: l.flag }),
          /* @__PURE__ */ jsx("span", { className: "flex-1 text-start", children: l.label }),
          /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground uppercase", children: l.code })
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
