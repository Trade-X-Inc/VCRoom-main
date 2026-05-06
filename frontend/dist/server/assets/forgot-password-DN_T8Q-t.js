import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { L as Link } from "./router-DUHyCcO4.js";
import { A as AuthLayout, F as Field } from "./AuthLayout-BS5gs7I1.js";
import { C as Check } from "./check-CokXn3MG.js";
import { L as LoaderCircle } from "./loader-circle-BfzWBVMa.js";
import { A as ArrowRight } from "./arrow-right-UEn806qT.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./Logo-DAWquX1K.js";
import "./shield-check-BcrWSRyB.js";
import "./createLucideIcon-ByQ9CEis.js";
function ForgotPasswordPage() {
  const [email, setEmail] = reactExports.useState("");
  const [sent, setSent] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthLayout, { title: sent ? "Check your email" : "Reset your password", subtitle: sent ? `We sent a reset link to ${email}.` : "Enter your email and we'll send a reset link.", footer: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/sign-in", search: {
    redirect: "/app"
  }, className: "text-foreground font-medium hover:text-brand", children: "Back to sign in" }) }), children: sent ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-6 text-center shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: "If an account exists, you'll receive an email within a minute." })
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", required: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "Send reset link ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
    ] }) })
  ] }) });
}
export {
  ForgotPasswordPage as component
};
