import type { DocPage } from "../primitives";
import { A, Callout, Code, DocTable, H2, Lead, P, Rules, Steps } from "../primitives";

const UPDATED = "2026-07-08";

export const SECURITY_PAGES: Record<string, DocPage> = {
  // ── /docs/security ────────────────────────────────────────────────────────
  "security": {
    meta: {
      slug: "security",
      title: "Security & compliance",
      description:
        "How Hockystick protects deal data: encryption, Row Level Security on every table, NDA gating, and DIFC/DIAC legal framework.",
      updated: UPDATED,
      toc: [
        { id: "summary", label: "Summary" },
        { id: "encryption", label: "Encryption" },
        { id: "access-control", label: "Access control" },
        { id: "legal", label: "Legal framework" },
        { id: "ai", label: "AI and your documents" },
        { id: "infrastructure", label: "Infrastructure" },
        { id: "reporting", label: "Reporting a vulnerability" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Hockystick hosts confidential fundraising material — pitch decks, financial models, cap
          tables, bank statements. This page states plainly what we do to protect it, what the legal
          framework around it is, and how to reach us if you find a problem.
        </Lead>

        <H2 id="summary">Summary</H2>
        <Rules
          items={[
            <>All traffic is encrypted in transit with TLS; data is encrypted at rest with AES-256.</>,
            <>
              Row Level Security is enabled on all 107 database tables — every query is scoped to
              the requesting user. Verified against the production database on 8 July 2026.
            </>,
            <>
              No deal document is visible to a counterparty before a mutual NDA is signed inside the
              deal room.
            </>,
            <>
              Every NDA is governed by DIFC law with DIAC arbitration, enforceable under the New
              York Convention in more than 170 states.
            </>,
            <>We do not sell user data to third parties. Ever.</>,
            <>
              Document text extraction runs in your browser. Document content reaches a third-party
              AI provider only when you explicitly trigger an AI action on it.
            </>,
            <>
              Security reports go to{" "}
              <A href="mailto:security@hockystick.app">security@hockystick.app</A> and are
              acknowledged within 48 hours.
            </>,
          ]}
        />

        <H2 id="encryption">Encryption</H2>
        <P>
          All connections to hockystick.app terminate at Cloudflare's edge over TLS — TLS 1.3 for
          every modern client, with TLS 1.2 as the floor. There is no unencrypted access path; HTTP
          requests are redirected to HTTPS. At rest, all application data and uploaded documents are
          stored on Supabase infrastructure (AWS-backed) with AES-256 encryption.
        </P>

        <H2 id="access-control">Access control</H2>
        <P>
          Authorization is enforced in the database, not just the application. Every one of the 107
          tables in the production schema has PostgreSQL Row Level Security enabled, which means a
          query can only return rows the authenticated user is entitled to see — even if
          application code has a bug, the database refuses to serve another user's data. Details and
          the verification query are on the <A href="/docs/security/rls">Row Level Security</A> page.
        </P>
        <P>
          On top of RLS, team accounts carry role-based permissions (admin, manager, analyst,
          viewer on the founder side; admin, associate, analyst, external on the investor side)
          that control what each member can do inside a workspace.
        </P>

        <H2 id="legal">Legal framework</H2>
        <P>
          Deal rooms are NDA-gated: the Information Vault stays locked until both parties sign the
          generated mutual NDA. The NDA specifies DIFC (Dubai International Financial Centre)
          governing law and binding arbitration under DIAC (Dubai International Arbitration Centre)
          rules, seated in Dubai, conducted in English. Awards are enforceable under the 1958 New
          York Convention. The full clause structure is documented on the{" "}
          <A href="/docs/security/nda">NDA legal framework</A> page.
        </P>

        <H2 id="ai">AI and your documents</H2>
        <P>
          Text extraction from uploaded files (PDF, DOCX, PPTX, XLSX, CSV) happens client-side, in
          your browser. Nothing is sent to an AI provider as a side effect of uploading. Document
          content is transmitted to a third-party AI model only when you take an explicit action
          that requires it — generating a summary, a deal brief, or running verification
          classification. The full policy is on <A href="/docs/ai/data-handling">AI data handling</A>.
        </P>

        <H2 id="infrastructure">Infrastructure</H2>
        <P>
          The application runs on Cloudflare Pages and Workers at the edge. Data, authentication,
          and file storage run on Supabase, which is built on AWS and holds SOC 2 Type II
          compliance. Secrets are stored encrypted in Cloudflare and never shipped to the browser
          bundle. See <A href="/docs/security/data">Data storage</A> for specifics.
        </P>

        <H2 id="reporting">Reporting a vulnerability</H2>
        <P>
          Email <A href="mailto:security@hockystick.app">security@hockystick.app</A>. We acknowledge
          reports within 48 hours. Our disclosure policy, including what we ask of researchers and
          what we commit to in return, is on the{" "}
          <A href="/docs/security/disclosure">Responsible disclosure</A> page, and is also published
          at <Code>/.well-known/security.txt</Code>.
        </P>
      </>
    ),
  },

  // ── /docs/security/overview ───────────────────────────────────────────────
  "security/overview": {
    meta: {
      slug: "security/overview",
      title: "Security posture",
      description:
        "The layers of Hockystick's security model: edge TLS, database-enforced authorization, NDA gating, and role-based team permissions.",
      updated: UPDATED,
      toc: [
        { id: "model", label: "The layered model" },
        { id: "auth", label: "Authentication" },
        { id: "authz", label: "Authorization" },
        { id: "secrets", label: "Secrets management" },
        { id: "limits", label: "Known boundaries" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Security on Hockystick is layered so that no single failure exposes deal data: transport
          encryption at the edge, authentication through Supabase Auth, authorization enforced
          inside the database itself, and a signed NDA before any counterparty sees a document.
        </Lead>

        <H2 id="model">The layered model</H2>
        <DocTable
          head={["Layer", "Enforced by", "What it stops"]}
          rows={[
            ["Transport", "Cloudflare edge (TLS 1.3/1.2)", "Interception of data in transit"],
            ["Authentication", "Supabase Auth (email + Google OAuth, captcha-protected)", "Unauthenticated access"],
            ["Authorization", "PostgreSQL Row Level Security on all 107 tables", "One user reading another user's rows"],
            ["Team roles", "Role permission checks (roles.ts + role_permissions table)", "A viewer performing admin actions"],
            ["Deal gating", "NDA signature gate before Information Vault unlock", "Document access before legal protection exists"],
          ]}
        />

        <H2 id="auth">Authentication</H2>
        <P>
          Sign-in supports email/password and Google OAuth, both through Supabase Auth. Sign-up and
          sign-in are protected by captcha to block credential-stuffing bots. Sessions are
          short-lived JWTs with refresh rotation; password changes and account deletion are
          self-service under Settings → Security.
        </P>

        <H2 id="authz">Authorization</H2>
        <P>
          The core rule: authorization lives in the database. Application-level checks exist for UX
          (hiding buttons a role can't use), but the thing that actually prevents cross-tenant data
          access is Row Level Security — described in detail on the{" "}
          <A href="/docs/security/rls">RLS page</A>. Where a policy needs to consult another table,
          it does so through <Code>SECURITY DEFINER</Code> helper functions rather than inline
          subqueries, which avoids both recursion bugs and policy bypasses.
        </P>

        <H2 id="secrets">Secrets management</H2>
        <P>
          API keys (AI providers, email, CRM) are stored as encrypted Cloudflare secrets and read
          only inside server functions at request time. They are never embedded in the client
          bundle, never exposed with a <Code>VITE_</Code> prefix, and never logged.
        </P>

        <H2 id="limits">Known boundaries</H2>
        <P>
          We state limits as plainly as guarantees. Hockystick does not currently hold its own SOC 2
          attestation — the SOC 2 Type II compliance referenced in these docs belongs to Supabase,
          our infrastructure provider. Uploaded documents are encrypted at rest but not end-to-end
          encrypted: the platform can technically read stored files, which is what allows AI
          summaries and verification to work. If your threat model requires zero platform access to
          file contents, do not upload those files.
        </P>
      </>
    ),
  },

  // ── /docs/security/data ───────────────────────────────────────────────────
  "security/data": {
    meta: {
      slug: "security/data",
      title: "Data storage, encryption, and residency",
      description:
        "Where Hockystick data lives, how it is encrypted in transit and at rest, and what happens when you delete your account.",
      updated: UPDATED,
      toc: [
        { id: "where", label: "Where data lives" },
        { id: "transit", label: "In transit" },
        { id: "rest", label: "At rest" },
        { id: "third-parties", label: "Third parties" },
        { id: "deletion", label: "Deletion" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Application data, uploaded documents, and authentication records are stored in Supabase
          (PostgreSQL and object storage on AWS). The web application itself is served from
          Cloudflare's edge network.
        </Lead>

        <H2 id="where">Where data lives</H2>
        <DocTable
          head={["Data", "Store"]}
          rows={[
            ["Profiles, deal rooms, Q&A, decisions, activity", "Supabase PostgreSQL"],
            ["Uploaded documents (decks, models, statements)", "Supabase Storage (object storage)"],
            ["Authentication credentials and sessions", "Supabase Auth"],
            ["Static application assets", "Cloudflare Pages CDN"],
          ]}
        />

        <H2 id="transit">In transit</H2>
        <P>
          Every connection is TLS-encrypted end to end: browser to Cloudflare edge, and Cloudflare
          to Supabase. TLS 1.3 is negotiated with every modern client; TLS 1.2 is the minimum
          accepted version. Plain HTTP is redirected before any request body is read.
        </P>

        <H2 id="rest">At rest</H2>
        <P>
          Database contents and stored files are encrypted at rest with AES-256 on Supabase's
          AWS-backed infrastructure. Supabase holds SOC 2 Type II compliance for this
          infrastructure. Document downloads are served through short-lived signed URLs — there are
          no permanently public file links to deal documents.
        </P>

        <H2 id="third-parties">Third parties</H2>
        <P>
          We do not sell user data to third parties. Data leaves our infrastructure only for
          functions you can see in the product: transactional email (Resend), CRM sync of contact
          records for signups (HubSpot), and AI processing you explicitly trigger (see{" "}
          <A href="/docs/ai/data-handling">AI data handling</A>). None of these receive deal
          documents except the AI path, and that only on your action.
        </P>

        <H2 id="deletion">Deletion</H2>
        <P>
          Account deletion is self-service under Settings → Security and requires typed
          confirmation. Deletion removes your authentication record and profile data. Some records
          survive deletion where the other party owns them or the law expects them to persist — for
          example, a signed NDA remains available to its counterparty, and activity log entries
          referencing past actions are retained for the workspaces they occurred in.
        </P>
      </>
    ),
  },

  // ── /docs/security/rls ────────────────────────────────────────────────────
  "security/rls": {
    meta: {
      slug: "security/rls",
      title: "Row Level Security",
      description:
        "Every one of Hockystick's 107 database tables has PostgreSQL Row Level Security enabled. How the policy model works.",
      updated: UPDATED,
      toc: [
        { id: "what", label: "What RLS gives you" },
        { id: "coverage", label: "Coverage: 107 of 107" },
        { id: "patterns", label: "Policy patterns" },
        { id: "verification", label: "How we verify it" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Row Level Security (RLS) is a PostgreSQL feature that attaches an access policy to a table
          itself. When RLS is on, the database — not the application — decides which rows a query
          may return or modify. Hockystick has RLS enabled on every table in the production schema.
        </Lead>

        <H2 id="what">What RLS gives you</H2>
        <P>
          Most data leaks in multi-tenant SaaS come from an application bug: a missing{" "}
          <Code>WHERE user_id = ...</Code> clause, a forgotten permission check on one endpoint.
          With RLS, that class of bug stops mattering for confidentiality. A query that forgets its
          filter returns your rows only — the policy runs inside PostgreSQL on every statement,
          keyed to the authenticated user's identity (<Code>auth.uid()</Code>), and cannot be
          skipped by client code.
        </P>

        <H2 id="coverage">Coverage: 107 of 107</H2>
        <P>
          As of 8 July 2026, the production database contains 107 tables in the public schema, and
          all 107 have RLS enabled — zero exceptions. This is checked directly against the live
          database, not inferred from migrations:
        </P>
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
          <pre className="text-[13px] leading-6 text-gray-800 font-mono">{`SELECT count(*)                                    AS total_tables,
       count(*) FILTER (WHERE c.relrowsecurity)    AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';

-- total_tables: 107, rls_enabled: 107`}</pre>
        </div>

        <H2 id="patterns">Policy patterns</H2>
        <Rules
          items={[
            <>
              <strong>Owner-scoped tables</strong> (watchlists, notes, preferences): policies test{" "}
              <Code>user_id = auth.uid()</Code> directly.
            </>,
            <>
              <strong>Membership-scoped tables</strong> (deal room documents, Q&A, activity):
              policies consult membership through <Code>SECURITY DEFINER</Code> helper functions
              such as <Code>is_startup_founder</Code> and <Code>get_user_team_startup_ids</Code>,
              never through a self-referencing subquery — a deliberate rule after an early policy
              that queried its own table caused infinite recursion.
            </>,
            <>
              <strong>Write policies</strong> use <Code>WITH CHECK</Code> clauses so inserts and
              updates are validated with the same rigor as reads.
            </>,
            <>
              <strong>Public pages</strong> (published profiles, verification reports) read through
              policies that require an explicit published flag — unpublished data is invisible even
              to a direct API call.
            </>,
          ]}
        />

        <H2 id="verification">How we verify it</H2>
        <P>
          New tables ship with RLS in the same migration that creates them, and bulk imports insert
          grandfathered rows in the same migration rather than as a follow-up. The end-to-end test
          suite runs against the live schema with real accounts, which has caught RLS regressions
          before users did — including a silent insert rejection caused by an{" "}
          <Code>auth.uid()</Code> call inside a subquery.
        </P>
      </>
    ),
  },

  // ── /docs/security/nda ────────────────────────────────────────────────────
  "security/nda": {
    meta: {
      slug: "security/nda",
      title: "NDA legal framework",
      description:
        "Every Hockystick deal room NDA: DIFC governing law, DIAC arbitration seated in Dubai, New York Convention enforcement.",
      updated: UPDATED,
      toc: [
        { id: "gate", label: "The NDA gate" },
        { id: "terms", label: "Governing terms" },
        { id: "arbitration", label: "Arbitration" },
        { id: "enforcement", label: "International enforcement" },
        { id: "record", label: "Signature record" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          Before a deal room's Information Vault unlocks, both parties sign a mutual non-disclosure
          agreement generated by the platform and populated with each party's live profile data. The
          legal framework is fixed and identical for every deal room — no party can weaken it.
        </Lead>

        <H2 id="gate">The NDA gate</H2>
        <P>
          The NDA is not a checkbox. The deal room enforces it structurally: documents in the
          Information Vault are not served to a counterparty until the room's NDA shows both
          signatures. The agreement itself is pinned as the first entry in the Vault so it remains
          inspectable for the life of the deal.
        </P>

        <H2 id="terms">Governing terms</H2>
        <P>
          The agreement is governed by the laws of the Dubai International Financial Centre (DIFC),
          United Arab Emirates, without regard to conflict-of-laws provisions. DIFC is a common-law
          jurisdiction with an independent, English-language court system — the standard choice for
          cross-border investment agreements in the region.
        </P>

        <H2 id="arbitration">Arbitration</H2>
        <P>
          Disputes not resolved by negotiation go to binding arbitration under the Rules of the
          Dubai International Arbitration Centre (DIAC), incorporated into the agreement by
          reference:
        </P>
        <Rules
          items={[
            <>One arbitrator for claims below USD 500,000; three arbitrators at or above it.</>,
            <>Seat of arbitration: Dubai, UAE.</>,
            <>Language of arbitration: English.</>,
            <>The award is final and binding, and may be entered as a judgment in any court of competent jurisdiction.</>,
          ]}
        />

        <H2 id="enforcement">International enforcement</H2>
        <P>
          Enforcement of awards is subject to the 1958 New York Convention on the Recognition and
          Enforcement of Foreign Arbitral Awards, to which the UAE is a signatory. In practice this
          means an award rendered in Dubai under a Hockystick NDA is enforceable in the courts of
          more than 170 contracting states — including every major venture jurisdiction
          worldwide.
        </P>

        <H2 id="record">Signature record</H2>
        <P>
          Each signature is recorded with the signer's name, organization, role in the deal, and
          date, and the signing event is written to the deal room's activity log. Signed NDAs
          remain accessible to both parties after the deal room closes, regardless of outcome.
        </P>
        <Callout>
          The NDA text is generated by the platform, but it is a real legal agreement between the
          founder and the investor. Hockystick is not a party to it and does not provide legal
          advice — review it with counsel if you are unsure.
        </Callout>
      </>
    ),
  },

  // ── /docs/security/disclosure ─────────────────────────────────────────────
  "security/disclosure": {
    meta: {
      slug: "security/disclosure",
      title: "Responsible disclosure",
      description:
        "How to report a security vulnerability in Hockystick: security@hockystick.app, acknowledged within 48 hours.",
      updated: UPDATED,
      toc: [
        { id: "how", label: "How to report" },
        { id: "commit", label: "What we commit to" },
        { id: "ask", label: "What we ask" },
        { id: "scope", label: "Scope" },
      ],
    },
    Body: () => (
      <>
        <Lead>
          If you believe you have found a security vulnerability in Hockystick, we want to hear
          about it — directly, before anyone else.
        </Lead>

        <H2 id="how">How to report</H2>
        <Steps
          items={[
            <>
              Email <A href="mailto:security@hockystick.app">security@hockystick.app</A> with a
              description of the issue, steps to reproduce, and the impact you believe it has.
            </>,
            <>Include the URL, account context (a test account is fine), and any relevant request/response detail.</>,
            <>If the issue exposes another user's data, stop at proof — do not enumerate further.</>,
          ]}
        />
        <P>
          This contact is also published in machine-readable form at{" "}
          <Code>https://hockystick.app/.well-known/security.txt</Code>.
        </P>

        <H2 id="commit">What we commit to</H2>
        <Rules
          items={[
            <>Acknowledgement of your report within 48 hours.</>,
            <>An honest assessment of severity and a timeline for the fix.</>,
            <>Notification when the issue is resolved.</>,
            <>No legal action against good-faith research conducted within this policy.</>,
          ]}
        />

        <H2 id="ask">What we ask</H2>
        <Rules
          items={[
            <>Give us reasonable time to fix the issue before public disclosure.</>,
            <>Do not access, modify, or delete data belonging to real users.</>,
            <>Do not run automated scanners that degrade service for others.</>,
            <>Do not use social engineering, phishing, or physical attacks against our team or users.</>,
          ]}
        />

        <H2 id="scope">Scope</H2>
        <P>
          In scope: hockystick.app and its subdomains, the API endpoints they call, and the
          authentication flows. Out of scope: third-party services we integrate with (Supabase,
          Cloudflare, Resend, HubSpot) — report issues in those platforms to their own programs —
          and denial-of-service findings.
        </P>
      </>
    ),
  },
};
