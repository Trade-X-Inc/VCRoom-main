import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { s as supabase } from "./router-BRauOI85.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "clsx";
function SignUp() {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const saveRole = async (userId, userRole, fullName) => {
    await supabase.from("users").upsert({
      id: userId,
      role: userRole,
      full_name: fullName,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      onConflict: "id"
    });
  };
  const handleGoogle = async () => {
    if (!role) return;
    localStorage.setItem("pending_role", role);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
      }
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError("");
    const {
      data,
      error: error2
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: name
        }
      }
    });
    if (error2) {
      setError(error2.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await saveRole(data.user.id, role, name);
      if (data.session) {
        window.location.href = role === "investor" ? "/app/investor/" : "/app";
      } else {
        setDone(true);
        setLoading(false);
      }
    }
  };
  if (done) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-background p-5", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-card border border-border rounded-2xl p-10 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl mb-4", children: "✉️" }),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold text-foreground mb-2", children: "Check your email" }),
      /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground text-sm", children: [
        "We sent a confirmation link to",
        " ",
        /* @__PURE__ */ jsx("strong", { className: "text-foreground", children: email }),
        ". Click it to activate your account, then sign in."
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/sign-in", className: "inline-block mt-6 text-purple-500 text-sm", children: "Go to sign in →" })
    ] }) });
  }
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-background p-5", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md bg-card border border-border rounded-2xl p-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-6", children: [
        /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-bold", children: "VR" }) }),
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: "Venture Room" })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold text-foreground mb-1", children: "Create your account" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Choose your role to get started" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 mb-6", children: ["founder", "investor"].map((r) => /* @__PURE__ */ jsxs("button", { onClick: () => setRole(r), className: `p-4 rounded-xl border-2 text-left transition-all ${role === r ? "border-purple-500 bg-purple-500/10" : "border-border bg-background hover:border-border/80"}`, children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl mb-2", children: r === "founder" ? "🚀" : "📈" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold text-foreground", children: r === "founder" ? "I'm a Founder" : "I'm an Investor" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: r === "founder" ? "Raising capital" : "Reviewing deals" })
    ] }, r)) }),
    role && /* @__PURE__ */ jsxs(Fragment, { children: [
      error && /* @__PURE__ */ jsx("div", { className: "mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm", children: error }),
      /* @__PURE__ */ jsxs("button", { onClick: handleGoogle, className: "w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background hover:bg-accent transition-colors mb-4 text-foreground text-sm font-medium", children: [
        /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 18 18", children: [
          /* @__PURE__ */ jsx("path", { fill: "#4285F4", d: "M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" }),
          /* @__PURE__ */ jsx("path", { fill: "#34A853", d: "M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" }),
          /* @__PURE__ */ jsx("path", { fill: "#FBBC05", d: "M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" }),
          /* @__PURE__ */ jsx("path", { fill: "#EA4335", d: "M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" })
        ] }),
        "Continue with Google as ",
        role === "founder" ? "Founder" : "Investor"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border" }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground text-xs", children: "or email" }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border" })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [
        /* @__PURE__ */ jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), required: true, placeholder: "Full name", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" }),
        /* @__PURE__ */ jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, placeholder: "Email address", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" }),
        /* @__PURE__ */ jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, minLength: 6, placeholder: "Password (min 6 chars)", className: "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" }),
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50", children: loading ? "Creating account..." : `Create ${role} account →` })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 text-center text-sm text-muted-foreground", children: [
      "Already have an account?",
      " ",
      /* @__PURE__ */ jsx(Link, { to: "/sign-in", className: "text-purple-500", children: "Sign in" })
    ] })
  ] }) });
}
export {
  SignUp as component
};
