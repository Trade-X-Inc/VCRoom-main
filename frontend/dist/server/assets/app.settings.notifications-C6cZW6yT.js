import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Bell, Save, Mail, Smartphone, Sparkles, UserPlus, MessageSquare, FileText, Briefcase } from "lucide-react";
import { a as useI18n } from "./router-BRauOI85.js";
import { c as cn } from "./utils-H80jjgLf.js";
import "@tanstack/react-router";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "clsx";
import "tailwind-merge";
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
  const [rules, setRules] = useState(notifRulesDefault);
  const [savedAt, setSavedAt] = useState(null);
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
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Bell, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: t("rules.title") })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: t("rules.subtitle") })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        savedAt && /* @__PURE__ */ jsxs("span", { className: "text-xs text-success", children: [
          "Saved at ",
          savedAt
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: save, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Save, { className: "h-4 w-4" }),
          " ",
          t("common.save")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsx("div", { className: "col-span-6", children: t("rules.events") }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsx(Mail, { className: "h-3.5 w-3.5" }),
          t("rules.email")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsx(Bell, { className: "h-3.5 w-3.5" }),
          t("rules.inApp")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "col-span-2 text-center inline-flex items-center justify-center gap-1", children: [
          /* @__PURE__ */ jsx(Smartphone, { className: "h-3.5 w-3.5" }),
          t("rules.push")
        ] })
      ] }),
      groups.map((g) => {
        const Icon = groupIcon[g];
        return /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "px-5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5" }),
            " ",
            g
          ] }),
          rules.filter((r) => r.group === g).map((r) => /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-12 items-center px-5 py-3.5 border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors", children: [
            /* @__PURE__ */ jsxs("div", { className: "col-span-6", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: r.label }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: r.description })
            ] }),
            ["email", "inApp", "push"].map((k) => /* @__PURE__ */ jsx("div", { className: "col-span-2 flex justify-center", children: /* @__PURE__ */ jsx(Toggle, { checked: r[k], onChange: (v) => update(r.id, k, v) }) }, k))
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
  return /* @__PURE__ */ jsx("button", { onClick: () => onChange(!checked), className: cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", checked ? "bg-gradient-brand" : "bg-muted border border-border/60"), children: /* @__PURE__ */ jsx("span", { className: cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5") }) });
}
export {
  NotifRulesPage as component
};
