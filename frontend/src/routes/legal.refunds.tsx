import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// New document, 22 Sep 2026. Written against a real recon finding, not
// an assumed payment flow: no payment processor is wired up anywhere in
// this codebase (zero Stripe dependency, no real charge on any code
// path — every payment-adjacent write is self-labelled TODO(stripe) /
// payment_status:"beta_bypass" in closing-fn.ts, PaymentConfirm.tsx,
// ClosingPipeline.tsx, roast-fn.ts). No AI-credit top-up feature exists
// in any form. This document is written to be true on the day it
// publishes (beta is free, nothing is charged) and to hold without
// republishing once billing goes live, since the credit-top-up
// language is stated as the intended policy for that feature rather
// than as a description of something already running.
//
// Deliberately NOT an absolute "no refunds under any circumstances"
// clause — stated as current policy, and closes by noting that
// statutory consumer rights, where they apply, are not waived by this
// page. Governing law: DIFC Courts, per direct instruction for this
// new document. legal.terms.tsx's own governing-law clause was found,
// on direct check, to still name England/Wales (never actually
// updated despite earlier discussion) and was fixed in the same pass
// using this exact wording, so both documents state the same forum in
// the same words rather than two independently-worded versions.

export const Route = createFileRoute("/legal/refunds")({
  component: Refunds,
});

const SECTIONS = [
  {
    title: "Current status: beta, no charges",
    content: `Lengdon is currently in beta. Using the platform — creating an account, opening a deal room, running a transaction through the closing sequence — is free. We do not charge you anything today, and there is nothing to refund.

This page describes the refund policy that will apply once any paid feature goes live. Nothing below describes a payment flow that exists yet.`,
  },
  {
    title: "AI-credit top-ups, when live",
    content: `We plan to offer optional AI-credit top-ups (expected to be priced in the region of $5–$10 per top-up) to pay for AI-assisted features that draw on usage-metered AI provider costs.

Once this feature is live: a top-up is charged at the time of purchase, and the credit is added to your account immediately. Once a credit has been issued to your account, that top-up is non-refundable — this reflects that the underlying AI usage cost is incurred by us as soon as the credit becomes available for you to spend, whether or not you go on to use it.

If a top-up is charged in error, or a technical fault prevents the credit from being issued at all, contact us and we will investigate and correct it.`,
  },
  {
    title: "Other paid features, if introduced",
    content: `If we introduce further paid plans or features beyond AI-credit top-ups, we will publish the specific refund terms that apply to that feature at the time it launches, either on this page or in the terms presented to you when you purchase it.`,
  },
  {
    title: "Your statutory rights",
    content: `This page describes our current policy. It does not limit, exclude, or waive any statutory consumer protection right you may have under the law applicable to you, where such a right applies and cannot lawfully be waived. Nothing in this policy is intended to override a right you hold by law.`,
  },
  {
    title: "How to contact us",
    content: `For any question about a charge, a credit, or this policy, contact: billing@lengdon.com`,
  },
  {
    title: "Governing law",
    content: `This policy is governed by the laws applicable in the Dubai International Financial Centre (DIFC), and any dispute arising from it is subject to the exclusive jurisdiction of the DIFC Courts.`,
  },
  {
    title: "Changes to this policy",
    content: `We will update this page before any paid feature goes live, and again if the terms of that feature change materially.

This policy was last updated: 22 September 2026.`,
  },
];

function Refunds() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Legal"
          title="REFUND"
          titleOutline="TERMS."
          subtitle="Beta is free today. This is the policy that will apply once any paid feature goes live. Last updated 22 September 2026."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[280px] shrink-0">
              <div className="sticky top-24">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#64748b] text-[11px] tracking-[1px] uppercase mb-4">Contents</div>
                <nav className="flex flex-col gap-2">
                  {SECTIONS.map((s, i) => (
                    <a key={i} href={`#section-${i}`}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="text-[#425466] text-[13px] hover:text-[#0a2540] transition-colors py-0.5">
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="flex-1 max-w-[720px] flex flex-col gap-12">
              {SECTIONS.map((s, i) => (
                <div key={i} id={`section-${i}`}>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-4">
                    {s.title}
                  </h2>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.8] whitespace-pre-line">
                    {s.content}
                  </div>
                </div>
              ))}
              <div>
                <Link to="/legal/terms" className="text-[#0a2540] underline hover:no-underline text-[14px]">Terms of Service</Link>
                {" · "}
                <Link to="/legal/privacy" className="text-[#0a2540] underline hover:no-underline text-[14px]">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
