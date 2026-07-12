import type { DocPage } from "../primitives";
import { A, AIScope, Callout, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const FOUNDER_PAGES: Record<string, DocPage> = {
  // ── /docs/founders ────────────────────────────────────────────────────────
  "founders": {
    meta: {
      slug: "founders",
      title: "Founder features",
      description:
        "Everything a founder can do on Hockystick: build a verified profile, run deal rooms, control document access, and answer investor diligence.",
      updated: UPDATED,
      toc: [
        { id: "map", label: "Feature map" },
        { id: "flow", label: "The founder flow" },
        { id: "onboarding", label: "Onboarding flow" },
        { id: "readiness", label: "Fundraising readiness checklist" },
        { id: "badges", label: "Badge system" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The founder side of Hockystick is built around one loop: build a verified profile, get
          discovered by investors whose thesis you match, open a deal room, and get a real decision
          — Invest, Hold, or Pass with a reason — instead of silence.
        </Lead>

        <H2 id="map">Feature map</H2>
        <DocTable
          head={["Feature", "What it does", "Docs"]}
          rows={[
            ["Company profile", "Structured, verifiable company profile with a public page", <A href="/docs/founders/profile">Profile</A>],
            ["Deal rooms", "NDA-gated private spaces where deals actually progress", <A href="/docs/founders/deal-rooms">Deal rooms</A>],
            ["Document vault", "Stage-aware document workspace with tiered visibility", <A href="/docs/founders/vault">Vault</A>],
            ["Q&A", "Structured investor questions with a hard limit and typed answers", <A href="/docs/founders/qa">Q&A</A>],
            ["NDA", "Mutual NDA generated and signed before documents unlock", <A href="/docs/founders/nda">NDA</A>],
            ["Verification", "Five trust tiers from automated checks to human review", <A href="/docs/founders/verification">Verification</A>],
            ["Team", "Role-based team accounts with scoped permissions", <A href="/docs/founders/team">Team</A>],
            ["AI", "Profile extraction, document review, and a context-aware advisor", <A href="/docs/founders/ai">AI</A>],
          ]}
        />

        <H2 id="flow">The founder flow</H2>
        <Steps
          items={[
            <>Create an account and build your profile — by hand, or by letting the AI extract it from your pitch deck.</>,
            <>Pass verification checks. Tier 1 is automated and instant; higher tiers add document evidence.</>,
            <>Fill the document vault against your stage's checklist so you're ready before the first investor call.</>,
            <>Open a deal room when an investor engages. The NDA gate protects everything inside it.</>,
            <>Progress through the six stages — Overview, Information Vault, Q&A, Due Diligence, Term Sheet, Closing — and receive a recorded decision.</>,
          ]}
        />

        <H2 id="onboarding">Onboarding flow</H2>
        <P>
          New founders follow one sequential path with a single call to action at each step:
          <strong> build your profile</strong> (a 10–12 question AI interview or a document
          upload, ~10 minutes), <strong>verify your identity</strong> (four automated checks,
          ~2 minutes), and <strong>publish to the directory</strong>. After saving, the app
          points you straight at verification; after publishing, you get a durable
          confirmation with your public profile link. The whole path from signup to a live,
          discoverable profile is designed to take under ten minutes.
        </P>

        <H2 id="readiness">Fundraising readiness checklist</H2>
        <P>
          Every time you save your profile or upload a document, the AI reviews your complete
          file — profile data, documents, verification status, and claim verdicts — the way an
          investment analyst would, and produces a readiness score (0–100) with the 5–7 most
          important gaps for <em>your</em> stage and sector. Each gap explains what an investor
          thinks when it's missing, how to fix it, and links to the exact place to do so. A
          pre-revenue deeptech company is asked about IP status; an early-revenue SaaS company
          about churn and unit economics — this is not a generic checklist.
        </P>
        <P>
          Investors in a deal room with you see your score and top three gaps on the room's
          Overview panel, so their questions focus on what actually matters. The checklist lives
          on your <A href="/app/overview">dashboard</A> and can be re-run at any time.
        </P>

        <H2 id="badges">Badge system</H2>
        <P>
          23 badges across four categories. Most are awarded automatically when the underlying
          fact becomes true — none can be bought outright (Roast Survivor has a participation
          fee for the live event itself; the outcome is decided independently).
        </P>
        <DocTable
          head={["Badge", "How it's earned", "What it signals to investors"]}
          rows={[
            ["Identity Confirmed", "Email, website, registry and domain-infrastructure checks pass", "Real person, real company"],
            ["Claims Verified", "3+ specific claims (1 financial) verified against evidence", "Their numbers survive document checks"],
            ["Revenue Verified", "Stated revenue confirmed against financial documents", "Revenue is real, not aspirational"],
            ["Team Verified", "Payroll/employment records confirm named team members", "The team exists as described"],
            ["Operationally Verified", "3 operational documents AI-checked, then human-reviewed", "Operations match the pitch"],
            ["Hockystick Verified", "Full review by a named reviewer incl. live video call", "The highest trust tier on the platform"],
            ["Deal Ready", "Deal room open, NDA signed, pitch materials uploaded", "Ready to run a real process"],
            ["Fully Documented", "Documents complete in all 5 diligence categories", "DD will be fast"],
            ["Fast Responder", "3+ investor questions answered within 24 hours", "Responsive counterparty"],
            ["DD Ready", "Every DD goal completed in at least one room", "Has been through diligence"],
            ["First Close", "A deal room reached the Closing stage", "Gets deals over the line"],
            ["Round Closed", "A room concluded with an Invest decision", "Proven closer"],
            ["Early Builder", "Among the first 100 identity-verified founders", "Early conviction in the platform"],
            ["Roast Survivor", "Completed a live Founder Roast (paid event)", "Held up under live investor challenge"],
            ["Roast Champion", "Top-scored in a Roast cohort, judged by investors", "Best of a challenged cohort"],
            ["Cohort Graduate", "Partner-institution program completion, co-issued", "Externally validated"],
          ]}
        />
        <P>
          Investors earn their own seven — Active Investor, Thesis Clarity, Fast Decision, Deal
          Closed, No Ghosting, Gives Reasons, and Verified Fund — so accountability runs both
          ways: founders can see whether an investor decides quickly and never ghosts before
          accepting a deal room.
        </P>
      </>
    ),
  },

  // ── /docs/founders/profile ────────────────────────────────────────────────
  "founders/profile": {
    meta: {
      slug: "founders/profile",
      title: "Company profile",
      description:
        "The Hockystick company profile: structured sections, per-section visibility, a public page, and a completeness score that gates AI features.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "visibility", label: "Visibility controls" },
        { id: "completeness", label: "Completeness score" },
        { id: "builder", label: "Building it with AI" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Your company profile is the structured record investors see — company details,
          problem and solution, market sizing, traction, financials, and team. It exists because
          investors filter by structured data, not prose: a complete profile is what makes you
          appear in a matched investor's feed.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Open Profile from the sidebar. Sections are edited independently and saved as you go.</>,
            <>Each factual claim (revenue, customers, registration) can be backed by evidence for verification — see <A href="/docs/founders/verification">Verification tiers</A>.</>,
            <>Toggle <strong>Publish</strong> to generate your public page at <code>hockystick.app/p/your-slug</code>. Unpublished profiles are invisible to direct API calls, enforced at the database level.</>,
            <>Add team members with roles, photos, and bios — they appear on the public page if the team section is visible.</>,
          ]}
        />

        <H2 id="visibility">Visibility controls</H2>
        <P>
          Visibility is per-section, not all-or-nothing. You choose which sections appear on the
          public page; sensitive sections (detailed financials, cap table) belong in the{" "}
          <A href="/docs/founders/vault">document vault</A> where access is tiered and NDA-gated,
          not on the public profile at all.
        </P>

        <H2 id="completeness">Completeness score</H2>
        <P>
          The profile has a completeness percentage computed by a single shared function, so the
          number in your sidebar, the completion banner, and feature gates always agree. One gate
          matters in practice: the AI panel requires at least 40% profile completion for founders.
          Below that, the AI has too little context to give answers worth reading, so it points you
          back to the profile instead.
        </P>

        <H2 id="builder">Building it with AI</H2>
        <P>
          The profile builder offers two assisted paths: upload a pitch deck or company document
          and the AI extracts structured fields from it, or answer a short AI-led interview and it
          drafts the profile from your answers. Both paths end at a confirmation screen — nothing
          is saved to your profile until you review and accept it. Details on{" "}
          <A href="/docs/founders/ai">AI for founders</A>.
        </P>
      </>
    ),
  },

  // ── /docs/founders/deal-rooms ─────────────────────────────────────────────
  "founders/deal-rooms": {
    meta: {
      slug: "founders/deal-rooms",
      title: "Deal rooms",
      description:
        "Creating and managing deal rooms as a founder: invites, statuses, team assignment, and the NDA gate.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "statuses", label: "Room statuses" },
        { id: "team", label: "Team assignment" },
        { id: "rules", label: "Key rules" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          A deal room is a private, NDA-gated workspace between your company and one investor. Each
          investor relationship gets its own room, so what you share with one firm is never visible
          to another. The full six-stage workflow is documented under{" "}
          <A href="/docs/deal-rooms">Deal rooms</A>; this page covers the founder's controls.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Open <strong>Deal Rooms</strong> and create a room, naming the investor or firm it's for.</>,
            <>Invite the investor by email or by shareable link. The room shows as <em>Pending</em> until they join.</>,
            <>Both parties sign the generated NDA. The Information Vault stays locked until both signatures exist.</>,
            <>Work through the stages. Later stages (Due Diligence, Term Sheet, Closing) unlock as the workflow advances — you always see where the deal actually stands.</>,
          ]}
        />

        <H2 id="statuses">Room statuses</H2>
        <DocTable
          head={["Status", "Meaning"]}
          rows={[
            ["New", "Room created, invitation not yet accepted"],
            ["Pending", "Invitation sent, waiting on the investor"],
            ["Active", "Both parties in the room, workflow in progress"],
            ["Closed", "Deal concluded — decision recorded, room archived but readable"],
          ]}
        />

        <H2 id="team">Team assignment</H2>
        <P>
          Founders with team accounts can assign specific members to each room. An analyst assigned
          to one deal room sees that room only — assignment is the unit of access for restricted
          roles, enforced by Row Level Security, not by hiding links.
        </P>

        <H2 id="rules">Key rules</H2>
        <Rules
          items={[
            <>One investor per room. Sharing with a second firm means a second room.</>,
            <>The NDA gate cannot be skipped, by either party.</>,
            <>Deleting a room requires a two-step confirmation and is logged.</>,
            <>Room activity — document views, stage changes, signatures — is recorded in the room's timeline.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/founders/vault ──────────────────────────────────────────────────
  "founders/vault": {
    meta: {
      slug: "founders/vault",
      title: "Document vault",
      description:
        "The founder document workspace: stage-based checklists, three visibility tiers, AI gap review, and upload rules.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "tiers", label: "The three visibility tiers" },
        { id: "review", label: "AI review" },
        { id: "limits", label: "Upload rules & limits" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The vault is your document workspace, organized as a checklist of what investors at your
          stage actually ask for — not a generic file drawer. Select your stage (Pre-seed, Seed,
          Series A, Series B) and the vault shows which documents are required, which are optional,
          and where each one becomes visible.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Set your funding stage. The template list adjusts — a Seed company is asked for traction and market sizing; a Series B company for a full DD pack.</>,
            <>For each document, either fill the structured template in the editor or upload an existing file. Uploaded files get AI text extraction so the content is usable either way.</>,
            <>Filter by category — Market, Financials, Team, Product, Legal — to work through one area at a time.</>,
            <>Toggle a completed document's deal-room visibility when you're ready to share it in an active deal.</>,
          ]}
        />

        <H2 id="tiers">The three visibility tiers</H2>
        <DocTable
          head={["Tier", "Unlocks", "Typical contents"]}
          rows={[
            ["Public profile", "Visible to anyone via your public page", "Problem & solution, team bios"],
            ["Detail pack", "Unlocks when an investor connects with you", "Traction summary, competitive landscape, product roadmap"],
            ["Deal room", "Only inside an NDA-signed deal room", "Financial model, cap table, bank statements, incorporation and shareholder documents"],
          ]}
        />
        <P>
          You control every promotion between tiers. Nothing moves to a wider audience
          automatically.
        </P>

        <H2 id="review">AI review</H2>
        <P>
          Each filled document can be reviewed by AI against what investors at your stage ask
          about. The review returns a 0–10 score, a strength/gap breakdown, and concrete
          recommendations — for example, flagging a financial model with no stated assumptions.
          Review happens only when you request it; see{" "}
          <A href="/docs/ai/data-handling">AI data handling</A>.
        </P>

        <H2 id="limits">Upload rules &amp; limits</H2>
        <Rules
          items={[
            <>Accepted formats: PDF, PPTX, PPT, XLSX, XLS, DOCX, DOC, CSV — plus PNG/JPG for image evidence.</>,
            <>Maximum file size: 50 MB per file.</>,
            <>Text extraction runs client-side in your browser at upload time.</>,
            <>Deal-room documents are served via short-lived signed URLs; there are no permanent public links.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/founders/qa ─────────────────────────────────────────────────────
  "founders/qa": {
    meta: {
      slug: "founders/qa",
      title: "Q&A",
      description:
        "The deal room Q&A stage from the founder side: 10 questions per room, typed 500-character answers, and a printable report.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "rules", label: "Key rules & limits" },
        { id: "report", label: "The Q&A report" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Q&A is a structured stage of the deal room, not an open chat. The investor asks a limited
          number of written questions; you answer each one in your own words. The limits are
          deliberate — they force both sides to focus on what actually matters before diligence.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>The investor submits questions into the room's Q&A panel. A counter shows how many of the 10 have been used.</>,
            <>You see each open question and answer it inline. Answers are typed — the field blocks pasting.</>,
            <>Answered questions move to the answered list; both sides see the same thread state.</>,
            <>When the stage completes, a Q&A report is generated and filed into the Information Vault.</>,
          ]}
        />

        <H2 id="rules">Key rules &amp; limits</H2>
        <Rules
          items={[
            <><strong>10 questions maximum</strong> per deal room. The counter is enforced, not advisory.</>,
            <><strong>Answers are typed, never pasted.</strong> The answer field disables paste — investors are reading your thinking, not your comms team's.</>,
            <><strong>500 characters per answer.</strong> If it needs more, it belongs in a document in the vault, referenced from the answer.</>,
            <>Questions and answers are permanent once submitted — the thread is part of the deal record.</>,
          ]}
        />

        <H2 id="report">The Q&A report</H2>
        <P>
          Completing the stage generates a formatted, print-ready report of the full thread and
          pins it in the Information Vault. It travels with the deal — useful for partner meetings
          on the investor side, and a fair record of what was asked and answered for you.
        </P>
      </>
    ),
  },

  // ── /docs/founders/nda ────────────────────────────────────────────────────
  "founders/nda": {
    meta: {
      slug: "founders/nda",
      title: "NDA",
      description:
        "How the deal room NDA works for founders: generated from live profile data, signed by both parties, gating the Information Vault.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "protects", label: "What it protects" },
        { id: "legal", label: "The legal framework" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Every deal room includes a mutual non-disclosure agreement generated by the platform and
          populated with both parties' live profile data — real names, companies, and roles, not
          blanks. Neither side sees the other's documents until both have signed.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>When a deal room opens, the NDA is generated and shown to both parties.</>,
            <>Each party reviews and signs. The room's Overview shows signature status for both sides.</>,
            <>On the second signature, the Information Vault unlocks. The signed NDA is pinned as the Vault's first entry.</>,
            <>Signing events are written to the room's activity log with name, organization, role, and date.</>,
          ]}
        />

        <H2 id="protects">What it protects</H2>
        <P>
          The agreement is mutual: your financials, customer data, and technical material are
          protected, and so is the investor's process. It covers non-disclosure of confidential
          material and non-circumvention, and it survives the deal room — a Pass decision does not
          dissolve the confidentiality obligation.
        </P>

        <H2 id="legal">The legal framework</H2>
        <P>
          Every NDA specifies DIFC governing law and DIAC arbitration seated in Dubai, with awards
          enforceable under the New York Convention. The framework is identical for every deal room
          and neither party can weaken it. Full clause detail:{" "}
          <A href="/docs/security/nda">NDA legal framework</A>.
        </P>
        <Callout>
          The NDA is an agreement between you and the investor — Hockystick generates it but is not
          a party to it. If anything in it matters to your situation, read it with counsel.
        </Callout>
      </>
    ),
  },

  // ── /docs/founders/verification ───────────────────────────────────────────
  "founders/verification": {
    meta: {
      slug: "founders/verification",
      title: "Verification tiers",
      description:
        "Hockystick's five trust tiers, from automated checks to human review. What each badge means and what it takes to earn it.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "tiers", label: "The five tiers" },
        { id: "tier1", label: "Tier 1: automated checks" },
        { id: "tier3", label: "Tier 3: operational evidence" },
        { id: "principles", label: "Principles" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Verification is Hockystick's trust layer: badges that tell an investor how much of your
          profile has actually been checked, and by what. It is free at every tier and never gates
          platform access — an unverified account can use everything, it just carries no badge.
        </Lead>

        <H2 id="tiers">The five tiers</H2>
        <DocTable
          head={["Tier", "Badge", "What it means"]}
          rows={[
            ["0", "Joined", "Account exists. No badge shown — verification signals trust, it doesn't gatekeep."],
            ["1", "Hockystick Checked", "Automated checks passed — instant and free."],
            ["2", "Document Verified", "Specific claims backed by matching evidence. One document never satisfies multiple unrelated claims."],
            ["3", "Operationally Verified", "Three independent documents proving real operations: financial activity, customer/contract evidence, team evidence."],
            ["4", "Hockystick Verified", "All prior evidence reviewed and confirmed by a human. The badge that means the most."],
          ]}
        />

        <H2 id="tier1">Tier 1: automated checks</H2>
        <Rules
          items={[
            <>Business email domain — MX records confirm the domain actually receives mail.</>,
            <>Website — a live HTTP check confirms it exists and responds.</>,
            <>LinkedIn URL — format validation only; we do not scrape LinkedIn.</>,
            <>Company registration — registry document check.</>,
          ]}
        />
        <P>Checks run on demand from the verification page and can be re-run any time.</P>

        <H2 id="tier3">Tier 3: operational evidence</H2>
        <P>
          Founders submit three independent documents: proof of financial activity (for example a
          bank or revenue statement), customer or contract evidence, and team evidence. Each
          document is classified by AI against the specific criterion it must satisfy — a bank
          statement can't double as customer evidence. Investors have a parallel Tier 3 path
          (Capital Verified) with fund formation and committed-capital documents.
        </P>

        <H2 id="principles">Principles</H2>
        <Rules
          items={[
            <>Verification is never paid. There is no way to buy a badge.</>,
            <>Investors see what was confirmed <em>and what wasn't</em> — badges state their scope precisely.</>,
            <>Evidence documents are used for verification only; they don't enter any deal room unless you put them there.</>,
          ]}
        />
      </>
    ),
  },

  // ── /docs/founders/team ───────────────────────────────────────────────────
  "founders/team": {
    meta: {
      slug: "founders/team",
      title: "Team management",
      description:
        "Founder team accounts: four roles with scoped permissions, invite links, and per-deal-room assignment.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "roles", label: "Roles" },
        { id: "how", label: "How invites work" },
        { id: "member-view", label: "What members see" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          A startup account can carry a team. Roles bound what each member can do, and deal-room
          assignment bounds what they can see — an analyst working one deal never sees another.
        </Lead>

        <H2 id="roles">Roles</H2>
        <DocTable
          head={["Role", "Access"]}
          rows={[
            ["Admin", "Full platform access. Can manage team members and appoint other admins."],
            ["Manager", "Can manage deal rooms, documents, and pipeline. Cannot manage team."],
            ["Analyst", "Can review and upload documents in assigned deal rooms. Cannot edit profile or pipeline."],
            ["Viewer", "Read-only access to assigned deal rooms. Cannot upload or edit anything."],
          ]}
        />

        <H2 id="how">How invites work</H2>
        <Steps
          items={[
            <>From <strong>Team</strong>, send an invite to a work email with a chosen role.</>,
            <>The invitee receives a tokenized join link. Tokens expire and are single-use.</>,
            <>On acceptance, the session is re-validated fresh — and if the person clicking the link is the inviter, acceptance is blocked outright with instructions to use another account.</>,
            <>Roles can be changed or revoked at any time from the team page; changes take effect immediately.</>,
          ]}
        />

        <H2 id="member-view">What members see</H2>
        <P>
          Managers, analysts, and viewers get a simplified workspace scoped to their assignments
          rather than the full admin shell. Each member also gets a personal profile with an
          optional public CV page — separate from the company profile, controlled by the member.
        </P>
      </>
    ),
  },

  // ── /docs/founders/ai ─────────────────────────────────────────────────────
  "founders/ai": {
    meta: {
      slug: "founders/ai",
      title: "AI for founders",
      description:
        "The AI features available to founders: profile extraction, document review, and the context-aware AI panel — with explicit scope limits.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "panel", label: "The AI panel" },
        { id: "builder", label: "Profile extraction" },
        { id: "review", label: "Document review" },
        { id: "scope", label: "What the AI does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Founders get three AI surfaces: a persistent context-aware panel, profile extraction
          during onboarding, and per-document review in the vault. All three follow the same rule —
          the AI acts on your data only when you ask, and anything that would change visible state
          requires your explicit confirmation.
        </Lead>

        <H2 id="panel">The AI panel</H2>
        <P>
          The AI tab on the right edge of every dashboard page opens an assistant that knows which
          page you're on and answers with your own profile and deal data as context. It requires at
          least 40% profile completion — below that it has too little context to be useful, and it
          says so instead of guessing. Full detail: <A href="/docs/ai/operator-panel">AI panel</A>.
        </P>

        <H2 id="builder">Profile extraction</H2>
        <P>
          During onboarding you can upload a pitch deck (or any company document) and the AI
          extracts structured profile fields from it, or take a short AI-led interview instead.
          Both paths end at a review screen; nothing writes to your profile until you accept it.
        </P>

        <H2 id="review">Document review</H2>
        <P>
          Any filled vault document can be scored 0–10 against what investors at your stage ask,
          with named gaps and concrete recommendations. Reviews run per-document, on request.
        </P>

        <H2 id="scope">What the AI does / doesn't</H2>
        <AIScope
          does={[
            "Reads your own profile and documents to answer your questions",
            "Extracts structured data from documents you explicitly submit",
            "Scores documents and recommends specific improvements",
            "Proposes actions — and waits for your confirmation before anything another party could see",
          ]}
          doesNot={[
            "See any other founder's private data, or any investor's pipeline",
            "Send, share, or publish anything without an explicit confirmation click",
            "Receive your documents as a side effect of upload — analysis is always your action",
            "Make decisions — investors decide deals, you decide what to share",
          ]}
        />
      </>
    ),
  },
};
