import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { L as Link, s as supabase } from "./router-DUHyCcO4.js";
import { A as AuthLayout, G as GoogleButton, D as Divider, F as Field } from "./AuthLayout-BS5gs7I1.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { L as LoaderCircle } from "./loader-circle-BfzWBVMa.js";
import { A as ArrowRight } from "./arrow-right-UEn806qT.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./Logo-DAWquX1K.js";
import "./shield-check-BcrWSRyB.js";
import "./check-CokXn3MG.js";
const __iconNode$1 = [
  [
    "path",
    {
      d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",
      key: "1s6t7t"
    }
  ],
  ["circle", { cx: "16.5", cy: "7.5", r: ".5", fill: "currentColor", key: "w0ekpg" }]
];
const KeyRound = createLucideIcon("key-round", __iconNode$1);
const __iconNode = [
  ["path", { d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8", key: "12jkf8" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }],
  ["path", { d: "m16 19 2 2 4-4", key: "1b14m6" }]
];
const MailCheck = createLucideIcon("mail-check", __iconNode);
function SignUpPage() {
  const [name, setName] = reactExports.useState("");
  const [email, setEmail] = reactExports.useState("");
  const [pw, setPw] = reactExports.useState("");
  const [token, setToken] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const [confirmed, setConfirmed] = reactExports.useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const {
        error: signUpError
      } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          emailRedirectTo: window.location.origin + "/sign-in",
          data: {
            full_name: name || "Founder",
            role: "founder",
            invite_token: token || null
          }
        }
      });
      if (signUpError) throw signUpError;
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
    return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthLayout, { title: "Check your email", footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "Already confirmed? ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/sign-in", search: {
        redirect: "/app"
      }, className: "text-foreground font-medium hover:text-brand", children: "Sign in" })
    ] }), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-4 py-6 text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-14 w-14 place-items-center rounded-full bg-success/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MailCheck, { className: "h-7 w-7 text-success" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: "Check your email — click the confirmation link to activate your account, then sign in." })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AuthLayout, { title: "Create your workspace", subtitle: "Free for founders. 14-day trial for funds.", footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    "Already have an account? ",
    /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/sign-in", search: {
      redirect: "/app"
    }, className: "text-foreground font-medium hover:text-brand", children: "Sign in" })
  ] }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(GoogleButton, { onClick: google }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "space-y-3.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Full name", value: name, onChange: (e) => setName(e.target.value), placeholder: "Jordan Reeves", required: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Work email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@company.com", required: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Password", type: "password", value: pw, onChange: (e) => setPw(e.target.value), placeholder: "At least 8 characters", required: true }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-dashed border-border/60 bg-accent/30 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-medium text-foreground/80", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(KeyRound, { className: "h-3.5 w-3.5 text-brand" }),
          " Have an invite code? ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground font-normal", children: "(optional)" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: token, onChange: (e) => setToken(e.target.value), placeholder: "vr_invite_••••", className: "mt-2 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-start gap-2 text-xs text-muted-foreground cursor-pointer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", required: true, className: "mt-0.5 h-3.5 w-3.5 accent-[var(--brand)]" }),
        "I agree to the",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/terms", className: "text-foreground hover:text-brand underline underline-offset-2", children: "Terms of Service" }),
        " ",
        "and",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/privacy", className: "text-foreground hover:text-brand underline underline-offset-2", children: "Privacy Policy" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: loading, className: "w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground py-2.5 text-sm font-medium shadow-glow disabled:opacity-60", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        "Create workspace ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-4 w-4" })
      ] }) }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: error })
    ] })
  ] });
}
export {
  SignUpPage as component
};
