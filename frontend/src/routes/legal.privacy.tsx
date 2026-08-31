import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026. Entity mismatch fixed: the source's
// "Lengdon Limited, a company incorporated in England and Wales
// (Company No. 14892031)" replaced with the repo's real, governing
// entity detail (CLAUDE.md §0/§12, Foundation Document): Venture Tech
// LLC, under incorporation, DIFC FinTech Hive — no UK entity, no
// company number (does not exist yet), no London address. Crypto
// vocabulary removed sitewide: "immutable" -> "append-only"/
// "tamper-evident"; "sealed copy" -> "copy of the complete record" (the
// underlying export/registry capability is not yet live — CLAUDE.md
// §12/§20.6 — this page describes the record mechanism, which is real,
// not the export delivery, which is not).

export const Route = createFileRoute("/legal/privacy")({
  component: Privacy,
});

const SECTIONS = [
  {
    title: "Who we are",
    content: `Lengdon ("we", "us") is operated by Venture Tech LLC, a company under incorporation in the DIFC FinTech Hive, Dubai, United Arab Emirates.

We operate closing infrastructure for private capital transactions. We process personal data as a data controller in the course of operating the Lengdon platform.

For data protection enquiries: privacy@lengdon.com`,
  },
  {
    title: "What data we collect",
    content: `We collect and process the following categories of personal data:

Identity data: Full name, as provided at account creation and NDA confirmation.
Contact data: Email address and, where provided, a telephone number.
Transaction data: Actions taken within a transaction room — confirmations, document accesses, signing events, payment confirmations. This data forms part of the append-only audit record.
Authentication data: Login events, MFA events, session data. We do not store passwords in plain text.
Technical data: IP address, device type, browser type, and access timestamps. Collected for security and fraud prevention purposes.

We do not collect payment card data. We do not handle, process, or store financial instruments.`,
  },
  {
    title: "How we use your data",
    content: `We use personal data for the following purposes:

To operate the Lengdon platform: Providing the transaction room infrastructure, enforcing the six-gate closing sequence, and generating the append-only audit record.
To comply with legal obligations: Maintaining records as required under applicable law, including data protection law, anti-money laundering regulations, and contract law.
To protect the security of the platform: Detecting and preventing fraud, unauthorised access, and abuse.
To communicate with you: Responding to enquiries, sending transactional notifications (gate status, signatures required), and, where you have consented, sending product updates.

We do not use personal data for advertising. We do not sell personal data to third parties.`,
  },
  {
    title: "Legal basis for processing",
    content: `We process personal data on the following legal bases:

Contract performance (Article 6(1)(b) UK GDPR): Processing necessary to provide the Lengdon service you have contracted for.
Legitimate interests (Article 6(1)(f) UK GDPR): Security monitoring, fraud prevention, and platform integrity. We have assessed that these interests are not overridden by your rights.
Legal obligation (Article 6(1)(c) UK GDPR): Compliance with applicable laws and regulations.
Consent (Article 6(1)(a) UK GDPR): Where you have opted in to receive product communications. Consent can be withdrawn at any time.`,
  },
  {
    title: "The append-only audit record",
    content: `A core feature of Lengdon is the append-only audit record — a tamper-evident log of every action taken in a transaction room.

This record contains personal data (names, roles, timestamps, actions). It cannot be deleted or modified after creation — this is a fundamental design property, not a limitation.

Both parties to a transaction receive a copy of the complete audit record at close. This is a contractual commitment, not optional behaviour.

Because the audit record is append-only, we cannot fulfil requests to delete personal data contained within it where that data is part of the legally required closing record. We will inform you of this limitation before you enter a transaction room.

We retain audit records for a minimum of seven years following close, and for as long as reasonably required by applicable law.`,
  },
  {
    title: "Your rights",
    content: `Under UK GDPR and the Data Protection Act 2018, you have the following rights:

Right of access: You may request a copy of the personal data we hold about you.
Right to rectification: You may request correction of inaccurate personal data.
Right to erasure: You may request deletion of personal data where we have no legal basis for continued processing. Note: this right does not apply to data contained in the append-only audit record (see above).
Right to restrict processing: You may request that we limit our use of your data in certain circumstances.
Right to data portability: You may request a machine-readable copy of data you have provided to us.
Right to object: You may object to processing based on legitimate interests.

To exercise any of these rights, contact: privacy@lengdon.com

You also have the right to lodge a complaint with the Information Commissioner's Office (ICO): ico.org.uk`,
  },
  {
    title: "Data transfers",
    content: `Lengdon operates data residency selection at the transaction room level. When you create a room, you select the jurisdiction (UK, EU, or US) and data for that room is stored accordingly.

Account-level data (your profile, authentication records) is stored in the UK.

Where we transfer data outside the UK or EEA, we ensure that appropriate safeguards are in place (Standard Contractual Clauses or adequacy decisions).`,
  },
  {
    title: "Cookies",
    content: `We use strictly necessary cookies to operate the Lengdon platform (session management, authentication state). We do not use advertising cookies, tracking cookies, or third-party analytics cookies.

You can manage cookie preferences through your browser settings. Disabling strictly necessary cookies will prevent you from using the platform.`,
  },
  {
    title: "Changes to this policy",
    content: `We will notify registered users of material changes to this Privacy Policy at least 30 days before they take effect. The current version of this policy is always available at lengdon.com/legal/privacy.

This policy was last updated: 26 August 2026.`,
  },
];

function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Legal"
          title="PRIVACY"
          titleOutline="POLICY."
          subtitle="How Lengdon collects, uses, and protects your personal data. Last updated 26 August 2026."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[280px] shrink-0">
              <div className="sticky top-24">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-4">Contents</div>
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
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
