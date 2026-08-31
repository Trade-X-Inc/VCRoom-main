import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/Security.tsx.
//
// FLAGGED, NOT CHANGED, per instruction: the CERTS grid lists "ISO
// 27001" and "SOC 2 Type II" as held certifications. CLAUDE.md §11.3
// states plainly: "Claim nothing we do not hold... A regulatory sandbox
// licence does not substitute for SOC 2... SOC 2 Type II requires a
// 6-12 month observation window" — i.e. not yet certified as of this
// repo's own governing record. Reproduced verbatim as instructed;
// content-claim correctness was explicitly deferred for this task.

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
    title: "Immutable audit record",
    body: "Every action taken in a room is written to an append-only, cryptographically linked log. No entry can be deleted, modified, or reordered. Attempting to alter any earlier entry breaks every subsequent link visibly.",
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
    body: "Lengdon never handles, holds, escrows, or routes funds. Payment confirmation is recorded — proof of transfer is uploaded and counter-confirmed — but no financial instrument passes through our infrastructure.",
  },
  {
    title: "Data residency",
    body: "Transaction data is stored in the jurisdiction elected at room creation. UK, EU, and US options are available. Data does not leave the elected jurisdiction. For institutional requirements, additional residency options are available on request.",
  },
  {
    title: "Sealed export at close",
    body: "Both parties receive a signed, portable export of the full audit trail at close. The record is independent of the Lengdon platform — it can be verified without accessing our systems, and it cannot be revoked.",
  },
];

const CERTS = [
  { name: "ISO 27001", desc: "Information security management" },
  { name: "SOC 2 Type II", desc: "Security, availability & confidentiality" },
  { name: "GDPR", desc: "EU data protection compliance" },
  { name: "UK GDPR", desc: "UK data protection compliance" },
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

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 bg-[#f8f9fb] border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Compliance</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            CERTIFICATIONS
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {CERTS.map((c) => (
              <div key={c.name} className="border border-[#e6e9ef] bg-white p-8 flex flex-col gap-3">
                <div className="w-3 h-3 border-2 border-[#0a2540]" />
                <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.5px]">{c.name}</div>
                <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[13px]">{c.desc}</div>
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
                THE IMMUTABLE<br />RECORD.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7] max-w-[480px] mb-8">
                Every action is written to a permanent, append-only log where each entry is encrypted and linked to the one before it. Change an earlier entry and every subsequent link breaks visibly.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { prop: "Append-only", desc: "No deletes. No edits. Additions only." },
                  { prop: "Encrypted links", desc: "Each entry references its predecessor." },
                  { prop: "Sealed export", desc: "Both parties receive a signed copy at close." },
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
                { seq: "0017", ts: "2026-08-26 14:32", action: "Condition Met: Regulatory Approval", ref: "enc-a8f9...2b1c" },
                { seq: "0018", ts: "2026-08-26 15:45", action: "Term Accepted: Board Seat", ref: "enc-3c7d...8e9f" },
                { seq: "0019", ts: "2026-08-27 09:12", action: "Document Released: Cap Table", ref: "enc-f1e2...d3c4" },
              ].map((block) => (
                <div key={block.seq} className="border border-white/10 relative">
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-white/20" />
                  <div className="pl-5 pr-5 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/30 text-[10px] tracking-[1px]">BLOCK #{block.seq}</span>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/20 text-[10px]">{block.ts}</span>
                      <div className="ml-auto flex items-center gap-1 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                        <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-emerald-400/70 text-[9px] tracking-[0.5px]">VERIFIED</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-white/75 text-[13px] mb-2">{block.action}</p>
                    <span className="font-mono text-[11px] text-white/30">{block.ref}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f8f9fb] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] max-w-[560px]">
              Full technical documentation of our security controls, encryption implementation, and compliance posture is available on request for institutional due diligence.
            </p>
            <div className="flex gap-4 shrink-0">
              <Link to="/legal/privacy" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-[#e6e9ef] hover:border-[#0a2540]/30 text-[#425466] hover:text-[#0a2540] text-[14px] px-8 py-3 transition-all duration-200">
                Read Privacy Policy →
              </Link>
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-[#0a2540] hover:bg-[#13233a] text-white font-semibold text-[14px] px-8 py-3 transition-colors duration-200">
                Start a room
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
