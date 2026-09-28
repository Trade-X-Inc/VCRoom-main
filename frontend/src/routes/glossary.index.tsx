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
// Record"/"Dual Export" as defined TERMS were kept (same distinction a
// dictionary makes between defining a word and claiming to have built
// the thing it names) — only the crypto-specific wording inside their
// definitions was changed.
//
// Corrected 8 Sep 2026: that distinction was applied wrong for these two
// entries. "Sealed Record" and "Dual Export" didn't just define
// vocabulary — their bodies asserted, in the present tense, that
// Lengdon delivers an exported file to both parties at close ("both
// parties receive at close" / "receive a sealed, identical copy"). That
// is a capability claim, not a neutral definition, and no export
// capability of any kind exists (CLAUDE.md §12, §20.15). Both entries
// rewritten to define the real underlying concept (the permanent,
// append-only in-room record) without asserting delivery of a file.
// "Transaction Room" also renamed to "Deal Room" throughout — every
// live product surface uses "deal room," and a glossary entry for the
// term the product no longer uses is itself a stale-fact problem, the
// same class this pass exists to catch, not a wording preference.

export const Route = createFileRoute("/glossary/")({
  head: () => ({
    meta: [
      { title: "Private capital glossary — terms of art, defined plainly — Lengdon" },
      { name: "description", content: "Accurate definitions of disclosure, diligence and closing terms used in private-capital transactions. Disclosure pack to sealed export." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/glossary" }],
  }),
  component: Glossary,
});

const TERMS = [
  { term: "Acquisition Room", letter: "A", def: "A deal room in Lengdon specifically configured for an M&A or business acquisition. The closing sequence is adapted for due diligence completion, regulatory approval, signing, and payment confirmation." },
  { term: "Audit Log", letter: "A", def: "An append-only, timestamped record of every action taken by every party within a deal room. In Lengdon, the audit log is tamper-evident — each entry references the prior one — making retrospective modification detectable." },
  { term: "Both-party Confirmation", letter: "B", def: "A requirement in Lengdon that requires explicit confirmation from both the room initiator and the invited party before progression. Neither party can advance a step unilaterally." },
  { term: "Cap Table", letter: "C", def: "Capitalization table. A record of who owns what percentage of a company's equity, including founders, employees (via option pool), and all investors across rounds. Maintained independently of Lengdon but produced by the deals Lengdon closes." },
  { term: "Close", letter: "C", def: "The final step of a Lengdon deal room's closing sequence. A close event requires both parties to confirm and seals the complete deal record — nothing in it can be edited or deleted afterward." },
  { term: "Closing Infrastructure", letter: "C", def: "Lengdon's category. Infrastructure that sequences, enforces, and records the formal close of a private capital transaction — distinct from data room platforms (document storage) or CRM tools (pipeline management)." },
  { term: "Closing Sequence", letter: "C", def: "The enforced sequence of steps a deal room moves through to reach Close: Counsel, Agreement, Conditions, Signing, Payment, Close. The sequence cannot be bypassed or reordered. Each step must be confirmed by both parties before the next unlocks." },
  { term: "Closing Step", letter: "C", def: "A named step in Lengdon's closing sequence (Counsel, Agreement, Conditions, Signing, Payment, Close). Each step has specific confirmation requirements that must be met by both parties before the transaction proceeds." },
  { term: "Condition Precedent", letter: "C", def: "A condition that must be satisfied before a transaction can proceed to the next step. Common conditions include regulatory approval, board consent, third-party sign-offs, and financing confirmations. Conditions are mapped to specific steps in Lengdon." },
  { term: "Counsel Step", letter: "C", def: "The point at the start of closing where either party may engage legal counsel, or both may agree to proceed without — the decision is recorded either way. This step ensures no party proceeds to agreement without the counsel question being addressed." },
  { term: "Data Room", letter: "D", def: "A secure repository for storing and sharing transaction documents — typically used during due diligence. Lengdon is not a data room. Data rooms precede the closing phase; Lengdon handles the close itself." },
  { term: "Deal Room", letter: "D", def: "The primary unit of work in Lengdon. A deal room is a sequenced, encrypted workspace that two parties use to formally close a private capital transaction. Each room has its own audit log, closing sequence, NDA enforcement, and permanent record." },
  { term: "Encryption", letter: "E", def: "All documents and communications within a Lengdon deal room are encrypted at rest and in transit. Access requires individual authentication and is scoped to each step's permissions." },
  { term: "Family Office", letter: "F", def: "A private wealth management entity investing on behalf of one or more high-net-worth families. Family offices use Lengdon to participate in co-investments and fund commitments with the same institutional-grade close infrastructure as large funds." },
  { term: "Reference Number", letter: "R", def: "A unique, checkable identifier assigned to a deal room's record at close. It carries no deal terms, party identities, or document content — it points to the record without exposing what's in it." },
  { term: "SAFE Note", letter: "S", def: "Simple Agreement for Future Equity. An instrument used in early-stage financing where an investor provides capital now in exchange for equity at a future priced round. SAFE notes can be closed through Lengdon's deal room infrastructure." },
  { term: "Sealed Record", letter: "S", def: "A deal record that becomes permanently closed at the completion of Close. A sealed record cannot be modified, appended, or removed — it stays inspectable in the room, unchanged, for the life of the deal." },
  { term: "SPV", letter: "S", def: "Special Purpose Vehicle. A legal entity created specifically to hold a single investment. SPV closes are a primary use case for Lengdon — the closing sequence handles counsel review, subscription documents, and payment confirmation for each LP in the vehicle." },
  { term: "Term Sheet", letter: "T", def: "A non-binding document outlining the key terms of a proposed investment. The term sheet precedes the Lengdon close process — Lengdon begins when both parties are committed to the terms and need to formally execute the transaction." },
  { term: "Venture Capital", letter: "V", def: "A category of professional investment in early-stage and growth companies in exchange for equity. VC firms use Lengdon to standardize close infrastructure across their portfolio — same closing sequence and sealed record for every investment." },
  { term: "Accredited Investor", letter: "A", def: "A legal designation, based on income, net worth, or professional certification, that determines who may participate in most private securities offerings without the issuer registering the offering publicly. Requirements vary by jurisdiction. A founder or platform accepting investment from an individual has a real obligation to confirm accredited status before the round closes, not after — it isn't a formality that can be assumed based on how the conversation went." },
  { term: "Anti-dilution (Broad-based Weighted Average)", letter: "A", def: "The most common anti-dilution formula, which adjusts an investor's conversion price downward after a down round, but by an amount that factors in the size of the new round relative to the company's total existing shares — the more shares outstanding, the smaller the adjustment. \"Broad-based\" means the calculation includes the full fully-diluted share count (including the option pool), which produces a gentler adjustment than a narrow-based calculation would. This is the founder-favorable version of anti-dilution and is standard in the large majority of venture deals." },
  { term: "Anti-dilution (Full Ratchet)", letter: "A", def: "An anti-dilution formula that resets an investor's conversion price to match the new, lower price of a down round entirely, regardless of how large or small the new round actually is. Unlike weighted average anti-dilution, full ratchet ignores the relative size of the new round, which makes it dramatically more punitive to the founder and other existing shareholders in a down round. It's rare in standard venture deals and more common in distressed or highly investor-favorable situations — a founder should treat a full ratchet request as a significant term worth pushing back on, not a routine protective clause." },
  { term: "Bridge Round", letter: "B", def: "A smaller, typically faster financing round raised between two priced rounds, intended to extend a company's runway until it either hits a milestone that justifies a full priced round or completes one already in progress. Bridge rounds are commonly structured as convertible notes or SAFEs rather than priced equity, since the point is usually speed and the company may not want to set a new valuation yet. A bridge is not inherently a bad sign — plenty of well-performing companies raise one deliberately to hit a specific milestone before a larger round — but investors will reasonably ask why this round wasn't planned as part of the last one." },
  { term: "Closing Book", letter: "C", def: "The complete, organized set of final signed documents and records produced at the close of a transaction — the final term sheet, stock purchase agreement, disclosure schedules, board consents, and any side letters, typically compiled into a single reference package. Legal counsel traditionally assembles the closing book after signing, and it becomes the definitive record both parties and their counsel refer back to if any question arises later. A disorganized or incomplete closing book is a common source of friction at the next financing round, when new counsel asks for documents nobody can immediately locate." },
  { term: "Closing Opinion (Legal)", letter: "C", def: "A formal written opinion from a party's legal counsel, delivered at closing, confirming specific legal facts about the transaction — typically that the company is validly formed, the securities being issued are properly authorized, and the agreements are enforceable. Investors, particularly institutional ones, often require a closing opinion from the company's counsel as a condition of closing, since it puts a law firm's professional judgment (and liability) behind specific representations rather than relying solely on the company's own assertions. Closing opinions are more common at Series A and beyond than at seed, where the cost often isn't justified relative to the round size." },
  { term: "Closing Conditions Precedent", letter: "C", def: "The specific set of requirements that must each be satisfied before a transaction is permitted to close, distinct from the general conditions precedent that might apply throughout diligence. Common closing conditions precedent include delivery of all signed transaction documents, confirmation that no material adverse change has occurred since the term sheet was signed, and receipt of any required third-party or regulatory consents. Unlike earlier-stage conditions, closing conditions precedent are typically binary and immediate — the close cannot proceed until literally every one is checked off, which is why founders should track them explicitly rather than assume they'll resolve naturally as the process moves forward." },
  { term: "Convertible Note", letter: "C", def: "A debt instrument used in early-stage financing that converts into equity at a future priced round, similar in purpose to a SAFE but structurally different: a convertible note accrues interest and has a maturity date, meaning it is technically a loan that must be repaid (or renegotiated) if the company never raises a triggering round. Convertible notes predate the SAFE and are still used, particularly where investors want the additional protections debt provides, such as a claim on assets ahead of equity holders if the company fails. The interest rate and maturity date are real, negotiable terms — a note with a near-term maturity date on a company that hasn't yet found product-market fit creates real pressure that a SAFE, with no maturity date, does not." },
  { term: "Down Round", letter: "D", def: "A financing round priced at a lower valuation than the company's previous round, meaning existing shareholders' ownership is diluted more heavily than it would be in a flat or up round, and any anti-dilution provisions from earlier rounds are triggered. Down rounds carry real signaling cost beyond the immediate dilution — they can affect employee morale, complicate future fundraising narratives, and trigger anti-dilution adjustments that shift additional dilution specifically onto founders and employees rather than spreading it evenly. A down round is sometimes still the right decision for a company's survival, but founders should understand the full mechanical consequences, not just the headline valuation, before agreeing to one." },
  { term: "Drag-along Rights", letter: "D", def: "A provision, usually held by a majority of preferred shareholders or the board, that compels all other shareholders — including founders and minority holders — to vote in favor of and participate in an approved sale of the company, even if they personally object. Drag-along rights exist to prevent a small minority of shareholders from blocking an exit that the majority supports, which is a real risk without them, since unanimous consent requirements can let a single holdout extract disproportionate leverage in a sale. Founders should understand what percentage threshold triggers drag-along in their specific documents, since this varies by deal and materially affects how much control they retain over a future sale decision." },
  { term: "Lead Investor", letter: "L", def: "The investor in a financing round who negotiates the term sheet's key terms on behalf of the round, typically commits the largest check, and often takes a board seat as part of the deal. Other investors in the same round — sometimes called followers — generally invest on the terms the lead has already negotiated, rather than negotiating their own separate terms, which is part of why securing a credible lead is usually the hardest and most important part of closing a round. A round without a clear lead can stall, since individual smaller investors are often reluctant to be the first, or only, party setting terms." },
  { term: "Liquidation Preference (Participating vs Non-participating)", letter: "L", def: "The distinction that determines whether preferred investors, in addition to receiving their liquidation preference back first at an exit, also get to participate further in whatever proceeds remain for common shareholders. Non-participating preferred investors choose one or the other — take their preference amount, or convert to common and take their pro-rata share, whichever is larger — but not both. Participating preferred investors get their preference back first and then also participate pro-rata in the remaining proceeds alongside common shareholders, which can meaningfully reduce what founders and employees receive in a modest exit even when the headline deal terms look reasonable. Non-participating is standard in most venture deals today; participating preferred is worth specific founder attention when proposed." },
  { term: "Maturity Date (Debt Instruments)", letter: "M", def: "The date by which a debt instrument, such as a convertible note, must either convert into equity or be repaid, if no triggering event (typically a priced round) has occurred by then. In practice, maturity dates on early-stage convertible notes are frequently extended or renegotiated rather than enforced literally, since forcing repayment of a note the company can't afford to repay in cash often isn't in either party's real interest. Still, an approaching maturity date creates genuine leverage for the noteholder in any renegotiation, which is one reason SAFEs — which carry no maturity date at all — became the more common instrument for straightforward early-stage rounds." },
  { term: "Most Favoured Nation (MFN) Clause", letter: "M", def: "A provision, common in SAFEs and convertible notes, giving an early investor the right to adopt more favorable terms if the company later issues a similar instrument to another investor on better terms before the MFN holder's instrument converts. If a founder signs a SAFE with a $10 million cap in January and then, needing more capital in March, issues a new SAFE with an $8 million cap, an MFN clause in the January SAFE lets that investor step down to the more favorable $8 million cap as well. Founders raising a bridge across multiple small checks should track every MFN clause carefully, since stacking several of them can mean a late, seemingly minor concession retroactively changes the terms of every earlier instrument that carries one." },
  { term: "Pay-to-play Provision", letter: "P", def: "A term, most common in down-round or distressed financings, that requires existing investors to participate in a new financing round on a pro-rata basis or else face a penalty — typically the forced conversion of their preferred shares into common shares, losing preferential rights like liquidation preference and anti-dilution protection. Pay-to-play provisions exist to align investor incentives during a difficult financing: an investor who won't put in more money to help the company survive loses the protections that assumed continued support. They're relatively rare in healthy markets but reappear specifically in down-round and bridge situations, where a company needs to know which investors will actually show up again." },
  { term: "Pro Rata Rights", letter: "P", def: "A right, typically granted to an investor in an earlier round, allowing (but not obligating) them to invest in a future round in an amount sufficient to maintain their existing ownership percentage, before that round is opened to new investors. Pro rata rights are standard and generally low-cost for founders to grant, since the investor is buying at the new round's price, not a discount — the real founder consideration is in an oversubscribed round, where honoring existing pro rata commitments can crowd out the space available for new investors the founder specifically wants to bring in." },
  { term: "Right of First Refusal (ROFR)", letter: "R", def: "A provision giving a company, and often its existing investors, the right to purchase a shareholder's shares on the same terms being offered by an outside buyer, before that shareholder is permitted to sell to the outside party. A ROFR is a standard mechanism for keeping a private company's cap table from being disrupted by shares transferring to parties the company and existing investors haven't approved of — it doesn't prevent a sale outright, but it gives insiders the first opportunity to match any offer before an outsider can buy in." },
  { term: "Side Letter", letter: "S", def: "A separate agreement between a company and one specific investor, made alongside the main financing documents, that grants that investor additional or different rights not extended to other investors in the same round — most favoured nation protection, additional information rights, or a specific board observer seat, for example. Side letters are common with larger or strategically important investors, but they create real complexity: a founder needs to track every side letter granted across every round, since conflicting or stacked side-letter commitments can create obligations that are easy to lose track of without a consolidated record." },
  { term: "Tag-along Rights", letter: "T", def: "A provision that allows minority shareholders to join, on the same terms, if a majority shareholder sells their stake to a third party — protecting minority holders from being left behind, holding shares in a company now controlled by a new, unvetted majority owner. Tag-along rights function as the mirror image of drag-along rights: drag-along protects the majority's ability to force a full sale, while tag-along protects the minority's ability to exit alongside them on equivalent terms rather than being stuck as a minority holder under new control." },
  { term: "Warrant", letter: "W", def: "A contractual right, but not an obligation, to purchase a specific number of a company's shares at a fixed price (the exercise price) within a set period of time. Warrants are sometimes issued alongside debt financing (as an added incentive for lenders) or to vendors and strategic partners in lieu of cash payment. Unlike a stock option, a warrant is typically issued to an outside party rather than an employee, and its terms — exercise price, expiration date, and how many shares it covers — are negotiated individually rather than following a standard equity incentive plan." },
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
        <div className="bg-[var(--v2-accent)] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative z-10 max-w-[1440px] mx-auto px-12 lg:px-16 py-24 pt-32">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-5 h-px bg-white/20" />
              <span style={{ fontFamily: "var(--font-v2-data)" }} className="text-white/50 text-[10px] tracking-[2.5px] uppercase">Private capital · Terminology</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-white text-[clamp(44px,7vw,72px)] leading-[0.88] tracking-[-3px] mb-6">
              GLOSSARY.
            </h1>
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-white/55 text-[15px] max-w-[480px]">Key terms for private capital transactions, closing infrastructure, and Lengdon's platform.</p>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-12 lg:px-16 py-8 border-b border-[var(--v2-rule)] flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            placeholder="Search terms…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActive(""); }}
            style={{ fontFamily: "var(--font-v2-ui)" }}
            className="flex-1 border border-[var(--v2-rule)] px-5 py-3 text-[14px] text-[var(--v2-accent)] placeholder-[var(--v2-ink-muted)] focus:outline-none focus:border-[var(--v2-accent)] transition-colors max-w-[400px]"
          />
          <div className="flex flex-wrap gap-1">
            {ALPHABET.map((l) => (
              <button
                key={l}
                onClick={() => { setActive(a => a === l ? "" : l); setSearch(""); }}
                style={{ fontFamily: "var(--font-v2-data)" }}
                className={`w-8 h-8 text-[12px] transition-all ${active === l ? "bg-[var(--v2-accent)] text-white" : "border border-[var(--v2-rule)] text-[var(--v2-ink-muted)] hover:border-[var(--v2-accent)]/30 hover:text-[var(--v2-accent)]"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto px-12 lg:px-16 py-16">
          {Object.keys(grouped).length === 0 ? (
            <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-muted)] text-[14px]">No terms match your search.</p>
          ) : (
            Object.entries(grouped).map(([letter, terms]) => (
              <div key={letter} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <span style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[40px] leading-none tracking-[-2px]">{letter}</span>
                  <div className="flex-1 h-px bg-[var(--v2-rule)]" />
                </div>
                <div className="flex flex-col gap-0 border border-[var(--v2-rule)] divide-y divide-[var(--v2-rule)]">
                  {terms.map((t) => (
                    <div key={t.term} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
                      <div className="px-7 py-6 border-b lg:border-b-0 lg:border-r border-[var(--v2-rule)]">
                        <span style={{ fontFamily: "var(--font-v2-ui)" }} className="font-semibold text-[var(--v2-accent)] text-[16px] tracking-[-0.3px]">{t.term}</span>
                      </div>
                      <div className="px-7 py-6">
                        <p style={{ fontFamily: "var(--font-v2-ui)" }} className="text-[var(--v2-ink-secondary)] text-[14px] leading-[1.7]">{t.def}</p>
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
