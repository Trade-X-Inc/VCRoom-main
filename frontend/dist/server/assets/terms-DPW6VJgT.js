import { jsxs, jsx } from "react/jsx-runtime";
import { S as SiteHeader, a as SiteFooter } from "./SiteFooter-CN6QRLAQ.js";
import "@tanstack/react-router";
import "./Logo-CIkq6vsm.js";
import "react";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "./utils-H80jjgLf.js";
import "clsx";
import "tailwind-merge";
import "lucide-react";
import "./LangSwitcher-C5BnSQOo.js";
import "./router-DLzDuQL7.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
const sections = [{
  title: "1. Acceptance of Terms",
  body: "By accessing or using Venture Room, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform. Continued use of the platform constitutes acceptance of any updates to these terms."
}, {
  title: "2. Use of Service",
  body: "You may use Venture Room solely for lawful purposes related to fundraising, investor relations, and deal management. You must not misuse the platform, attempt to gain unauthorised access, or use it to transmit harmful content. We reserve the right to suspend accounts that violate these conditions."
}, {
  title: "3. User Accounts",
  body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us immediately of any unauthorised use. We may terminate or suspend accounts that breach these terms."
}, {
  title: "4. Confidentiality",
  body: "Deal room content, investor data, and uploaded documents are confidential and intended only for authorised participants. You agree not to share, reproduce, or distribute confidential materials without the consent of all relevant parties. Venture Room applies access controls and audit logging to support this commitment."
}, {
  title: "5. Payments",
  body: "Paid plans are billed in advance on a monthly or annual basis and are non-refundable except where required by law. You authorise us to charge your payment method for all fees associated with your selected plan. Pricing is subject to change with 30 days' notice."
}, {
  title: "6. Termination",
  body: "Either party may terminate the agreement at any time. Upon termination, your access will cease and your data will be retained for 30 days before deletion, after which it cannot be recovered. We may terminate immediately for material breaches of these terms."
}, {
  title: "7. Limitation of Liability",
  body: "To the maximum extent permitted by law, Venture Room shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability for any claim shall not exceed the amount you paid in the 12 months preceding the claim. The platform is provided on an 'as is' basis without warranties of any kind."
}, {
  title: "8. Governing Law",
  body: "These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the courts of Delaware. If any provision of these terms is found unenforceable, the remaining provisions remain in full effect."
}];
function TermsPage() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background flex flex-col", children: [
    /* @__PURE__ */ jsx(SiteHeader, {}),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 mx-auto w-full max-w-3xl px-6 py-16", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-10", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-widest text-brand mb-3", children: "Legal" }),
        /* @__PURE__ */ jsx("h1", { className: "text-4xl font-semibold tracking-tight", children: "Terms of Service" }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Last updated: May 2025" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-10", children: sections.map((s) => /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold mb-2", children: s.title }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: s.body })
      ] }, s.title)) })
    ] }),
    /* @__PURE__ */ jsx(SiteFooter, {})
  ] });
}
export {
  TermsPage as component
};
