import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/Glossary.tsx. Search + letter-filter
// state is the source's own real logic, unchanged.
//
// Content pass, 31 Aug 2026 — crypto vocabulary removed sitewide:
// "cryptographically linked/closed" -> "append-only"/"tamper-evident".
// Per CLAUDE.md §12's own precedent (Group 6), a glossary defines
// vocabulary rather than claiming a product capability, so "Sealed
// Record"/"Dual Export" as defined TERMS are kept (same distinction a
// dictionary makes between defining a word and claiming to have built
// the thing it names) — only the crypto-specific wording inside their
// definitions was changed.

export const Route = createFileRoute("/glossary/")({
  component: Glossary,
});

const TERMS = [
  { term: "Acquisition Room", letter: "A", def: "A transaction room in Lengdon specifically configured for an M&A or business acquisition. The six-gate sequence is adapted for due diligence completion, regulatory approval, signing, and payment confirmation." },
  { term: "Audit Log", letter: "A", def: "An append-only, timestamped record of every action taken by every party within a transaction room. In Lengdon, the audit log is tamper-evident — each entry references the prior one — making retrospective modification detectable." },
  { term: "Both-party Confirmation", letter: "B", def: "A gate requirement in Lengdon that requires explicit confirmation from both the room initiator and the invited party before progression. Neither party can advance a gate unilaterally." },
  { term: "Cap Table", letter: "C", def: "Capitalization table. A record of who owns what percentage of a company's equity, including founders, employees (via option pool), and all investors across rounds. Maintained independently of Lengdon but produced by the transactions Lengdon closes." },
  { term: "Close", letter: "C", def: "The final gate of a Lengdon transaction room. A close event requires both parties to confirm, triggers the audit log seal, and initiates the dual export of the complete transaction record." },
  { term: "Closing Infrastructure", letter: "C", def: "Lengdon's category. Infrastructure that sequences, enforces, and records the formal close of a private capital transaction — distinct from data room platforms (document storage) or CRM tools (pipeline management)." },
  { term: "Condition Precedent", letter: "C", def: "A condition that must be satisfied before a transaction can proceed to the next gate. Common conditions include regulatory approval, board consent, third-party sign-offs, and financing confirmations. Conditions are mapped to specific gates in Lengdon." },
  { term: "Counsel Gate", letter: "C", def: "Gate 1 of the Lengdon six-gate sequence. Both parties confirm that legal counsel has reviewed the transaction before the process proceeds. This gate ensures no party proceeds to agreement without legal review." },
  { term: "Data Room", letter: "D", def: "A secure repository for storing and sharing transaction documents — typically used during due diligence. Lengdon is not a data room. Data rooms precede the closing phase; Lengdon handles the close itself." },
  { term: "Dual Export", letter: "D", def: "At the close gate, both parties in a Lengdon transaction room receive a sealed, identical copy of the complete transaction record. Neither party controls or can revoke the other's copy." },
  { term: "Encryption", letter: "E", def: "All documents and communications within a Lengdon transaction room are encrypted at rest and in transit. Access requires individual authentication and is scoped to each gate's permissions." },
  { term: "Family Office", letter: "F", def: "A private wealth management entity investing on behalf of one or more high-net-worth families. Family offices use Lengdon to participate in co-investments and fund commitments with the same institutional-grade close infrastructure as large funds." },
  { term: "Gate", letter: "G", def: "One of six sequential checkpoints in a Lengdon transaction room. Each gate has specific confirmation requirements that must be met by both parties before the transaction proceeds. Gates are: Counsel, Agreement, Conditions, Signing, Payment, Close." },
  { term: "Gate Sequence", letter: "G", def: "The enforced order of Lengdon's six gates. The sequence cannot be bypassed or reordered. Each gate must be confirmed by both parties before the next gate unlocks." },
  { term: "SAFE Note", letter: "S", def: "Simple Agreement for Future Equity. An instrument used in early-stage financing where an investor provides capital now in exchange for equity at a future priced round. SAFE notes can be closed through Lengdon's transaction room infrastructure." },
  { term: "Sealed Record", letter: "S", def: "A transaction record that has been permanently closed at the completion of Gate 6. A sealed record cannot be modified, appended, or revoked. It is a permanent, standalone file that both parties receive at close." },
  { term: "SPV", letter: "S", def: "Special Purpose Vehicle. A legal entity created specifically to hold a single investment. SPV closes are a primary use case for Lengdon — the six-gate sequence handles counsel review, subscription documents, and payment confirmation for each LP in the vehicle." },
  { term: "Term Sheet", letter: "T", def: "A non-binding document outlining the key terms of a proposed investment. The term sheet precedes the Lengdon close process — Lengdon begins when both parties are committed to the terms and need to formally execute the transaction." },
  { term: "Transaction Room", letter: "T", def: "The primary unit of work in Lengdon. A transaction room is a sequenced, encrypted workspace that two parties use to formally close a private capital transaction. Each room has its own audit log, gate sequence, NDA enforcement, and sealed export at close." },
  { term: "Venture Capital", letter: "V", def: "A category of professional investment in early-stage and growth companies in exchange for equity. VC firms use Lengdon to standardize close infrastructure across their portfolio — same six-gate sequence and sealed record for every investment." },
].sort((a, b) => a.term.localeCompare(b.term));

const ALPHABET = [...new Set(TERMS.map(t => t.letter))].sort();

function Glossary() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");

  const filtered = TERMS.filter(t =>
    !search || t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase())
  ).filter(t => !active || t.letter === active);

  const grouped = ALPHABET.reduce<Record<string, typeof TERMS>>((acc, l) => {
    const items = filtered.filter(t => t.letter === l);
    if (items.length) acc[l] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <div className="bg-[#0a2540] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-white/35 text-[10px] tracking-[2.5px] uppercase">Private capital · Terminology</span>
            </div>
            <h1 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-white text-[72px] leading-[0.88] tracking-[-3px] mb-6">
              GLOSSARY.
            </h1>
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-white/55 text-[15px] max-w-[480px]">Key terms for private capital transactions, closing infrastructure, and Lengdon's platform.</p>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-12 lg:px-16 py-8 border-b border-[#e6e9ef] flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            placeholder="Search terms…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActive(""); }}
            style={{ fontFamily: "'Inter:Regular', sans-serif" }}
            className="flex-1 border border-[#e6e9ef] px-5 py-3 text-[14px] text-[#0a2540] placeholder-[#c9d0db] focus:outline-none focus:border-[#0a2540] transition-colors max-w-[400px]"
          />
          <div className="flex flex-wrap gap-1">
            {ALPHABET.map((l) => (
              <button
                key={l}
                onClick={() => { setActive(a => a === l ? "" : l); setSearch(""); }}
                style={{ fontFamily: "'Inter:Medium', sans-serif" }}
                className={`w-8 h-8 text-[12px] transition-all ${active === l ? "bg-[#0a2540] text-white" : "border border-[#e6e9ef] text-[#94a3b8] hover:border-[#0a2540]/30 hover:text-[#0a2540]"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          {Object.keys(grouped).length === 0 ? (
            <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[14px]">No terms match your search.</p>
          ) : (
            Object.entries(grouped).map(([letter, terms]) => (
              <div key={letter} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[40px] leading-none tracking-[-2px]">{letter}</span>
                  <div className="flex-1 h-px bg-[#e6e9ef]" />
                </div>
                <div className="flex flex-col gap-0 border border-[#e6e9ef] divide-y divide-[#e6e9ef]">
                  {terms.map((t) => (
                    <div key={t.term} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
                      <div className="px-7 py-6 border-b lg:border-b-0 lg:border-r border-[#e6e9ef]">
                        <span style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[16px] tracking-[-0.3px]">{t.term}</span>
                      </div>
                      <div className="px-7 py-6">
                        <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.7]">{t.def}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
