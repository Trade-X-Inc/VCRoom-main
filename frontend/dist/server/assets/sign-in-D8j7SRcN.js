import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { s as supabase } from "./router-C9QH749P.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleGoogle = async () => {
    setError("");
    const {
      error: error2
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
      }
    });
    if (error2) setError(error2.message);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const {
      data,
      error: error2
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error2) {
      setError(error2.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      setError("Sign in failed — please try again");
      setLoading(false);
      return;
    }
    const {
      data: userRecord
    } = await supabase.from("users").select("role").eq("id", data.session.user.id).maybeSingle();
    const role = userRecord?.role || data.session.user.user_metadata?.role || "founder";
    window.location.href = role === "investor" ? "/app/investor/" : "/app";
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-background p-5", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-card border border-border rounded-2xl p-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-6", children: [
        /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-bold", children: "VR" }) }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: "Venture Room" })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-foreground mb-1", children: "Welcome back" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Sign in to your workspace" })
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: error }),
    /* @__PURE__ */ jsxs("button", { onClick: handleGoogle, className: "w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background hover:bg-accent transition-colors mb-4 text-foreground text-sm font-medium", children: [
      /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", children: [
        /* @__PURE__ */ jsx("path", { fill: "#4285F4", d: "M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" }),
        /* @__PURE__ */ jsx("path", { fill: "#34A853", d: "M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" }),
        /* @__PURE__ */ jsx("path", { fill: "#FBBC05", d: "M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" }),
        /* @__PURE__ */ jsx("path", { fill: "#EA4335", d: "M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" })
      ] }),
      "Continue with Google"
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border" }),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "or" }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted-foreground mb-1.5", children: "Email" }),
        /* @__PURE__ */ jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "you@company.com", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm text-muted-foreground mb-1.5", children: "Password" }),
        /* @__PURE__ */ jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, placeholder: "••••••••", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50", children: loading ? "Signing in..." : "Sign in →" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-between text-sm", children: [
      /* @__PURE__ */ jsx(Link, { to: "/forgot-password", className: "text-muted-foreground hover:text-foreground", children: "Forgot password?" }),
      /* @__PURE__ */ jsx(Link, { to: "/sign-up", className: "text-purple-500 hover:text-purple-400", children: "Create account →" })
    ] })
  ] }) });
}
export {
  SignIn as component
};
