import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/Feedback.tsx. Form is intentionally
// fake (local state only), same treatment as the Contact and homepage
// demo forms, per instruction.

export const Route = createFileRoute("/feedback")({
  component: Feedback,
});

const TYPES = ["Product feedback", "Bug report", "Complaint", "Accessibility issue", "Regulatory concern", "Other"];

function Feedback() {
  const [form, setForm] = useState({ type: "", message: "", email: "", urgent: false });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.type && form.message) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Complaints & Feedback"
          title="TELL US"
          titleOutline="DIRECTLY."
          subtitle="We take every complaint and piece of feedback seriously. Complaints about our service or conduct are reviewed by a senior team member within two business days."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[360px] shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Our commitment</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[36px] leading-[0.95] tracking-[-1px] mb-6">
                EVERY COMPLAINT IS REVIEWED.
              </h2>
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="flex flex-col gap-5 text-[#425466] text-[14px] leading-[1.7]">
                <p>Complaints about our conduct, data handling, or service are reviewed by a senior team member within two business days. You will receive an acknowledgement and a timeline for resolution.</p>
                <p>For complaints involving data handling or privacy, we are required to respond within 72 hours under UK GDPR.</p>
                <p>If you are not satisfied with our response, you can escalate to the <a href="https://ico.org.uk" className="text-[#0a2540] underline hover:opacity-60">ICO (UK)</a> or the relevant supervisory authority in your jurisdiction.</p>
              </div>

              <div className="mt-8 border-t border-[#e6e9ef] pt-6">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-2">Direct contact</div>
                <a href="mailto:complaints@lengdon.com" style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[15px] hover:opacity-60 transition-opacity">
                  complaints@lengdon.com
                </a>
              </div>
            </div>

            <div className="flex-1 max-w-[580px]">
              {submitted ? (
                <div className="border border-[#e6e9ef] p-12 flex flex-col items-center text-center gap-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                      <path d="M2 8L8 14L20 2" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] mb-2">Received.</div>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.6]">
                      We've received your {form.type.toLowerCase()}. {form.email ? `We'll reply to ${form.email}.` : ""}
                      {form.urgent ? " This has been flagged as urgent and will be reviewed immediately." : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="border border-[#e6e9ef] p-10 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Type *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {TYPES.map(t => (
                        <button type="button" key={t}
                          onClick={() => setForm(p => ({ ...p, type: t }))}
                          style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                          className={`border px-3 py-2.5 text-left text-[12px] transition-all duration-150 ${
                            form.type === t ? "border-[#0a2540] bg-[#0a2540] text-white" : "border-[#e6e9ef] text-[#425466] hover:border-[#0a2540]/30"
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Your message *</label>
                    <textarea rows={6} placeholder="Describe your feedback or complaint in as much detail as possible..."
                      value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors resize-none" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Email (for our response)</label>
                    <input type="email" placeholder="your@email.com"
                      value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.urgent} onChange={e => setForm(p => ({ ...p, urgent: e.target.checked }))}
                      className="w-4 h-4 accent-[#0a2540]" />
                    <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px]">
                      This is urgent or time-sensitive
                    </span>
                  </label>

                  <button type="submit"
                    disabled={!form.type || !form.message}
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-40 text-white font-semibold text-[14px] py-4 transition-colors duration-200">
                    Submit
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
