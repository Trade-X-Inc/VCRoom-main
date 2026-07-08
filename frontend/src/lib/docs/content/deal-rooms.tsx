import type { DocPage } from "../primitives";
import { A, Callout, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const DEAL_ROOM_PAGES: Record<string, DocPage> = {
  // ── /docs/deal-rooms ──────────────────────────────────────────────────────
  "deal-rooms": {
    meta: {
      slug: "deal-rooms",
      title: "How deal rooms work",
      description:
        "The Hockystick deal room: one founder, one investor, six stages, an NDA gate, and a recorded decision at the end.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "principles", label: "Design principles" },
        { id: "anatomy", label: "Anatomy of a room" },
        { id: "shared", label: "Shared features" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          A deal room is the unit of a deal on Hockystick: a private workspace between one founder
          and one investor, moving through six explicit stages from first look to closing. Both
          parties see the same room, the same stage, and the same record — the deal has one state,
          not two versions of it.
        </Lead>

        <H2 id="principles">Design principles</H2>
        <Rules
          items={[
            <><strong>One counterparty per room.</strong> Confidential material shared with one firm is structurally invisible to every other.</>,
            <><strong>Legal protection before disclosure.</strong> The Information Vault stays locked until both parties sign the room's NDA.</>,
            <><strong>Stages, not vibes.</strong> The workflow advances through explicit transitions both parties can see — and stage transitions are requested by one side and approved by the other.</>,
            <><strong>A recorded ending.</strong> Rooms conclude in a decision — Invest, Hold, or Pass with a reason — not a trailing silence.</>,
          ]}
        />

        <H2 id="anatomy">Anatomy of a room</H2>
        <P>
          The room header carries the stage bar — the six stages in order, with locked stages
          shown but disabled until the workflow reaches them. Below it, each stage renders its own
          panel. Alongside the stages, every room has an activity timeline, notes, and participant
          management.
        </P>
        <DocTable
          head={["Stage", "Purpose", "Docs"]}
          rows={[
            ["Overview", "Company summary, metrics, NDA status, deal brief", <A href="/docs/deal-rooms/overview">Overview</A>],
            ["Information Vault", "The document repository, NDA-gated", <A href="/docs/deal-rooms/information-vault">Vault</A>],
            ["Q&A", "Structured questions, 10 per room", <A href="/docs/deal-rooms/qa">Q&A</A>],
            ["Due Diligence", "Shared DD workstation", <A href="/docs/deal-rooms/due-diligence">DD</A>],
            ["Term Sheet", "Structured terms", <A href="/docs/deal-rooms/term-sheet">Term sheet</A>],
            ["Closing", "Final confirmations and decision", <A href="/docs/deal-rooms/closing">Closing</A>],
          ]}
        />

        <H2 id="shared">Shared features</H2>
        <Rules
          items={[
            <><strong>Activity timeline</strong> — every material event (uploads, views, signatures, stage changes, notes) in one chronological feed.</>,
            <><strong>Notes</strong> — with three visibility levels: private to you, shared with your team, or visible to the whole room.</>,
            <><strong>Participants</strong> — invite by email or link; team members join with the role and assignment their account carries.</>,
            <><strong>Ask AI</strong> — a room-scoped AI assistant that answers against this room's context.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/deal-rooms/stages ───────────────────────────────────────────────
  "deal-rooms/stages": {
    meta: {
      slug: "deal-rooms/stages",
      title: "The six stages",
      description:
        "How the deal room workflow advances: stage order, unlock rules, and the request/approve transition model.",
      updated: UPDATED,
      toc: [
        { id: "order", label: "Stage order" },
        { id: "unlock", label: "Unlock rules" },
        { id: "transitions", label: "Requesting a transition" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The stage bar is the deal's spine. Stages unlock in order as the workflow advances, and
          the current stage is always visible to both parties — there is no ambiguity about where
          a deal stands.
        </Lead>

        <H2 id="order">Stage order</H2>
        <P>
          Overview → Information Vault → Q&A → Due Diligence → Term Sheet → Closing. Earlier
          stages stay accessible after the workflow moves past them; the record accumulates, it
          doesn't disappear.
        </P>

        <H2 id="unlock">Unlock rules</H2>
        <DocTable
          head={["Stage", "Unlocks"]}
          rows={[
            ["Overview", "Always available"],
            ["Information Vault", "Always visible; documents gated behind the NDA signatures"],
            ["Q&A", "When the workflow reaches Q&A — or earlier, when the investor explicitly advances to it from the Vault"],
            ["Due Diligence", "When the workflow reaches DD"],
            ["Term Sheet", "When the workflow reaches Term Sheet — the panel opens on the investor side"],
            ["Closing", "When the workflow reaches Closing"],
          ]}
        />

        <H2 id="transitions">Requesting a transition</H2>
        <Steps
          items={[
            <>Either party requests the next stage with the <strong>Request next stage</strong> action.</>,
            <>The other party sees a pending-transition banner and approves or declines.</>,
            <>On approval the workflow advances, the stage bar updates for both sides, and the transition lands in the activity timeline.</>,
          ]}
        />
        <Callout>
          Transitions are deliberately two-sided. A deal cannot be marched forward unilaterally —
          the stage you see is a stage both parties agreed to be in.
        </Callout>
      </>
    ),
  },

  // ── /docs/deal-rooms/overview ─────────────────────────────────────────────
  "deal-rooms/overview": {
    meta: {
      slug: "deal-rooms/overview",
      title: "Overview panel",
      description:
        "The deal room's landing view: company summary, traction metrics, NDA status, deal brief, and recent activity.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "What it shows" },
        { id: "sections", label: "Sections" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The Overview panel is what both parties land on when they open the room: a current
          statement of the deal — who, what stage, what the numbers are, and whether the NDA is in
          force — without opening a single document.
        </Lead>

        <H2 id="sections">Sections</H2>
        <DocTable
          head={["Section", "Contents"]}
          rows={[
            ["Company header", "Name, stage, sector, days open, workflow stage, match score"],
            ["Traction metrics", "Revenue, burn rate, runway, team size — from the founder's profile"],
            ["Deal brief", "AI-generated brief, cached per room; generate on demand"],
            ["NDA & confidentiality", "Signature status for both parties, with signer names and dates"],
            ["Team", "Participants on each side"],
            ["Recent activity", "The latest events from the room's timeline"],
          ]}
        />
        <P>
          The numbers here come from the founder's live profile, not a snapshot — if the founder
          updates traction mid-deal, the room reflects it.
        </P>
      </>
    ),
  },

  // ── /docs/deal-rooms/information-vault ────────────────────────────────────
  "deal-rooms/information-vault": {
    meta: {
      slug: "deal-rooms/information-vault",
      title: "Information Vault",
      description:
        "The deal room document repository: NDA-gated, categorized, view-tracked, with document requests in both directions.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "rules", label: "Key rules" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The Information Vault is where the deal's documents live. It is the room's most protected
          surface: nothing in it is served to the counterparty until both NDA signatures exist, and
          every document view is recorded.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Once the NDA is signed, the founder shares documents into the Vault — directly, or by promoting documents already prepared in their <A href="/docs/founders/vault">document vault</A>.</>,
            <>Documents are organized by category, with the signed NDA pinned as the first entry.</>,
            <>The investor requests missing documents through the request flow; requests appear on the founder side as an explicit wishlist.</>,
            <>Views are tracked per document — the founder can see what has actually been read, which is often the most honest signal of interest.</>,
          ]}
        />

        <H2 id="rules">Key rules</H2>
        <Rules
          items={[
            <>No counterparty access before both NDA signatures. This is enforced structurally, not by convention.</>,
            <>Downloads are served through short-lived signed URLs — no permanent links exist.</>,
            <>Uploads follow the same limits as the founder vault: 50 MB per file, standard document formats.</>,
            <>The Q&A report is filed here automatically when the Q&A stage completes.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/deal-rooms/qa ───────────────────────────────────────────────────
  "deal-rooms/qa": {
    meta: {
      slug: "deal-rooms/qa",
      title: "Q&A panel",
      description:
        "The deal room Q&A stage: 10 questions per room, typed 500-character answers, and a printable report filed to the Vault.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "rules", label: "Rules & limits" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Q&A is a bounded, structured exchange — not a chat thread. The investor spends a limited
          budget of questions; the founder answers each in their own typed words. The constraint is
          the feature: it forces precision on both sides before diligence begins.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>The investor submits questions against a visible counter — <em>n of 10 used</em>.</>,
            <>The founder answers inline. The answer field accepts typing only; paste is disabled.</>,
            <>Both parties see the same thread: open questions, answered questions, timestamps.</>,
            <>Completing the stage generates a print-ready Q&A report and files it into the Information Vault.</>,
          ]}
        />

        <H2 id="rules">Rules &amp; limits</H2>
        <Rules
          items={[
            <><strong>10 questions per deal room.</strong> Enforced by the panel, not a guideline.</>,
            <><strong>Answers max 500 characters, typed only.</strong> Longer material belongs in a Vault document, referenced from the answer.</>,
            <>The thread is permanent — questions and answers are part of the deal record and appear in the generated report.</>,
            <>The investor can enter Q&A early from the Vault by explicitly advancing to it; otherwise it unlocks with the workflow.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/deal-rooms/due-diligence ────────────────────────────────────────
  "deal-rooms/due-diligence": {
    meta: {
      slug: "deal-rooms/due-diligence",
      title: "Due diligence panel",
      description:
        "The shared DD workstation inside a deal room: category checklists tied to Vault documents, visible to both parties.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "difference", label: "Relation to the investor DD page" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The DD panel is the shared workstation for the diligence stage. Unlike the investor's
          private DD tracker, this one is visible to both parties — the founder can see what is
          being checked and what evidence is still missing, which turns diligence from a black box
          into a checklist both sides can finish.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>The workstation presents categorized checklist items for the deal.</>,
            <>Items are checked off as supporting documents land in the Vault; document views are tracked alongside.</>,
            <>Missing evidence becomes a document request the founder sees immediately.</>,
            <>DD completion feeds the stage decision — when the checklist is satisfied, the room moves toward Term Sheet.</>,
          ]}
        />

        <H2 id="difference">Relation to the investor DD page</H2>
        <P>
          The investor-side <A href="/docs/investors/due-diligence">Due diligence page</A> is a
          private tracker across all deals and watchlist companies. This panel is the in-room,
          two-party workstation for one deal. An external DD firm added with the External Analyst
          role works here, inside the rooms it is assigned to, and nowhere else.
        </P>
      </>
    ),
  },

  // ── /docs/deal-rooms/term-sheet ───────────────────────────────────────────
  "deal-rooms/term-sheet": {
    meta: {
      slug: "deal-rooms/term-sheet",
      title: "Term sheet",
      description:
        "The term sheet stage: structured deal terms recorded in the room once diligence completes.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The Term Sheet stage records the deal's proposed terms as structured data in the room,
          replacing the version-confusion of terms negotiated across email attachments. It unlocks
          when the workflow reaches it, after due diligence.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>The workflow advances to Term Sheet after the DD stage — via the same request/approve transition as every stage.</>,
            <>The panel opens on the investor side, where the proposing party enters the terms.</>,
            <>Terms live in the room as a structured card — both parties reference one current version, with changes visible in the activity timeline.</>,
            <>Agreement moves the workflow to Closing.</>,
          ]}
        />
        <Callout>
          The term sheet recorded here is deal-room state, not a substitute for executed legal
          documents — final agreements are drafted and signed by counsel as usual.
        </Callout>
      </>
    ),
  },

  // ── /docs/deal-rooms/closing ──────────────────────────────────────────────
  "deal-rooms/closing": {
    meta: {
      slug: "deal-rooms/closing",
      title: "Closing",
      description:
        "The final deal room stage: confirmations, the recorded decision, and what persists after a room closes.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "after", label: "After the room closes" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Closing is the last stage of the workflow: final confirmations, and the point where the
          deal's outcome is recorded. Every room ends here eventually — whether the ending is an
          investment or a reasoned pass.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>The workflow advances to Closing after terms are agreed — or a decision ends the deal earlier from whatever stage it reached.</>,
            <>The investor records the decision: Invest, Hold, or Pass with a categorized reason.</>,
            <>The decision is written to the deal record and reflected on both parties' dashboards — the founder's pipeline and the investor's decisions board and portfolio.</>,
          ]}
        />

        <H2 id="after">After the room closes</H2>
        <Rules
          items={[
            <>The room becomes read-only but remains accessible to both parties.</>,
            <>The signed NDA survives the room, and its obligations continue per its terms.</>,
            <>The activity timeline, Q&A report, and decision record stay intact — the deal's history is permanent.</>,
          ]}
        />
      </>
    ),
  },
};
