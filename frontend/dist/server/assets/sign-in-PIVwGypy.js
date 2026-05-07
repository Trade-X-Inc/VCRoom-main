import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-CGbmMhnh.js";
import { u as useAuth, s as supabase } from "./router-CteB-ixO.js";
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
  useEffect(() => {
    const saveRoleAfterConfirmation = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      const metadata = session.user.user_metadata;
      if (!metadata?.role) return;
      const {
        data: existing
      } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
      if (!existing?.role) {
        const {
          error: upsertErr
        } = await supabase.from("users").upsert({
          id: session.user.id,
          role: metadata.role,
          full_name: metadata.full_name || "",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (upsertErr) console.error("[Auth] Role save on confirmation failed:", upsertErr);
        else console.log("[Auth] Role saved after email confirmation:", metadata.role);
      }
    };
    saveRoleAfterConfirmation();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const appUser = await signIn(email, pw);
      if (!appUser) {
        setError("Invalid email or password.");
        return;
      }
      const pendingRole = localStorage.getItem(`pending_role_${email}`);
      if (pendingRole) {
        await supabase.from("users").upsert({
          id: appUser.id,
          role: pendingRole,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        localStorage.removeItem(`pending_role_${email}`);
      }
      console.log("[Auth Debug] User ID:", appUser.id);
      console.log("[Auth Debug] appRole (from DB + metadata):", appUser.appRole);
      console.log("[Auth Debug] Pending localStorage role:", pendingRole ?? "none");
      const effectiveRole = pendingRole ?? appUser.appRole;
      const roleDefault = effectiveRole === "investor" ? "/app/investor" : "/app";
      const target = search.redirect && search.redirect !== "/app" ? search.redirect : roleDefault;
      nav({
        to: target
      });
    } catch (err) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };
  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback"
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
