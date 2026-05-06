import { jsxs, jsx } from "react/jsx-runtime";
import { UserPlus, Users } from "lucide-react";
function TeamPage() {
  const members = [];
  const invites = [];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Team" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Invite analysts and partners to your fund" })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "h-4 w-4" }),
        " Invite analyst"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: members.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Users, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No team members yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Invite analysts and partners to collaborate on deals." })
    ] }) : null }),
    /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-2", children: "Pending invites" }),
      invites.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground text-center", children: "No pending invites." }) : null
    ] })
  ] });
}
export {
  TeamPage as component
};
