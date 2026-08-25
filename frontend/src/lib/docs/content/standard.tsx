// Group 5 of the lengdon-public-site/ migration (25 Aug 2026): /standard,
// /schedules/:slug, /docs/record-format, /docs/security-whitepaper,
// /docs/api. Registered into registry.tsx only, NOT nav.ts — these pages
// resolve at their real URL and are correctly indexed for SEO, but do not
// yet appear in the /docs sidebar tree, per the confirmed decision to hold
// public linking back until explicitly decided (Decision 4 from earlier in
// this migration, extended to the docs sidebar specifically).
//
// Renders through the EXISTING v1 docs shell (docs.tsx, docs.$.tsx,
// DocArticle.tsx, primitives.tsx — Syne font, purple accents) rather than
// a new v2.0 shape, per explicit instruction: this migration does not
// rebuild /docs's presentation, only adds content to it. The v1/v2
// mismatch is deferred to /docs's own future rebuild (CLAUDE.md §20.5
// coexistence tracking).
//
// Content verified against real app state before writing, same discipline
// as every other group: the reference-number format and check digit are
// real (deal_rooms.reference_no, pack_api.deal_rooms_mint_reference(),
// public schema migration 20260809060000). The published schedule is real
// (pack_v1.schedule, one row, technology/seed v1 — same source
// /resources/schedule reads). /docs/security-whitepaper and /docs/api are
// both honestly staged as not-yet-built, matching how the equivalent
// lengdon-public-site/ pages were hedged in Group 1.
import type { DocPage } from "../primitives";
import { A, Callout, Code, DocTable, H2, Lead, P, Rules } from "../primitives";

const UPDATED = "2026-08-25";

export const STANDARD_PAGES: Record<string, DocPage> = {
  // ── /docs/standard ───────────────────────────────────────────────────────
  standard: {
    meta: {
      slug: "standard",
      title: "The disclosure standard",
      description:
        "A shared, language-independent way to state what a deal discloses, reference it, and prove it was not altered. Open to read, open to adopt.",
      updated: UPDATED,
      toc: [
        { id: "what", label: "What it is" },
        { id: "fields", label: "Field identifiers" },
        { id: "evidence", label: "The evidence ladder" },
        { id: "reference", label: "Reference numbering" },
        { id: "why-open", label: "Why open" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Private markets have no shared transaction schema. The reference
          numbering, field identifiers, and hash-chained record described
          here are a proto-standard, published rather than held privately.
        </Lead>

        <H2 id="what">What it is</H2>
        <P>
          A shared way to state what a deal discloses, reference it, and
          prove it was not altered. This is not a legal instrument and does
          not require adoption — it is documentation of the format this
          product itself uses.
        </P>

        <H2 id="fields">Field identifiers</H2>
        <P>
          Every disclosed field on a published schedule carries a stable
          identifier that survives translation — the same field reads the
          same way regardless of the interface language. See{" "}
          <A href="/resources/schedule">the published technology schedule</A>{" "}
          for a live example.
        </P>

        <H2 id="evidence">The evidence ladder</H2>
        <P>
          Every field accepts three evidence tiers — preferred, alternative,
          minimum — and the schedule shows which was met. A business with no
          audited statements but real processor history is not penalised for
          lacking a document it never had reason to hold.
        </P>

        <H2 id="reference">Reference numbering</H2>
        <P>
          Every citable object carries a reference number with a check
          digit. Read the full format on{" "}
          <A href="/docs/record-format">Record and reference format</A>.
        </P>

        <H2 id="why-open">Why open</H2>
        <P>
          A standard held privately is a product feature. A standard
          published is infrastructure. This documentation states the format
          plainly rather than guarding it.
        </P>
      </>
    ),
  },

  // ── /docs/record-format ──────────────────────────────────────────────────
  "record-format": {
    meta: {
      slug: "record-format",
      title: "Record and reference format",
      description:
        "How a reference number reads: the format, a worked example, and the ISO 7064 MOD 97-10 check digit.",
      updated: UPDATED,
      toc: [
        { id: "format", label: "The format" },
        { id: "check-digit", label: "The check digit" },
        { id: "sequencing", label: "Sequencing" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Every citable object carries a reference number. It states the
          organisation, the type, the year, and the sequence — and it
          self-checks.
        </Lead>

        <H2 id="format">The format</H2>
        <P>
          Format: <Code>{"{ORG}-{TYP}-{YYYY}-{SEQ}-{CD}"}</Code>
        </P>
        <P>
          Worked example: <Code>ATLS01-RSE-2026-000042-31</Code>
        </P>
        <P>
          This is a real, live mechanism, not a documentation placeholder —
          every deal room mints its own reference number on creation
          (<Code>deal_rooms.reference_no</Code>).
        </P>

        <H2 id="check-digit">The check digit</H2>
        <P>
          The check digit uses the ISO 7064 MOD 97-10 algorithm, the same
          family as IBAN, so a mistyped reference is caught without a
          lookup.
        </P>

        <H2 id="sequencing">Sequencing</H2>
        <Rules
          items={[
            "Sequences are gapless per organisation, per type, per year.",
            "An observed gap is a records incident to be investigated, never silently corrected.",
          ]}
        />
      </>
    ),
  },

  // ── /docs/security-whitepaper ────────────────────────────────────────────
  "security-whitepaper": {
    meta: {
      slug: "security-whitepaper",
      title: "Security whitepaper",
      description:
        "A single-document summary of the security posture described on the trust page. Not yet published.",
      updated: UPDATED,
      toc: [{ id: "status", label: "Status" }],
    },
    Body: () => (
      <>
        <Lead>
          A single document covering encryption, access control, the
          confidentiality model, and audit logging, matched to and kept
          current with the live security posture.
        </Lead>

        <H2 id="status">Status</H2>
        <Callout kind="note">
          This document is not yet published. The security posture it will
          summarise is already documented, in detail, at{" "}
          <A href="/docs/security">Security &amp; compliance</A> — read that
          page directly today.
        </Callout>
      </>
    ),
  },

  // ── /docs/api ─────────────────────────────────────────────────────────────
  api: {
    meta: {
      slug: "api",
      title: "API and MCP",
      description:
        "Every action is a permissioned, auditable operation defined once. The developer and agent surface. Not yet published.",
      updated: UPDATED,
      toc: [{ id: "status", label: "Status" }],
    },
    Body: () => (
      <>
        <Lead>
          Every action is a permissioned, auditable operation defined once.
          The interface and an agent read the same layer.
        </Lead>

        <H2 id="status">Status</H2>
        <Callout kind="note">
          This developer surface is not yet published. When it ships, the
          MCP server will expose read and prepare tools over the same
          action layer the product uses internally — never a tool that
          executes a consequential action on its own.
        </Callout>
      </>
    ),
  },
};
