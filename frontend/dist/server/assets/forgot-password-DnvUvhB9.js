import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { A as AuthLayout, F as Field } from "./AuthLayout-CGbmMhnh.js";
import { Check, Loader2, ArrowRight } from "lucide-react";
import "./Logo-CIkq6vsm.js";
function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };
  return /* @__PURE__ */ jsx(AuthLayout, { title: sent ? "Check your email" : "Reset your password", subtitle: sent ? `We sent a reset link to ${email}.` : "Enter your email and we'll send a reset link.", footer: /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Link, { to: "/sign-in", search: {
    redirect: "/app"
  }, className: "text-foreground font-medium hover:text-brand", children: "Back to sign in" }) }), children: sent ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-6 text-center shadow-card", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success", children: /* @__PURE__ */ jsx(Check, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: "If an account exists, you'll receive an email within a minute." })
  ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
    /* @__PURE__ */ jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", required: true }),
    /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      "Send reset link ",
      /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
    ] }) })
  ] }) });
}
export {
  ForgotPasswordPage as component
};
