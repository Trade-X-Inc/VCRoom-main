import { U as jsxRuntimeExports } from "./worker-entry-4qtpAlX3.js";
import { S as SiteHeader, a as SiteFooter } from "./SiteFooter-DkNoLrOk.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./router-DliDWiY8.js";
import "./index-DYJmQpRE.js";
import "./Logo-D6dspbRM.js";
import "./utils-Bz4m9VPB.js";
import "./LangSwitcher-WD19H3AP.js";
import "./createLucideIcon-amrEyyxI.js";
import "./globe-BuWKFBTI.js";
import "./arrow-right-BoBYgBgI.js";
const sections = [{
  title: "1. Information We Collect",
  body: "We collect information you provide directly, such as your name, email address, company details, and any content you upload to the platform. We also collect usage data automatically, including IP addresses, browser type, pages visited, and feature interactions. This data helps us operate, improve, and secure the platform."
}, {
  title: "2. How We Use Information",
  body: "We use your information to provide and improve the Venture Room platform, send transactional and product emails, and respond to support requests. We may use aggregated, anonymised data for analytics and product development. We do not sell your personal information to third parties."
}, {
  title: "3. Data Sharing",
  body: "We share data only with service providers necessary to operate the platform, including Supabase for database and authentication infrastructure, and OpenAI for AI-powered features such as email generation and analysis. All processors are contractually bound to protect your data. We may disclose data when required by law or to protect our legal rights."
}, {
  title: "4. Data Security",
  body: "We use industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest (via Supabase), and role-based access controls. Sensitive deal room documents are watermarked and access-logged. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security."
}, {
  title: "5. Data Retention",
  body: "We retain your data for as long as your account is active or as needed to provide services. After account deletion, data is retained for 30 days before permanent deletion. Audit logs may be retained for up to 12 months for compliance purposes."
}, {
  title: "6. Your Rights",
  body: "You have the right to access, correct, or delete your personal data at any time from your account settings. You may also request a copy of your data or object to certain processing activities. To exercise these rights, contact us at privacy@ventureroom.app."
}, {
  title: "7. Contact Us",
  body: "If you have questions about this Privacy Policy or how we handle your data, please contact our privacy team at privacy@ventureroom.app. For data deletion requests or GDPR inquiries, we aim to respond within 30 days. Our registered address is Venture Room, Inc., Delaware, United States."
}];
function PrivacyPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background flex flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 mx-auto w-full max-w-3xl px-6 py-16", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-brand mb-3", children: "Legal" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-4xl font-semibold tracking-tight", children: "Privacy Policy" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Last updated: May 2025" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-10", children: sections.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold mb-2", children: s.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: s.body })
      ] }, s.title)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SiteFooter, {})
  ] });
}
export {
  PrivacyPage as component
};
