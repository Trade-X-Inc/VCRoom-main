import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/legal/SubProcessors.tsx.

export const Route = createFileRoute("/legal/sub-processors")({
  component: SubProcessors,
});

const PROCESSORS = [
  { name: "Amazon Web Services (AWS)", category: "Cloud infrastructure", location: "United States / EU", purpose: "Hosting, compute, storage, and database services for the Lengdon platform." },
  { name: "Cloudflare", category: "CDN & security", location: "United States / Global", purpose: "Content delivery, DDoS protection, and TLS termination for platform traffic." },
  { name: "Stripe", category: "Payment processing", location: "United States", purpose: "Payment method storage and processing for Lengdon subscription billing. Not used for transaction payment confirmation in closing rooms." },
  { name: "SendGrid (Twilio)", category: "Transactional email", location: "United States", purpose: "Delivery of system notifications, gate confirmation emails, and account verification messages." },
  { name: "PlanetScale / Vitess", category: "Database", location: "United States", purpose: "Relational database hosting for transaction room data, audit logs, and user accounts." },
  { name: "Sentry", category: "Error monitoring", location: "United States", purpose: "Application error tracking and performance monitoring. PII is scrubbed before transmission." },
  { name: "Vercel", category: "Frontend delivery", location: "United States / Global edge", purpose: "Serving of the Lengdon web application to end users." },
];

function SubProcessors() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-20 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Legal · Sub-processors</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[56px] leading-[0.9] tracking-[-2.5px] mb-4">
              SUB-<br /><span style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.4)", color: "transparent" }}>PROCESSORS.</span>
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/40 text-[14px]">Last updated: 1 August 2025 · Changes notified 30 days in advance</p>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          <div className="max-w-[680px] mb-12">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
              Lengdon uses the following sub-processors to provide the platform. Per our Data Processing Agreement, we provide 30 days notice before adding or replacing sub-processors. Customers may object to changes during this period.
            </p>
          </div>

          <div className="border border-[#e6e9ef] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-8 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Sub-processor</div>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-6 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase border-l border-[#e6e9ef]">Category</div>
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-6 py-4 text-[#94a3b8] text-[11px] tracking-[1px] uppercase border-l border-[#e6e9ef]">Location</div>
            </div>
            {PROCESSORS.map((p, i) => (
              <div key={p.name} className={`grid grid-cols-[1fr_160px_160px] ${i < PROCESSORS.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <div className="px-8 py-5">
                  <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[14px] tracking-[-0.2px] mb-1">{p.name}</div>
                  <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] leading-[1.5]">{p.purpose}</div>
                </div>
                <div className="px-6 py-5 border-l border-[#e6e9ef]">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{p.category}</span>
                </div>
                <div className="px-6 py-5 border-l border-[#e6e9ef]">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{p.location}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-[#e6e9ef] pt-8 max-w-[680px]">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px] leading-[1.7]">
              To receive advance notification of sub-processor changes, contact privacy@lengdon.com. For questions about our Data Processing Agreement, see the full DPA at lengdon.com/legal/dpa.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
