import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { m as members, i as invites } from "./mock-UGcEIF7y.js";
import { U as Users } from "./users-D4EiXx1L.js";
import { U as UserPlus } from "./user-plus-BBTKWlNs.js";
import { S as Search } from "./search-BIDKGnWi.js";
import { E as Ellipsis } from "./ellipsis-C8uyG72t.js";
import { M as Mail } from "./mail-zergbGIc.js";
import { C as Copy } from "./copy-BtPVp-za.js";
import { X } from "./x-BIY2iyG1.js";
import { C as Check } from "./check-CWsPEI0h.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
const roleColor = {
  Owner: "bg-violet/10 text-violet border-violet/20",
  Admin: "bg-brand/10 text-brand border-brand/20",
  Member: "bg-accent text-foreground border-border/60",
  Viewer: "bg-muted text-muted-foreground border-border/60"
};
const statusDot = (s) => s === "Active" ? "bg-success" : s === "Pending" ? "bg-warning" : "bg-muted-foreground/40";
function UsersPage() {
  const [tab, setTab] = reactExports.useState("team");
  const [q, setQ] = reactExports.useState("");
  const [showInvite, setShowInvite] = reactExports.useState(false);
  const filteredMembers = reactExports.useMemo(() => members.filter((m) => !q || (m.name + m.email).toLowerCase().includes(q.toLowerCase())), [q]);
  const filteredInvites = reactExports.useMemo(() => invites.filter((i) => !q || i.email.toLowerCase().includes(q.toLowerCase())), [q]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Team & users" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage who can access your workspace and deal rooms." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowInvite(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm font-medium shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-4 w-4" }),
        " Invite people"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex items-center gap-2 border-b border-border/60", children: [
      [{
        k: "team",
        l: "Team",
        count: members.length
      }, {
        k: "invites",
        l: "Invites",
        count: invites.filter((i) => i.status === "Pending").length
      }].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.k), className: `relative px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`, children: [
        t.l,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-xs text-muted-foreground tabular-nums", children: t.count }),
        tab === t.k && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" })
      ] }, t.k)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ml-auto relative pb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search…", className: "w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] })
    ] }),
    tab === "team" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_120px_140px_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Member" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Role" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Last active" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: filteredMembers.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_120px_140px_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0", children: m.initials }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: m.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: m.email })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[m.role]}`, children: m.role }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full ${statusDot(m.status)}` }),
          m.status
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground tabular-nums", children: m.lastActive }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Ellipsis, { className: "h-4 w-4" }) })
      ] }, m.id)) })
    ] }),
    tab === "invites" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_120px_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Scope" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Sent by" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: filteredInvites.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_120px_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium truncate", children: i.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${roleColor[i.role]}`, children: i.role })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: i.scope }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium", children: i.sentBy }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-muted-foreground", children: i.sentAt })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] rounded-full px-2 py-0.5 font-medium border ${i.status === "Pending" ? "bg-warning/10 text-warning border-warning/20" : i.status === "Accepted" ? "bg-success/10 text-success border-success/20" : i.status === "Expired" ? "bg-muted text-muted-foreground border-border/60" : "bg-destructive/10 text-destructive border-destructive/20"}`, children: i.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-end gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { title: "Copy invite link", className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }) }),
          i.status === "Pending" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { title: "Revoke", className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }, i.id)) })
    ] }),
    showInvite && /* @__PURE__ */ jsxRuntimeExports.jsx(InviteModal, { onClose: () => setShowInvite(false) })
  ] });
}
function InviteModal({
  onClose
}) {
  const [emails, setEmails] = reactExports.useState("");
  const [role, setRole] = reactExports.useState("Member");
  const [scope, setScope] = reactExports.useState("Workspace");
  const [sent, setSent] = reactExports.useState(false);
  const link = "https://app.ventureroom.com/join/vr_invite_a8f3k2x";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-md rounded-2xl border border-border/60 bg-popover shadow-elev overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-5 border-b border-border/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Invite people to Atlas Robotics" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 text-xs text-muted-foreground", children: "They'll receive an email with a secure invite link." })
    ] }),
    sent ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-sm font-medium", children: "Invites sent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-xs text-muted-foreground", children: "Pending invites will appear in the Invites tab." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "mt-5 w-full rounded-md bg-foreground text-background py-2 text-sm font-medium", children: "Done" })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Emails" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: emails, onChange: (e) => setEmails(e.target.value), placeholder: "alice@firm.com, bob@firm.com", className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: role, onChange: (e) => setRole(e.target.value), className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: ["Admin", "Member", "Viewer"].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: r }, r)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Scope" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: scope, onChange: (e) => setScope(e.target.value), className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Workspace" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Atlas · Deal Room" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-dashed border-border/60 bg-accent/30 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Or share a link" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "flex-1 truncate rounded bg-background border border-border/60 px-2 py-1.5 text-[11px]", children: link }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigator.clipboard?.writeText(link), className: "grid h-8 w-8 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSent(true), className: "rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow", children: "Send invites" })
      ] })
    ] })
  ] }) });
}
export {
  UsersPage as component
};
