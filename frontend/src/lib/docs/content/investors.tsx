import type { DocPage } from "../primitives";
import { A, AIScope, Callout, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const INVESTOR_PAGES: Record<string, DocPage> = {
  // ── /docs/investors ───────────────────────────────────────────────────────
  "investors": {
    meta: {
      slug: "investors",
      title: "Investor features",
      description:
        "The investor side of Hockystick: watchlist-driven sourcing, AI deal briefs, structured decisions, and NDA-gated deal rooms.",
      updated: UPDATED,
      toc: [
        { id: "map", label: "Feature map" },
        { id: "watchlist", label: "The watchlist" },
        { id: "flow", label: "The investor flow" },
        { id: "connections", label: "Connection requests" },
        { id: "deep-dd", label: "Deep due diligence analysis" },
        { id: "plans", label: "Subscription plans" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The investor side is built around a simple discipline: every company you're tracking
          lives in one watchlist, every deal progresses through visible stages, and every outcome —
          including a Pass — is recorded with a reason. No deal dies of silence.
        </Lead>

        <H2 id="map">Feature map</H2>
        <DocTable
          head={["Feature", "What it does", "Docs"]}
          rows={[
            ["Deal intake parser", "Turn raw lead data into structured, thesis-scored candidates", <A href="/docs/investors/intake">Intake</A>],
            ["Deal flow inbox", "Inbound queue with AI briefs per company", <A href="/docs/investors/deal-flow">Deal flow</A>],
            ["Pipeline", "Kanban of active deal rooms by stage", <A href="/docs/investors/pipeline">Pipeline</A>],
            ["Decisions", "Invest / Hold / Pass with recorded reasons", <A href="/docs/investors/decisions">Decisions</A>],
            ["Due diligence", "DD checklist status across every active deal", <A href="/docs/investors/due-diligence">Due diligence</A>],
            ["Investment memos", "AI-drafted analysis against your thesis", <A href="/docs/investors/analysis">Memos</A>],
            ["Fund team", "Role-scoped team accounts, including external DD firms", <A href="/docs/investors/team">Team</A>],
          ]}
        />

        <H2 id="watchlist">The watchlist</H2>
        <P>
          The watchlist (<strong>Startups</strong> in the sidebar) is the backbone: a private list
          of every company you're tracking, whether it came from intake parsing, the deal flow
          inbox, a CSV import, or manual entry. Each entry carries a status —{" "}
          <em>Sourcing → Reviewing → Diligence → Passed / Invested / Watching</em> — and the
          diligence, analysis, and portfolio pages all read from it. Your watchlist is scoped to
          you at the database level; no other investor can see it.
        </P>

        <H2 id="flow">The investor flow</H2>
        <Steps
          items={[
            <>Set your thesis — stage, sectors, geography, check size. Matching and scoring run against it.</>,
            <>Fill the watchlist: parse pasted lead data, work the deal flow inbox, or import a CSV.</>,
            <>Generate AI briefs to decide what deserves a first meeting.</>,
            <>Open a deal room with companies worth diligence. NDA first, then documents.</>,
            <>Record the decision — Invest, Hold, or Pass with a reason the founder actually receives.</>,
          ]}
        />

        <H2 id="connections">Connection requests</H2>
        <P>
          From the directory or a founder's public profile, send a connection request with an
          optional 200-character message. The founder reviews it — name, fund, thesis summary —
          and on approval a deal room is <strong>created automatically</strong> with both parties
          as members, opening at the Information Vault behind the NDA gate. Declines return a
          neutral message. Your sent requests are tracked with live status (Pending / Approved
          with a room link / Declined) on the connections page. Approval is always an explicit
          founder action; nothing auto-creates without it.
        </P>

        <H2 id="deep-dd">Deep due diligence analysis</H2>
        <P>
          Inside any deal room's Due Diligence stage, <strong>Run deep analysis</strong> has the
          AI read the actual contents of every document in the room and the founder's library,
          then cross-examine them against every stated claim and metric. It returns
          contradictions, gaps, red flags, and unverifiable claims — each with quoted evidence,
          the exact question to ask, and what a satisfactory answer would include. One click
          sends any suggested question into the room's Q&A. See{" "}
          <A href="/docs/deal-rooms/due-diligence">the DD panel docs</A>.
        </P>

        <H2 id="plans">Subscription plans</H2>
        <P>
          Investor registration is open during beta — accounts are created immediately, with no
          application or review step. Paid tiers (Growth $99, Pro $299,
          Enterprise $1,999 per month) scale deal room count, team seats, and AI usage — see{" "}
          <A href="/docs/pricing">Pricing &amp; plans</A>.
        </P>
      </>
    ),
  },

  // ── /docs/investors/intake ────────────────────────────────────────────────
  "investors/intake": {
    meta: {
      slug: "investors/intake",
      title: "Deal intake parser",
      description:
        "Paste raw lead data or upload files — the AI extracts structured company candidates and scores each against your thesis.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "rules", label: "Key rules & limits" },
        { id: "ai", label: "What the AI does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Deal flow arrives as mess: forwarded emails, spreadsheet exports, notes from a demo day.
          The intake parser takes that raw material — pasted text or uploaded files — and returns
          structured company candidates, each scored against your stated thesis, in one batch.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Paste text directly, or upload files. File types are validated before anything is processed.</>,
            <>The AI extracts one candidate record per company it finds: name, sector, stage, geography, and whatever traction detail the source contained.</>,
            <>If a document is image-only (a scanned one-pager, a screenshot), extraction falls back to a vision model rather than failing.</>,
            <>Each candidate gets a thesis-fit score so you triage the batch by relevance, not source order.</>,
            <>From the results panel, add candidates to your watchlist or send an invite email directly.</>,
          ]}
        />

        <H2 id="rules">Key rules &amp; limits</H2>
        <Rules
          items={[
            <><strong>Paste-your-own-data only, by design.</strong> There is no email or CRM OAuth integration — Hockystick never connects to your inbox. What you paste is the entire input.</>,
            <>Every run is saved to history and can be reopened later with its full results.</>,
            <>Extraction quality follows source quality: a candidate parsed from two vague sentences will be sparse, and the parser leaves fields empty rather than inventing them.</>,
          ]}
        />

        <H2 id="ai">What the AI does / doesn't</H2>
        <AIScope
          does={[
            "Extracts structured candidate records from text you explicitly submit",
            "Scores each candidate against your thesis settings",
            "Falls back to vision-model extraction for image-only documents",
          ]}
          doesNot={[
            "Read your email, CRM, or anything you didn't paste or upload",
            "Invent data — fields the source doesn't support stay empty",
            "Add anything to your watchlist without your action",
          ]}
        />
      </>
    ),
  },

  // ── /docs/investors/deal-flow ─────────────────────────────────────────────
  "investors/deal-flow": {
    meta: {
      slug: "investors/deal-flow",
      title: "Deal flow inbox",
      description:
        "The inbound deal queue: thesis-matched companies with cached AI briefs and one-click watchlist routing.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "briefs", label: "AI briefs" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The deal flow inbox is where inbound reaches you: founders whose verified profiles match
          your thesis. It exists to replace the cold-email pile with a queue that is already
          filtered by stage, sector, and geography before you see it.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Companies appear in the inbox when their profile matches your thesis settings.</>,
            <>Each card shows the verified profile summary — what was checked, and what wasn't.</>,
            <>Generate an AI brief for anything that looks interesting before committing meeting time.</>,
            <>Route each company: add to watchlist to track it, or move on.</>,
          ]}
        />

        <H2 id="briefs">AI briefs</H2>
        <P>
          A brief is a structured first-pass read on a company: what it does, traction signals,
          and thesis fit. Briefs are cached — generating the same company's brief twice costs
          nothing and stays consistent — and carry a viewed/unviewed state so you can see what's
          new at a glance. Full detail: <A href="/docs/ai/deal-brief">Deal briefs</A>.
        </P>
      </>
    ),
  },

  // ── /docs/investors/pipeline ──────────────────────────────────────────────
  "investors/pipeline": {
    meta: {
      slug: "investors/pipeline",
      title: "Pipeline",
      description:
        "The investor pipeline kanban: every active deal room mapped to a stage, from sourced to closed.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "stages", label: "Pipeline stages" },
        { id: "how", label: "How it works" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The pipeline is a kanban view of every deal room you're party to, mapped to where each
          deal actually stands. It is derived from real deal room state — a card moves because the
          deal moved, not because someone remembered to drag it.
        </Lead>

        <H2 id="stages">Pipeline stages</H2>
        <DocTable
          head={["Stage", "Meaning"]}
          rows={[
            ["Sourced", "Deal room exists, work not yet started"],
            ["Reviewing", "Initial materials under review"],
            ["Diligence", "DD stage active in the deal room"],
            ["Partner", "Internal partner review"],
            ["Term Sheet", "Terms being negotiated in the room"],
            ["Closed", "Decision recorded — invested or passed"],
          ]}
        />

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Open <strong>Pipeline</strong> for the kanban view; switch to list view for a sortable table of the same deals.</>,
            <>Each card links straight into its deal room.</>,
            <>Stage placement follows the deal room's workflow stage, so the board reflects reality without manual upkeep.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/investors/decisions ─────────────────────────────────────────────
  "investors/decisions": {
    meta: {
      slug: "investors/decisions",
      title: "Decisions",
      description:
        "Invest, Hold, or Pass — every deal outcome is recorded with a reason, and stale deals are flagged after 14 days.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "reasons", label: "Pass reasons" },
        { id: "rules", label: "Key rules" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Hockystick's founding complaint is the deal that dies of silence. The decisions board
          makes outcomes explicit: every deal ends in Invest, Hold, or Pass, and a Pass carries a
          categorized reason that the founder receives.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Submit a decision from inside the deal room, or track everything on the <strong>Decisions</strong> board.</>,
            <>Invest and Hold record the state; Pass additionally requires a reason category.</>,
            <>The board shows every deal across the lifecycle — Sourcing through Invested or Passed — with its current decision state.</>,
            <>Deals with no activity for 14 days are flagged stale, so nothing quietly rots at the bottom of a column.</>,
          ]}
        />

        <H2 id="reasons">Pass reasons</H2>
        <P>
          Pass reasons are categorized — Valuation, Traction, Team, Market, Thesis fit, Timing —
          so the founder gets signal they can act on, and your own pass history becomes analyzable
          across deals.
        </P>

        <H2 id="rules">Key rules</H2>
        <Rules
          items={[
            <>Submitting a decision is a confirm-first action — it is visible to the founder, so it always requires an explicit confirmation click.</>,
            <>Decisions are recorded with actor and date in the deal record.</>,
            <>Your portfolio page derives from decisions: a company appears there when its deal reaches an invested state.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/investors/due-diligence ─────────────────────────────────────────
  "investors/due-diligence": {
    meta: {
      slug: "investors/due-diligence",
      title: "Due diligence",
      description:
        "The investor DD summary: six-category checklists across every active deal and in-diligence watchlist company.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "categories", label: "The six categories" },
        { id: "two-systems", label: "DD here vs. DD in the deal room" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The due diligence page aggregates DD state across your whole book: every active deal
          room, plus watchlist companies you've marked as in diligence but haven't opened a room
          with yet. It answers "where is every diligence workstream right now" in one screen.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Open <strong>Due Diligence</strong> and pick a company from the list.</>,
            <>Work the checklist: each category expands into items you check off as evidence lands.</>,
            <>Progress is saved per company, so partner meetings can read completion at a glance.</>,
          ]}
        />

        <H2 id="categories">The six categories</H2>
        <P>
          Financials, Team, Product, References, Market, Legal. The structure is fixed so DD
          completion is comparable across companies — 60% done means the same thing on every deal.
        </P>

        <H2 id="two-systems">DD here vs. DD in the deal room</H2>
        <P>
          This page is your private tracker and works even before a deal room exists. The{" "}
          <A href="/docs/deal-rooms/due-diligence">deal room DD panel</A> is the shared workstation
          both parties see, tied to the room's documents and stage. They serve different moments:
          this one for portfolio-wide oversight, the room's for working a specific deal with the
          founder.
        </P>
      </>
    ),
  },

  // ── /docs/investors/analysis ──────────────────────────────────────────────
  "investors/analysis": {
    meta: {
      slug: "investors/analysis",
      title: "Investment memos",
      description:
        "AI-drafted investment memos for watchlist companies, informed by your thesis, with save, copy, and download.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "ai", label: "What the AI does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The analysis page drafts a structured investment memo for any watchlist company —
          the document you'd otherwise spend an afternoon assembling before a partner discussion.
          Your thesis is part of the prompt, so the memo evaluates fit against what you actually
          invest in.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Select a company from your watchlist.</>,
            <>Generate the memo. It draws on the watchlist entry's data and your thesis settings.</>,
            <>Edit judgment into it — then save it to the company record, copy it, or download it.</>,
          ]}
        />
        <Callout>
          A memo is a first draft for a human to challenge, not an investment recommendation. It
          can only be as current as the data in the watchlist entry it reads from.
        </Callout>

        <H2 id="ai">What the AI does / doesn't</H2>
        <AIScope
          does={[
            "Drafts a structured memo from the company's watchlist data",
            "Evaluates fit against your stated thesis",
            "Saves, copies, or exports only on your action",
          ]}
          doesNot={[
            "Access data beyond your own watchlist entry and thesis",
            "Recommend investing — it organizes evidence, you weigh it",
            "Share the memo with anyone, including the founder",
          ]}
        />
      </>
    ),
  },

  // ── /docs/investors/team ──────────────────────────────────────────────────
  "investors/team": {
    meta: {
      slug: "investors/team",
      title: "Fund team management",
      description:
        "Investor team accounts: four roles including an External Analyst role designed for third-party DD firms.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "roles", label: "Roles" },
        { id: "external", label: "External DD firms" },
        { id: "how", label: "How invites work" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          A fund account carries a team with scoped roles. The design assumption is a real fund's
          shape: partners who decide, associates who work deals, analysts who review documents, and
          outside firms brought in for diligence on specific deals only.
        </Lead>

        <H2 id="roles">Roles</H2>
        <DocTable
          head={["Role", "Access"]}
          rows={[
            ["Admin", "Full platform access. Can manage team members and appoint other admins."],
            ["Associate", "Can browse startups, request access, and manage assigned deal rooms. Cannot submit final decisions."],
            ["Analyst", "Can review and upload documents in assigned deal rooms. Cannot edit profile or pipeline."],
            ["External Analyst", "Limited to assigned deal rooms only. Designed for third-party DD firms and agencies."],
          ]}
        />
        <P>
          Note the decision boundary: only admins submit final Invest/Hold/Pass decisions.
          Associates work the deal; the decision record belongs to someone accountable for it.
        </P>

        <H2 id="external">External DD firms</H2>
        <P>
          The External Analyst role exists for the common pattern of outsourced
          diligence. An external member sees only the deal rooms they're assigned to — not your
          watchlist, not your pipeline, not any other deal. Assignment is enforced at the
          database access layer, and removal takes effect immediately.
        </P>

        <H2 id="how">How invites work</H2>
        <Steps
          items={[
            <>Invite by work email with a chosen role from <strong>Team</strong>.</>,
            <>The invitee accepts through a single-use, expiring token link; inviter self-acceptance is blocked.</>,
            <>Assign deal rooms per member. Roles and assignments can be changed or revoked at any time.</>,
          ]}
        />
      </>
    ),
  },
};
