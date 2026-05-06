import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { p as postJson } from "./backend-CMfy16B4.js";
import { S as Sparkles } from "./sparkles-D86DPdwE.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { C as Copy } from "./copy-BoKcNC8i.js";
import { S as Send } from "./send-DA-wluQh.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
const __iconNode = [
  ["path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", key: "1p45f6" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }]
];
const RotateCw = createLucideIcon("rotate-cw", __iconNode);
const templates = [{
  k: "cold",
  label: "Cold outreach"
}, {
  k: "follow",
  label: "Follow-up"
}, {
  k: "update",
  label: "Investor update"
}, {
  k: "intro",
  label: "Warm intro reply"
}];
const sample = `Hi Marcus,

Quick note — Atlas Robotics is closing our Series A. We've grown ARR 4.2x in the last 12 months and just signed two F500 pilots in industrial automation.

Given a16z's recent thesis around physical AI, I think there's a strong fit. Would you be open to a 20-minute call next week?

Pitch deck attached. Happy to share the data room afterward.

Best,
Jordan`;
function EmailComposer() {
  const [tab, setTab] = reactExports.useState("cold");
  const [to, setTo] = reactExports.useState("marcus@a16z.com");
  const [body, setBody] = reactExports.useState(sample);
  const [sending, setSending] = reactExports.useState(false);
  const [status, setStatus] = reactExports.useState("");
  const sendInvite = async () => {
    setSending(true);
    setStatus("");
    try {
      await postJson("/api/invites", {
        to,
        subject: "Atlas Robotics — Series A · physical AI",
        message: body,
        inviteLink: "https://app.ventureroom.com/join/vr_invite_a8f3k2x"
      });
      setStatus("Invite email sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "AI Email Assistant" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "Drafts that sound like you. Approved by you." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid lg:grid-cols-[280px_1fr] gap-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Templates" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-1", children: templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab(t.k), className: `w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: t.label }, t.k)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Recipient" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2.5 rounded-md border border-border/60 bg-background/60 p-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold", children: "MV" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: "Marcus Vale" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: "a16z · Dev tools" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 text-xs text-muted-foreground", children: "Tone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 flex gap-1.5", children: ["Direct", "Warm", "Formal"].map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `flex-1 rounded-md border border-border/60 px-2 py-1.5 text-xs ${i === 0 ? "bg-accent" : "hover:bg-accent/60"}`, children: t }, t)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 border-b border-border/60 px-5 py-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: "AI draft · Cold outreach" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Written in your voice based on your profile" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "text-xs inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 hover:bg-accent", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCw, { className: "h-3 w-3" }),
            " Regenerate"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground w-16", children: "To" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: to, onChange: (e) => setTo(e.target.value), className: "font-medium bg-transparent border-b border-border/40 focus:outline-none" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground w-16", children: "Subject" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Atlas Robotics — Series A · physical AI" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: body, onChange: (e) => setBody(e.target.value), className: "w-full min-h-[300px] resize-none bg-transparent text-sm leading-relaxed focus:outline-none" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border/60 px-5 py-3 flex items-center justify-between bg-gradient-soft", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Reading time: 28s · Tone: direct · Sentiment: confident" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3.5 w-3.5" }),
              " Copy"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: sendInvite, disabled: sending, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow disabled:opacity-60", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }),
              " ",
              sending ? "Sending..." : "Send"
            ] })
          ] })
        ] }),
        status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 pb-4 text-xs text-muted-foreground", children: status })
      ] })
    ] })
  ] });
}
export {
  EmailComposer as component
};
