import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Dz_cryAq.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { G as Globe } from "./globe-DAjxjmXb.js";
import { P as Plus } from "./plus-CYFkjbiX.js";
import { C as CircleCheck } from "./circle-check-CwHIy6AR.js";
import { T as Trash2 } from "./trash-2-9l6wXDH8.js";
import { C as Copy } from "./copy-C_LWtWRE.js";
import { M as Mail } from "./mail-Dzo8A5tj.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-BWyo4Tuv.js";
const initial = [{
  name: "ventureroom.app",
  verified: true,
  primary: true
}];
function DomainEmail() {
  const [domains, setDomains] = reactExports.useState(initial);
  const [input, setInput] = reactExports.useState("");
  const [emailFrom, setEmailFrom] = reactExports.useState("notifications@atlas.ai");
  const [signed, setSigned] = reactExports.useState(true);
  const addDomain = (e) => {
    e.preventDefault();
    if (!input.match(/^[a-z0-9.-]+\.[a-z]{2,}$/i)) return;
    setDomains((d) => [...d, {
      name: input,
      verified: false,
      primary: false
    }]);
    setInput("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-4 w-4 text-brand" }),
        " Custom domains"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Connect your own domain to host deal rooms and outbound emails." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: addDomain, className: "mt-4 flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: input, onChange: (e) => setInput(e.target.value), placeholder: "yourdomain.com", className: "flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Add domain"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-2", children: domains.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: d.name }),
          d.primary && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5", children: "Primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("inline-flex items-center gap-1 text-[11px]", d.verified ? "text-success" : "text-warning"), children: d.verified ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3 w-3" }),
            " Verified"
          ] }) : "Pending DNS" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDomains((xs) => xs.filter((x) => x.name !== d.name)), className: "p-1.5 text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
      ] }, d.name)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 rounded-lg bg-muted/40 border border-border/60 p-4 space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Required DNS records" }),
        [["TXT", "@", "v=spf1 include:ventureroom.app ~all"], ["CNAME", "vr._domainkey", "vr-dkim.ventureroom.app"], ["MX", "@", "10 mx.ventureroom.app"]].map(([t, host, val]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-[60px_120px_1fr_auto] items-center gap-2 text-xs font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: t }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground truncate", children: host }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: val }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigator.clipboard.writeText(val), className: "p-1 text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-3 w-3" }) })
        ] }, t + host))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "h-4 w-4 text-brand" }),
        " Email configuration"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: 'Default "From" address' }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: emailFrom, onChange: (e) => setEmailFrom(e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: signed, onChange: (e) => setSigned(e.target.checked), className: "h-4 w-4 accent-[var(--brand)]" }),
        "DKIM-sign all outbound messages"
      ] })
    ] })
  ] });
}
export {
  DomainEmail as component
};
