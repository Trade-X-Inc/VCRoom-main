import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — rewrite of the pixel-exact port of
// LENGDONPUBLIC-NEW's Security.tsx. Per direct instruction: removed
// every SOC 2 / ISO 27001 / GDPR certification claim, and rewritten so
// certifications simply aren't the subject (no "not yet certified"
// gap left visible) — the page is built entirely around controls that
// are true and provable today. Same layout/visual pattern as the
// original (two-column pillar grid, record explainer, CTA strip);
// only the CERTIFICATIONS section was removed outright and the record
// explainer's language brought in line with the sitewide append-only/
// tamper-evident vocabulary rule (no "cryptographic", "hash", "block",
// "chain", "immutable" — the mechanism is described as append-only and
// tamper-evident instead).
//
// Corrected 8 Sep 2026: "Data residency" claimed per-room UK/EU/US
// jurisdiction selection at room creation — no such feature exists
// anywhere in the deal-room code (verified against a live query of the
// real production Supabase project: single region, no per-room
// override). "Independent record" claimed both parties "receive a copy"
// at close — no export/delivery mechanism of any kind exists (CLAUDE.md
// §12, §20.15). Both rewritten to describe what's real.
//
// Corrected 9 Sep 2026 (public-site rewrite, Batch 2): the same "receive
// a copy... at close" export claim survived in a second location this
// 8 Sep pass missed — the "Shared record" item in the append-only-record
// sidebar list below. Rewritten to match the pillar-level fix above.
// Also added, per the task's own instruction that a procurement reviewer
// trusts a company that volunteers its gaps: a one-line statement that
// SOC 2 and independent penetration testing are not yet in place (the
// 31 Aug pass removed every certification claim but never stated the
// gap plainly, leaving certifications simply unaddressed rather than
// disclosed), and an explicit regulatory-boundary statement (software
// infrastructure, not a regulated financial institution, works alongside
// regulated counsel and compliance functions rather than replacing them).

export const Route = createFileRoute("/product/security")({
  component: Security,
});

const PILLARS = [
  {
    title: "Encryption at rest and in transit",
    body: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Encryption keys are managed per-room and rotated at close. No Lengdon employee has access to transaction content.",
  },
  {
    title: "Per-person NDA enforcement",
    body: "Every participant — not every company — signs an individual NDA before accessing the room. Access is granted to named individuals, not to organisations or teams. There is no 'company-level' access.",
  },
  {
    title: "Append-only, tamper-evident record",
    body: "Every action taken in a room is written to an append-only log. No entry can be deleted, modified, or reordered. Altering any earlier entry is detectable — the record makes tampering evident, not merely logged.",
  },
  {
    title: "Multi-factor authentication",
    body: "MFA is mandatory for all participants in every room. There is no mechanism to disable it. Authentication events are recorded individually in the audit log.",
  },
  {
    title: "Role-scoped access",
    body: "Each participant receives only the access their role requires for the current gate. Documents not yet released at the current gate are inaccessible — not hidden, not locked — simply not visible to the other party.",
  },
  {
    title: "No money movement",
    body: "Lengdon is software infrastructure, not a regulated financial institution. We never handle, hold, escrow, or route funds. Payment confirmation is recorded — proof of transfer is uploaded and counter-confirmed between the parties — but no financial instrument passes through our infrastructure. We work alongside your counsel, escrow agent, and compliance function; we don't replace them.",
  },
  {
    title: "Reference-checkable record",
    body: "Every closed deal gets a unique reference number that identifies its record without exposing terms, party identities, or document content. Both parties can cite it at any point after close.",
  },
  {
    title: "Independent record",
    body: "The full audit trail is preserved after close, unchanged, for both parties. It documents exactly what happened — every gate, confirmation, and signature — for as long as the deal room exists.",
  },
];

function Security() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Product · Security & Trust"
          title="BUILT FOR"
          titleOutline="ZERO TRUST."
          subtitle="Lengdon assumes no party should be trusted by default — including us. Every control exists to protect both parties from each other, from the platform, and from time."
          dark
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Security Controls</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            EIGHT CONTROLS.<br />ALL MANDATORY.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#e6e9ef]">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className={`p-8 ${i % 2 === 0 ? "md:border-r border-[#e6e9ef]" : ""} ${i < PILLARS.length - 2 ? "border-b border-[#e6e9ef]" : ""} ${i === PILLARS.length - 2 ? "md:border-b border-[#e6e9ef]" : ""}`}
              >
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">
                  {p.title}
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 px-12 lg:px-16 py-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">The Record</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-6">
                THE APPEND-ONLY<br />RECORD.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7] max-w-[480px] mb-8">
                Every action is written to a permanent, append-only log where each entry references the one before it. Altering an earlier entry breaks that reference — visibly, and permanently.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { prop: "Append-only", desc: "No deletes. No edits. Additions only." },
                  { prop: "Tamper-evident", desc: "Each entry references its predecessor; a change is detectable." },
                  { prop: "Shared record", desc: "Both parties see the same record — neither controls or can revoke the other's view of it." },
                ].map((item) => (
                  <div key={item.prop} className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#0a2540] mt-1.5 shrink-0" />
                    <div>
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#0a2540] text-[13px]">{item.prop} — </span>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px]">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-[480px] shrink-0 bg-[#0a2540] px-12 py-24 flex flex-col gap-6 justify-center">
              {[
                { ref: "ATLS01-ROM-2026-000017-91", ts: "2026-08-26 14:32", action: "Condition Met: Regulatory Approval" },
                { ref: "ATLS01-ROM-2026-000018-88", ts: "2026-08-26 15:45", action: "Term Accepted: Board Seat" },
                { ref: "ATLS01-ROM-2026-000019-85", ts: "2026-08-27 09:12", action: "Document Released: Cap Table" },
              ].map((entry) => (
                <div key={entry.ref} className="border border-white/10 relative">
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-white/20" />
                  <div className="pl-5 pr-5 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/20 text-[10px]">{entry.ts}</span>
                      <div className="ml-auto flex items-center gap-1 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-400/70 text-[9px] tracking-[0.5px]">RECORDED</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-white/75 text-[13px] mb-2">{entry.action}</p>
                    <span className="font-mono text-[11px] text-white/30">{entry.ref}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] max-w-[560px]">
              Full technical documentation of our security controls and encryption implementation is available on request for institutional due diligence. We do not yet hold a SOC 2 attestation or an independent penetration-test report — both are on our roadmap, not achieved today, and we say so directly rather than leave the question open.
            </p>
            <div className="flex gap-4 shrink-0">
              <Link to="/legal/privacy" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] hover:text-[#0a2540] text-[14px] px-8 py-3 transition-all duration-200">
                Read Privacy Policy →
              </Link>
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3 transition-colors duration-200">
                Join the waitlist
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
