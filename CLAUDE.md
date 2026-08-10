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
- **Inside a `SECURITY DEFINER` function, `current_user` and `session_user` both report the function's OWNER, never the caller.** Only `current_setting('role', true)` reflects the role PostgREST switched to for the request. Probed directly to confirm (9 Aug 2026): with `set local role authenticated`, a `SECURITY DEFINER` function observes `current_user=postgres`, `session_user=postgres`, `current_setting('role')=authenticated`. A trigger guard that gated itself on `current_user <> 'authenticated'` therefore disabled itself for **every** caller including the one it was written to constrain — shipped and caught within minutes by re-running the adversarial probe that had passed before, not by reading the function. Never use `current_user` for a caller-role check inside a `SECURITY DEFINER` function.
- **A `BEFORE UPDATE` trigger written to column-scope one RLS policy will also fire for service-role and `SECURITY DEFINER` writers, which that policy never governed.** Same 9 Aug 2026 incident: a guard whose bypass condition was `auth.uid()`-derived (`is_startup_founder`) rejected all nine service-role `deal_rooms` writers and `finalize_deal_close()`, blocking stage advance, term-sheet response, pass-deal and deal closing in production. A trigger's scope is every writer of the table; an RLS policy's scope is one role. When adding a trigger to constrain a policy, gate it explicitly on the role that policy admits, and test the privileged paths — not only the path being constrained.
- **New `SECURITY DEFINER` functions inherit `EXECUTE TO PUBLIC` by default.** Every `pack_api` function requires an explicit `REVOKE EXECUTE FROM PUBLIC` and `GRANT` to `service_role`, verified live with an `anon` call, not assumed because every other function in the schema follows the convention. Convention is precisely what failed here — six `room_get_*` functions (9 Aug 2026, step 2c) were created without the revoke, and the omission was invisible until tested: `set local role anon` plus a real user's uuid as `p_uid` returned that user's actual room data (`p_uid` is caller-supplied, never derived from `auth.uid()` — see the §7.1 identity-parameter rule — so the only thing standing between an anonymous caller and real data was the grant). Caught by the adversarial matrix itself, fixed the same session, re-verified live that `authenticated` now gets a genuine `permission denied for function` error. Check every new `pack_api` function's grants against `information_schema.role_routine_grants` before considering it done, not after something else surfaces the gap.
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
- **Checking the error is not sufficient — PostgREST returns no error for a 0-row `UPDATE`.** An `UPDATE` rejected by RLS (no row matched the `USING` clause) is indistinguishable at the client from an `UPDATE` that legitimately matched zero rows for an unrelated reason: `if (error) throw error` passes in both cases. Found live on `deal_rooms` during the deal-room-core step-0 audit (5 Aug 2026): `app.investor.analysis.tsx`'s `handleSaveMemo` showed `toast.success("Memo saved to deal room")` on every investor click while the row genuinely never changed, because no RLS write policy existed for investors on that table at all. Verified live in a rolled-back transaction: investor `UPDATE` affected 0 rows, the identical `UPDATE` as the room's founder affected 1. Every gateway write function must return an affected-row count, and the client must treat 0 as failure, not silently render the success path.
- **A single RLS `UPDATE` policy grants the whole row, never specific columns.** There is no native column-scoped `UPDATE` policy in Postgres — `USING`/`WITH CHECK` gate which rows are reachable, not which columns of a reachable row may change. Found live while fixing the defect above: a policy written to let an investor update only `investor_memo`/`memo_generated_at` on `deal_rooms` also silently granted them `workflow_stage`, `funding_ask`, and every other column on the same row, because the policy had no column predicate — caught before merge by testing a non-memo column, not by reading the policy. The actual column restriction requires a `BEFORE UPDATE` trigger comparing `NEW`/`OLD` on every column outside the intended allow-list and raising if any differ (see `pack_api.enforce_deal_rooms_investor_memo_only()`, migration `20260809000000`). Any future column-scoped write grant needs the same two-part shape — policy for row reachability, trigger for column scope — not the policy alone.
- `investor_profiles.id` (profile PK) is **not** `investor_profiles.user_id` (= `auth.uid()`). Never conflate.
- Do not hand-roll workflow transitions across an enum. The prior codebase ended with two conflicting stage vocabularies and a live constraint violation.
- **A table can carry two independently-written "stage" columns that look interchangeable but are not.** `deal_rooms.status` and `deal_rooms.workflow_stage` both read as lifecycle state, but only `status` is real: it is guarded by an immutable-once-closed trigger (`enforce_deal_room_close_guard`) and can only reach `'closed'` through `finalize_deal_close()`, which requires both parties' recorded mutual confirmation (`deal_room_close.investor_confirmed`/`founder_confirmed`). `workflow_stage` is written directly by a separate, unguarded, single-party-approvable path (`useStageTransition.ts`'s `approveTransition`) with no mutual-confirmation requirement and no trigger. A step-0 audit's first read of a room with `workflow_stage='closed'`, `status='active'` concluded `status` was stale and wrong; deeper tracing (the trigger, the RPC, `deal_room_close`'s empty confirmation row on that exact room) showed `status` was correct and `workflow_stage` was the stale/separate signal — the opposite conclusion. **Before trusting which of two same-shaped columns is authoritative, trace every trigger and RPC that writes either one, not just which UI reads which.**
- **`status` and `workflow_stage` are NOT two vocabularies for the same concept — do not reconcile them by making one read the other.** `status` is the trigger-protected, mutually-confirmed, authoritative close state with 18 dependent RLS policies (via `rls_private.dr_is_open`). `workflow_stage` is an unguarded progress indicator. They answer different questions and a "fix" that points one at the other — in either direction — breaks the close mechanism or the progress display. This was proposed once (8 Aug 2026), verified wrong before it was applied, and is recorded here so it is not re-proposed. Any future change to either column starts from the premise that both are legitimate and separately owned; the open question is naming and constraint, not unification.

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

**Step-0 audit run 5 Aug 2026 (Opus); one live defect fixed same session (8 Aug 2026), a second finding overturned on deeper trace, three decisions still open before authorization-port work begins:**

- **Fixed, live, verified:** `deal_rooms` had exactly one write policy (`deal_rooms_founder_manage`, founder-only). Four investor-facing UI surfaces attempted writes anyway; all four silently affected 0 rows while the UI reported success — see the new §7.4 entry. Product decision: investors may write `investor_memo`/`memo_generated_at` only. Migration `20260809000000_deal_rooms_investor_memo_write_and_stage_fix.sql` adds a row-scoped RLS policy (`investor_user_id` AND membership, both required — `investor_user_id` alone was found to be a second, RLS-unenforced identity path) plus a `BEFORE UPDATE` trigger enforcing the column allow-list, since the policy alone was found live to grant the full row (see the new §7.4 entry on this exact failure, caught before being left in place). `DealTermsCard.tsx` and `DDWorkstation.tsx`'s write controls were checked and found already gated on `isFounder` — no investor-facing control existed to remove there. **Not fixed, flagged instead:** `useStageTransition.ts`'s `approveTransition` writes `workflow_stage` and is intentionally bidirectional (investor auto-approves `due_diligence → term_sheet` with no founder sign-off) — it was already silently broken by the same 0-row defect before this session, and remains blocked after this fix, now via the new trigger's exception instead of a silent no-op. Investor-side stage approval is a real, currently-broken product flow that this migration does not restore — **needs its own authorization decision before the authorization-port step**, not assumed fixed by this write-up.
- **Overturned, not applied:** the original audit read `pack_api.authz_dr_is_open` (tests `status`) against a room with `workflow_stage='closed'`, `status='active'`, and concluded `status` was the stale field. Deeper trace (this session) found the opposite: `status` is the real, trigger-guarded (`enforce_deal_room_close_guard`, immutable once `'closed'`), mutual-confirmation-gated (`finalize_deal_close()`, requires `deal_room_close.investor_confirmed` AND `founder_confirmed`) close state — and 18 separate RLS policies on other tables already depend on the equivalent `rls_private.dr_is_open`, unchanged, alongside it. `workflow_stage` is written by a different, unguarded, single-party path (`useStageTransition.ts`) with no relation to the real close mechanism. Changing `authz_dr_is_open` to test `workflow_stage` would have desynchronized it from the 18-policy-deep `dr_is_open` twin and broken real deal closing. **Left unchanged.** See the new §7.4 entry — before trusting which of two same-shaped "stage" columns is authoritative, trace every trigger and RPC that writes either one, not just which UI reads which.
- **Fixed, live, verified (9 Aug 2026, migration `20260809020000`):** `sync_deal_room_profile_disclosure()`'s unlock set was missing `due_diligence` and `closing` — the exact two stages `useStageTransition.ts`'s `STAGE_ORDER` advances into after `qa`/`term_sheet`. Live proof before the fix: advancing a room `qa → due_diligence` deleted its `deal_room_profile_disclosures` row, silently revoking the investor's access to founder team PII (and the founder's to the investor's) on forward progress — advancing the deal *removed* access rather than growing it. Traced every dependent before applying, per the new standing rule below: three RLS policies (`team_member_details_unlocked_room_member`, `investor_team_member_details_unlocked_founder`, `deal_room_profile_disclosures_member_read`) plus one RPC not previously identified in the original audit (`get_investor_profile_in_room`, widens automatically, no separate allow-list) all key off this table. `MutualDisclosure.tsx` was found to hold its own hardcoded copy of the identical five-value list for UI-only gating (`enabled: unlocked && ...` on five queries) — fixing only the DB trigger would have left those queries disabled for the newly-unlocked stages, making the fix invisible; updated in the same commit. Verified live on the fixture room: `qa`→1, `due_diligence`→1 (was 0), `closing`→1 (was 0), `information_vault`→0 (unchanged, deliberately still locked), `nda_signed`→0 (unchanged). `tsc` unchanged at 59.
- **Step 2a — authorization port: COMPLETE, zero new code, zero semantic change (9 Aug 2026).** All nine `authz_*` primitives this group needs were already ported in `9398d03`. Re-verified live against the RLS predicates they replace rather than assumed: `authz_is_deal_room_member` 18/18 agreement across every user × room pair including null identity; `authz_is_startup_founder` and `authz_founder_has_permission` 10/10 across every user × startup pair. The instruction to "resist improving anything during the port" was the right call — §1a of the step-2 trace found these primitives are load-bearing for **58 RLS policies across 40 tables** (the documents group touched ~4), so any semantic drift here propagates to QA, messaging, meetings, NDAs, term sheets and PII disclosure simultaneously.
- **Step 2b — lawyer scope narrowed: DELIBERATE BEHAVIOUR CHANGE, not a faithful port (9 Aug 2026, migrations `20260809030000` + `20260809040000`).** `LawyerRoomView.tsx` documents the room-native lawyer's scope as "deal summary, term sheet area, the Investment Terms meeting slot, and its records. Nothing else" — but that was enforced **only in the client**. Of 58 membership-based RLS policies, exactly 3 discriminated on `role` (two correctly scoping the lawyer to `stage_slug='investment_terms'` — the precedent this follows); the other 55 treated a lawyer as a full principal. Verified live as `test-lawyer@` before the change: **10 `deal_room_qa` rows including real diligence content** ("What is your current monthly recurring revenue?"), 6 `dd_categories`, 8 `dd_checklist_items`, 1 document, 1 `team_members` row — none of it ever rendered by `LawyerRoomView`. New primitive `pack_api.authz_is_room_lawyer(uid, room)` (scoped **per room** — a lawyer in room A who is a principal in room B is narrowed only in A, verified live), appended as a single exclusion term to 13 policies across 8 tables; every policy's existing predicate kept verbatim. After: lawyer reads QA 0, diligence 0/0, documents 0, team PII 0, and is blocked from inserting Q&A — while retaining deal summary, members, agreements, NDAs, `investment_terms` meetings, and **their own uploaded documents** (`documents_own` deliberately not narrowed, since a lawyer must still work with closing documents they upload). Founder, investor, non-member, anon and service-role paths all verified unchanged. This closes a real authorization gap; it is recorded as a behaviour change so nobody later "restores" the old breadth thinking it was intentional.
- **Standing rule, added 9 Aug 2026 after two incidents in one session (see §7.2):** before adding or altering any trigger, trace every dependent — every other trigger on the same table, every RLS policy reading the table it writes to, every RPC/function referencing that table, every client-side call site — and report the trace before applying. Two consecutive prior instructions in this session skipped that trace: one broke all nine service-role `deal_rooms` writers and `finalize_deal_close()` in production for roughly 40 minutes: the other nearly shipped a guard that was silently disabled for everyone. This fix's own trace caught a real fourth dependent (`get_investor_profile_in_room`) and a client-side mirror (`MutualDisclosure.tsx`) that the original step-0 audit had not surfaced.
- **Interim gap, open between step 2b and step 2c — lawyer narrowing is one-directional.** Step 2b (above) enforces the lawyer's closing-only scope at RLS, which governs the client path only. It does **not** cover the 18 service-role authz checks in `src/lib` (`dd-fn.ts`, `doc-request-fn.ts`, etc.) — those check `deal_room_members` membership only, with no role discrimination, and bypass RLS entirely by running as the service role. **A lawyer calling those server functions today is still treated as a full principal.** Close condition: step 2c's gateway functions must carry the same `authz_is_room_lawyer` distinction into every read they authorize, not just the RLS-governed client queries. Until 2c lands, do not treat the lawyer boundary as closed — it blocks one path (direct client reads) and not the other (server-function calls).
- **Open, blocking the authorization-port step:**
  1. Reconciling `status` vs. `workflow_stage` as two independently-written lifecycle signals — a product decision, not a code fix. Do not make one read the other (§7.4).
  2. ~~The org-code allocation scheme for reference numbering~~ — **built 9 Aug 2026, see step 2d below.**
  3. **(b) Vocabulary collapse.** `workflow_stage`'s CHECK constraint currently permits nine values across two overlapping vocabularies with synonym pairs (`diligence`/`due_diligence`, `initial_review`/`qa`) that read as interchangeable but are independently reachable. Collapse to the single sequence actually used by `useStageTransition.ts`'s `STAGE_ORDER`, tighten the CHECK constraint, and bring `deal-room-workflow-fn.ts`'s `WorkflowStage` TypeScript type in line with it so the existing `DB_ALLOWED_WORKFLOW_STAGES` stopgap (itself a comment-documented workaround for this exact mismatch) can be deleted rather than maintained.
  4. **(c) Rename and scope `workflow_stage` correctly; `closed` does not belong in it.** Closure is `status`'s alone (§7.4 — do not reconcile by pointing one column at the other). Rename `workflow_stage` → `progress_stage` (or similar) and remove `'closed'` from its permitted values entirely.
  5. **(c, product decision — now answered, not yet built):** declines are **not** `workflow_stage='closed'`. Per Foundation Document §11.1, a raise terminates *Closed* or *Declined*, and *Declined* requires a recorded reason surfaced to the founder. `passDeal` (`deal-room-fn.ts:588`) currently writes `workflow_stage: "closed"` with no reason captured and no distinction from a genuinely closed deal — this conflates the two outcomes CLAUDE.md §7.4's `status`/`workflow_stage` entry already flags as a defect. A decline path with a mandatory reason does not exist today and must be built alongside (c), not deferred further.
  6. **Consolidate duplicate implementations.** `deal-room-fn.ts` and `deal-room-workflow-fn.ts` are near-duplicate implementations of the same stage-transition operations — writers 3/6 (`data.to_stage` advance) and 5/8 (`term_sheet` accepted → `closed`) in the step-0 audit's writer table are the same operation implemented twice, independently. Consolidate into one during the deal-room-core group rather than porting both forward.
- **Step 2c — column-scoped read functions: COMPLETE (9 Aug 2026, migration `20260809050000`).** Column contract traced from real consumers (an Explore-agent sweep of 27 files, spot-checked directly against two of its claims before trusting it) rather than assumed from schema. Six functions, not four — `investor_memo`/`memo_generated_at` and `pitch_deck_url`/`product_video_url`/`product_images` turned out not to fit any of the four named buckets (investor-private notes never read by any founder-facing file; room media unrelated to deal economics) and got their own functions rather than being folded in under a wrong label. `pack_api.room_get_identity`, `room_get_deal_terms`, `room_get_term_sheet`, `room_get_workflow_state`, `room_get_media`, `room_get_investor_memo` — each independently authorized via `authz_is_deal_room_member`. Zero-consumer columns (13 of them, listed in the migration) excluded from every function's return set rather than speculatively included. Lawyer scoping carries step 2b's precedent forward exactly, not re-derived: deal summary and term sheet stay in scope (`LawyerRoomView.tsx` renders both); `workflow_state`'s `qa_completed_at`/`qa_completed_by` and all of `room_media` are excluded, matching the `deal_room_qa`/`documents_room_read` narrowing already applied. `room_get_investor_memo` is self-scoped to `investor_user_id = caller` — verified live that a genuine co-member founder gets `forbidden`, not filtered fields. **This closes the interim gap logged above**: the lawyer distinction now applies to a server-callable surface, not only RLS.
  - **Live regression found and fixed in the same step, before verification was considered complete:** the six new functions were created with Postgres's default `EXECUTE ... TO PUBLIC` grant — every other `pack_api` function (`doc_insert`, `doc_list_room`, `pack_get`, all `authz_*`, both 2b additions) is explicitly scoped to `postgres`/`service_role` only, and that revoke step was missed here. Caught by the adversarial matrix itself: `set local role anon` plus a real investor's UUID as `p_uid` returned that investor's real room data — the exact identity-spoofing shape CLAUDE.md §7.1 already warns about (`p_uid` is caller-supplied, never derived from `auth.uid()`; the accepted mitigation is that only the trusted service-role layer can reach the function at all). Fixed by revoking `PUBLIC` and granting only `service_role`/`postgres`, matching the established pattern exactly; re-verified live post-fix that `authenticated` role now gets a real `permission denied for function` error, not data.
  - Full adversarial matrix per function (founder / investor / lawyer / non-member / anon / null-uid / wrong-room / cross-room) run live; `room_get_workflow_state`'s lawyer differential proven with real non-null data (same user: `qa_completed_at` populated in a room where they're a principal, `null` in a room where they're a lawyer), not just the empty-fixture case.
- **Step 2d — `reference_no` + schedule link: COMPLETE (9 Aug 2026, migration `20260809060000`).** Two prerequisites discovered mid-step, neither named in the instruction, both built as hard dependencies rather than deferred:
  - **Org-code allocator** (`pack_v1.next_org_code()` + `pack_v1.org_code_counter`, base-36, 6 characters, dedicated singleton counter distinct from `reference_counter`) — `pack_v1.next_reference()` requires an org code as input and none existed anywhere in the schema; without this, no reference number could be minted at all. Design matches what was reviewed earlier in this session.
  - **A schedule entity already exists and was missed by the original step-0 audit**: `pack_v1.schedule` (one published row, technology/seed v1, from the Phase 1 foundation work, commit `cfd20f5`) — the audit's "no schedule entity exists" finding was checked only against `public` schema tables. `deal_rooms.schedule_id` now references it directly; `startups.sector` is free text with no controlled-vocabulary mapping to `pack_v1.schedule.sector` yet, so the column resolves to the one published schedule today and will read `null` once a second, non-matching schedule exists — sector-to-schedule mapping is explicitly out of scope for this step, per instruction.
  - **Mechanism: a `BEFORE INSERT` trigger on `deal_rooms`** (`pack_api.deal_rooms_mint_reference()`), not application-level sequencing — a raw PostgREST `POST` (the `connection-request-fn.ts` service-role path) has no transaction boundary exposed to it that a separate mint call could share, so a trigger firing inside whatever transaction the INSERT itself is already in is the only mechanism that makes "both paths must migrate as a unit" hold without either call site changing its transaction handling. Verified live: both the client-insert shape (`app.deal-rooms.index.tsx`'s exact column list) and the service-role shape (`connection-request-fn.ts`'s exact column list) auto-mint correctly with zero application code changes. Three back-to-back inserts for the same startup produced three strictly sequential numbers (no gaps, no collisions). A forged `reference_no` supplied in the insert payload is silently overwritten by the mint — unforgeable by construction, verified live.
  - Backfill: 2 startups, 3 rooms, deterministic `created_at` order per §9.2. Check digit independently recomputed and matched for a backfilled row, not just trusted from the function.
  - `tsc` unaffected (59, unchanged) — no frontend files touched in 2c or 2d; both are additive database changes only.
- **Client rewire, Stage 1 — proving run: COMPLETE (10 Aug 2026).** Chosen consumer: `LawyerGate.tsx`'s `useLawyerGateState()` — narrowest real `deal_rooms` read (one column, `waived_legal_counsel`), not `useDealRoomContext.ts` (deliberately excluded — feeds most room surfaces, so a pattern flaw there fails broadly instead of narrowly). New module `src/lib/actions/deal-room-core.ts`, following `deal-room-documents.ts`'s established `defineAction`/`callAction` shape exactly — no direct-from-browser `supabase.rpc()` path exists, since `pack_api` is not exposed to PostgREST. Verified per role including the lawyer explicitly (term sheet is in their un-narrowed scope per step 2b): founder/investor/lawyer all resolve `waived_legal_counsel` identically; non-member gets the thrown `forbidden` `callAction` produces, functionally equivalent to the old silent-null contract for a case that should never be reached by a real user. Found and noted, not fixed: every gateway call appends a `pack_v1.record_entry` row (§8.3) — proving-run testing alone left one real committed entry in the fixture room's chain.
- **Client rewire, Stage 2 — the wide consumers: COMPLETE (10 Aug 2026).** Standing rule applied throughout: column contract traced from real reads/writes before touching any file, not from schema or the gateway functions' own signatures.
  - **Non-member throw-vs-null audit run first, before any rewiring** — a full sweep (Explore-agent trace, spot-checked directly against its two highest-severity claims) of all 27 Stage-2 target files found 10 single-row `.maybeSingle()`/`.single()` sites where a null/empty result is today a deliberate, silently-handled state (an early-return empty render, a fallback chain, a load-bearing default) that would instead surface as an uncaught thrown error under the gateway's `{ok:false,error:"forbidden"}` contract. Highest-severity, independently reconfirmed: `p.$slug.tsx`'s `getAccessLevel()`, called via a bare `.then()` with **no `.catch()`** — a thrown error would hang the public profile page's access-tier resolution rather than fail visibly. Fixed first, in isolation: added a `.catch()` defaulting to `"public"` (the function's own existing least-access fallback for every negative case, not an invented behavior), scoped to that one call site — `discovery_requests` reads in the same file untouched.
  - **`useDealRoomContext.ts` rewired** — `room` now assembles from `room_get_identity` + `room_get_workflow_state` (parallel) plus a direct `startups` read, replacing `select("*, startups(*)")`. `startups` is explicitly out of scope for this migration group (a different table; belongs to the profile/founder group) and was deliberately left as a direct read rather than blocking on a gateway function that doesn't exist yet. Two things verified before splitting one query into three: (1) no consumer depends on `room`/`startup` being read as one atomic snapshot — every downstream use takes a single scalar independently, never a value computed jointly across both objects; (2) the standalone `startups` read returns identical rows to the old nested join, per role including the lawyer (`startups_investor_read`'s `get_investor_startup_ids()` is membership-based and role-agnostic — (b)'s narrowing was never applied to `startups`, confirmed, not assumed). `forbidden` (genuine non-member) is caught and mapped to `null`, preserving the exact contract every `(room as any)?.x` consumer already expects; any other error now feeds the layout's existing `accessError` fail-closed path (`memberError || ndaError || roomError`) — the same mechanism `memberRow` already used correctly, not a new one.
    - **Real regression found and fixed before considering this file done:** the initial rewrite broke `tsc` from 59→98 errors, entirely in 30+ files never touched directly — an object-literal return type inference issue, not a logic bug. The old query's implicit-`any` Supabase result is what every downstream `(room as any)?.x` cast across the whole app relies on; my explicit merged-object return was inferred far more strictly, and TypeScript's stricter typing surfaced as `unknown`/wrong-shape errors in unrelated consumer files. Fixed with an explicit `Promise<any>` return type on `queryFn`, matching the old call's actual (loose) contract — tightening 26 downstream files' typing was never in scope for this migration and won't be smuggled in as a side effect. Verified with a full error-SET diff against `main` (not count alone, per §20.3): **zero difference**.
  - **Atomicity check (report-only, per explicit instruction): closed, no combined function needed.** `isClosed`/`closedAt` (from `room_get_identity`'s `status`/`closed_at`) and `currentStage` (from `room_get_workflow_state`'s `workflow_stage`) are now two separate reads. Traced every consumer: zero overlap — `isClosed` is read only by `ClosingPipeline.tsx`/`ExitDeal.tsx`, `currentStage` only by `DealRoomWorkflow.tsx`, no file destructures both, `DealRoomLayout` itself doesn't read either. No derived value is computed jointly across the two. Also noted: `status` and `workflow_stage` are already independently-written, unsynchronized columns on the same row (§7.4) — a moment of read-skew between two separate gateway calls is strictly less severe than the pre-existing permanent skew between the columns themselves.
  - **`DealTermsCard.tsx` rewired** onto `room_get_deal_terms` — 1:1 column match, no gap. Read only; the `.update()` write stays direct, since no gateway write function exists yet.
  - **`DDWorkstation.tsx` rewired** onto `room_get_media` (the one function fully `forbidden` for the lawyer, not field-nulled). **Found dead: the component has zero import sites anywhere in `src/routes`** — not reachable from any route as of this rewire. Rewired anyway for correctness in case it's reactivated, flagged rather than silently left stale or silently skipped (§7.5-shaped finding — a dead-code component hiding behind no route reference at all, the inverse of the documented "hides behind an otherwise-clean route file" pattern).
  - **`app.deal-rooms.$id.qa.tsx` and `.documents.tsx`'s `drStageData`/`qa-room-status` rewired** onto `room_get_workflow_state`. `qa.tsx` only mounts inside `DealRoomCtx`, which the layout already intercepts for the lawyer (renders `LawyerRoomView` instead), so the lawyer-null on `qa_completed_at`/`qa_completed_by` is unreachable here in practice — handled anyway for defense in depth. `documents.tsx`'s site was one of the traced `§B — future migration group: deal_rooms read (deal-room-core group)` markers from the documents-group work. Added `staleTime: 60_000` to `qa.tsx`'s query (previously unset, React Query default 0 — refetching, and thus re-appending a record entry, on every tab remount; the record-volume finding from the pre-Stage-2 report).
  - **`TermClosingPanel.tsx`'s `lawyerPresent` — verified, deliberately left unchanged, no code touched.** Traced the real authorization boundary before treating this as a UI concern: `uploadAgreement()`'s actual enforcement is `agreement-fn.ts`'s own independent `designatedUploader()` (a separate raw service-role REST read, not routed through this client query, not part of the `pack_api`/`defineAction` migration at all) — `TermClosingPanel.tsx`'s `lawyerPresent` only decides which button label to render. No `room_get_*` function covers `deal_room_members` existence checks (all six are `deal_rooms` column reads). RLS (`drm_room_members_read`) is unchanged by anything in this session. Verified live per role (founder/investor/lawyer/non-member) that the query resolves identically before and after — trivially, since nothing changed, but confirmed rather than assumed: all three genuine members see `lawyer_present = true`, non-member sees `false`. Same disposition for `DocRequestsTab.tsx`'s `founderMember` fallback (counterparty-identity read, RLS unaffected, left direct) and `documents.tsx`'s three fire-and-forget notification-recipient `deal_room_members` list reads.
  - **`app.deal-rooms.$id.nda.tsx` left unrewired, deliberately.** This route is the one place `DealRoomLayout` explicitly renders *without* `DealRoomCtx`, specifically so an unsigned member can reach it and sign at all, per the layout's own comment. Whether `deal_room_members` rows can exist for a caller who hasn't yet signed the NDA (i.e., whether `room_get_identity`'s `authz_is_deal_room_member` check would even succeed on this exact route, for this exact caller) was not conclusively provable from current fixture data — every existing row happens to already have a signature — so this was flagged rather than guessed. Left as a direct read pending that confirmation, not migrated speculatively onto a function that might reject the exact caller this route exists to unblock.
  - **Multi-room list queries — no matching function, correctly out of scope.** `app.deal-rooms.index.tsx`'s room list (`.eq("startup_id",...)`, no `.single()`), `useDealFlowProgress.ts`, `useRaiseProgress.ts` all query across *multiple* rooms — none of the six `room_get_*` functions fit (all six are single-room reads). These need a different, not-yet-built list-shaped function; left as direct reads, not forced onto a mismatched primitive.
  - **Full sweep for missed single-room sites, at the end**: confirmed no `.eq("id", dealRoomId)`-shaped `deal_rooms` read remains outside a `.delete()` write (unrelated, no gateway write function exists).
  - `tsc`: full error-SET diff against `main` after every step, zero difference throughout, 59/59 final.
  - Adversarial matrix re-run at the end across all four rewired functions (identity/workflow_state/deal_terms/media) × role: matches design exactly, including `media`'s lawyer-only exclusion.

Follow the exact sequence proven on the documents group, in order, each its own reviewed step:

1. **Content-trace audit before trusting any file/table grouping** — a table or file can look like it belongs to one feature by name and still be dual-role or misclassified; verify by reading actual usage, not by import graph or naming alone (this is the general form of the lesson CLAUDE.md §7.5 already records).
2. **Port and adversarially verify authorization primitives before building anything on them** — the same discipline as the `9398d03` `authz_*` port: trace each primitive against the exact current RLS predicate it replaces, run the full member/non-member/wrong-scope/null matrix live, and document the RLS-predicate-to-function mapping before any gateway data function is written against it.
3. **Build gateway data functions, verify against real UI write/read contracts, not just RLS/schema** — the Stage-1/Stage-2 proving runs on the documents group caught real column-coverage gaps this way (`priority`, `for_user_id`, `file_size`, the founder "share link" path) that a schema-only or RLS-only read would have missed. Trace every actual `.select()`/`.insert()`/`.update()` call site's real column list before considering a data function complete.
4. **Client rewire, verify functional equivalence old-vs-new** — old RLS-governed query vs. new gateway output, field-by-field, same fixtures. This caught a real semantic divergence on the documents group (`is distinct from` vs. SQL `<>` on a nullable column) that the adversarial matrix alone did not.
5. **Empty states and error semantics, as their own step** — see §20.4. Not folded into the client rewire and not left to the presentation pass; specced and built between the two.
6. **DESIGN v2 presentation rebuild, as its own reviewable step** — do not fold presentation into the data-layer rewire step; keep it a separate, explicitly-reviewed pass over already-proven primitives, as done for the documents group.
7. **Push only after all of the above is reviewed as one unit, against the §20.3 exit checklist** — the documents-group precedent: six commits, one push, after every stage was individually approved.

### 20.2 Known open items — not blocking, logged for whenever relevant

- **`useAuth()` session-injection gap** blocks real-browser-render testing in production without solving hCaptcha. This affects test tooling only, not shipped code — the underlying gateway authorization was independently verified live against production by calling the `pack_api` functions directly with real, freshly-minted tokens. The same gap exists in the codebase's own previously-trusted Playwright pattern (`auth-and-portfolio.spec.ts`), confirmed by running it directly against this exact scenario — it is pre-existing, not introduced by this work.
- **Orphaned `doc_list` DB function** (superseded by the three named `doc_list_room`/`doc_list_library`/`doc_list_investor` reads, no caller) — left in place per §4 (harmless, service-role-only, unexposed); flagged for a future cleanup pass rather than dropped silently.
- **Detached-documents library bug** (pre-existing, faithfully preserved during the migration, not fixed) — a document detached from a deal room (`deal_room_id` set to `NULL`) becomes permanently invisible to the "add from library" picker, because the picker's `<>` comparison excludes `NULL` rows, matching the original PostgREST query's behaviour exactly. Needs a product decision on whether detached docs should be re-addable from the library before anyone touches this comparison. See the `project-detached-docs-library-bug` memory for the full trace.
- **Font-loading cost during the v1/v2 coexistence period**: five font families now load simultaneously — v1's DM Sans and Syne, plus v2's Archivo, Source Serif 4 and JetBrains Mono. Self-hosted, no third-party requests, but still a real payload cost worth revisiting once v1 fully retires and the coexistence period ends.

### 20.3 Standard exit checklist per migration group

A migration group is complete only when all of the following are true. This replaces per-group improvisation — do not renegotiate this list on the next group.

- **Content-trace audit done before trusting any file/table grouping.** This has changed the plan on every group so far. Treat as mandatory, not optional — see §20.1 step 1 and the general §7.5 lesson it extends.
- **Column contract verified against real UI reads/writes, not just RLS and schema.** §20.1 step 3's lesson — this caught silent data loss on the documents group (`priority`, `for_user_id`, `file_size`, the founder share-link path).
- **Authorization ported and adversarially verified, live, not inferred:** correct user, wrong user, non-member, wrong-room, closed-room, and null identity, each actually run against the deployed function — not read from the code and assumed to hold.
- **Functional equivalence proven old-vs-new, field by field.** Separate from and not covered by the adversarial matrix — this is what caught the `is distinct from` vs. SQL `<>` NULL divergence on the documents group. A passing adversarial matrix does not substitute for this check.
- **Empty states specced and built for every surface in the group** — see §20.4.
- **Error semantics defined for the group's failure modes** — see §20.4.
- **`tsc` at or below baseline, verified by error-set diff, not count.** Two different error sets of equal size is not a pass; the baseline count dropping is not proof nothing new was introduced. Diff the actual error list against the pre-group baseline.
- **Review gate passed before push.** No group pushes without an explicit review, same as the documents-group precedent in §20.

### 20.4 Empty states and error semantics as explicit steps

These are step 5 in the §20.1 sequence, between the client rewire (step 4) and the DESIGN v2 presentation rebuild (step 6). Not polish, not foldable into either neighboring step — they are the difference between a product that reads as six months old and one that reads as five years old.

**Empty states.** One per surface in the group. Each names what would appear and the one next action available from that empty state. No illustrations. Per DESIGN.md §7.3.

**Error semantics.** Each failure class in a group needs its own defined behaviour — retryable, not retryable, partially applied, or unknown — because each reads differently to the user and silently defaulting to one generic error message is itself a defect. Define behaviour explicitly for at least:

- Write failure after a user action
- Session expiry mid-action
- Concurrent edit conflict
- Third-party provider failure
- Upload interruption

**No optimistic UI on consequential actions.** A consequential action (anything Commit-class per Foundation Document §15.2 / CLAUDE.md §8.2) shows a pending state until the record confirms — never an optimistic success state that could be rolled back under the user.

### 20.5 V1 retirement condition

The codebase currently runs two design systems, five font families (§20.2), and two data-access paradigms (direct `supabase.from()` and the gateway) simultaneously. **This is correct during migration and must not become permanent.**

End condition, stated plainly: v1 tokens, v1 fonts (DM Sans, Syne), and the remaining direct `supabase.from()` paths are removed when the last migration group completes — not before, and not left in place after as a "just in case."

Until that point, **each group's DESIGN v2 rebuild is final, not interim.** Do not build a group's presentation layer twice under the assumption that a later cleanup pass will redo it — build it once, to the standard in §20.3/§20.4, and move on.

The five-font load cost logged in §20.2 is a tracked cost of the coexistence period, resolved at v1 retirement, not before. Do not attempt to prematurely optimize it mid-migration.

### 20.6 Reference numbering placement

Reference numbering (Foundation Document §9.1, CLAUDE.md §8.4) exists as a proven `pack_v1` primitive but sits on no user-facing table today. This means `ReferenceLine` — the signature element of the entire design system per DESIGN.md — currently renders nothing, everywhere, indefinitely, until this is addressed.

**Reference numbering lands with the deal-room-core group** (`deal_rooms`, `deal_room_members`), not later. Deal rooms are the first object a user would actually cite, which makes this group the natural landing point. Every subsequent migration group inherits reference numbering from this point forward — it is not re-derived or re-scoped per group after this.

### 20.7 Rollback procedure per group

Not yet needed for any group, which is exactly when to write the procedure — before the pressure of an in-flight incident forces improvisation.

For each migration group, before push, state and confirm as actually executable (not assumed):

- The commit range to revert
- Any schema state that would need to be reversed (new columns, new functions, new isolated-schema objects) and the exact statement or migration that reverses it
- Any `pack_api` function introduced by the group that would need to be dropped
- Confirmation that the stated rollback has been checked against the real commit range and schema state for that group, not written generically and assumed to apply

A rollback procedure that has not been checked against the actual group is a claim, not a procedure — see §6, claims are not evidence.

### 20.8 Migration progress tracking

Tracked so progress is measurable, not vibes.

**Baseline corrected 8 Aug 2026.** The original 226 figure did not reconcile against any reproducible count during the deal-room-core step-0 audit — it matched neither total sites, distinct files, nor a client-only count. Replaced with the audit's directly-reproduced figures, counting basis stated explicitly so future deltas measure the same thing:

| Metric | Count | Basis |
|---|---|---|
| Total direct `.from()` sites, all tables, `frontend/src/` | 662 | `grep -rEno` for a quoted `.from(...)` call, across `src/` |
| — client-side (`routes`/`components`/`hooks`) | 530 | same grep, scoped to those three directories |
| — server-side (`lib`/`server`) | 132 | same grep, scoped to those two directories |
| Distinct files containing any `.from()` | 129 | `grep -rl` file count |
| `pack_api` gateway call sites (post-documents-group) | 48 | grep for `pack_api.`/`.rpc("doc_` |
| `// §B — future migration group` comments | 13 (4 tagged deal-room-core) | literal comment grep |

At the close of each migration group, update this table with the same six rows, re-measured the same way — not a new counting method.

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
| 8 Aug 2026 | Closed four gaps in §20 that would otherwise be renegotiated per migration group, documentation only, no code touched. §20.1's six-step sequence became seven steps: inserted "empty states and error semantics" as its own step (new step 5) between client rewire and DESIGN v2 presentation, and the final push step now points at the new §20.3 checklist. Added §20.3 (standard exit checklist per migration group — codifies content-trace audit, column-contract verification, live adversarial authorization matrix, field-by-field functional equivalence, empty states, error semantics, `tsc` error-set diff, and review gate as mandatory, not improvised, per group). Added §20.4 (empty states and error semantics as explicit steps, including the five named failure classes and the no-optimistic-UI-on-Commit-class-actions rule). Added §20.5 (v1 retirement condition: two design systems/five fonts/two data-access paradigms are correct only during migration, removed when the last group completes; each group's DESIGN v2 rebuild is final, not interim — no double-building). Added §20.6 (reference numbering, proven in `pack_v1` per §8.4 but on no user-facing table today, explicitly slotted into the deal-room-core group rather than left open-ended — `ReferenceLine` currently renders nothing anywhere until this lands). Added §20.7 (rollback procedure required per group before push: commit range, schema reversal, `pack_api` function drops, confirmed executable against the actual group, not written generically). Added §20.8 (migration progress tracking: starting figure 226 direct `supabase.from()` call sites from the step-0 audit, minus the documents group's migrated sites; updated at each group's close alongside the remaining `§B — future migration group` comment count). |
