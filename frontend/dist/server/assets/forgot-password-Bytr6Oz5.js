import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { s as supabase } from "./router-DOcN9fVX.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const {
      error: error2
    } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/callback"
    });
    if (error2) {
      setError(error2.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-background p-5", children: /* @__PURE__ */ jsx("div", { className: "w-full max-w-md bg-card border border-border rounded-2xl p-10", children: sent ? /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "text-5xl mb-4", children: "📬" }),
    /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold text-foreground mb-2", children: "Check your email" }),
    /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-sm", children: [
      "Password reset link sent to",
      " ",
      /* @__PURE__ */ jsx("strong", { className: "text-foreground", children: email })
    ] }),
    /* @__PURE__ */ jsx(Link, { to: "/sign-in", className: "inline-block mt-6 text-purple-500 text-sm", children: "Back to sign in →" })
  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-foreground mb-2", children: "Reset password" }),
    /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm mb-8", children: "Enter your email and we'll send you a reset link" }),
    error && /* @__PURE__ */ jsx("div", { className: "mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: error }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "your@email.com", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm disabled:opacity-50", children: loading ? "Sending..." : "Send reset link →" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 text-center", children: /* @__PURE__ */ jsx(Link, { to: "/sign-in", className: "text-muted-foreground text-sm hover:text-foreground", children: "← Back to sign in" }) })
  ] }) }) });
}
export {
  ForgotPassword as component
};
