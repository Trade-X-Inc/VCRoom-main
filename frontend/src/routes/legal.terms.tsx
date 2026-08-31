import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/Terms.tsx.

export const Route = createFileRoute("/legal/terms")({
  component: Terms,
});

const SECTIONS = [
  {
    title: "Agreement to terms",
    content: `These Terms of Service ("Terms") govern your access to and use of the Lengdon platform, operated by Lengdon Limited ("Lengdon", "we", "us"), a company incorporated in England and Wales (Company No. 14892031).

By creating an account or participating in a transaction room, you agree to these Terms. If you do not agree, do not use the platform.

These Terms were last updated: 26 August 2026.`,
  },
  {
    title: "What Lengdon is",
    content: `Lengdon is closing infrastructure for private capital transactions. It provides a structured, sequenced environment for parties to conduct the stages of a private transaction from counsel confirmation to close.

Lengdon is not:
— A financial advisor or broker
— A legal advisor
— An escrow or custodial service
— A party to any transaction conducted on the platform

We do not provide investment advice, legal advice, or financial services. We provide infrastructure. All decisions made within a transaction room are made by the parties themselves.`,
  },
  {
    title: "Your account",
    content: `You are responsible for maintaining the security of your account credentials. You must enable multi-factor authentication (MFA) — this is a mandatory platform requirement, not optional.

You may not share your credentials with any other person. Each individual must have their own account.

You must provide accurate information when creating your account. Providing false information is grounds for immediate account termination.`,
  },
  {
    title: "Transaction rooms",
    content: `A transaction room ("Room") is a structured environment in which two or more parties conduct the six-gate closing sequence.

Each Room is created by a room initiator and exists until the transaction closes, is terminated by mutual agreement, or is terminated by Lengdon for violation of these Terms.

The immutable audit record of a Room is the permanent, append-only log of all actions taken in that Room. It cannot be modified or deleted. Both parties receive a sealed copy at close.

By participating in a Room, you acknowledge that:
— Your actions in the Room will be recorded in the immutable audit record
— Your personal data will be included in the sealed export received by both parties
— The audit record cannot be deleted after creation`,
  },
  {
    title: "Acceptable use",
    content: `You may not use the Lengdon platform to:

— Conduct any illegal transaction or evade applicable laws
— Provide false or misleading information to another party in a Room
— Attempt to access another party's data outside of the permissions granted to you by the platform
— Reverse engineer, decompile, or attempt to extract source code from the platform
— Use the platform in a manner that interferes with its operation or other users' access
— Misrepresent your identity, authority, or relationship to any transaction

Violation of these restrictions may result in immediate account termination and may be reported to law enforcement.`,
  },
  {
    title: "Intellectual property",
    content: `The Lengdon platform, including its software, design, and documentation, is owned by Lengdon Limited and protected by applicable intellectual property laws.

Your transaction data — the records of your actions, your documents, your confirmations — belongs to you and the other parties in your transaction. Lengdon does not claim ownership of transaction content.

The immutable audit record is jointly owned by all parties to the transaction. Lengdon holds a copy as part of its record retention obligations.`,
  },
  {
    title: "Limitation of liability",
    content: `To the maximum extent permitted by applicable law, Lengdon is not liable for:

— The outcome of any transaction conducted on the platform
— Losses arising from actions or representations made by another party in a Room
— Indirect, consequential, incidental, or punitive damages

Our total aggregate liability to you shall not exceed the fees paid by you to Lengdon in the twelve months preceding the event giving rise to the claim.

Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.`,
  },
  {
    title: "Termination",
    content: `You may close your account at any time by contacting hello@lengdon.com. Closing your account does not delete data from closed transaction rooms (see "Transaction rooms" above).

We may suspend or terminate your account if you violate these Terms, if we are required to do so by law, or if continued operation would create legal or regulatory risk for Lengdon.

On termination, your access to the platform ceases. Any sealed exports already delivered to you remain yours.`,
  },
  {
    title: "Governing law",
    content: `These Terms are governed by the law of England and Wales. Any dispute arising from these Terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.

If you are a consumer located in another jurisdiction, you may also have rights under the laws of that jurisdiction.`,
  },
  {
    title: "Changes to these terms",
    content: `We will notify registered users of material changes to these Terms at least 30 days before they take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms.

The current version of these Terms is always available at lengdon.com/legal/terms.`,
  },
];

function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Legal"
          title="TERMS OF"
          titleOutline="SERVICE."
          subtitle="The terms governing your use of the Lengdon platform. Last updated 26 August 2026."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[280px] shrink-0">
              <div className="sticky top-24">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-4">Contents</div>
                <nav className="flex flex-col gap-2">
                  {SECTIONS.map((s, i) => (
                    <a key={i} href={`#term-${i}`}
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
                <div key={i} id={`term-${i}`}>
                  <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px] mb-4">
                    {s.title}
                  </h2>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.8] whitespace-pre-line">
                    {s.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
