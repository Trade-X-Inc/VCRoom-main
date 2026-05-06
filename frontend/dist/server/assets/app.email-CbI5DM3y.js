import { jsxs, jsx } from "react/jsx-runtime";
import { Sparkles, RotateCw, Copy, Send } from "lucide-react";
import { useState } from "react";
import { p as postJson } from "./backend-CMfy16B4.js";
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
const sample = "";
function EmailComposer() {
  const [tab, setTab] = useState("cold");
  const [to, setTo] = useState("");
  const [body, setBody] = useState(sample);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const sendInvite = async () => {
    setSending(true);
    setStatus("");
    try {
      await postJson("/api/invites", {
        to,
        subject: "Venture Room — Invitation",
        message: body,
        inviteLink: window.location.origin + "/join"
      });
      setStatus("Invite email sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "AI Email Assistant" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Drafts that sound like you. Approved by you." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid lg:grid-cols-[280px_1fr] gap-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Templates" }),
          /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-1", children: templates.map((t) => /* @__PURE__ */ jsx("button", { onClick: () => setTab(t.k), className: `w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: t.label }, t.k)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Recipient" }),
          /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx("input", { value: to, onChange: (e) => setTo(e.target.value), placeholder: "investor@firm.com", className: "w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-brand/50" }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 text-xs text-muted-foreground", children: "Tone" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1.5 flex gap-1.5", children: ["Direct", "Warm", "Formal"].map((t, i) => /* @__PURE__ */ jsx("button", { className: `flex-1 rounded-md border border-border/60 px-2 py-1.5 text-xs ${i === 0 ? "bg-accent" : "hover:bg-accent/60"}`, children: t }, t)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-border/60 px-5 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "AI draft · Cold outreach" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Written in your voice based on your profile" })
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "text-xs inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 hover:bg-accent", children: [
            /* @__PURE__ */ jsx(RotateCw, { className: "h-3 w-3" }),
            " Regenerate"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-5 space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 text-sm items-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground w-16", children: "To" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium text-sm", children: to || /* @__PURE__ */ jsx("span", { className: "text-muted-foreground italic", children: "Enter recipient above" }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground w-16", children: "Subject" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium text-muted-foreground italic", children: "AI-generated subject line" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "border-t border-border/60 pt-4", children: /* @__PURE__ */ jsx("textarea", { value: body, onChange: (e) => setBody(e.target.value), className: "w-full min-h-[300px] resize-none bg-transparent text-sm leading-relaxed focus:outline-none" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-border/60 px-5 py-3 flex items-center justify-between bg-gradient-soft", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Reading time: 28s · Tone: direct · Sentiment: confident" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent", children: [
              /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
              " Copy"
            ] }),
            /* @__PURE__ */ jsxs("button", { onClick: sendInvite, disabled: sending, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow disabled:opacity-60", children: [
              /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }),
              " ",
              sending ? "Sending..." : "Send"
            ] })
          ] })
        ] }),
        status && /* @__PURE__ */ jsx("div", { className: "px-5 pb-4 text-xs text-muted-foreground", children: status })
      ] })
    ] })
  ] });
}
export {
  EmailComposer as component
};
