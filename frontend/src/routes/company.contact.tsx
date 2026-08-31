import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/company/Contact.tsx. Form is
// intentionally fake (local state only, no submission) as in the
// source — same deferred-wiring treatment as the homepage demo form,
// per instruction.

export const Route = createFileRoute("/company/contact")({
  component: Contact,
});

const REASONS = [
  "Book a product demo",
  "Institutional / Firm plan inquiry",
  "Security documentation request",
  "Press or media",
  "Partnership inquiry",
  "Other",
];

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", company: "", reason: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.reason) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Company · Contact"
          title="GET IN"
          titleOutline="TOUCH."
          subtitle="Whether you're evaluating Lengdon, running due diligence, or just want to see a live transaction — we respond to every message."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[380px] shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Contact</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-[0.9] tracking-[-1.5px] mb-8">
                WE READ EVERY MESSAGE.
              </h2>

              <div className="flex flex-col gap-6 border-t border-[#e6e9ef] pt-8">
                {[
                  { label: "General", email: "hello@lengdon.com" },
                  { label: "Sales & demos", email: "sales@lengdon.com" },
                  { label: "Security", email: "security@lengdon.com" },
                  { label: "Press", email: "press@lengdon.com" },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-1">{item.label}</div>
                    <a href={`mailto:${item.email}`} style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[15px] hover:opacity-60 transition-opacity">{item.email}</a>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-[#e6e9ef] pt-8">
                <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase mb-3">Office</div>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">
                  Lengdon Limited<br />
                  20 Fenchurch Street<br />
                  London EC3M 3BY<br />
                  United Kingdom
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-[600px]">
              {submitted ? (
                <div className="border border-[#e6e9ef] p-12 flex flex-col items-center text-center gap-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                      <path d="M2 8L8 14L20 2" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] mb-2">Message received.</div>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.6]">
                      We'll be in touch at {form.email} — usually within one business day.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="border border-[#e6e9ef] p-10 flex flex-col gap-5">
                  <div className="flex gap-5">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Full name *</label>
                      <input type="text" placeholder="Jane Thornton"
                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                        className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Work email *</label>
                      <input type="email" placeholder="jane@firm.com"
                        value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                        className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Company</label>
                    <input type="text" placeholder="ROM Capital Partners"
                      value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Reason for contact *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {REASONS.map(r => (
                        <button type="button" key={r}
                          onClick={() => setForm(p => ({ ...p, reason: r }))}
                          style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                          className={`border px-3 py-2.5 text-left text-[12px] transition-all duration-150 ${
                            form.reason === r ? "border-[#0a2540] bg-[#0a2540] text-white" : "border-[#e6e9ef] text-[#425466] hover:border-[#0a2540]/30"
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[12px] tracking-[0.3px]">Message</label>
                    <textarea rows={4} placeholder="Tell us what you're working on..."
                      value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      style={{ fontFamily: "'Inter:Regular', sans-serif" }}
                      className="border border-[#e6e9ef] px-4 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors resize-none" />
                  </div>
                  <button type="submit"
                    disabled={!form.name || !form.email || !form.reason}
                    style={{ fontFamily: "'Geist:SemiBold', sans-serif" }}
                    className="bg-[#0a2540] hover:bg-[#13233a] disabled:opacity-40 text-white font-semibold text-[14px] py-4 transition-colors duration-200">
                    Send message
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
