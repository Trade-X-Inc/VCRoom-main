import { T as jsxRuntimeExports, r as reactExports } from "./worker-entry-Cd_qZNvB.js";
import { A as AppShell } from "./AppShell-CM86ChrN.js";
import { e as notifRulesDefault } from "./mock-UGcEIF7y.js";
import { c as useI18n } from "./router-BGpvLWsf.js";
import { a as cn } from "./utils-BYfsx3cX.js";
import { B as Bell } from "./bell-C-AkfEyM.js";
import { c as createLucideIcon } from "./createLucideIcon-3NIsAiHL.js";
import { M as Mail } from "./mail-zergbGIc.js";
import { S as Sparkles } from "./sparkles-D9nEshzh.js";
import { U as UserPlus } from "./user-plus-BBTKWlNs.js";
import { M as MessageSquare } from "./message-square-B3FYF4Hj.js";
import { F as FileText } from "./file-text-D9XXuUkz.js";
import { B as Briefcase } from "./briefcase-BOwxSwyG.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./Logo-BwaV5-7_.js";
import "./settings-CX-qH6Dy.js";
import "./user-b_Q8iwAJ.js";
import "./users-D4EiXx1L.js";
import "./shield-check-BOlOV-LA.js";
import "./LangSwitcher-CXAkmc3B.js";
import "./globe-B2cmhj34.js";
import "./building-2-DUkGSJjT.js";
import "./brain-BWEPLY4p.js";
import "./list-checks-1Ejb0VFu.js";
import "./layout-grid-DdF8o8R7.js";
import "./calendar-CONuaO2E.js";
import "./search-BIDKGnWi.js";
import "./plus-BQ1Om6Fn.js";
const __iconNode$1 = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
];
const Save = createLucideIcon("save", __iconNode$1);
const __iconNode = [
  ["rect", { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2", key: "1yt0o3" }],
  ["path", { d: "M12 18h.01", key: "mhygvu" }]
];
const Smartphone = createLucideIcon("smartphone", __iconNode);
const groupIcon = {
  "Deal activity": Briefcase,
  "Documents": FileText,
  "Messages": MessageSquare,
  "Team & invites": UserPlus,
  "AI insights": Sparkles
};
function NotifRulesPage() {
  const {
    t
  } = useI18n();
  const [rules, setRules] = reactExports.useState(notifRulesDefault);
  const [savedAt, setSavedAt] = reactExports.useState(null);
  const update = (id, key, value) => {
    setRules((rs) => rs.map((r) => r.id === id ? {
      ...r,
      [key]: value
    } : r));
  };
  const groups = Array.from(new Set(rules.map((r) => r.group)));
  const save = () => {
    setSavedAt((/* @__PURE__ */ new Date()).toLocaleTimeString());
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("rules.title") })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t("rules.subtitle") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        savedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-success", children: [
          "Saved at ",
          savedAt
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "h-4 w-4" }),
          " ",
          t("common.save")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-6", children: t("rules.events") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-3.5 w-3.5" }),
          t("rules.email")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "h-3.5 w-3.5" }),
          t("rules.inApp")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "h-3.5 w-3.5" }),
          t("rules.push")
        ] })
      ] }),
      groups.map((g) => {
        const Icon = groupIcon[g];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-3.5 w-3.5" }),
            " ",
            g
          ] }),
          rules.filter((r) => r.group === g).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 items-center px-5 py-3.5 border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-6", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: r.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: r.description })
            ] }),
            ["email", "inApp", "push"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 flex justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { checked: r[k], onChange: (v) => update(r.id, k, v) }) }, k))
          ] }, r.id))
        ] }, g);
      })
    ] })
  ] });
}
function Toggle({
  checked,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(!checked), className: cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", checked ? "bg-gradient-brand" : "bg-muted border border-border/60"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5") }) });
}
const SplitComponent = () => /* @__PURE__ */ jsxRuntimeExports.jsx(AppShell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(NotifRulesPage, {}) });
export {
  SplitComponent as component
};
