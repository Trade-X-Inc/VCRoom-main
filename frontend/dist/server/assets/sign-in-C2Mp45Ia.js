import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { u as useAuth, a as useNavigate, b as useSearch, L as Link } from "./router-BGpvLWsf.js";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-4inClxz1.js";
import { L as LoaderCircle } from "./loader-circle-D99H4vV_.js";
import { A as ArrowRight } from "./arrow-right-D9ZRlUua.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./Logo-BwaV5-7_.js";
import "./shield-check-BOlOV-LA.js";
import "./createLucideIcon-3NIsAiHL.js";
import "./check-CWsPEI0h.js";
function SignInPage() {
  const {
    signIn
  } = useAuth();
  const nav = useNavigate();
  const search = useSearch({
    from: "/sign-in"
  });
  const [email, setEmail] = reactExports.useState("jordan@atlas.ai");
  const [pw, setPw] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, pw);
      nav({
        to: search.redirect
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };
  const google = async () => {
    setError("Google login is not configured yet.");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthLayout, { title: "Welcome back", subtitle: "Sign in to your Venture Room workspace.", footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    "Don't have an account? ",
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/sign-up", className: "text-foreground font-medium hover:text-brand", children: "Create one" })
  ] }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GoogleButton, { onClick: google }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium text-foreground/80", children: "Password" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/forgot-password", className: "text-xs text-muted-foreground hover:text-foreground", children: "Forgot?" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: pw, onChange: (e) => setPw(e.target.value), className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Sign in ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: error })
    ] })
  ] });
}
export {
  SignInPage as component
};
