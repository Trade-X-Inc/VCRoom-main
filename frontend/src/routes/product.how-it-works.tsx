import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/HowItWorks.tsx.

export const Route = createFileRoute("/product/how-it-works")({
  component: HowItWorks,
});

const GATES = [
  {
    num: "01", title: "Counsel",
    party: "Both parties",
    desc: "Both legal teams are brought in before any data is shared. Transaction parameters are formally established and each party's counsel acknowledged. This gate cannot be bypassed — Lengdon requires both parties to confirm counsel is in place before proceeding.",
    detail: "Per-person NDA enforced. No data shared until this gate is confirmed.",
  },
  {
    num: "02", title: "Agreement",
    party: "Both parties, independently",
    desc: "Each party independently confirms their intent to proceed. No single confirmation can trigger the next gate — both must act in their own time, without visibility into the other's confirmation until both are complete.",
    detail: "Independent confirmation prevents any coercive or premature disclosure.",
  },
  {
    num: "03", title: "Conditions",
    party: "Owner of each condition",
    desc: "Conditions precedent are added to the room and assigned to named owners. Each condition must be satisfied in sequence. The system enforces completion order — conditions cannot be reordered, skipped, or marked satisfied by any party other than their assigned owner.",
    detail: "System-enforced sequencing. Not convention, not goodwill.",
  },
  {
    num: "04", title: "Signing",
    party: "Both parties, separately",
    desc: "Transaction documents are executed in sequence by each party, in their own time, with their own counsel. No joint session required. Each signature event is recorded individually to the audit log.",
    detail: "No joint session. Each party signs independently, with their own counsel.",
  },
  {
    num: "05", title: "Payment",
    party: "Investor + Founder confirm",
    desc: "Investor uploads verified proof of transfer. Founder confirms receipt. Both confirmations are required to advance to Close. Neither party can proceed to the final gate without the other's acknowledgement.",
    detail: "Dual confirmation required. The system records each action independently.",
  },
  {
    num: "06", title: "Close",
    party: "Both parties, independently",
    desc: "Mutual confirmation seals the record permanently. Both parties export a signed copy of the complete immutable audit trail. The room is archived. Nothing in the record can be changed, amended, or deleted after this point.",
    detail: "Both parties receive a sealed, signed copy of the complete record.",
  },
];

const PRINCIPLES = [
  { label: "Append-only", desc: "No entry in the audit record can be deleted or modified. The system only ever adds to the log." },
  { label: "Encrypted links", desc: "Each record entry is cryptographically linked to the previous entry. Altering any earlier entry breaks every subsequent link visibly." },
  { label: "Per-person, not per-company", desc: "Every NDA, every access grant, every signature is tied to a specific individual — not a company, not a role, not a team." },
  { label: "Dual confirmation", desc: "Critical events — agreement, close — require independent confirmation from both parties before proceeding." },
  { label: "Sealed export", desc: "At close, both parties receive a signed, portable export of the full audit trail. The record lives with both parties, not just the platform." },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Product · How It Works"
          title="SIX GATES."
          titleOutline="ONE CLOSE."
          subtitle="Every private capital transaction follows the same sequence. Lengdon enforces it — not by convention, but by the system itself. No gate can be opened until the one before it is complete."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-[320px] shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">The Sequence</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-6">
                THE GATES
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.7]">
                Six gates. Each requires the one before it. The system enforces the order — neither party can advance alone.
              </p>
            </div>

            <div className="flex-1 flex flex-col">
              {GATES.map((gate, i) => (
                <div key={gate.num} className={`flex gap-8 py-8 ${i < GATES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                  <div className="flex flex-col items-center gap-0 shrink-0 w-10">
                    <div className="w-8 h-8 bg-[#0a2540] flex items-center justify-center shrink-0">
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white text-[11px] tracking-[1px]">{gate.num}</span>
                    </div>
                    {i < GATES.length - 1 && <div className="w-px flex-1 bg-[#e6e9ef] mt-2" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[22px] tracking-[-0.5px]">
                        {gate.title}
                      </h3>
                      <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px] border border-[#e6e9ef] px-2.5 py-1">
                        {gate.party}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7] mb-3">
                      {gate.desc}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-px bg-[#d4af37]/60" />
                      <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[12px] italic">{gate.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Design Principles</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            BUILT ON THESE<br />GUARANTEES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {PRINCIPLES.map((p, i) => (
              <div key={p.label} className={`p-8 ${i % 3 < 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r md:lg:border-r-0" : ""} ${i < 3 ? "border-b" : ""} border-[#e6e9ef]`}>
                <div className="w-2 h-2 bg-[#0a2540] mb-5" />
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[18px] tracking-[-0.3px] mb-3">{p.label}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Ready to run the sequence?
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] leading-[1.6]">
                Initialize a room and begin the six-gate process today.
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Initialize Account
              </Link>
              <Link to="/sign-in" search={{ redirect: "/app" }} style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                Sign in →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
