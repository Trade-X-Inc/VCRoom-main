import { U as jsxRuntimeExports, _ as Outlet } from "./worker-entry-Cmmw-2kk.js";
import { L as Link, u as useAuth, s as supabase } from "./router-DUHyCcO4.js";
import { u as useRouterState } from "./useRouterState-HD9MJh1w.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { S as Settings } from "./settings-BnDFnI-4.js";
import { B as Building2 } from "./building-2-e7mFjcBM.js";
import { G as Globe } from "./globe-C2Bd-UgU.js";
import { B as Bell } from "./bell-nx3hwQdI.js";
import { C as CreditCard } from "./credit-card-7dAxqfe9.js";
import { S as Shield } from "./shield-QHmdsR0s.js";
import { U as User } from "./user-BVMtp3jl.js";
import { U as Users } from "./users-DG4-LCT1.js";
import { T as Trash2 } from "./trash-2-CcYLBnzw.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./createLucideIcon-ByQ9CEis.js";
const tabs = [{
  to: "/app/settings",
  label: "General",
  icon: Building2,
  exact: true
}, {
  to: "/app/settings/domain",
  label: "Domain & Email",
  icon: Globe
}, {
  to: "/app/settings/notifications",
  label: "Notifications",
  icon: Bell
}, {
  to: "/app/settings/billing",
  label: "Billing",
  icon: CreditCard
}, {
  to: "/app/settings/security",
  label: "Security",
  icon: Shield
}];
function SettingsLayout() {
  const path = useRouterState({
    select: (s) => s.location.pathname
  });
  const isIndex = path === "/app/settings";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "h-5 w-5 text-brand" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Settings" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Manage workspace, domain, notifications, billing and security." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-[220px_1fr] gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-1", children: tabs.map((t) => {
        const active = t.exact ? path === t.to : path.startsWith(t.to);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: t.to, className: cn("flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors", active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(t.icon, { className: cn("h-4 w-4", active && "text-brand") }),
          " ",
          t.label
        ] }, t.to);
      }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-w-0", children: isIndex ? /* @__PURE__ */ jsxRuntimeExports.jsx(General, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(Outlet, {}) })
    ] })
  ] });
}
function General() {
  const {
    user
  } = useAuth();
  const {
    data: startup
  } = useQuery({
    queryKey: ["startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("id, name, website, description").eq("founder_id", user.id);
      return data?.[0] ?? null;
    }
  });
  const companyName = startup?.name ?? user?.workspace ?? "";
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Workspace", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Workspace name", value: companyName, placeholder: "Your company name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Public URL slug", value: slug, prefix: "ventureroom.app/", placeholder: "your-company" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sel, { label: "Default language", options: ["English", "Español", "Français", "Deutsch", "العربية"] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sel, { label: "Time zone", options: ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Dubai"] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { title: "Account", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/profile", className: "flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm hover:bg-accent transition-colors", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Edit profile" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "→" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/users", className: "flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm hover:bg-accent transition-colors", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Team & users" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "→" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2 border-t border-border/60 mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { disabled: true, title: "Contact support to delete your account", className: "flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-destructive/40 cursor-not-allowed w-full", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Delete account" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] text-muted-foreground/60", children: "Contact support" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SaveBar, {})
  ] });
}
function Card({
  title,
  children
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-sm font-semibold", children: title }),
    children
  ] });
}
function Field({
  label,
  value,
  defaultValue,
  prefix,
  placeholder
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 flex items-center rounded-md border border-border/60 bg-background overflow-hidden", children: [
      prefix && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground px-3 border-r border-border/60 bg-muted/30 py-2", children: prefix }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { defaultValue: value ?? defaultValue ?? "", placeholder, className: "flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none" })
    ] })
  ] });
}
function Sel({
  label,
  options
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm", children: options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: o }, o)) })
  ] });
}
function SaveBar() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent", children: "Reset" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow", children: "Save changes" })
  ] });
}
export {
  Card,
  Field,
  SaveBar,
  Sel,
  SettingsLayout as component
};
