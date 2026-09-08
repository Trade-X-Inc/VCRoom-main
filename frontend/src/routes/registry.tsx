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
// queryable" was flagged and left open by this comment — that flag was
// picked up 8 Sep 2026: "sealed export" (no export capability of any
// kind exists — CLAUDE.md §12, §20.15) and "publicly queryable" (no
// public registry query surface exists) are both corrected below to
// describe the real mechanism — a reference number, generated and
// checkable in the room, not a public lookup and not an exported file.
// "Transaction room(s)" also corrected to "deal room(s)" in the same
// pass.

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
          titleOutline="REFERENCE."
          subtitle="Every deal closed through Lengdon generates a unique reference number for the complete record — checkable by both parties, without exposing confidential deal terms."
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
                When a deal room reaches Gate 6 and both parties confirm close, Lengdon generates a unique reference number for the complete deal record. That reference identifies the record. It carries no deal terms, no party identities, no document content.
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
                Both parties can cite the reference number for a closed deal against the room's own append-only record. The record can't be edited or deleted after close — the reference just points a reader to it.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-24 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">How a reference is generated</span>
          </div>
          <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[48px] leading-[0.9] tracking-[-2px] mb-16">
            THREE STEPS.<br />ONE RECORD.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#e6e9ef]">
            {[
              { num: "01", title: "Room reaches Gate 6", body: "Both parties confirm close. The gate sequence is complete." },
              { num: "02", title: "The record stays sealed", body: "The complete gate log, documents, and confirmations are locked in place — append-only, nothing further can be edited or removed." },
              { num: "03", title: "A reference number is assigned", body: "A unique reference for the closed record is generated and attached to the room, timestamped, checkable by both parties." },
            ].map((s, i) => (
              <div key={s.num} className={`p-8 ${i < 2 ? "border-r border-[#e6e9ef]" : ""}`}>
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
              A reference number identifies the record — it carries no deal terms, no party identities, no document content. It's checkable by both parties to the deal, in the room itself, today. A public lookup surface is not yet built.
            </p>
          </div>
        </section>

        <section className="bg-[#0a2540] max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[40px] leading-[0.95] tracking-[-1.5px] mb-3">
                Every close. Recorded forever.
              </h2>
              <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px]">Open a deal room and generate your first reference number at close.</p>
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
