# SECURITY-CHECKLIST.md

Pre-flight for any new feature work. Skim this before you start, not after you ship.

Every line below is a rule this project learned by breaking it. The "why" is a real
incident with a real cost — not generic advice. Where a rule cites a CLAUDE.md section
or a commit, that is the primary record; this file is the index, not the replacement.

**How to use it:** read the eight headings at the start of a feature. Read the lines
under any heading your change actually touches. If you cannot tick a line, that is the
work — not a footnote to it.

---

## 1. RLS — every new table, at creation, no exceptions

- [ ] **Every new table has an RLS policy written in the same migration that creates it.** Not "will add later." — *§19f: `startups` had no anon SELECT policy, so a route used the service-role key to work around it and shipped all 77 columns (incl. `founder_email`, `burn_rate`, `org_code`) to every anonymous visitor for 70 days.*
- [ ] **The policy is least-privilege against the real consumers, not the table's obvious shape.** — *`59f1baa`: `profile_sections_public` granted ANON read of full section content for a surface that renders nowhere. The founder UI offered "Public" as a live selectable state — one click from real. Dropped, not narrowed.*
- [ ] **Role-discriminate where roles exist.** Membership ≠ principal. — *Build Step 0 (`7e20858`): 7 `dd-fn.ts` functions authorized on bare `deal_room_members` membership with no role check, letting a room-scoped lawyer read/write diligence and trigger investor-facing AI analysis exactly like a founder. §20.1's step-2b RLS narrowing never reached the service-role function layer.*
- [ ] **Service-role code bypasses RLS entirely — there is no database backstop.** Authorization must be complete in the code. — *§7.1.*
- [ ] **"A row exists matching these IDs" is not an authorization check.** It must be "the caller *is* the party in that row." — *§7.1.*
- [ ] **Exposure is enforced by what you QUERY, not what you RENDER.** A `select(*)` behind a client-side visibility gate ships every column. — *§19f. "Zero readers" is a claim about the code, never about what crossed the wire.*
- [ ] **Check the founder/investor mirror side.** If a risk shape exists on one, check the other — nothing flags it for you. — *§7.5; §19f was the founder-side mirror of an investor-side pattern that was already correct.*
- [ ] **A 0-row `UPDATE` returns no error.** Every gateway write returns an affected-row count; the client treats 0 as failure. — *§7.4: investors saw "Memo saved" on every click while the row never changed.*
- [ ] **An RLS `UPDATE` policy grants the whole row, never specific columns.** Column scope needs a `BEFORE UPDATE` trigger comparing `NEW`/`OLD`. — *§7.4.*
- [ ] **New `SECURITY DEFINER` functions inherit `EXECUTE TO PUBLIC`.** Revoke explicitly, verify against `information_schema.role_routine_grants`, test with a real `anon` call. — *§7.2: six `room_get_*` functions shipped without the revoke; `anon` + a real uuid returned that user's actual room data.*
- [ ] **`SET search_path = public, pg_temp` (pg_temp last), never `TO 'public'`.** — *§7.2.*

## 2. Secrets — verify the built artifact, never the source

- [ ] **No secret reaches client-side code, and no build-config pattern can inline one.** Check `envPrefix`, `define`, and env allowlists — not just your own call sites. — *§19e: `"OPENAI_"` in `vite.config.ts`'s `envPrefix` shipped a live OpenAI key in plaintext in the main entry bundle, loaded on every page, for ~11 weeks.*
- [ ] **After any change to secrets, build config, or a key rotation: build, then grep `dist/client`, `dist/server`, AND the worker for the key's format.** Source greps and removed call sites prove nothing about what the bundler emits. — *§19e: commit `f52e60e` ("move all OpenAI calls server-side, remove VITE_OPENAI from browser") did exactly the right thing at source level, touched three files, never touched `envPrefix`, and left the key live for eleven more weeks.*
- [ ] **Rotation does not close an exposure mechanism — it refills it.** Re-run the artifact check on every rotation. — *§19e: the July and August bundles carry two different keys.*
- [ ] **Where a deploy has happened, fetch the DEPLOYED bundle and grep that too.** A local build and a CI build can differ in env. — *§19e.*
- [ ] **`grep` silently suppresses matches on files it deems binary.** Use `grep -a` on any served/minified response; confirm with `file` first. — *§19f: the first check of the production response reported zero occurrences of everything and nearly produced a wrong all-clear.*

## 3. Claims vs. evidence — including claims from your own tools

- [ ] **A security finding is not a finding until it reproduces against the real target.** Reproduce it yourself before acting, escalating, or recording it. — *Strix run `host-docker-internal-8788_f413` (13 Sep 2026) filed a CRITICAL / CVSS 9.8 "command injection in `/login`", confidence High, with a POC, a CVSS breakdown, four agent-signed update entries, and a four-point "Fix Verification" section. **There is no `/login` route in this codebase** (the real route is `sign-in.tsx`), there is no Python server, and the cited sink `os.system(username)` appears nowhere. The "fix" it verified was never applied — it verified a patch that does not exist, on an endpoint that does not exist.*
- [ ] **An AI security tool's confidence score, severity, CVSS, and update history are output, not evidence.** They are generated with the same freedom as the finding. — *Same run: the report grew *more* confident across four revisions while remaining entirely fictional.*
- [ ] **Paste raw output — `curl`, query results, status codes, screenshots. Not summaries.** — *§6.*
- [ ] **Attempt the actual attack. Reading the code is not a test.** — *§6.*
- [ ] **Adversarial tests run as a real account with genuinely no access, never as a privileged role.** — *§6.*
- [ ] **Verify that a live check asserts on known ground truth, not merely that a screen rendered.** — *§20.10: a verification pass looked directly at "No deal rooms yet." for a founder with two real rooms, and passed it.*
- [ ] **A stated limitation is itself a claim — test it once by attempting the thing it forbids.** — *§20.10: an hCaptcha "verification ceiling" was re-disclosed across two passes and ~15 surfaces. It was false; the working bypass helper was already committed in `tests/`.*
- [ ] **After any live hand-edit of a migration, reconcile the file from `pg_get_functiondef` for EVERY object it touches — byte-for-byte, never retyped from memory.** — *§7.2: three functions diverged from their migration file across one build; two were found only by pulling every function, not the ones already suspected.*
- [ ] **A correction asserting a removal must verify that removal against live code and live data AT THE TIME OF WRITING.** — *§20.13: a public changelog said a readiness score "was removed" with "no live path." It rendered to investors for 15 more days. §19: `verify-investor` stayed publicly invokable for 8 days after being declared closed. Nobody re-reads a section headed "closed."*

## 4. New routes — check filename-prefix nesting BEFORE shipping

- [ ] **Two route files sharing a dot-separated filename prefix become a parent/child layout pair by default.** Without an `<Outlet />` in the parent, the child's URL renders the parent's content and nothing else. — *§7.4: `tsc` and the build stay clean; only a live click-through catches it. Found under three different names across this codebase's history.*
- [ ] **If the parent is not meant to be a layout, apply the trailing-underscore break proactively** (`app.support_.feedback.tsx`) **and verify the resolved `fullPath` in `routeTree.gen.ts`** — not by assuming the rename worked. — *§19k. Six files in `src/routes/` currently carry this break: `app.support_.`, `deals-preview.profile_.` ×3, `deals-preview.$sector_.`.*
- [ ] **A route filename containing `.client.` is denied to the server environment and takes the ENTIRE route tree down with a 500.** `tsc` passes clean. — *§20.15.*
- [ ] **Open the new route in a real browser before calling it done.** Static tooling has never caught either bug above.

> ⚠️ **Open instance, found while writing this very item — tracked as §19o, NOT fixed.**
> `join.tsx` is an `<Outlet />`-less layout parent for `join.team.$token.tsx`
> (`routeTree.gen.ts:3986-3994`), so `/join/team/:token` resolves, changes the URL, and
> never mounts the child.
>
> **The obvious fix is the wrong one here, and that is the point.** The child is a **dead
> legacy path**, confirmed on 28 Jul 2026 by migration `20260728050000`'s own comment;
> real invite emails use the search-param shape (`triggers.ts:299` → `/join?token=`) that
> `join.tsx` handles correctly. The two files are independent, divergent implementations
> of the same feature: the live one resolves everything through `SECURITY DEFINER` RPCs,
> the dead one reads `invites` directly from the client and writes `accepted_at` with a
> client-side `.update()`. **The missing `<Outlet />` is currently the only thing keeping
> that client-trusting write path unreachable by URL** — so adding an `<Outlet />`, or
> applying this section's own trailing-underscore rename, would *reactivate* it rather
> than repair anything.
>
> **Correct remedy: re-confirm dead via a live click-through, then delete the legacy path
> entirely** — remove the surface rather than fix the routing gap. Blocked on that
> click-through per §5 (confirm-first); nothing activated or deleted pending it.
>
> Read this callout as the worked example for §4 generally: **a routing gap can be
> load-bearing.** Establish what the child actually does before you make it reachable.

## 5. Real external side effects — confirm first, every time

- [ ] **Reversibility, not tool class, decides whether you ask first.** "It's already live in production" and "it's a Read-class action" are not exemptions. — *§19n/§4: an AI analysis was run to verify a color fix; it wrote a permanent note to a shared fixture and spent a real provider call. Three genuinely reversible probes minutes earlier had correctly not needed asking.*
- [ ] **Confirm before: any write to production data (incl. "temporary" probe rows), any real third-party API call, any AI-provider call that spends budget, any email send.** — *§4.*
- [ ] **Disclosing afterwards is not the same thing.** — *§4.*
- [ ] **Before probing ANY endpoint, establish what it does with the input you are about to send — including the empty input.** — *§19d.2: an empty-body POST to `daily-desk-cron` ran the full batch pass, made real OpenAI calls, and created 9 rows across 5 real user accounts. For a parameterless batch endpoint there is no safe probe; verify reachability by reading the deployed body and testing the auth gate only.*
- [ ] **Never assume a dev/test environment is inert.** `main` runs directly against the live production Supabase project; there is no second project. — *§12.*
- [ ] **Email sends are irreversible and reach real people.** `lib/email/triggers.ts` → `lib/email/resend.ts` posts to the live Resend API. — *§19i Finding 3: a matching-claim fabrication shipped in the live investor welcome email — the first instance of that violation class to reach a real person outside in-app UI.*
- [ ] **Disabling a trigger is not disabling what it triggers.** An unscheduled cron leaves the function publicly invokable forever. — *§7.1, §19 — the same conflation recurred three separate times.*

## 6. Public-facing content — no capability claim without code behind it

- [ ] **Every capability claim points at the real code implementing it, checked at the time of writing.** — *The multi-wave fabrication audit (`2e76c59`, `6b972dc`, `41319c7`, `f044bbd`, `76261f2`, `f4b08d5`, `ef114f9` — seven commits, 8–13 Sep 2026, 30+ files) removed claims for: sealed export, registry verification, a 5-tier verification system, thesis matching, a public API, and data residency. All described capabilities that do not exist.*
- [ ] **Search the underlying CLAIM, not a phrase list.** A fixed list finds only its own wording; the same claim survives restated. — *Three full sweep passes were needed on one fact pattern: "sealed close export" → "receive a sealed, signed export" → "Export at close" all survived the prior pass's grep.*
- [ ] **No statistic without a computed source.** Write the sentence without the number, or omit the sentence. — *§7.4: "3x more investor views" and "3× more likely to submit a decision" both shipped in live outbound email, the second directly beneath its own comment calling itself a placeholder.*
- [ ] **A comment admitting content is fabricated is evidence of the defect, never a mitigation.** It proves the decision was conscious. — *§7.4.*
- [ ] **Never render a fabricated value styled as cryptographic proof** — a hash, signature, or fingerprint. The visual form manufactures the trust, and a "preview" label does not neutralize it. Omit the element. — *§7.4, §20.15.*
- [ ] **An attributed testimonial with no real person behind it is a more serious category than an unattributed claim.** — *`ef114f9`: five removed across five audience pages, no replacements invented.*
- [ ] **Legal/compliance documents are capability claims too.** — *Round 3: `legal.sub-processors.tsx` named PlanetScale, SendGrid, and Vercel. The real stack is Supabase, Resend, and Cloudflare — all three wrong simultaneously, in a DPA-adjacent document, never checked against the app's own infrastructure.*
- [ ] **Fix bad claims even in unreachable code.** Reachability is not a reason to leave a false claim standing. — *§19i.*

## 7. Dependencies / CVEs — trace real reachability, never the label

- [ ] **Before deferring a flagged CVE, trace whether the code actually executes in the real build/deploy path.** Trace usage; do not trust the `dependency`/`devDependency` label. — *`e7b114f`: `pdfjs-dist` carried an arbitrary-JS-execution CVE. It was genuinely reachable — `document-extractor.ts` calls `getDocument()` on founder/investor uploads client-side, and it ships in the built client bundle. The label alone would have justified deferring it.*
- [ ] **"Only used in tests/build" must be proven by tracing imports into the built artifact**, the same standard as §2's secret check.
- [ ] **Prefer the non-breaking in-major upgrade and verify the baseline afterward** — `npm audit` clears, `tsc` at baseline, build clean, bundle size sane. — *`e7b114f` recorded all four.*
- [ ] **Attacker-controlled input includes every uploaded document.** Content goes to a model as delimited data, never as instruction, and a Read-class tool operating on document content cannot chain into another tool in the same turn. — *§10.*

## 8. CSP / security headers — prove it blocks, not just that the page loads

- [ ] **Verify adversarially: deliberately try to break the fix.** A passing happy path proves nothing about enforcement. — *`fafd871`: an injected nonce-less inline script AND an injected stale-nonce script were both confirmed blocked with real CSP errors, and a control script from a disallowed origin produced an explicit block. That control is what makes "correctly allowlisted" distinguishable from "silently broken."*
- [ ] **Gate the flip on real violation data before enforcing.** — *`fafd871`: 489 accumulated Report-Only reports showed 484 hits across two gaps (`static.cloudflareinsights.com`, `static.figma.com`) that would have broken production on a blind flip. Neither origin appears in our source.*
- [ ] **Distinguish "no CSP error" from "no error."** Daily.co produced CORS/network errors and no CSP error — a different diagnosis from a CSP block. — *`fafd871`.*
- [ ] **A nonce must never be attacker-pinnable.** Strip any client-supplied nonce header before setting your own. — *`fafd871`.*
- [ ] **`_headers` and `_redirects` do NOT apply to SSR-routed responses.** Inject via `patch-wrangler.mjs`; keep both in sync or production silently diverges. — *§7.3.*
- [ ] **Regex inside `patch-wrangler.mjs` template literals is consumed at Node build time** — a literal `\d` does not survive. Verify against the PRE-MINIFIED assembled string. — *§7.3: reading minified output produced a wrong diagnosis before.*
- [ ] **Know the rollback before you enforce.** — *`fafd871`: a one-line header-name revert.*

---

## The two that generalize

**Audit before you build. Report before you merge.** (§1) Every phase starts with a
read-only step 0 that produces a written report and stops. This rule has found a live
authorization bypass, a template-literal bug that survived a clean build, and a security
test that passed while the vulnerability was open.

**Claims are not evidence** (§6) — and that applies to your own tooling, your own prior
passes, and any section headed "closed." Four of the incidents above were sections
someone had already marked resolved.
