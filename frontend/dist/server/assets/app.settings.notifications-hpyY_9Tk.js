import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-4qtpAlX3.js";
import { d as useI18n } from "./router-DliDWiY8.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { B as Bell } from "./bell-DuuhWqqD.js";
import { c as createLucideIcon } from "./createLucideIcon-amrEyyxI.js";
import { M as Mail } from "./mail-ByPqqOog.js";
import { S as Smartphone } from "./smartphone-Bn4Maqus.js";
import { S as Sparkles } from "./sparkles-DVrSr6Sk.js";
import { U as UserPlus } from "./user-plus-CRS__GJY.js";
import { M as MessageSquare } from "./message-square-CFHAruJW.js";
import { F as FileText } from "./file-text-AooM6BWu.js";
import { B as Briefcase } from "./briefcase-B4COjR_G.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
const __iconNode = [
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
const Save = createLucideIcon("save", __iconNode);
const notifRulesDefault = [{
  id: "r1",
  group: "Deal activity",
  label: "Investor opened deal room",
  description: "Get notified when an investor first enters a room.",
  email: true,
  inApp: true,
  push: false
}, {
  id: "r2",
  group: "Deal activity",
  label: "NDA signed",
  description: "Legal milestone — high-signal event.",
  email: true,
  inApp: true,
  push: true
}, {
  id: "r3",
  group: "Deal activity",
  label: "Stage changed",
  description: "When a deal moves between pipeline stages.",
  email: false,
  inApp: true,
  push: false
}, {
  id: "r4",
  group: "Documents",
  label: "Document downloaded",
  description: "Track who downloads sensitive files.",
  email: false,
  inApp: true,
  push: false
}, {
  id: "r5",
  group: "Documents",
  label: "New document uploaded",
  description: "Workspace-wide upload notifications.",
  email: true,
  inApp: true,
  push: false
}, {
  id: "r6",
  group: "Messages",
  label: "New question in Q&A",
  description: "When an investor asks a question.",
  email: true,
  inApp: true,
  push: true
}, {
  id: "r7",
  group: "Messages",
  label: "Direct message",
  description: "1:1 messages from investors or team.",
  email: true,
  inApp: true,
  push: true
}, {
  id: "r8",
  group: "Team & invites",
  label: "Invite accepted",
  description: "When someone joins via invite link.",
  email: true,
  inApp: true,
  push: false
}, {
  id: "r9",
  group: "Team & invites",
  label: "New team member added",
  description: "Workspace membership changes.",
  email: true,
  inApp: true,
  push: false
}, {
  id: "r10",
  group: "AI insights",
  label: "Weekly AI brief",
  description: "Mondays at 9 AM — round summary.",
  email: true,
  inApp: false,
  push: false
}, {
  id: "r11",
  group: "AI insights",
  label: "Stalled investor flagged",
  description: "AI detects an at-risk relationship.",
  email: true,
  inApp: true,
  push: true
}];
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
export {
  NotifRulesPage as component
};
