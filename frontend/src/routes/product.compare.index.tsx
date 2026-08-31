import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/product/Compare.tsx.
//
// FLAGGED, NOT CHANGED: this comparison table's checkmarks assert
// "Immutable audit record", "Sealed exportable record at close" and
// "Dual-party confirmation required" as live Lengdon capabilities.
// CLAUDE.md §12 (Group 4, this repo's own prior public-site migration)
// already found near-identical claims — "single-notice diligence",
// "sealed export", "watermarked/logged release" — FALSE of the live
// product, describing only the unpromoted pack_v1 schema (0 real rows),
// and removed them from public copy for exactly that reason. This page
// reintroduces the same claim shape. Reproduced verbatim per
// instruction; content-claim correctness explicitly deferred.

export const Route = createFileRoute("/product/compare/")({
  component: Compare,
});

const COMPARISON = [
  {
    feature: "Enforced closing sequence",
    lengdon: true,
    dataRoom: false,
    note: "Traditional data rooms have no concept of gates — parties can access anything at any time.",
  },
  {
    feature: "Per-person NDA enforcement",
    lengdon: true,
    dataRoom: false,
    note: "Data rooms grant access at the company level. Lengdon binds access to individuals.",
  },
  {
    feature: "Immutable audit record",
    lengdon: true,
    dataRoom: false,
    note: "Most data room logs can be modified by administrators. Lengdon's record is append-only.",
  },
  {
    feature: "Dual-party confirmation required",
    lengdon: true,
    dataRoom: false,
    note: "Data rooms are passive repositories. Lengdon actively requires both parties to confirm at each gate.",
  },
  {
    feature: "Sealed exportable record at close",
    lengdon: true,
    dataRoom: false,
    note: "A data room is controlled by one party. Lengdon gives both parties a sealed copy of the full record.",
  },
  {
    feature: "Payment confirmation workflow",
    lengdon: true,
    dataRoom: false,
    note: "No traditional data room includes a payment confirmation gate.",
  },
  {
    feature: "Document storage and sharing",
    lengdon: true,
    dataRoom: true,
    note: "",
  },
  {
    feature: "Access permissions",
    lengdon: true,
    dataRoom: true,
    note: "Data rooms offer company-level permissions. Lengdon offers per-person, per-gate permissions.",
  },
  {
    feature: "Activity logging",
    lengdon: true,
    dataRoom: true,
    note: "Lengdon's log is cryptographically linked. Traditional logs are mutable.",
  },
  {
    feature: "No money movement",
    lengdon: true,
    dataRoom: true,
    note: "",
  },
];

const PRINCIPLES = [
  {
    title: "A data room is a filing cabinet.",
    body: "It stores documents and lets people access them. It doesn't know what phase of a transaction you're in, doesn't enforce any sequence, and doesn't record who confirmed what.",
  },
  {
    title: "Lengdon is closing infrastructure.",
    body: "It begins when two parties have already decided to talk. It enforces the sequence that makes a private capital transaction legal, verified, and permanent — from counsel to close.",
  },
  {
    title: "The record belongs to both parties.",
    body: "A traditional data room is controlled by whoever set it up — usually the seller. Lengdon's record is sealed and exported to both parties at close. Neither party can revoke the other's copy.",
  },
];

function Compare() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Lengdon vs Traditional Data Rooms"
          title="NOT A DATA"
          titleOutline="ROOM."
          subtitle="Traditional data rooms store documents. Lengdon closes transactions. The difference is architectural — and it matters more than any feature comparison."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {PRINCIPLES.map((p, i) => (
              <div key={i} className={`p-10 ${i < PRINCIPLES.length - 1 ? "lg:border-r border-b lg:border-b-0 border-[#e6e9ef]" : ""}`}>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[20px] tracking-[-0.5px] mb-4 leading-[1.2]">
                  {p.title}
                </h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Feature Comparison</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            HEAD TO HEAD
          </h2>

          <div className="border border-[#e6e9ef] overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_160px] bg-[#f8f9fb] border-b border-[#e6e9ef]">
              <div style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="px-8 py-5 text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Feature</div>
              <div style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="px-6 py-5 font-semibold text-[#0a2540] text-[13px] text-center border-l border-[#e6e9ef]">Lengdon</div>
              <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="px-6 py-5 text-[#94a3b8] text-[13px] text-center border-l border-[#e6e9ef]">Data Room</div>
            </div>

            {COMPARISON.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_160px_160px] ${i < COMPARISON.length - 1 ? "border-b border-[#e6e9ef]" : ""} hover:bg-[#fafbfc] transition-colors`}
              >
                <div className="px-8 py-5">
                  <div style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px] mb-1">{row.feature}</div>
                  {row.note && (
                    <div style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{row.note}</div>
                  )}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-[#e6e9ef]">
                  {row.lengdon ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#e6e9ef] flex items-center justify-center">
                      <div className="w-2 h-px bg-[#c9d0db]" />
                    </div>
                  )}
                </div>
                <div className="px-6 py-5 flex items-center justify-center border-l border-[#e6e9ef]">
                  {row.dataRoom ? (
                    <div className="w-5 h-5 rounded-full bg-[#94a3b8]/20 border border-[#94a3b8]/30 flex items-center justify-center">
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#e6e9ef] flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M2 2L6 6M6 2L2 6" stroke="#e6e9ef" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                See it in a live room.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">
                30 minutes. We'll show you the six-gate sequence from setup to close.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
                Start closing
              </Link>
              <Link to="/company/contact" style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-[14px] px-10 py-4 transition-all duration-200">
                Book a demo →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
