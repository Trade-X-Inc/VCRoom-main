import type { DocPage } from "../primitives";
import { A, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const GETTING_STARTED_PAGES: Record<string, DocPage> = {
  // ── /docs ─────────────────────────────────────────────────────────────────
  "": {
    meta: {
      slug: "",
      title: "Lengdon Documentation",
      description:
        "Documentation for Lengdon — closing infrastructure for private capital. Feature guides, security posture, and changelog.",
      updated: UPDATED,
      toc: [
        { id: "what", label: "What Lengdon is" },
        { id: "start", label: "Where to start" },
        { id: "sections", label: "Sections" },
        { id: "honesty", label: "How these docs are written" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Lengdon is a global fundraising platform for founders and investors:
          NDA-gated deal rooms, an evidence ladder for every disclosed fact, structured diligence,
          and recorded decisions — with an AI layer that drafts the work and never acts on your
          behalf without confirmation.
        </Lead>

        <H2 id="what">What Lengdon is</H2>
        <P>
          The platform gives a raise a structure: founders build a profile where every field
          carries its own evidence tier — Preferred, Alternative, or Minimum — instead of a single
          unqualified claim; deals progress inside deal rooms through six explicit closing gates;
          and every deal ends in a recorded decision — including a Pass with a reason the founder
          receives.
        </P>

        <H2 id="start">Where to start</H2>
        <Steps
          items={[
            <>
              <strong>Founders:</strong> start with the <A href="/docs/founders">founder feature map</A>,
              then the <A href="/docs/founders/profile">company profile</A> — everything downstream
              (the evidence ladder, deal rooms, the AI panel) depends on it.
            </>,
            <>
              <strong>Investors:</strong> start with the <A href="/docs/investors">investor feature map</A>,
              then set your thesis and add companies to your <A href="/docs/investors/pipeline">pipeline</A>.
            </>,
            <>
              <strong>Evaluating the platform's security?</strong> Go straight to{" "}
              <A href="/docs/security">Security &amp; compliance</A> — encryption, Row Level
              Security coverage, and the NDA legal framework are documented with specifics.
            </>,
          ]}
        />

        <H2 id="sections">Sections</H2>
        <DocTable
          head={["Section", "Covers"]}
          rows={[
            [<A href="/docs/founders">For founders</A>, "Profile, vault, deal rooms, Q&A, NDA, team, AI"],
            [<A href="/docs/investors">For investors</A>, "Watchlist, deal flow, pipeline, decisions, DD, memos, fund team"],
            [<A href="/docs/deal-rooms">Deal rooms</A>, "The six-stage workflow and every panel in it"],
            [<A href="/docs/ai">AI</A>, "Architecture, each AI feature, and the data-handling policy"],
            [<A href="/docs/security">Security</A>, "Encryption, RLS, NDA framework, responsible disclosure"],
            [<A href="/docs/tools">Tools</A>, "The seven free financial calculators"],
            [<A href="/docs/changelog">Changelog</A>, "What shipped, month by month, from real commit history"],
          ]}
        />

        <H2 id="honesty">How these docs are written</H2>
        <Rules
          items={[
            <>Every limit stated (10 Q&A questions, 500-character answers, 50 MB uploads, 40% AI gate) is read from the source code, not from marketing copy.</>,
            <>Security claims are verified against the live system — the RLS page shows the query and its result.</>,
            <>Where something has a boundary, the docs say so. See "Known boundaries" on the <A href="/docs/security/overview">security posture</A> page.</>,
          ]}
        />
      </>
    ),
  },
};
