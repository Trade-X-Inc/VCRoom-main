import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-CGbmMhnh.js";
import { R as Route, s as supabase } from "./router-CMUL11Nw.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { MailCheck, ExternalLink, Loader2, Check, RefreshCw, Rocket, TrendingUp, KeyRound, ArrowRight } from "lucide-react";
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
  const nav = useNavigate();
  const [role, setRole] = useState(search.role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendStatus, setResendStatus] = useState("idle");
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1e3);
    return () => clearTimeout(t);
  }, [countdown]);
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
          data: {
            full_name: name || role,
            role,
            invite_token: token || null
          }
        }
      });
      if (signUpError) throw signUpError;
      localStorage.setItem(`pending_role_${email}`, role);
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session && data.user?.id) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await supabase.from("users").upsert({
          id: data.user.id,
          email,
          full_name: name || role,
          role,
          created_at: now,
          updated_at: now
        });
        localStorage.removeItem(`pending_role_${email}`);
        nav({
          to: role === "investor" ? "/app/investor" : "/app"
        });
        return;
      }
      if (data.user?.id) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const {
          error: upsertError
        } = await supabase.from("users").upsert({
          id: data.user.id,
          email,
          full_name: name || role,
          role,
          created_at: now,
          updated_at: now
        });
        if (upsertError) console.error("Failed to save user role:", upsertError);
      }
      setConfirmed(true);
      setCountdown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create account.";
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setError("An account with this email already exists. Sign in instead, or use a different email.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    setResendStatus("sending");
    try {
      const {
        error: resendError
      } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback"
        }
      });
      if (resendError) throw resendError;
      setResendStatus("sent");
      setCountdown(60);
      setTimeout(() => setResendStatus("idle"), 3e3);
    } catch {
      setResendStatus("error");
      setTimeout(() => setResendStatus("idle"), 3e3);
    }
  };
  const webmailLink = (() => {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (domain === "gmail.com") return "https://mail.google.com";
    if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "https://outlook.live.com";
    if (domain === "yahoo.com") return "https://mail.yahoo.com";
    return null;
  })();
  const google = async () => {
    localStorage.setItem("oauth_pending_role", role);
    console.log("Saving role before OAuth:", role);
    const {
      error: error2
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });
    if (error2) console.error(error2);
  };
  if (confirmed) {
    return /* @__PURE__ */ jsx(AuthLayout, { title: "Check your inbox", footer: /* @__PURE__ */ jsxs(Fragment, { children: [
      "Already confirmed?",
      " ",
      /* @__PURE__ */ jsx(Link, { to: "/sign-in", search: {
        redirect: role === "investor" ? "/app/investor" : "/app"
      }, className: "text-foreground font-medium hover:text-brand", children: "Sign in" })
    ] }), children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-5 py-4 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-16 w-16 place-items-center rounded-full bg-success/10 ring-4 ring-success/20", children: /* @__PURE__ */ jsx(MailCheck, { className: "h-8 w-8 text-success" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Confirmation email sent to" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-brand font-semibold", children: email })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "w-full rounded-xl border border-border/60 bg-card p-4 text-left space-y-3", children: ["Open the email from Venture Room", "Click the confirmation link", "You'll be redirected to sign in"].map((step, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-[10px] font-bold mt-0.5", children: i + 1 }),
        /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: step })
      ] }, i)) }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Not seeing it? Check your ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: "spam or junk folder." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "w-full flex flex-col gap-2", children: [
        webmailLink && /* @__PURE__ */ jsxs("a", { href: webmailLink, target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors", children: [
          /* @__PURE__ */ jsx(ExternalLink, { className: "h-4 w-4" }),
          " Open email app"
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: resend, disabled: countdown > 0 || resendStatus === "sending", className: cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors", resendStatus === "sent" ? "bg-success/10 text-success border border-success/30" : resendStatus === "error" ? "bg-destructive/10 text-destructive border border-destructive/30" : countdown > 0 ? "border border-border/60 text-muted-foreground cursor-not-allowed opacity-60" : "border border-brand/40 bg-brand/5 text-brand hover:bg-brand/10"), children: resendStatus === "sending" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }),
          " Sending…"
        ] }) : resendStatus === "sent" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }),
          " Email sent!"
        ] }) : resendStatus === "error" ? "Failed — try again" : countdown > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(RefreshCw, { className: "h-3.5 w-3.5" }),
          " Resend in ",
          countdown,
          "s"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(RefreshCw, { className: "h-3.5 w-3.5" }),
          " Resend confirmation email"
        ] }) })
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
