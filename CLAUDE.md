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
| `tsc` errors | 64 | Do not increase. If it drops, update this line and record why. |
| Client bundle | 0.88 MB gzip | Ceiling is 1 MB. |

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

> **CURRENT STATE (verified 2 Aug 2026):** does not exist in any form. Zero matches anywhere in the codebase or migration history for hash-chain terminology (`hash_chain`, `prev_hash`, predecessor-hash logic). Entirely prospective — Phase 1 of the build sequence, not started.

Append-only, hash-chained. Each entry carries its predecessor's hash. Entries record actor identity, actor type (human / agent / system), timestamp, object reference, action.

Cannot be retrofitted onto existing history. Build it from the first write.

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

**Provider routing is enforced in code, not by convention.** Current state: OpenAI direct only, `gpt-4o-mini` and `gpt-4o`. No DPA in place. OpenRouter key exists in secrets and is unwired.

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
- Social feed, team chat, referral programme, news aggregation
- Configurable workflow — templates with optional steps only
- Tokenisation
- Scraping of any kind

---

## 16. Amendment log

| Date | Change |
|---|---|
| 30 Jul 2026 | Rewritten for the pivot to closing infrastructure. §9 scoped to public surface only; DESIGN.md now governs the application. Prior §35–§55 consolidated into §7 as defect patterns. Action layer, tool classes and record standards added as §8. |
| 2 Aug 2026 | Verification pass against actual repo/infra state (§8, §12, §13 were written prospectively as part of the pivot and had not been checked against reality before commit). No branch, gateway, hash-chained record, reference-numbering scheme, or second Supabase project exists — `main` is the only environment and runs directly against the live production schema (`ldimninnjlvxozubheib`). Atlas Robotics is already a real deal-room member, not excluded from one. tsc (64) and bundle (0.88 MB gzip) confirmed current. "CURRENT STATE (verified 2 Aug 2026)" notes added inline to §8.1, §8.3, §8.4, §12 and §13 to distinguish present fact from prospective design intent — no rule text changed. |
