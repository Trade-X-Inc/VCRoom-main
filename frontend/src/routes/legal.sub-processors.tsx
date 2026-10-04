import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";
import { socialMeta } from "@/lib/social-meta";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/SubProcessors.tsx.
//
// Corrected 8 Sep 2026: this table listed vendors that don't match the
// real infrastructure this codebase actually runs on — unreviewed
// boilerplate from the Figma-export source, never checked against real
// state. "PlanetScale / Vitess" -> Supabase (the real database, real
// throughout CLAUDE.md §5/§12: PostgreSQL, AWS-backed). "SendGrid
// (Twilio)" -> Resend (the real transactional email provider — see
// lib/email/templates.ts, lib/email/triggers.ts). "Vercel" -> Cloudflare
// Pages/Workers (the real deploy target — CLAUDE.md §5/§12, "Never run
// npm run deploy... Git integration deploys"). AWS, Cloudflare (CDN
// row), and Stripe were checked and left as-is — consistent with real
// usage. "Transaction room" wording also corrected to "deal room."
//
// Corrected 13 Sep 2026 (legal/compliance audit): Sentry was removed —
// no Sentry package dependency and no code reference anywhere in the
// repo (grepped package.json and full source tree); it was never a
// real integration, just carried over from the Figma-export boilerplate
// like the three vendors above. HubSpot was added — it was missing
// entirely despite being a real, live processor of personal data
// (email, name, signup role) on every account signup, footer waitlist
// submission, and contact-form submission (see lib/hubspot.ts,
// routes/auth.callback.tsx). A processor that receives real personal
// data and isn't disclosed is a bigger gap than a disclosed vendor that
// doesn't exist — this direction of error was previously unchecked.
//
// Corrected 20 Sep 2026 (compliance audit): two more undisclosed live
// processors added, same direction-of-error as the HubSpot fix above.
// OpenAI receives real deal-room Q&A and diligence document content via
// the ai-router edge function — the absence of a DPA with them is
// already tracked internally as an open counsel question, but had never
// been surfaced on the customer-facing page the DPA's own §6 points at.
// Its training/retention wording was verified against OpenAI's own
// published API data policy, not asserted from memory. Daily.co was
// confirmed a real live integration (src/lib/interview-fn.ts and
// roast-fn.ts call api.daily.co to create rooms and meeting tokens) and
// processes participant audio/video — unambiguously personal data.
//
// Notion was deliberately NOT added: it backs the public blog/CMS only
// (src/lib/notion-blog.ts), handling published marketing content, not
// customer personal data. Listing it would overstate the processing
// surface in the other direction.

export const Route = createFileRoute("/legal/sub-processors")({
  head: () => ({
    meta: [
      { title: "Sub-processors — Lengdon" },
      { name: "description", content: "A maintained list of third-party sub-processors used by Lengdon, their purpose and data region." },
      ...socialMeta({ title: "Sub-processors — Lengdon", description: "A maintained list of third-party sub-processors used by Lengdon, their purpose and data region.", path: "/legal/sub-processors" }),
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/legal/sub-processors" }],
  }),
  component: SubProcessors,
});

const PROCESSORS = [
  { name: "Amazon Web Services (AWS)", category: "Cloud infrastructure", location: "United States / EU", purpose: "Underlying hosting, compute, and storage for the Lengdon platform's database and file infrastructure." },
  { name: "Cloudflare", category: "CDN, security & hosting", location: "United States / Global", purpose: "Content delivery, DDoS protection, TLS termination, and application hosting via Cloudflare Pages and Workers." },
  { name: "Stripe", category: "Payment processing", location: "United States", purpose: "Payment method storage and processing for Lengdon subscription billing. Not used for transaction payment confirmation in closing rooms." },
  { name: "Resend", category: "Transactional email", location: "United States", purpose: "Delivery of system notifications, closing-sequence confirmation emails, and account verification messages." },
  { name: "Supabase", category: "Database & authentication", location: "United States / EU", purpose: "PostgreSQL database hosting, authentication, and file storage for deal room data, audit logs, and user accounts." },
  { name: "HubSpot", category: "CRM & contact management", location: "United States / EU", purpose: "Stores contact records (name, email, account role) created on signup, waitlist join, or contact form submission. Used for account communications and support — not for advertising." },
  { name: "OpenAI", category: "AI processing", location: "United States", purpose: "Processes document and deal room content submitted to AI features — document review, diligence analysis, and Q&A summarisation. Per OpenAI's published API policy, content sent via the API is not used to train their models, and abuse-monitoring logs are retained for up to 30 days. A data processing agreement with this provider is not yet in place; until it is, do not submit content to AI features that you would not accept being processed under those terms." },
  { name: "Daily.co", category: "Video meetings", location: "United States", purpose: "Hosts live audio and video for in-room meetings and interview sessions. Processes participant audio, video, and display names for the duration of a call." },
];

// SEO-010 (AEO pass): BreadcrumbList JSON-LD.
const SUB_PROCESSORS_BREADCRUMB_JSON_LD = breadcrumbJsonLd([
  { name: "Home", url: "https://lengdon.com/" },
  { name: "Legal", url: "https://lengdon.com/legal" },
  { name: "Sub-processors" },
]);

function SubProcessors() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SUB_PROCESSORS_BREADCRUMB_JSON_LD }} />
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Legal · Sub-processors</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(36px,7vw,56px)] leading-[0.9] tracking-[-2.5px] mb-4">
              SUB-<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>PROCESSORS.</span>
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/50 text-[14px]">Last updated: 1 August 2025 · Changes notified 30 days in advance</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="max-w-[680px] mb-12">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[15px] leading-[1.75]">
              Lengdon uses the following sub-processors to provide the platform. Per our Data Processing Agreement, we provide 30 days notice before adding or replacing sub-processors. Customers may object to changes during this period.
            </p>
          </div>

          <div className="border border-[var(--v2-rule)] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[var(--v2-surface)] border-b border-[var(--v2-rule)]">
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-8 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase">Sub-processor</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase border-l border-[var(--v2-rule)]">Category</div>
              <div style={{ fontFamily: "var(--font-v2-data)" }} className="px-6 py-4 text-[var(--v2-ink-muted)] text-[11px] tracking-[1px] uppercase border-l border-[var(--v2-rule)]">Location</div>
            </div>
            {PROCESSORS.map((p, i) => (
              <div key={p.name} className={`grid grid-cols-[1fr_160px_160px] ${i < PROCESSORS.length - 1 ? "border-b border-[var(--v2-rule)]" : ""}`}>
                <div className="px-8 py-5">
                  <div style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[14px] tracking-[-0.2px] mb-1">{p.name}</div>
                  <div style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[12px] leading-[1.5]">{p.purpose}</div>
                </div>
                <div className="px-6 py-5 border-l border-[var(--v2-rule)]">
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[13px]">{p.category}</span>
                </div>
                <div className="px-6 py-5 border-l border-[var(--v2-rule)]">
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[13px]">{p.location}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-[var(--v2-rule)] pt-8 max-w-[680px]">
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[13px] leading-[1.7]">
              To receive advance notification of sub-processor changes, contact privacy@lengdon.com. For questions about our Data Processing Agreement, see the full DPA at lengdon.com/legal/dpa.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
