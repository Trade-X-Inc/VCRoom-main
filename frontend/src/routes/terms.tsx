import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Lengdon" },
      { name: "description", content: "Terms of Service for Lengdon." },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Lengdon, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform. Continued use of the platform constitutes acceptance of any updates to these terms.",
  },
  {
    title: "2. Use of Service",
    body: "You may use Lengdon solely for lawful purposes related to fundraising, investor relations, and deal management. You must not misuse the platform, attempt to gain unauthorised access, or use it to transmit harmful content. We reserve the right to suspend accounts that violate these conditions.",
  },
  {
    title: "3. User Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us immediately of any unauthorised use. We may terminate or suspend accounts that breach these terms.",
  },
  {
    title: "4. Confidentiality",
    body: "Deal room content, investor data, and uploaded documents are confidential and intended only for authorised participants. You agree not to share, reproduce, or distribute confidential materials without the consent of all relevant parties. Lengdon applies access controls and audit logging to support this commitment.",
  },
  {
    title: "5. Payments",
    body: "Paid plans are billed in advance on a monthly or annual basis and are non-refundable except where required by law. You authorise us to charge your payment method for all fees associated with your selected plan. Pricing is subject to change with 30 days' notice.",
  },
  {
    title: "6. Termination",
    body: "Either party may terminate the agreement at any time. Upon termination, your access will cease and your data will be retained for 30 days before deletion, after which it cannot be recovered. We may terminate immediately for material breaches of these terms.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the maximum extent permitted by law, Lengdon shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability for any claim shall not exceed the amount you paid in the 12 months preceding the claim. The platform is provided on an 'as is' basis without warranties of any kind.",
  },
  {
    title: "8. Governing Law",
    body: "These Terms are governed by the laws of the Dubai International Financial Centre (DIFC), United Arab Emirates, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the DIFC Courts. If any provision of these terms is found unenforceable, the remaining provisions remain in full effect.",
  },
  // Added 17 Aug 2026 — Foundation Document §20.7. The entity name appears on
  // this page only, and always carries the "(under incorporation)" qualifier.
  // Lengdon holds no DFSA licence and is not a regulated entity; stating
  // that here is required rather than optional.
  {
    title: "9. Operating Entity",
    body: "Lengdon is operated by Venture Tech LLC (under incorporation), with offices at DIFC FinTech Hive, Dubai, United Arab Emirates. Lengdon is a software platform. It does not hold a DFSA licence, is not a regulated financial institution, and does not act as a bank, broker, custodian, or intermediary in any transaction conducted through it.",
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 mx-auto w-full max-w-3xl px-6 py-16">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 block">
            ← Back to Lengdon
          </a>
        </div>
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: May 2025</p>
        </div>
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-border/40">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Lengdon
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
