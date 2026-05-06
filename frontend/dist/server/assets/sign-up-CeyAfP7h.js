import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-CGbmMhnh.js";
import { R as Route, s as supabase } from "./router-DFJyB8BW.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { MailCheck, Rocket, TrendingUp, KeyRound, Loader2, ArrowRight, Check } from "lucide-react";
import "./Logo-CIkq6vsm.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
function RoleCard({
  active,
  onClick,
  icon: Icon,
  label,
  sub
}) {
  return /* @__PURE__ */ jsxs("button", { type: "button", onClick, className: cn("relative rounded-xl border p-4 text-left transition-all", active ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-glow" : "border-border/60 hover:border-border bg-card"), children: [
    active && /* @__PURE__ */ jsx("div", { className: "absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsx(Check, { className: "h-3 w-3" }) }),
    /* @__PURE__ */ jsx("div", { className: cn("grid h-9 w-9 place-items-center rounded-lg", active ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground"), children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }) }),
    /* @__PURE__ */ jsx("div", { className: "mt-3 text-sm font-semibold leading-tight", children: label }),
    /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: sub })
  ] });
}
function SignUpPage() {
  const search = Route.useSearch();
  const [role, setRole] = useState(search.role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const {
        data,
        error: signUpError
      } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          emailRedirectTo: window.location.origin + "/sign-in",
          data: {
            full_name: name || role,
            role,
            invite_token: token || null
          }
        }
      });
      if (signUpError) throw signUpError;
      if (data.user?.id) {
        await supabase.from("users").upsert({
          id: data.user.id,
          email,
          full_name: name || role,
          role
        });
      }
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
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
  if (confirmed) {
    return /* @__PURE__ */ jsx(AuthLayout, { title: "Check your email", footer: /* @__PURE__ */ jsxs(Fragment, { children: [
      "Already confirmed?",
      " ",
      /* @__PURE__ */ jsx(Link, { to: "/sign-in", search: {
        redirect: role === "investor" ? "/app/investor" : "/app"
      }, className: "text-foreground font-medium hover:text-brand", children: "Sign in" })
    ] }), children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4 py-6 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-14 w-14 place-items-center rounded-full bg-success/10", children: /* @__PURE__ */ jsx(MailCheck, { className: "h-7 w-7 text-success" }) }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground leading-relaxed", children: [
        "Check your email — click the confirmation link to activate your account, then sign in to your",
        " ",
        role === "investor" ? "investor" : "founder",
        " dashboard."
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxs(AuthLayout, { title: "Create your workspace", subtitle: "Free for founders. 14-day trial for funds.", footer: /* @__PURE__ */ jsxs(Fragment, { children: [
    "Already have an account?",
    " ",
    /* @__PURE__ */ jsx(Link, { to: "/sign-in", search: {
      redirect: "/app"
    }, className: "text-foreground font-medium hover:text-brand", children: "Sign in" })
  ] }), children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2 mb-2", children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs font-medium text-muted-foreground", children: "I am a…" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
        /* @__PURE__ */ jsx(RoleCard, { active: role === "founder", onClick: () => setRole("founder"), icon: Rocket, label: "I'm a Founder", sub: "Raising capital for my startup" }),
        /* @__PURE__ */ jsx(RoleCard, { active: role === "investor", onClick: () => setRole("investor"), icon: TrendingUp, label: "I'm an Investor", sub: "Reviewing investment opportunities" })
      ] })
    ] }),
    /* @__PURE__ */ jsx(GoogleButton, { onClick: google }),
    /* @__PURE__ */ jsx(Divider, {}),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Full name", value: name, onChange: (e) => setName(e.target.value), placeholder: role === "investor" ? "Alex Johnson" : "Sam Rivera", required: true }),
      /* @__PURE__ */ jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", required: true }),
      /* @__PURE__ */ jsx(Field, { label: "Password", type: "password", value: pw, onChange: (e) => setPw(e.target.value), placeholder: "At least 8 characters", required: true }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-dashed border-border/60 bg-accent/30 p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs font-medium text-foreground/80", children: [
          /* @__PURE__ */ jsx(KeyRound, { className: "h-3.5 w-3.5 text-brand" }),
          " Have an invite code?",
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground font-normal", children: "(optional)" })
        ] }),
        /* @__PURE__ */ jsx("input", { value: token, onChange: (e) => setToken(e.target.value), placeholder: "vr_invite_••••", className: "mt-2 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2 text-xs text-muted-foreground cursor-pointer", children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", required: true, className: "mt-0.5 h-3.5 w-3.5 accent-[var(--brand)]" }),
        "I agree to the",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/terms", className: "text-foreground hover:text-brand underline underline-offset-2", children: "Terms of Service" }),
        " ",
        "and",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/privacy", className: "text-foreground hover:text-brand underline underline-offset-2", children: "Privacy Policy" })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        role === "investor" ? "Create investor workspace" : "Create founder workspace",
        " ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) }),
      error && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive", children: error })
    ] })
  ] });
}
export {
  SignUpPage as component
};
