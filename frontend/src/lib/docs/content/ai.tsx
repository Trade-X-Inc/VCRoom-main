import type { DocPage } from "../primitives";
import { A, AIScope, Callout, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const AI_PAGES: Record<string, DocPage> = {
  // ── /docs/ai ──────────────────────────────────────────────────────────────
  "ai": {
    meta: {
      slug: "ai",
      title: "AI on Hockystick",
      description:
        "How AI is architected on Hockystick: two separate agents, a confirm-first rule for anything visible to another party, and explicit scope on every feature.",
      updated: UPDATED,
      toc: [
        { id: "philosophy", label: "Philosophy" },
        { id: "two-agents", label: "Two agents, never one" },
        { id: "confirm-first", label: "The confirm-first rule" },
        { id: "features", label: "AI features" },
        { id: "readiness-ai", label: "Fundraising readiness AI" },
        { id: "confrontational-dd", label: "Confrontational DD analysis" },
        { id: "scope-note", label: "Where the line is" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          AI on Hockystick is an operator, not an oracle: it reads your data to answer your
          questions and drafts work you would otherwise do by hand — and anything that would become
          visible to another party stops and waits for your explicit confirmation, with no
          exceptions.
        </Lead>

        <H2 id="philosophy">Philosophy</H2>
        <P>
          Deal flow runs on confidential information, so the AI layer is designed around
          containment first and capability second. Three commitments hold across every feature:
          the AI only sees data the requesting user could already see; it never takes a
          party-visible action without a confirmation click; and its scope is documented per
          feature — every AI page in these docs carries an explicit "does / doesn't" block.
        </P>

        <H2 id="two-agents">Two agents, never one</H2>
        <P>
          Founders and investors talk to two separate agents with separate system prompts,
          separate tool sets, and separate contexts. The founder agent cannot see any investor's
          pipeline; the investor agent cannot see another investor's watchlist or a founder's
          private data. Where the two sides legitimately share context — inside a deal room — the
          agent works through the room's shared data and nothing else. The agents share
          infrastructure (the model router and rate limiting) but never context.
        </P>

        <H2 id="confirm-first">The confirm-first rule</H2>
        <P>
          Every AI-proposed action is classified by one question: <em>would another human see a
          change because of this?</em> If no — saving a draft, fetching a score, parsing a paste —
          it executes immediately. If yes — sending an invite, submitting a decision, approving
          access — the AI renders a confirmation card and waits for a click. There are no
          exceptions for "obviously safe" cases; the rule is structural.
        </P>

        <H2 id="features">AI features</H2>
        <DocTable
          head={["Feature", "For", "Docs"]}
          rows={[
            ["AI panel", "Both sides", <A href="/docs/ai/operator-panel">AI panel</A>],
            ["Deal briefs", "Investors", <A href="/docs/ai/deal-brief">Deal briefs</A>],
            ["Verification classification", "Both sides", <A href="/docs/ai/verification">AI verification</A>],
            ["Profile extraction", "Founders", <A href="/docs/founders/ai">AI for founders</A>],
            ["Intake parsing", "Investors", <A href="/docs/investors/intake">Intake</A>],
            ["Investment memos", "Investors", <A href="/docs/investors/analysis">Memos</A>],
            ["Document review", "Founders", <A href="/docs/founders/vault">Vault</A>],
            ["Data handling policy", "Everyone", <A href="/docs/ai/data-handling">Data handling</A>],
            ["Readiness checklist", "Founders", <A href="/docs/founders#readiness">Readiness</A>],
            ["Deep DD analysis", "Investors", <A href="/docs/deal-rooms/due-diligence">DD analysis</A>],
          ]}
        />

        <H2 id="readiness-ai">Fundraising readiness AI</H2>
        <P>
          After every profile save or document upload, the AI reviews the founder's complete
          file — profile fields, documents, verification state, claim verdicts — and produces a
          0–100 readiness score with the 5–7 gaps most likely to make an investor pass, specific
          to that company's stage and sector. Each gap carries the investor's-eye rationale and a
          concrete fix. Deal-room investors see the score and top gaps, so diligence starts
          focused.
        </P>

        <H2 id="confrontational-dd">Confrontational DD analysis</H2>
        <P>
          On investor request inside a deal room, the AI reads the actual extracted contents of
          every document and cross-examines them against every stated claim and metric. It is
          instructed <em>not</em> to summarize: it reports contradictions (statement vs.
          document), gaps (absent from both), red flags, and unverifiable claims — always citing
          the specific source, and explicitly stating its reasoning when it finds no
          contradictions. Findings include the exact question to ask and what a good answer looks
          like.
        </P>

        <H2 id="scope-note">Where the line is</H2>
        <P>
          Honest update: the AI now goes further than drafting and summarizing — it critiques,
          scores readiness, and cross-examines documents. What has not changed: it only reads
          data the requesting user could already see, every party-visible action still requires
          an explicit confirmation click, verdicts are conservative by instruction (it flags what
          it cannot verify rather than assuming it's fine), and no AI output — score, finding, or
          verdict — ever auto-triggers a decision. Humans decide; the AI prepares.
        </P>
      </>
    ),
  },

  // ── /docs/ai/operator-panel ───────────────────────────────────────────────
  "ai/operator-panel": {
    meta: {
      slug: "ai/operator-panel",
      title: "AI panel",
      description:
        "The persistent AI assistant on every dashboard page: page-aware context, per-page conversations, and confirm-first action cards.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "rules", label: "Key rules & limits" },
        { id: "scope", label: "What it does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          The AI panel is the tab on the right edge of every dashboard page. It opens an assistant
          that knows what page you're on and answers with your own data as context — your profile
          on the profile page, your deal rooms on the deal rooms page — rather than giving generic
          startup advice.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Open the panel from the AI tab. On desktop it docks beside the page; on mobile it opens full-screen.</>,
            <>Ask anything. The panel injects the current page's context into the conversation automatically.</>,
            <>Conversations persist per page and per user, so returning to a page resumes its thread.</>,
            <>If the AI proposes a party-visible action, it renders a confirmation card and waits — see the <A href="/docs/ai">confirm-first rule</A>.</>,
          ]}
        />

        <H2 id="rules">Key rules &amp; limits</H2>
        <Rules
          items={[
            <><strong>Founder gate:</strong> the panel requires at least 40% profile completion for founders. Below that it points you to the profile builder instead of answering from too little context.</>,
            <>AI usage is rate-limited per plan (daily call limits).</>,
            <>Requests carry a timeout — a slow model produces a clear "try again" message, not a hung panel.</>,
            <>The panel reads only what your account can read; its access is bounded by the same Row Level Security as your own queries.</>,
          ]}
        />

        <H2 id="scope">What it does / doesn't</H2>
        <AIScope
          does={[
            "Answers with your own profile, pipeline, and deal room data as context",
            "Adapts its context to the page you're on",
            "Proposes actions and renders confirmation cards for anything party-visible",
          ]}
          doesNot={[
            "See any data your account couldn't query itself",
            "Execute party-visible actions without an explicit confirmation click",
            "Share conversation content with the other side of any deal",
          ]}
        />
      </>
    ),
  },

  // ── /docs/ai/deal-brief ───────────────────────────────────────────────────
  "ai/deal-brief": {
    meta: {
      slug: "ai/deal-brief",
      title: "Deal briefs",
      description:
        "AI-generated first-pass analysis of a startup for investors: cached per company, viewed-state tracked, generated on demand.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "caching", label: "Caching" },
        { id: "scope", label: "What it does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          A deal brief is the AI's structured first read on a company — what it does, the traction
          signals in its profile, and how it fits your thesis. It exists to answer one question
          cheaply: does this deserve twenty minutes of human attention?
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Generate a brief from the deal flow inbox, the investor dashboard, or a deal room's Overview panel.</>,
            <>The brief draws on the company's profile data — and inside a deal room, the room's shared context.</>,
            <>Briefs carry a viewed/unviewed state, so new analysis is visible at a glance.</>,
          ]}
        />

        <H2 id="caching">Caching</H2>
        <P>
          Briefs are cached per company. Requesting the same brief again returns the stored result
          instantly instead of re-running the model — consistent output, no duplicate spend. A
          brief regenerates when you explicitly ask for a fresh one.
        </P>

        <H2 id="scope">What it does / doesn't</H2>
        <AIScope
          does={[
            "Summarizes a company from its profile and (in-room) shared deal data",
            "Scores thesis fit against your stated criteria",
            "Caches results and tracks what you've already read",
          ]}
          doesNot={[
            "Access documents the founder hasn't shared with you",
            "Replace diligence — a brief is triage, not verification",
            "Send anything to the founder",
          ]}
        />
      </>
    ),
  },

  // ── /docs/ai/verification ─────────────────────────────────────────────────
  "ai/verification": {
    meta: {
      slug: "ai/verification",
      title: "AI verification classification",
      description:
        "How AI checks verification evidence: each document is classified against the specific criterion its slot requires.",
      updated: UPDATED,
      toc: [
        { id: "overview", label: "Overview" },
        { id: "how", label: "How it works" },
        { id: "slots", label: "Slot-specific rubrics" },
        { id: "scope", label: "What it does / doesn't" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Tier 2 and Tier 3 verification require documents as evidence. AI classification is the
          first reviewer: it checks that each uploaded document actually satisfies the specific
          criterion of the slot it was uploaded for — before any badge is granted.
        </Lead>

        <H2 id="how">How it works</H2>
        <Steps
          items={[
            <>Each verification slot states what it needs — for example, a capital commitment letter showing a committed amount and a named signatory.</>,
            <>You upload a document into a slot. The AI reads it against that slot's rubric only.</>,
            <>The result is confirm or flag, with the reason stated. A flagged document can be replaced and re-checked.</>,
            <>Tier 4 (<em>Hockystick Verified</em>) adds a human review over all prior evidence — the AI never grants the top badge alone.</>,
          ]}
        />

        <H2 id="slots">Slot-specific rubrics</H2>
        <P>
          The classification is deliberately narrow: a bank statement uploaded into the
          customer-evidence slot fails, even though it is a perfectly good bank statement. One
          document never satisfies multiple unrelated claims — that rule comes from the
          verification tier design itself, and the AI enforces it mechanically.
        </P>

        <H2 id="scope">What it does / doesn't</H2>
        <AIScope
          does={[
            "Checks each document against its slot's specific criterion",
            "States why a document was confirmed or flagged",
            "Feeds results into the tier system for badge computation",
          ]}
          doesNot={[
            "Grant Tier 4 — the top badge always requires human review",
            "Use verification documents for anything beyond the check itself",
            "Expose evidence documents to investors or deal rooms",
          ]}
        />
      </>
    ),
  },

  // ── /docs/ai/data-handling ────────────────────────────────────────────────
  "ai/data-handling": {
    meta: {
      slug: "ai/data-handling",
      title: "AI data handling",
      description:
        "What the AI sees and when: client-side extraction, explicit-action-only transmission, server-side keys, and per-user scoping.",
      updated: UPDATED,
      toc: [
        { id: "principles", label: "Principles" },
        { id: "when", label: "When data reaches an AI provider" },
        { id: "never", label: "What never happens" },
        { id: "technical", label: "Technical safeguards" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          This page states precisely when your data is transmitted to a third-party AI model and
          when it is not. The rule in one line: document content reaches an AI provider only as
          the direct result of an action you took, never as a side effect.
        </Lead>

        <H2 id="principles">Principles</H2>
        <Rules
          items={[
            <><strong>Extraction is local.</strong> Reading text out of your uploaded files (PDF, DOCX, PPTX, XLSX, CSV) happens in your browser, client-side. Uploading a file transmits it to storage — not to any AI model.</>,
            <><strong>Transmission is explicit.</strong> Content goes to an AI provider only when you trigger an AI action on it: generate a summary, a brief, a memo; run a review; submit verification evidence for classification.</>,
            <><strong>Scope is per-user.</strong> AI requests are built from data your account can read under Row Level Security. There is no cross-tenant context, ever.</>,
          ]}
        />

        <H2 id="when">When data reaches an AI provider</H2>
        <DocTable
          head={["Action", "What is sent"]}
          rows={[
            ["AI panel conversation", "Your message plus page context from your own data"],
            ["Document review / summary", "The text of the specific document you requested analysis on"],
            ["Deal brief / investment memo", "The company's profile or watchlist data you can already see"],
            ["Intake parsing", "The text you pasted or files you uploaded to the parser"],
            ["Verification classification", "The evidence document you submitted to the slot"],
          ]}
        />
        <P>
          Requests are processed through the provider's API under API data-use terms — API inputs
          are not used to train the provider's models.
        </P>

        <H2 id="never">What never happens</H2>
        <Rules
          items={[
            <>No document is sent to an AI provider because you uploaded it.</>,
            <>No background job reads your documents into a model without an action from you.</>,
            <>No AI request ever includes another user's private data.</>,
            <>Nothing the AI produces is shown to a counterparty without your confirmation.</>,
          ]}
        />

        <H2 id="technical">Technical safeguards</H2>
        <Rules
          items={[
            <>AI provider keys live server-side as encrypted secrets — never in the browser bundle.</>,
            <>All AI calls route through server functions that enforce authentication, rate limits, and timeouts.</>,
            <>Usage is metered per user per day, bounded by plan limits.</>,
          ]}
        />
      </>
    ),
  },
};
