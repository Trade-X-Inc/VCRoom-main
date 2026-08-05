# CLAUDE.md

Implementation authority for this repository. Read before any work.

---

## 0. Precedence

| Document | Governs |
|---|---|
| **Foundation Document** (project knowledge) | What to build, who may do it, what we refuse to build |
| **DESIGN.md** (repo root) | How the authenticated application looks and reads |
| **CLAUDE.md** (this file) | How we build, verify, and ship |

Conflicts resolve upward: Foundation wins on product, DESIGN wins on interface, this file wins on process.

A rule in this file may only be changed by amending this file. "It seemed reasonable at the time" is not an amendment.

---

## 1. The one rule

**Audit before you build. Report before you merge.**

Every phase begins with a read-only step 0 that produces a written report and stops. No code, no migrations, no drops until that report is reviewed and approved.

This rule exists because it has repeatedly found things that would not otherwise have been found: a live authorisation bypass, a template-literal bug that survived a clean build, a security test that passed while the vulnerability was open.

---

## 2. Two agents, never one

- **This repository's chat** — strategy, prompt writing, report review. Does not write production code.
- **Claude Code** — builds, audits, verifies. Does not decide scope.

Neither role does the other's job. When Claude Code encounters a scope question, it stops and asks rather than deciding.

---

## 3. Model routing

| Task | Model |
|---|---|
| Step-0 audits of any kind | Opus |
| Anything touching authorisation, RLS, the record chain, or the action layer | Opus |
| Schema design | Opus |
| Reviewing completed work before merge | Opus |
| Component work, forms, tables, migrations against a settled schema | Sonnet |
| Deletion passes, test writing, documentation | Sonnet |

Do not use Haiku for this project. Its failure mode is silent, and silent failure is the expensive kind here.

Security-phrased prompts sometimes trip Fable's safeguards. Use Opus for security work rather than burning attempts.

---

## 4. Confirm-first rule

Claude Code never performs these without explicit approval in the same session:

- Dropping or altering a database table
- Deleting a file that is not clearly dead
- Modifying anything under `src/lib/auth.tsx` or `src/lib/supabase.ts`
- Writing to production data, including "temporary" probe rows
- Changing anything in Cloudflare, Supabase dashboard, or DNS
- Merging or pushing

If a test requires a write to production, stop and ask first. Disclosing it afterwards is not the same thing.

---

## 5. Build discipline

- Branch per phase. Commit per numbered step.
- Merge `--no-ff`, never squash.
- **Never run `npm run deploy`.** Push only — Git integration deploys.
- Verify the committed tree equals the tested tree before merge. Working tree clean, `git status --porcelain` empty.
- Report `tsc` error count and gzip bundle size before and after every branch.
- A security gap found mid-phase is never "out of scope". Stop and report it.

### Baselines

| Metric | Value | Rule |
|---|---|---|
| `tsc` errors | 59 | Do not increase. If it drops, update this line and record why. Dropped from 64 across `phase0/close-and-clear`: 64→62 (cluster 3, two deleted files' own pre-existing errors), 62→61 (cluster 4, same), 61→60 (cluster 6 + orphaned `investor-advisor-fn.ts` deletion, same), 60→59 (step 5, `DDWorkstation.tsx`'s own pre-existing type error on a field reference the JWT-forwarding fix removed). Every drop verified line-by-line against the prior baseline, not by count alone — see §7.5. |
| Worker bundle (`_worker.js`, gzip) | 0.76 MB | Ceiling is 1 MB (CF Pages limit). Same metric the build script reports as "`_worker.js` gzip size" — prior figure (0.88 MB) predates this branch's deletions; drop is consistent with net negative line count across `phase0/close-and-clear` (+350/−17,582 vs `main` as of step 5). |

---

## 6. Verification standards

**Claims are not evidence.** A report saying "verified" without raw output is not a report.

- Paste raw `curl` output, raw query results, raw status codes. Not summaries.
- Adversarial tests run as a real authenticated account with genuinely no access — not as a privileged role.
- When testing whether a protection holds, attempt the actual attack. Reading the code is not a test.
- **Shadow every table a function touches, not just the first.** A partial test produces a false pass. This exact mistake once produced a clean bill of health on a live vulnerability.
- Verify worker-injected code against the **pre-minified** assembled string. Reading minified output has produced a wrong diagnosis before.

---

## 7. Known defect patterns — do not reintroduce

These were found the hard way. Each cost hours.

### 7.1 Authorisation

- **Never trust an identity parameter.** A `user_id` in a request body is spoofable. Derive identity from the session, always. Delete the parameter rather than validating it.
- **Service-role code bypasses RLS entirely.** There is no database backstop. Authorisation must be complete in the code.
- **"A row exists matching these IDs" is not an authorisation check.** It must be "the caller *is* the party in that row."
- **RLS helper functions that query their own protected table cause infinite recursion.** Use direct subqueries or a `SECURITY DEFINER` helper.
- **`auth.email()` outperforms `(SELECT email FROM auth.users WHERE id = auth.uid())`** — the latter silently fails for the authenticated role.
- **`requireUser()` authenticates the token, not the possessor.** A stolen valid token passes every check in this codebase, everywhere. This is an accepted boundary, not a gap in any single function — do not re-litigate it per-function.
- **When auditing any Supabase Edge Function's auth, test whether the public anon key (present in every frontend bundle) is itself accepted as a valid JWT.** `verify_jwt: true` alone does not exclude it — the anon key is a real, platform-signed JWT, so a JWT-format check passes it; only a claims check (e.g. rejecting a token with no `sub`) excludes it. Test explicitly, do not assume a JWT check excludes unauthenticated callers.

### 7.2 SECURITY DEFINER functions

- `SET search_path TO 'public'` is **not** safe. `pg_temp` is searched implicitly first. Use `SET search_path = public, pg_temp` (pg_temp last) or `SET search_path = ''` with fully-qualified names.
- Functions owned by `postgres` have `BYPASSRLS`. RLS is not a backstop inside them.
- A function that is RPC-reachable, takes a caller-supplied ID, and returns data is a data-exposure surface regardless of `search_path`. RLS helpers belong in an unexposed schema.
- Revoking `EXECUTE` from `authenticated` does not work for RLS helpers — policy expressions run as the querying user.
- `REVOKE TEMPORARY ... FROM authenticated` is a no-op. `TEMPORARY` is granted to `PUBLIC`.

### 7.3 Cloudflare and the worker

- `_headers` and `_redirects` do **not** apply to SSR-routed responses. Headers and redirects must be injected in the worker via `patch-wrangler.mjs`.
- `patch-wrangler.mjs` and `public/_headers` must stay in sync. Editing one without the other silently diverges production.
- **Regex inside `patch-wrangler.mjs` template literals is consumed at Node build time.** A literal `\d` or `\/` does not survive. Use `String.fromCharCode(92)` construction and verify against the pre-minified string.
- `React.lazy` does not reduce the Pages `_worker.js` — esbuild `--outfile` inlines dynamic imports. Only `--external` affects the worker. Client-side splitting still helps the client bundle.
- Edge-cached HTML referencing hashed asset filenames can break after a deploy. Keep edge TTL short on cached routes.

### 7.4 Application

- **One Supabase auth listener only.** Multiple listeners cause 5-second localStorage lock timeouts. Two currently exist (`lib/auth.tsx`, `lib/auth-store.ts`), each individually guarded — resolve during the rebuild.
- **Soft-delete files** by setting the parent reference to null. Never hard-delete from storage. *(See §11.2 — this conflicts with the erasure requirement and must be reconciled.)*
- **Errors must be checked.** A destructured `error` that is never referenced produces silent failure and false success in the interface. This class shipped to production more than once.
- `investor_profiles.id` (profile PK) is **not** `investor_profiles.user_id` (= `auth.uid()`). Never conflate.
- Do not hand-roll workflow transitions across an enum. The prior codebase ended with two conflicting stage vocabularies and a live constraint violation.

### 7.5 Deletion passes (found during `phase0/close-and-clear`)

- **File-level cut/keep classification is insufficient when a file's import graph matches the cut pattern but its content doesn't.** `app.connections.tsx` matched the CRM cut cluster by import graph, but tracing its actual content found `IncomingRequests` — the real deal-room-creation approve/decline flow — embedded inside otherwise-cut CRM UI. Trace content, not just imports, before deleting any file with real usage. Generalises to Phase 1's action-layer work: a gateway function can have the same problem at a larger scale.
- **Check the founder/investor mirror side even when only one side was flagged.** If a given risk shape (stale content, an orphaned component, a shared table) shows up on one side of a founder/investor pair, check the other side as a matter of habit — it is not independently flagged by the same audit pass that caught the first one.
- **A backend function can survive with a stale prompt/context built for a deleted feature, even after its frontend callers change.** `advisor-fn.ts`'s `pageGuidance` block referenced the deleted CRM pipeline and the deleted investor-readiness-score feature — found only by reading the function's actual content after its two live callers (`PageGuide.tsx`, `AIChat.tsx`) had already been reclassified as kept. Re-check a surviving backend function's own content, not just whether its callers still exist.
- **A dead-code component can hide behind an otherwise-clean, still-imported route file.** `FounderHome`/`InvestorChat`-shaped blocks were found rendered from routes that looked cut-cluster-clean on import graph alone. Check for orphaned route-exported components before assuming a file is load-bearing (or, conversely, safe to delete) on import graph alone.
- **A table can be dual-role.** `discovery_requests` and `vc_leads` are each written by kept infrastructure and read by a mix of cut UI (deleted) and kept UI (preserved) simultaneously — neither is classifiable as purely cut or purely kept at the table level. Trace actual read/write call sites per table before assuming a table follows its most prominent feature's fate.
- **A nav-reference grep catches what `tsc` misses.** Deleting a route can leave a dangling `<Link to="...">` or nav entry that is not a type error (the route path is often typed as a plain string) but is a real broken link in production. Grep for the literal route string across `src/`, not just the import graph, before treating a deletion as complete.
- **AI-facing prompt/guide/help content is a second copy of product truth invisible to `tsc`, import-graph checks, and route-reachability grep.** It only surfaces by grepping content files directly for deleted feature names, or by live-testing the actual UI. Confirmed 4 separate instances in one session (`advisor-fn.ts`'s `pageGuidance`, `PageGuide.tsx`'s `GUIDES`, `HelpGuide.tsx` ×10 sections across two passes). Any full feature-deletion pass must include a content-file sweep as a standard step, not an afterthought.
- **A deployed Supabase Edge Function can exist with zero trace in the repo at all** — not stale content inside a tracked file, but the entire file missing from `supabase/functions/`. Found by diffing `mcp__…__list_edge_functions`'s live slug list against the repo directory listing, not by any grep or `tsc` check, since there is nothing in the repo to grep. Two of six such orphans found this way (`match-investors`, `verify-investor`) turned out to be fully-built, actively cron-scheduled implementations of features excluded by product decision (Foundation Document §15/§25 — matching/recommendation, verification claims/badges) — running in production since first deploy, discovered only by directly querying `cron.job_run_details`, not by any code-level check. (All logged runs of both jobs had in fact failed — `pg_net` was never installed — so no real user was ever processed; this was found by reading the cron log, not assumed from the job existing.) A full deployed-function inventory sweep — list vs. repo diff, plus a content grep of each live function's actual fetched source — is now a standard step in any feature-deletion pass, not just a frontend content sweep.
- **When a Supabase Edge Function must be retired but no delete/undeploy tool is available, overwrite it with an inert stub** (fixed non-200 response, no DB/env/network access) rather than leaving the old logic live or leaving it undocumented. `run-readiness-score`, `run-investor-sim`, `run-verification` and `simulate-investor` were stubbed to a bare `410 Gone` this way on 3 Aug 2026 — repo source removed for the three that had any (`simulate-investor` never did), function slugs remain listed in Supabase as inert stubs. True removal from the function list requires `supabase functions delete <slug>` via CLI or dashboard; note this explicitly so a future inventory sweep recognises these four as already-handled rather than re-flagging them as a fresh "unrepoed" alarm.

---

## 8. Architecture rules for the rebuild

> **CURRENT STATE (verified 2 Aug 2026):** everything in §8 below is prospective — none of it has been built yet. There is no action-layer directory, no gateway module, no naming convention indicating a chokepoint. Actual measured shape of the codebase today: 65 files under `src/routes`/`src/components` call `supabase.from()` directly from the client (RLS-governed, not gateway-routed); 50 files in `src/lib` define independent `createServerFn` handlers, each authorising on its own; 25 of those use the shared `requireUser()` identity helper (added by the R43 branch, merged to `main`) but there is no single entry point they all pass through. This is precisely the "scattered across a hundred policies and forty functions with no chokepoint" failure mode §8.1 describes below — meaning §8.1–§8.4 describe the fix, not the present. Treat every rule below as Phase-1-not-started design intent until this note is removed.

### 8.1 The action layer

**The client never queries the database directly.** Every read and write passes through a server action that derives identity from the session and enforces authorisation in one place.

RLS remains as a second layer but is no longer the primary boundary. Nearly every security incident in this codebase followed from authorisation scattered across a hundred policies and forty functions with no chokepoint. One gateway is auditable by a person; a hundred policies are not.

### 8.2 Actions are tools

Every action is defined once, at an interface-independent layer, with a typed contract, complete authorisation, and its own audit entry. The web interface and the agent interface are both consumers.

**No action may exist only as a UI event handler.** Retrofitting this later means rewriting the entire action layer.

Tool classes:

| Class | Agent may | Examples |
|---|---|---|
| **Read** | Execute freely within the principal's permissions | Read pack, list requests, get status |
| **Prepare** | Produce a draft a human must commit | Draft a request batch, draft an answer |
| **Commit** | **Never** | Accept a term, sign, close, decline, release a document |

No agent executes a Commit-class action under any circumstance, including explicit user instruction.

### 8.3 The record

> **CURRENT STATE (updated 4 Aug 2026):** first implementation built and verified in the **isolated `pack_v1` schema** (Phase 1 sub-milestone A, migration `supabase/migrations/pack_v1/20260804000000_pack_v1_foundation.sql`, commit `cfd20f5`). NOT in `public`, NOT promoted, 0 real entries — `pack_v1` is a discardable design-proving namespace (Supabase branching is Pro-only and unavailable on this project; schema isolation is the approved substitute). `record_entry` is one append-only hash-chain per org; `append_record()` is the sole writer; UPDATE/DELETE blocked by trigger (defense-in-depth — a superuser can `DISABLE TRIGGER`, so the hash chain itself, not the trigger, is the real tamper-evidence). Verified live: genesis + links, per-org independence, all three actor types, immutability, and independent hash recomputation. Still prospective in `public` until cutover.

Append-only, hash-chained. Each entry carries its predecessor's hash. Entries record actor identity, actor type (human / agent / system), timestamp, object reference, action.

Cannot be retrofitted onto existing history. Build it from the first write.

**`entry_hash = sha256(prev_hash || canonical_json(payload))`. The canonicalisation is spec'd, versioned, and authoritative in [`supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md`](supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md) — the Postgres function is the reference implementation, that document is what any second implementation (export tooling, client verifier, auditor) is checked against.** Key traps it records, found by probing actual output, not intent: number trailing-zeros are PRESERVED (`1.50` ≠ `1.5` — this is deliberately NOT RFC 8785/JCS, which would normalise them), object keys are recursively code-point-sorted while array order is preserved, and numbers must be carried as arbitrary-precision decimals never floats. Changing canonicalisation once real entries exist is a breaking, versioned change with product-owner sign-off — never a silent edit.

### 8.4 Reference numbering

> **CURRENT STATE (verified 2 Aug 2026):** does not exist in any form. Zero matches anywhere in the codebase or migration history for `{ORG}-{TYP}-{YYYY}-{SEQ}-{CD}`-style formatting, ISO 7064 MOD 97-10, or any `reference_number`/`ref_no` column. Entirely prospective.

Format: `{ORG}-{TYP}-{YYYY}-{SEQ}-{CD}` — `ATLS01-ROM-2026-000042-31`

Sequences are gapless per organisation, per type, per year. Check digit is ISO 7064 MOD 97-10. **An observed gap is a records incident to be investigated, never silently corrected.**

### 8.5 Never build

- PDF renderer, e-signature stack, workflow state machine — use libraries or vendors
- A platform fork of any kind. Libraries yes, platforms never. Our data model is the product.

---

## 9. Design

**Superseded for the authenticated application.** `DESIGN.md` governs all interface behind sign-in.

The tokens previously in this section remain authoritative **only** for public-facing pages — marketing, pricing, docs, blog, tools — until the application reaches roughly 80% completion, at which point the public surface migrates and this section is deleted.

Do not touch public-facing surfaces during application work.

---

## 10. AI usage

| Application | Rule |
|---|---|
| Extraction from documents | Proposes a value with citation to page and location. Human confirms; the confirmation is the warranty. |
| Completeness checking | Compares pack against schedule. Reports absence, never judgment. |
| Answer drafting | Drafts from existing pack data with citations. Human edits and sends. |
| Discrepancy detection | Flags a conflict. Does not resolve it. |
| Retrieval, search, translation | Permitted. Original always authoritative. |
| Scoring, ranking, recommendation, assessment | **Prohibited.** |
| Anything entering the record | **Prohibited.** Uncitable in a dispute. |
| Legal instrument generation | **Prohibited.** UPL exposure. |

**Injection containment:** uploaded documents are attacker-controlled text. Document content is delivered to a model as data, explicitly delimited, never as instruction. Content-derived values may populate fields awaiting human confirmation; they may never be passed as arguments to a Prepare or Commit tool without it. Read-class tools operating on document content cannot chain into another tool in the same turn.

**No provider-routing enforcement currently exists anywhere in the codebase.** `ai-router`'s `MODEL_MAP` routes every task type to OpenAI only (`gpt-4o-mini` or `gpt-4o`) — this is a single hardcoded provider, not an enforced routing policy; there is no code path that could route sensitive content elsewhere even accidentally, but there is also no mechanism that would catch it if one were added. No DPA is in place. OpenRouter key exists in secrets and is unwired. (Corrected 3 Aug 2026 — this line previously claimed enforcement existed; the `ai-router` audit found none. See §17.)

---

## 11. Security and compliance

### 11.1 Controls built from day one

- AES-256 at rest with managed key rotation
- TLS 1.3 enforced, legacy versions blocked
- Signed, short-lived URLs for every document. No persistent public URL.
- Tenant isolation at the action layer. No identifier in a request may widen access.
- **Mandatory MFA** — required, not a settings toggle
- Immutable hash-chained audit log recording actor, action, object, timestamp, source address
- Automated dependency scanning from the first commit
- Explicit recorded consent at onboarding per processing purpose

### 11.2 Erasure versus retention — unresolved

DIFC data protection law requires a genuine erasure capability for personal data. **This conflicts with the soft-delete rule in §7.4.**

Intended resolution: personal data erasable; transaction records retained and pseudonymised, with the party replaced by a permanent reference so the audit trail survives.

**This must be settled with counsel before the disclosure pack schema is finalised.** It is the one compliance question that changes the data model.

### 11.3 Certification

Build the controls now, delay the audit. SOC 2 Type II requires a 6–12 month observation window, so it begins around month 6, not when a customer asks.

A regulatory sandbox licence does **not** substitute for SOC 2. They are unrelated, and claiming otherwise damages credibility with anyone who knows the difference.

Claim nothing we do not hold. Publish what exists instead.

---

## 12. Environments

> **CURRENT STATE (verified 2 Aug 2026): `main` is the only environment that exists.** No branch named "rebuild" or similar is present — the full branch list is exclusively feature/security branches (`r10-…r15c-`, `security/r40-…r42-`, `fix/r43-…`, etc.). `list_projects` against the Supabase account returns exactly **one** project, `ldimninnjlvxozubheib` ("ilovetech56@gmail.com's Project"), and it is the same project ID referenced in `frontend/wrangler.toml`/`.env.local` for both `VITE_SUPABASE_URL` and `SUPABASE_URL`. There is no second Supabase project and no schema separation between "rebuild" and "production" — `main` runs directly against the live production schema. The table below describes intended future state, not current infrastructure.

| Environment | State |
|---|---|
| `hockystick-legacy` | Private archive of the complete pre-pivot codebase. **Frozen. Never modify. Never merge.** |
| Production (`main`) | Live. Signups closed; sign-up route is a waitlist form feeding HubSpot. Roast is a waitlist page. |
| Rebuild branch | Separate Supabase project — the new data model would destroy production schema. |

Local development via the Workers dev server. Edge behaviour verified against the preview URL, never assumed from local.

**Latency measured from a sandbox is not production latency.** Cached static assets have measured 442ms TTFB from CC's environment. Report bytes, chain structure and cache status — not timings.

---

## 13. Test fixtures

> **CURRENT STATE (verified 2 Aug 2026):** the three accounts and Atlas Robotics all exist and are unchanged by the R43 branch — `test-founder@` (`a5f889f9-d3fa-466f-bd37-b3f00a44c1d9`), `test-investor@` (`920727d9-77fa-4ecc-a3e4-467e04a0bb38`), `test-lawyer@hockystick.app` (`62006467-1e23-40ea-8e66-0d41ae23b5c9`), and Atlas Robotics (startup `ebfcaf98-13e5-4e33-a0ad-175d8c041580`, founder `620b1fe9-3d79-4226-8ae8-fbc59579005c`, `profile_published: true`). **The characterization below is false as a description of current behaviour.** Atlas Robotics is already a real `deal_room_members` row (role `founder`) in deal room `957f9750-00c7-402a-b1ba-d9c7a4e3ba2f`, alongside the Dr Henry investor fixture — the opposite of "can never enter a deal room." No verification gate that would block it from doing so exists today. The paragraph below describes a not-yet-built feature.

`test-founder@` / `test-investor@` / `test-lawyer@hockystick.app` — credentials in `.env.test`.

**Atlas Robotics is the permanent adversarial case.** It must always fail verification. Under the new model this means it can never enter a deal room. That is a regression test that runs itself.

---

## 14. Interface writing

Sentence case. Active voice. A control names exactly what happens. An action keeps the same name through the whole flow — the button says *Release document*, the toast says *Document released*.

No exclamation marks. No filler. Sentences under twenty words. No emoji. The phrase "AI-powered" appears nowhere.

| Write | Never write |
|---|---|
| Asserted 4 March · evidence attached | Verified |
| Complete against the seed schedule | Investor-ready |
| 12 of 14 conditions satisfied | 86% complete |
| Declined 2 June · reason recorded | Not a fit at this time |
| Nothing is waiting on you. | You're all caught up! |

---

## 15. Explicit non-goals

Do not build these. Each was decided deliberately.

- Marketplace, directory, matching, recommendation
- Verification claims of any kind — we record assertions, parties judge
- Readiness scores, gates, or any invented number presented as fact
- Percentage-of-round fees, per-page fees, per-GB fees
- Money movement, escrow, custody, trustee role
- Our own fund, vehicle, or investment activity
- Secondary market in unlisted shares
- Retail crowdfunding
- Signable legal instruments generated by us
- Social feed, referral programme, news aggregation
- Configurable workflow — templates with optional steps only
- Tokenisation
- Scraping of any kind

"Marketplace, directory, matching, recommendation" excludes public discovery/browsing surfaces (founder directory, thesis-matching/alerts) — not the connection-request approve/decline mechanism, which is core deal-room-creation infrastructure and is kept. `discovery_requests` and `vc_leads` are both dual-role tables: written by KEPT connection-request infrastructure, read by both cut UI (deleted) and kept UI (preserved) — see step-0 and cluster 2-4 findings on the `phase0/close-and-clear` branch.

Team coordination chat (internal, per-organisation) is IN SCOPE for a future phase, rebuilt toward Slack-like capability — reclassified 2 Aug 2026 during `phase0/close-and-clear` after direct product-owner instruction. This is distinct from the excluded social/engagement features above. Not a Phase 0 build item; the existing `team_messages`-backed implementation was preserved, not rebuilt, in this branch.

---

## 17. `ai-router` — auth and fabrication remediated 3 Aug 2026; DPA question still open

Found 3 Aug 2026, post-merge of `phase0/close-and-clear`, while live-verifying that branch's `advisor-fn.ts`/`PageGuide.tsx` fixes against the real "Ask AI" panel on `/app/prepare/ip-vault/document-intake`. Audited and remediated same day (Opus, step-0 audit → live incident mitigation → fix, same session). This section is the permanent record — not a live threat any more, but the found-the-hard-way lesson stays.

**What was found (audit):** `ai-router` (Supabase Edge Function, `supabase/functions/ai-router`) served the live Ask AI panel with `verify_jwt: false` and no in-code identity check — a client-supplied body `user_id` was trusted, meaning any caller could invoke it (including `gpt-4o`) with an arbitrary system prompt on the project's OpenAI key. Asked to describe a nonexistent "Investor Simulation" feature, it invented a detailed, entirely fictional description in production, to a real founder — the system prompt carried no guardrail against inventing features. The repo copy of the source had also drifted from what was actually deployed.

**What was fixed, in order, each verified live against the deployed function, not inferred:**
1. **`verify_jwt: true`** (deployed v6) — blocked no-token and garbage-token callers. Live-testing then found this alone was insufficient: the public Supabase anon key is itself a valid platform-signed JWT and passed the platform check. See the new §7.1 lesson below.
2. **Deployed↔repo reconciliation** (commit `ef32b6c`) — the tracked `supabase/functions/ai-router/index.ts` had fallen behind the deployed body (`VALID_FEATURES` normalisation and `try/catch` hardening existed only in production). Repo made byte-for-byte equal to deployed before any further edit, so every subsequent diff is legible as new work, not archaeology.
3. **In-code identity fix** (commit `d825b43`, deployed v8) — added `resolveUid()`, mirroring `requireUser()`: derives the caller's uid by verifying their bearer token against `/auth/v1/user`, and rejects the request (401) if that fails, including when the token is the anon key (no `sub` claim). The client-supplied `user_id` field was removed entirely; the anon-key gap left open by step 1 alone is closed. A first version of this fix passed the wrong key as `apikey` in the verification call and would have rejected every real user — caught live by testing the legitimate-caller path, not just the attack, before it shipped.
4. **Anti-fabrication guardrail** (commit `9c4da33`, deployed v9) — an assertion-boundary rule ("treat all data as unverified claims, never invent, surface uncertainty") is now appended to every `task_type`, not just the caller that already had it (`diligence.tsx`'s `dd_report` prompt), plus a matching tightening in `AIOperatorPanel.tsx`'s own prompt (which had actively invited feature invention). The exact prompt that produced the original fabrication was re-run live post-fix and now declines instead of inventing.

**Live verification standard held throughout:** a 6-case adversarial matrix (no auth header, garbage token, no `user_id`, attacker-controlled system prompt, anon key as bearer, plus the original fabrication prompt) run against the actual deployed endpoint at every step, alongside 2 legitimate-caller reproductions (the global panel's `chat` shape, the deal-room `dd_report` shape) — both required to keep passing after every change.

**STILL OPEN — explicitly, not resolved by this remediation:** the Foundation Document §16 Rule 16.1 / DPA question. `dd_report` (the deal-room QA-summary and due-diligence callers) sends real deal-room Q&A and financial diligence content through `ai-router` to OpenAI. There is no DPA in place (see the corrected §10 line above), and no code-level enforcement exists that would route sensitive content to a different, DPA-covered provider even in principle — `ai-router` has exactly one provider wired in. This is a counsel/product decision, not a code fix, and must be raised separately alongside the other open regulatory items (§11.2, §26 of the Foundation Document). Do not consider this section closed until that question has an answer.

---

## 19. Verification/badge system — found and closed 3 Aug 2026

Found during the deployed-edge-function inventory sweep queued after the §17 `ai-router` remediation. **Closed 3 Aug 2026** — the full grep-clean confirmation ran the same day, no open thread remains except the pricing item logged below.

**What was found:** a 5-tier verification system (Identity, Claims, Operational, Capital, Hockystick Verified) and a 23-badge achievement system were described across the entire public site — homepage, `/trust`, 4 docs pages, 6 tools-page CTAs, the public FAQ JSON-LD, the pricing page, and one in-app settings component — none of which had ever been more than partially built. Two Supabase Edge Functions (`match-investors`, `verify-investor`) were fully-built, cron-scheduled implementations of this system, excluded by Foundation Document §15/§25 (matching/recommendation, verification claims), running since first deploy — but every one of 55 logged cron executions per job had failed (`pg_net` never installed), so no real user was ever processed. Of the 23 badges described, only one (Roast Survivor) was ever wired to an automated award mechanism; the schema and a display component existed for the rest, but no award engine was ever built.

**Scale, in one count:** 27 files changed across 5 commits (`6ded0dd`..`e403023`), plus infrastructure actions with no file diff: 4 cron jobs permanently unscheduled (`match-investors-daily`, `verify-investors-daily`, `send-nudge-emails`, `send-nudges-every-6h` — the latter two found broken by the same `pg_net` root cause but unrelated to the verification claim itself), 4 fixture-origin database rows deleted (confirmed test/demo accounts only, per direct product-owner authorization), and 4 Supabase Edge Functions (`run-readiness-score`, `run-investor-sim`, `run-verification`, `simulate-investor`) stubbed to an inert `410 Gone` (no delete/undeploy tool was available in-session; true removal from the Supabase function list still requires `supabase functions delete <slug>` via CLI or dashboard — cosmetic, not urgent).

**Discovery method, matching the §7.5 lesson this incident itself extended:** found by diffing the live `list_edge_functions` output against the repo's `supabase/functions/` directory (not by any code-level grep, since the two central functions had zero repo trace), then by directly querying `cron.job_run_details` (not by assuming a scheduled job runs because it exists), then by a full-file read of every docs/marketing page rather than a keyword grep (the keyword grep alone missed at least 6 confirmed instances across `index.tsx`, `ai.tsx`, `founders.tsx`, and `seo.ts`, each only found by reading the whole file).

**Changelog handling:** 4 changelog entries (`docs/content/changelog.tsx`, dated 2026-07-09 through -07-11) had described the system as shipped. Left as historical record, each with a dated correction appended inline rather than rewritten or silently removed — the changelog is not the place to erase a mistake, only to annotate it.

**STILL OPEN — logged separately so it is not lost:** a founder-pricing inconsistency, found incidentally during this sweep, unrelated to the verification/badge claim itself. `index.tsx` and `pricing.tsx`'s own body both state $49/month for founders (free for investors); `pricing.tsx`'s page metadata (line ~110) and `seo.ts`'s FAQ JSON-LD (`DOC_FAQS[""]`, the "How does the success fee work?" entry) both state $19/month founder, $99/month investor. Not touched by this pass — needs a product decision on which figure is correct before either file is edited.

---

## 20. Current status — documents-group migration closed, 5 Aug 2026

**STATUS AS OF 5 AUG 2026:**

- **Documents-group migration is COMPLETE and PUSHED to `origin/main`** — commits `9398d03` through `c64e9cf` (6 commits). Verified in production, live, post-push: v1 isolation holds (untouched screens render exactly as before, no `--v2-*` leakage), the rebuilt documents screens render correctly and accept real writes end-to-end, `pack_v1`/`pack_api` schema isolation holds (raw `PGRST106` / `42501` checks re-run), and the gateway authorization matrix — including the load-bearing uploader-only `doc_update` boundary — passes live against the production Supabase project.
- **This closes the first full vertical slice of the new architecture**: token layer → primitives → ported authorization primitives → gateway data functions → client rewire → DESIGN v2 presentation rebuild. Every stage of that sequence was built, adversarially verified, and reviewed before the next stage started, and the whole slice was pushed as one unit only after every stage passed.
- **NO WORK IS IN PROGRESS.** No open branch for this work, no uncommitted changes, no half-migrated feature. `main` is clean and matches `origin/main`.

### 20.1 Next up — deal-room-core migration

`deal_rooms` and `deal_room_members` reads are currently left as direct `supabase.from()` calls throughout the documents-group code, each marked with an inline `// §B — future migration group: ... (deal-room-core group)` comment. **Grep for these comments to find every site** before starting — they are the complete, already-traced worklist for this group; do not re-derive it from scratch.

Follow the exact sequence proven on the documents group, in order, each its own reviewed step:

1. **Content-trace audit before trusting any file/table grouping** — a table or file can look like it belongs to one feature by name and still be dual-role or misclassified; verify by reading actual usage, not by import graph or naming alone (this is the general form of the lesson CLAUDE.md §7.5 already records).
2. **Port and adversarially verify authorization primitives before building anything on them** — the same discipline as the `9398d03` `authz_*` port: trace each primitive against the exact current RLS predicate it replaces, run the full member/non-member/wrong-scope/null matrix live, and document the RLS-predicate-to-function mapping before any gateway data function is written against it.
3. **Build gateway data functions, verify against real UI write/read contracts, not just RLS/schema** — the Stage-1/Stage-2 proving runs on the documents group caught real column-coverage gaps this way (`priority`, `for_user_id`, `file_size`, the founder "share link" path) that a schema-only or RLS-only read would have missed. Trace every actual `.select()`/`.insert()`/`.update()` call site's real column list before considering a data function complete.
4. **Client rewire, verify functional equivalence old-vs-new** — old RLS-governed query vs. new gateway output, field-by-field, same fixtures. This caught a real semantic divergence on the documents group (`is distinct from` vs. SQL `<>` on a nullable column) that the adversarial matrix alone did not.
5. **DESIGN v2 presentation rebuild, as its own reviewable step** — do not fold presentation into the data-layer rewire step; keep it a separate, explicitly-reviewed pass over already-proven primitives, as done for the documents group.
6. **Push only after all of the above is reviewed as one unit** — the documents-group precedent: six commits, one push, after every stage was individually approved.

### 20.2 Known open items — not blocking, logged for whenever relevant

- **`useAuth()` session-injection gap** blocks real-browser-render testing in production without solving hCaptcha. This affects test tooling only, not shipped code — the underlying gateway authorization was independently verified live against production by calling the `pack_api` functions directly with real, freshly-minted tokens. The same gap exists in the codebase's own previously-trusted Playwright pattern (`auth-and-portfolio.spec.ts`), confirmed by running it directly against this exact scenario — it is pre-existing, not introduced by this work.
- **Orphaned `doc_list` DB function** (superseded by the three named `doc_list_room`/`doc_list_library`/`doc_list_investor` reads, no caller) — left in place per §4 (harmless, service-role-only, unexposed); flagged for a future cleanup pass rather than dropped silently.
- **Detached-documents library bug** (pre-existing, faithfully preserved during the migration, not fixed) — a document detached from a deal room (`deal_room_id` set to `NULL`) becomes permanently invisible to the "add from library" picker, because the picker's `<>` comparison excludes `NULL` rows, matching the original PostgREST query's behaviour exactly. Needs a product decision on whether detached docs should be re-addable from the library before anyone touches this comparison. See the `project-detached-docs-library-bug` memory for the full trace.
- **Font-loading cost during the v1/v2 coexistence period**: five font families now load simultaneously — v1's DM Sans and Syne, plus v2's Archivo, Source Serif 4 and JetBrains Mono. Self-hosted, no third-party requests, but still a real payload cost worth revisiting once v1 fully retires and the coexistence period ends.

---

## 21. Amendment log

| Date | Change |
|---|---|
| 30 Jul 2026 | Rewritten for the pivot to closing infrastructure. §9 scoped to public surface only; DESIGN.md now governs the application. Prior §35–§55 consolidated into §7 as defect patterns. Action layer, tool classes and record standards added as §8. |
| 2 Aug 2026 | Verification pass against actual repo/infra state (§8, §12, §13 were written prospectively as part of the pivot and had not been checked against reality before commit). No branch, gateway, hash-chained record, reference-numbering scheme, or second Supabase project exists — `main` is the only environment and runs directly against the live production schema (`ldimninnjlvxozubheib`). Atlas Robotics is already a real deal-room member, not excluded from one. tsc (64) and bundle (0.88 MB gzip) confirmed current. "CURRENT STATE (verified 2 Aug 2026)" notes added inline to §8.1, §8.3, §8.4, §12 and §13 to distinguish present fact from prospective design intent — no rule text changed. |
| 3 Aug 2026 | §15 reconciled against this session's actual kept/cut decisions per §0's precedence rule (Foundation Document governs product; §15 is a convenience summary, not an independent source of truth). Team chat reclassified in scope, flagged for future rebuild. Directory/matching exclusion clarified to distinguish public discovery (excluded) from connection-request infrastructure (kept, core to deal-room creation). |
| 3 Aug 2026 | Added §17 (new numbered section, not folded into §7): `ai-router` Supabase Edge Function found live-serving the Ask AI panel on at least one real page, fabricating a non-existent feature in production, never audited for identity/auth. Flagged as highest-priority follow-up, full audit scoped for next session (Opus, step-0 only). |
| 3 Aug 2026 | `ai-router` audited and remediated same day (commits `ef32b6c`, `d825b43`, `9c4da33`; deployed through v9): `verify_jwt: true` + in-code `resolveUid()` closes the open-auth and forgeable-`user_id` gap (anon key explicitly tested and rejected); anti-fabrication guardrail added to every `task_type` and to `AIOperatorPanel.tsx`; deployed↔repo drift reconciled before the fix, as its own commit. §17 rewritten to record this as history rather than an open incident. Added a general §7.1 lesson: test whether the anon key itself passes any `verify_jwt`-style check. Corrected §10's provider-routing line, which had claimed enforcement that the audit proved does not exist. **DPA/sensitive-routing question (Foundation §16 Rule 16.1) explicitly left open** — counsel/product decision, not resolved by this pass. |
| 3 Aug 2026 | Deployed-edge-function inventory sweep (queued after the `ai-router` remediation above) found `match-investors` and `verify-investor` as fully-built, cron-scheduled, §15/§25-excluded features with zero repo trace — traced to a much larger finding of a never-fully-functional 5-tier verification / 23-badge system described sitewide. Added as new §19 (27 files, 5 commits `6ded0dd`..`e403023`; both crons unscheduled, 4 fixture rows deleted per product-owner authorization, 4 edge functions stubbed to `410 Gone`, 4 changelog entries corrected inline rather than rewritten). §19 records this as closed; the founder/investor pricing figure inconsistency found incidentally during the sweep ($49/mo vs. $19+$99/mo across different pages) is logged there as a separate open item, not resolved by this pass. |
| 5 Aug 2026 | Added §20 (new numbered section; prior §20 Amendment log renumbered to §21): documents-group migration recorded as CLOSED and PUSHED — `9398d03`..`c64e9cf`, 6 commits, verified live in production on all four post-push checks (v1 isolation, rebuilt-screen render + real write, `pack_v1`/`pack_api` isolation, gateway authorization matrix). First full vertical slice of the new architecture (token layer → primitives → authorization port → gateway functions → client rewire → DESIGN v2 presentation) proven end-to-end. No work in progress. §20.1 records the proven six-step sequence for the next group (deal-room-core) and points at the inline `§B — future migration group` comments left throughout the documents-group code as the traced worklist. §20.2 logs four known open items (session-injection test-tooling gap, orphaned `doc_list` function, detached-documents library bug, five-font-family coexistence cost) as non-blocking. |
