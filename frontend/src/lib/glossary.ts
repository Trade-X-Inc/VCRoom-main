import type { GlossaryEntry } from "@/components/site/GlossaryTerm";

// Group 6 of the lengdon-public-site/ migration (25 Aug 2026). Ten terms
// per public-site-spec.html section F. See GlossaryTerm.tsx's header
// comment for the per-term verification discipline: a "usage" field is
// present ONLY where the app genuinely implements the concept today;
// terms with no live implementation (single-notice rule, sealed export,
// beneficial ownership, LEI, release class) are defined as general
// private-capital vocabulary with no product claim attached.
export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: "disclosure-pack",
    term: "Disclosure pack",
    definition:
      "The complete set of company information a party assembles once and discloses in stages — a brief, a data room, and a closing package — rather than answering the same questions repeatedly to different counterparties.",
    usage:
      "A startup's disclosure schedule (fields, evidence, and documents) is built once and read into every deal room it enters. The published technology seed schedule is a live example.",
  },
  {
    slug: "evidence-ladder",
    term: "Evidence ladder",
    definition:
      "Three tiers a disclosed field can meet — preferred, alternative, minimum — so a business without an audited statement is not penalised for lacking a document it never had reason to hold.",
    usage:
      "Every field on the published technology seed schedule states which evidence tier was actually met, not just whether the field was answered.",
  },
  {
    slug: "single-notice-rule",
    term: "Single-notice rule",
    definition:
      "A diligence discipline borrowed from documentary credit practice: an examining party raises every discrepancy for a given stage in one notice, rather than a drip of individual requests over weeks. It exists to prevent the specific failure mode where a raise stalls because requests keep arriving one at a time.",
  },
  {
    slug: "condition-precedent",
    term: "Condition precedent",
    definition:
      "A condition that must be satisfied, or explicitly waived on the record, before a deal is permitted to close. The term comes from contract law generally, not from any one platform's implementation of it.",
  },
  {
    slug: "beneficial-ownership",
    term: "Beneficial ownership",
    definition:
      "The natural person or persons who ultimately own or control an entity, as distinct from whoever is named as the registered legal owner on paper. Beneficial-ownership disclosure is a standard requirement in most jurisdictions' anti-money-laundering frameworks.",
  },
  {
    slug: "lei",
    term: "Legal Entity Identifier (LEI)",
    definition:
      "A 20-character alphanumeric code, issued under the ISO 17442 standard, that uniquely identifies a distinct legal entity party to a financial transaction. LEIs are maintained by accredited Local Operating Units under the Global LEI Foundation.",
  },
  {
    slug: "soft-circle",
    term: "Soft-circle",
    definition:
      "A non-binding indication of interest from a prospective investor, ahead of a committed allocation. A soft-circled amount signals intent but carries no obligation to fund.",
  },
  {
    slug: "sealed-export",
    term: "Sealed export",
    definition:
      "A terminal artefact issued to every party at close, combining the record's chain, its terminal hash, the parties involved, and every reference cited during the deal — intended to be the one document a party can file and later prove was not altered.",
  },
  {
    slug: "release-class",
    term: "Release class",
    definition:
      "The permission tier attached to a document release, controlling who may view a given document and under what confidentiality instrument they are bound before viewing it.",
  },
  {
    slug: "term-set",
    term: "Term set",
    definition:
      "The group of deal terms — valuation, instrument, investor rights, and similar — that move together through a negotiation as one unit rather than being agreed individually and separately.",
    usage:
      "Deal terms in a Lengdon room move through a real propose, accept, and counter state machine, per term. A new proposed value resets both parties' prior acceptance, so a term only locks when both sides have accepted the same current value.",
  },
];

export function getGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.slug === slug);
}

export function relatedGlossaryEntries(slug: string, count = 3): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.slug !== slug).slice(0, count);
}
