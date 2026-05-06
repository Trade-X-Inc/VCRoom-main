import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-CGbmMhnh.js";
import { u as useAuth, s as supabase } from "./router-DFJyB8BW.js";
import { Loader2, ArrowRight } from "lucide-react";
import "./Logo-CIkq6vsm.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function SignInPage() {
  const {
    signIn
  } = useAuth();
  const nav = useNavigate();
  const search = useSearch({
    from: "/sign-in"
  });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appUser = await signIn(email, pw);
      const roleDefault = appUser.appRole === "investor" ? "/app/investor" : "/app";
      nav({
        to: search.redirect && search.redirect !== "/app" ? search.redirect : roleDefault
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };
  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/app"
      }
    });
  };
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Welcome back", subtitle: "Sign in to your Venture Room workspace.", footer: /* @__PURE__ */ jsxs(Fragment, { children: [
    "Don't have an account? ",
    /* @__PURE__ */ jsx(Link, { to: "/sign-up", className: "text-foreground font-medium hover:text-brand", children: "Create one" })
  ] }), children: [
    /* @__PURE__ */ jsx(GoogleButton, { onClick: google }),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium text-foreground/80", children: "Password" }),
          /* @__PURE__ */ jsx(Link, { to: "/forgot-password", className: "text-xs text-muted-foreground hover:text-foreground", children: "Forgot?" })
        ] }),
        /* @__PURE__ */ jsx("input", { type: "password", value: pw, onChange: (e) => setPw(e.target.value), className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        "Sign in ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) }),
      error && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive", children: error })
    ] })
  ] });
}
export {
  SignInPage as component
};
