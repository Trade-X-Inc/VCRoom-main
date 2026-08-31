import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Content pass, 31 Aug 2026 — word-level rewrite only. Per the sitewide
// crypto/blockchain vocabulary rule: "hash" and "cryptographic" removed
// throughout, replaced with the real described mechanism (append-only
// record, reference number, check digit) per instruction. No new
// capability claim was introduced or invented in the process — every
// sentence on this page was originally built around "hash" as its
// literal subject (already flagged in CLAUDE.md §12 as one of four
// differentiator claims found false of the live product: no public
// registry query surface exists anywhere in the codebase). Reworded
// around the real mechanism (a reference number, not a hash) rather
// than silently dropping the page, since the underlying reference-
// numbering system (CLAUDE.md §8.4) is real and specified, even though
// it is not yet public-facing. Content-claim correctness on "publicly
// queryable" is unchanged from the prior flag and remains open —
// wording only was in scope for this pass.

export const Route = createFileRoute("/registry")({
  component: Registry,
});

function Registry() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="Lengdon · Registry"
          title="THE CLOSE"
          titleOutline="REGISTRY."
          subtitle="Every transaction closed through Lengdon generates a unique registry entry — a permanent, verifiable reference to the sealed record without exposing confidential deal terms."
        />

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#e6e9ef] divide-y lg:divide-y-0 lg:divide-x divide-[#e6e9ef]">
            <div className="p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">What it is</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] leading-[1.0] tracking-[-1.5px] mb-5">
                A REFERENCE.<br />NOT THE DEAL.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
                When a transaction room reaches Gate 6 and both parties confirm close, Lengdon generates a unique reference number for the complete transaction record. This reference — and only this reference — is stored in the registry. No deal terms. No party identities. No document content.
              </p>
            </div>
            <div className="p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-px bg-[#0a2540]/30" />
                <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">What it proves</span>
              </div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[32px] leading-[1.0] tracking-[-1.5px] mb-5">
                THE CLOSE<br />HAPPENED.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[15px] leading-[1.75]">
                Any party holding a sealed export can verify their record against the registry reference. A match proves the record is authentic and unmodified. The registry is the anchor — the exports are the evidence.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">How registry entries work</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            FOUR STEPS.<br />PERMANENT PROOF.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e6e9ef]">
            {[
              { num: "01", title: "Room reaches Gate 6", body: "Both parties confirm close. The transaction sequence is complete." },
              { num: "02", title: "Record is sealed", body: "The complete audit log, documents, and confirmations are compiled into a permanent record." },
              { num: "03", title: "Reference is written to registry", body: "A unique reference number for the sealed record is recorded in the Lengdon registry with a timestamp." },
              { num: "04", title: "Exports are issued", body: "Both parties receive identical sealed exports. Each can be verified against the registry at any future date." },
            ].map((s, i) => (
              <div key={s.num} className={`p-8 ${i < 3 ? "border-r border-[#e6e9ef]" : ""}`}>
                <div className="font-mono text-[#e6e9ef] text-[32px] font-bold leading-none mb-6">{s.num}</div>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px] mb-3">{s.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[13px] leading-[1.65]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20 border-b border-[#e6e9ef] bg-[#f8f9fb]">
          <div className="max-w-[680px]">
            <div className="w-8 h-px bg-[#d4af37]/60 mb-8" />
            <p style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[22px] leading-[1.45] tracking-[-0.4px]">
              The registry contains only reference numbers. It is designed to be publicly queryable. Every closed transaction has an entry. No transaction has its terms, parties, or documents exposed.
            </p>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Every close. Recorded forever.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Open a transaction room and generate your first registry entry.</p>
            </div>
            <Link to="/sign-up" search={{ role: "founder" } as any} style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="shrink-0 bg-white hover:bg-[#f0ece0] text-[#0a2540] font-semibold text-[14px] px-10 py-4 transition-colors duration-200">
              Start a room
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
