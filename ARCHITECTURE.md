# ARCHITECTURE.md

**Living document. Not a frozen spec.**

This describes the system as it actually is on **14 Sep 2026**, verified against the
live database, the built artifact, and the current tree — not as it is intended to
become. Where something is prospective, unbuilt, or contradictory, it says so and says
why. That honesty is the point: a reader who trusts a stale line here will build on it.

**Precedence.** This file does not govern anything. `CLAUDE.md` (process, defect
patterns) and the Foundation Document (product) remain authoritative; `CLAUDE.md §0`
sets the order. If this file and `CLAUDE.md` disagree, `CLAUDE.md` wins and this file
is stale — fix it.

**When you change the system, change this file in the same commit.** A line that has
drifted is worse than a line that was never written: it reads as checked. Every
numeric claim below was measured at the date shown; re-measure rather than assume.

---

## 1. What this is

Closing infrastructure for private capital — a system of record for a transaction
between a founder and an investor, from first contact to close. It is not a
marketplace, directory, matching service, or scoring engine; those are excluded by
product decision, permanently (`CLAUDE.md §15`).

Two surfaces, one repository:

| Surface | Path | What it is |
|---|---|---|
| **Authenticated app** | `frontend/src/routes/app.*` | The product. Deal rooms, documents, diligence, profiles. |
| **Public marketing site** | `frontend/src/routes/` (root-level) | lengdon.com. Also `lengdon-public-new/` — a *separate git repo* nested in this tree, its own lineage (`CLAUDE.md §20.16`). |

---

## 2. Stack

Measured from `frontend/package.json`, 14 Sep 2026.

| Layer | Choice | Version |
|---|---|---|
| UI | React | 19.2 |
| Routing / SSR | TanStack Router + Start | 1.168 / 1.167 |
| Server state | TanStack Query | 5.83 |
| Build | Vite | 7.3 |
| Styling | Tailwind | 4.2 |
| Language | TypeScript | 5.8 |
| Database / auth | Supabase (PostgreSQL) | client 2.108 |
| Hosting | Cloudflare Pages + Workers | — |
| Validation | Zod | 3.24 |

**One environment.** `main` runs directly against the live production Supabase project
(`ldimninnjlvxozubheib`). There is no staging project and no second database. Every
query you write in development hits production data. (`CLAUDE.md §12`)

**Deploys are git-integrated.** Push to deploy. **Never run `npm run deploy`.**

**Build pipeline.** `vite build` → `postbuild` runs `scripts/patch-wrangler.mjs`, which
injects the CF env shim, in-worker redirects, security headers, and CSP; then
`scripts/check-action-split.mjs` (see §4) which can **fail the build**. CI
(`.github/workflows/ci.yml`) runs typecheck, build, and `npm audit`.

Current metrics (14 Sep 2026): `tsc` **55 errors** (the tracked baseline — do not
increase), worker **0.78 MB gzip** (ceiling 1 MB), **188** route files, **12** edge
functions.

---

## 3. Data flow

Two paths coexist. This is deliberate and mid-migration, not an accident.

```
                    ┌─────────────────────────────────────────┐
  Browser           │  React route / component                │
                    └───────────────┬─────────────────────────┘
                                    │
            ┌───────────────────────┴────────────────────────┐
            │                                                │
   PATH A (target)                                  PATH B (legacy)
   callAction(...)                                  supabase.from(...)
            │                                                │
   top-level createServerFn                          direct from browser
            │                                                │
   ┌────────▼─────────┐                                      │
   │  runAction()     │  ← the single chokepoint             │
   │  1 identity      │                                      │
   │  2 validate      │                                      │
   │  3 agent/commit  │                                      │
   │  4 authorize     │                                      │
   │  5 handle        │                                      │
   │  6 record append │                                      │
   └────────┬─────────┘                                      │
            │ service_role (bypasses RLS)                    │ anon/authenticated
            ▼                                                ▼
   ┌──────────────────┐                            ┌──────────────────┐
   │ pack_api.*       │                            │  public.* tables │
   │ (39 functions)   │───────────────────────────▶│  RLS enforced    │
   └──────────────────┘                            └──────────────────┘
```

**Path A — the action layer (target architecture).** The client never touches the
database. `callAction` → a top-level `createServerFn` → `runAction` → a `pack_api`
SQL function running as `service_role`. Authorization is enforced in code, in one
place. **25 actions** exist today.

**Path B — direct client queries (legacy).** **594** `.from(` call sites remain in
`frontend/src`. These are RLS-governed and genuinely safe *provided the policy is
right* — but authorization is spread across **256 policies**, which is not auditable by
a person. Migration is group-by-group (`CLAUDE.md §20.1`, `LCS_MIGRATION_PLAN.md`).

**Do not add new Path B code in a migrated area.** Adding an action is the default.

---

## 4. Why the action layer exists — and the bug that shaped it

`CLAUDE.md §8.1` gives the original reason: nearly every security incident in this
codebase came from authorization scattered across many policies and functions with no
chokepoint. One gateway is auditable; a hundred policies are not.

**§20.11 is why it looks the way it does, and this is the single most important
implementation detail in the codebase.**

`runAction` is a **plain async function**. Each action binds **its own top-level**
`createServerFn`. It must never be wrapped in a factory.

The reason, from the 11-day production outage it caused: the previous shape was
`defineAction(def)` which *returned* `createServerFn(...)`. TanStack Start's server-fn
transform is a **compile-time AST rewrite** that only recognises a statically
analysable, top-level `createServerFn(...).handler(...)`. A `createServerFn` returned
from inside a function body is invisible to it — no RPC stub is emitted, no server
registration happens, and **the entire handler is bundled into the client and executed
in the browser**, where the service-role key is correctly absent. Every gateway call
failed having made zero network requests, for 11.24 days, across all 25 actions.

It failed *closed* only by the accident that the service-role key is never shipped to
the client. Had that key been present for any other reason — as an OpenAI key once was
for eleven weeks (§19e) — the full handler, authorization included, would have run in
an attacker's browser with a service-role handle.

**Four mechanisms now hold the guarantee.** Two are structural, two are enforcement:

1. `ActionDef` requires `authorize` and `record` — **non-optional**, so an action
   omitting either does not type-check.
2. `serviceClient` is **not exported**; `ActionCtx` is constructed only inside
   `runAction`, so no action can obtain a service-role handle independently.
3. An **eslint rule** over `src/lib/actions/**` requires every `createServerFn().handler()`
   body to be a direct `runAction(def, data)` call — catches the wrong *shape* at author time.
4. **`scripts/check-action-split.mjs` fails the build** in both directions: every action
   routes through `runAction`, and zero `pack_api` handler bodies reach `dist/client`
   — catches a wrong *artifact* for any reason, including causes nobody anticipated.
   That last clause is the point: this bug was exactly such a cause.

> **The general lesson, worth more than the fix:** a design can be correct in the type
> system and silently not honoured by the build. Those are different failures. Verify
> the artifact, not the source.

**Tool classes (`CLAUDE.md §8.2`).** Every action declares one. `read` — an agent may
execute freely within the principal's permissions. `prepare` — produces a draft a human
must commit. `commit` — **an agent may never execute one, under any circumstance,
including explicit user instruction**. `runAction` step 3 enforces this before the
handler runs.

---

## 5. Authorization and RLS

**Three layers, none of which is a backstop for the others.**

1. **RLS on every table.** 139 public tables, **139 with RLS enabled, 0 without**,
   256 policies (live, 14 Sep 2026).
2. **`authz_*` primitives in `pack_api`.** Ported from the RLS predicates they mirror,
   adversarially verified against them. Load-bearing for 58 policies across 40 tables.
3. **In-code authorization inside `runAction`.** The real boundary for Path A.

**Service-role code bypasses RLS entirely. There is no database backstop.** Any
function running as `service_role` must be complete in its own authorization. This is
the single most repeated cause of incidents in this codebase.

**Rules that were learned expensively** (`CLAUDE.md §7.1`, §7.2):

- **Never trust an identity parameter.** A `user_id` in a request body is spoofable.
  Delete the parameter rather than validating it.
- **"A row exists matching these IDs" is not authorization.** It must be "the caller
  *is* the party in that row."
- **Membership is not role.** A room-scoped lawyer is a member. Seven `dd-fn.ts`
  functions authorized on bare membership and let a lawyer read diligence and trigger
  investor-facing AI analysis exactly like a principal (fixed, Build Step 0).
- **An RLS `UPDATE` policy grants the whole row**, never specific columns. Column
  scope requires a `BEFORE UPDATE` trigger comparing `NEW`/`OLD`.
- **A 0-row `UPDATE` returns no error.** PostgREST cannot distinguish "RLS rejected it"
  from "matched nothing." Every gateway write returns an affected-row count; the client
  treats 0 as failure.
- **New `SECURITY DEFINER` functions inherit `EXECUTE TO PUBLIC`.** Revoke explicitly
  and verify against `information_schema.role_routine_grants` — six functions once
  shipped without it and returned real user data to `anon`.
- **`SET search_path = public, pg_temp`** (pg_temp last), never `TO 'public'`.
- **Exposure is what you QUERY, not what you RENDER.** A `select(*)` behind a
  client-side visibility gate ships every column — that is §19f, 77 columns to every
  anonymous visitor for 70 days.

**Anon-reachability convention** (Build Step 2, and the current standard): a
`get_*_by_token` preview function **must** be anon-granted — the visitor has no session
when a join screen loads. An `accept_*` / `graduate_*` function **must not** be.

> Two legacy functions (`accept_lawyer_invite`, `accept_team_invite`) still carry an
> `anon` grant. Both were probed live against a genuinely valid token and both return
> `not_authenticated` from an in-body `auth.uid() is null` guard — defence-in-depth
> hygiene, not a live gap. Tracked for revocation.

---

## 6. The record — append-only hash chain

`pack_v1.record_entry`, one chain per scope. `append_record()` is the sole writer;
UPDATE and DELETE are blocked by trigger. The trigger is defence in depth — a superuser
can disable it, so **the hash chain itself, not the trigger, is the tamper evidence**.

```
entry_hash = sha256(prev_hash || canonical_json(payload))
```

Each entry records actor identity, actor type (`human` / `agent` / `system`),
timestamp, object reference, and action. **`runAction` step 6 appends one for every
action, reads included**, and a failed append fails the whole action — a records
incident is surfaced, never swallowed.

Canonicalisation is spec'd and versioned in
`supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md`. It is deliberately **not**
RFC 8785/JCS: number trailing zeros are **preserved** (`1.50` ≠ `1.5`), object keys are
recursively code-point sorted, array order is preserved, numbers are arbitrary-precision
decimals never floats. Changing it once real entries exist is a breaking, versioned
change requiring product-owner sign-off.

**Live state (14 Sep 2026): 337 entries across 8 chains, 9 Aug – 13 Sep, zero
unhashed, actor_type `human` only.** These are real gateway-call entries, not a
seeded fixture.

**Reference numbering** (`CLAUDE.md §8.4`): `{ORG}-{TYP}-{YYYY}-{SEQ}-{CD}`, e.g.
`ATLS01-ROM-2026-000042-31`. Gapless per organisation/type/year; check digit is
ISO 7064 MOD 97-10. Minted by a `BEFORE INSERT` trigger on `deal_rooms`, so it is
unforgeable — a `reference_no` supplied by a caller is silently overwritten. **An
observed gap is a records incident to be investigated, never silently corrected.**

---

## 7. Deal-room lifecycle

**Read this section carefully: the vocabulary is genuinely fragmented, and the
fragmentation is the fact.** (`CLAUDE.md §20.12`)

### Three orthogonal axes on `deal_rooms`

These are **not** three names for one concept. Each answers a different question, and
"fixing" one by pointing it at another breaks something real.

| Column | Question | Values (live CHECK) | Guarded? |
|---|---|---|---|
| `prep_status` | Is the room set up yet? | `in_prep`, `live`, `cancelled` | Two-sided AND RPC; neither party can flip alone |
| `workflow_stage` | How far has it progressed? | `nda_signed`, `qa`, `diligence`, `term_sheet`, `closing_confirmed` | Server-enforced sequence (Build Step 1) |
| `status` | Is it closed? | **no CHECK constraint** | Immutable-once-closed trigger; `finalize_deal_close()` requires *both* parties' recorded confirmation |

**`status` is authoritative for closure. `workflow_stage` is a progress indicator.**
18 RLS policies depend on `status` via `rls_private.dr_is_open`. Do not reconcile them
by making one read the other — in either direction. This was proposed once, verified
wrong, and is recorded so it is not re-proposed.

### UI stage order

`src/lib/deal-room-stages.ts` — what a user actually sees as tabs:

`Overview → Information Vault → Interviews → Q&A → Due Diligence → Term Sheet → Closing`

Interviews is a **parallel tab** inheriting Information Vault's unlock rank, not a
sequential stage. The workflow is six-stage; the tab bar has seven entries.

### The six closing gates

1. **Counsel** — both parties confirm counsel in place. Cannot be bypassed; no data
   shared until confirmed.
2. **Agreement** — each party confirms independently, without visibility into the
   other's confirmation until both are complete.
3. **Conditions** — conditions precedent tracked to satisfaction. **The gate is
   enforced** (no advance until all complete); sequencing *within* it is between the
   parties.
4. **Signing** — executed separately by each party, own counsel, no joint session.
   Each signature recorded individually.
5. **Payment** — investor and founder each confirm.
6. **Close** — mutual, recorded.

> **Backend reconciliation is incomplete and explicitly scoped as separate work.**
> The seven-state lifecycle / six-gate model is the authoritative *vocabulary*
> (`CLAUDE.md §0`, 1 Sep 2026 amendment), and Build Step 1 collapsed the DB CHECK from
> a 9-value superset to the 5 values above. But `deal-room-fn.ts`, `deal-room-workflow-fn.ts`,
> `deal-room-stages.ts` and `useStageTransition.ts` still carry their own vocabularies.
> Check the live CHECK constraint before writing anything that depends on stage values.

---

## 8. Design system — LCS

The **Lengdon Component System** is design truth for the authenticated app, superseding
DESIGN.md v2 (`CLAUDE.md §0`, 1 Sep 2026).

- Palette `#FFFFFF` / `#F6F5F2` / `#DDDBD6` / `#57544E` / `#1A1A19`, accent `#1F4E8C`
- IBM Plex Sans (UI), IBM Plex Mono (reference codes, IDs, tabular figures), Lora (serif accent)
- 4px base unit
- **Exactly four status colours**: Pending / In progress / Satisfied / Attention.
  **No red anywhere** — attention amber covers errors too.

**12 primitives** in `src/components/lcs/` (documented in `PRIMITIVES.md`): PageShell,
NavItem, PageHeader, Table, StatusPill, Card, EmptyState, FormField, Button, Modal,
Skeleton, ReferenceLine.

**Build new internal screens from these only.** Do not invent a primitive; do not
borrow a pattern from the retired v1/v2 systems.

**Migration is incomplete.** v1 purple (`hs-gradient`, `#7C3AED`, `gradient-brand`)
survives in **39 files** under `frontend/src`, including `styles.css` itself — tracked
as its own pass (`CLAUDE.md §19m`), not incidental cleanup. (§19m records 47; that
figure is from 6 Sep and is now stale — Group 7 closed some incidentally. Re-run the
grep rather than trusting either number.) A standing rule applies anyway: **any page found rendering v1
purple during any work gets migrated on the spot**, content unchanged.

**CC does not design** (`CLAUDE.md §0a`). Screens come from the founder's Figma file
exactly, extracted via the Figma connector — never approximated, never "inspired by."
If no frame exists, **stop and ask**. Content and workflow logic are *not* covered by
this: Figma frames in this project have repeatedly carried wrong brand names, invented
features, and M&A vocabulary that does not match the product. Extract layout; replace
copy with the real thing.

---

## 9. AI usage

Permitted, with citation and human confirmation: extraction from documents,
completeness checking, answer drafting, discrepancy *flagging*, retrieval, search,
translation. The original is always authoritative; **the human's confirmation is the
warranty**.

**Prohibited: scoring, ranking, recommendation, assessment — and anything entering the
record** (uncitable in a dispute). Also prohibited: legal instrument generation (UPL).

This is not a style preference. It is `Foundation §15/§25`, and violations of it are
the **single most frequently recurring defect class in this codebase** — found in
edge functions, route files, dormant tables, in-app copy, marketing pages, and **live
outbound email**. Five-plus independent instances, each found by a pass that was
looking for something else.

> **One is still live.** `review-document` prompts for `overall_score` (1–10),
> `signal`, and `investor_flag` with "Be harsh but fair," and renders at two real call
> sites. First logged 11 Aug 2026; re-confirmed unchanged in the deployed function.
> Scoped as its own standalone fix.

**Injection containment.** Uploaded documents are attacker-controlled text. Document
content is delivered to a model as data, explicitly delimited, **never as instruction**.
Content-derived values may populate fields awaiting human confirmation; they may never
be passed as arguments to a Prepare or Commit tool without it. A Read-class tool
operating on document content **cannot chain into another tool in the same turn**.

**Provider.** A single wired provider (OpenAI, via the `ai-router` edge function).
Fallbacks must **fail closed** — a condition like `|| !API_KEY` silently routing to an
unapproved provider on a missing env var has shipped twice. **No DPA is in place**;
sensitive-content routing is an open counsel question (`CLAUDE.md §17`).

---

## 10. Edge functions

12 deployed. Identity derivation is **gated, not optional** (`CLAUDE.md §19d.1`, which
carries the same blocking weight as the confirm-first rule):

> No new edge function may be deployed without deriving caller identity through
> `supabase/functions/_shared/auth.ts`'s `resolveUid()`. **`verify_jwt: true` alone
> does not satisfy this** — the public anon key is a real, platform-signed JWT and
> passes a JWT-format check. Only a claims check excludes it.

This applies to functions with no known caller, cron-only functions, and anything
described as internal or temporary. An inventory once found that **one function out of
eleven derived identity correctly**, and that five of six defective ones had no caller
at all. *No caller found is not the same as inaccessible* — an unreferenced deployed
function is a live HTTP endpoint until it is made inert.

**Deploy caveat:** the deploy tool resolves relative imports per function directory, so
byte-identical copies of `_shared/auth.ts` live inside each consuming function. Any edit
must be applied to all copies and re-verified identical.

---

## 11. Security posture

Beyond §5:

- **CSP is enforcing** (not Report-Only) with a per-request nonce minted in the worker.
  Any client-supplied `x-csp-nonce` is stripped before the worker sets its own — the
  nonce must never be attacker-pinnable. `style-src 'unsafe-inline'` deliberately
  remains: React `style={{}}` serialises to real `style="..."` in SSR'd HTML, so
  removing it is a styling-architecture decision, not a config edit.
- **`_headers` and `_redirects` do not apply to SSR-routed responses.** Headers and
  redirects are injected in the worker via `patch-wrangler.mjs`. Editing one without
  the other silently diverges production.
- **Regex inside `patch-wrangler.mjs` template literals is consumed at Node build
  time** — a literal `\d` does not survive. Verify against the **pre-minified**
  assembled string; reading minified output has produced a wrong diagnosis before.
- **Secrets never reach the client.** Verify by grepping the **built artifact**
  (`dist/client`, `dist/server`, worker) — not the source. A correct source-level
  remediation once left a live OpenAI key in the production bundle for eleven weeks
  because `envPrefix` still inlined it. **Re-run the check on every rotation**;
  rotation refills an exposure mechanism, it does not close it.
- **Uploaded-file parsers are attack surface.** `pdfjs-dist` (PDF) and `xlsx` (spreadsheets)
  both parse user uploads and both ship in the client bundle. pdfjs was upgraded to
  clear an arbitrary-JS-execution CVE; **`xlsx@0.18.5` carries two unpatched high-severity
  advisories with no fixed version available** — tracked as its own audit.

**Compliance, unresolved:** DIFC law requires genuine erasure of personal data, which
conflicts with the soft-delete rule. Intended resolution is personal data erasable,
transaction records retained and pseudonymised. **Must be settled with counsel before
the disclosure-pack schema is finalised** — it is the one open question that changes
the data model (`CLAUDE.md §11.2`).

---

## 12. Testing and verification

**Live authenticated browser verification is available and is the expected standard.**
A fixture session mints via the password-grant endpoint (hCaptcha is only on sign-up,
never sign-in); the helper is committed in `tests/`. Component-level checks — `tsc`,
greps, logic diffs — are the **floor, not the ceiling**. Skipping the live check
requires a specific stated reason.

Non-negotiables drawn from real failures:

- **Claims are not evidence** — paste raw output, not summaries. This applies to your
  own tooling and your own prior passes.
- **`tsc` is compared by error-SET diff, not count.** Two different sets of equal size
  is not a pass.
- **Transport-level check**: open the real route in a real browser and confirm the
  response contains real data. Every SQL-level authorization check in every prior
  migration group passed throughout the 11-day §20.11 outage, because none exercised
  the client→worker→handler path.
- **Assert against known ground truth**, not "a screen rendered." A pass once looked
  directly at "No deal rooms yet." for a founder with two real rooms.
- **Mobile uses real device emulation** (`isMobile: true`), not a resize floor; and a
  page-level `scrollWidth` check is **necessary but not sufficient** — a fully
  truncated heading once hid inside a section's own `overflow-hidden`.
- **Adversarial means attempt the actual attack**, as a real account with genuinely no
  access. Reading the code is not a test.

`SECURITY-CHECKLIST.md` is the two-minute pre-flight; read it before starting a feature.

---

## 13. Known-fragile areas

Read before touching. Each has bitten.

| Area | What to know |
|---|---|
| **Action layer** | Never wrap `createServerFn` in a factory (§4). The build guard exists because reasoning about this failed once. |
| **Stage vocabularies** | Seven competing vocabularies documented; partially collapsed. Check the live CHECK constraint, not a TypeScript type. |
| **`status` vs `workflow_stage`** | Separately owned, separately guarded. Never make one read the other. |
| **Route filenames** | Two files sharing a dot-prefix become a parent/child layout pair. Without `<Outlet />` the child renders nothing. `tsc` and the build stay clean. Four instances to date. `*.client.*` in a route filename takes the **entire route tree** down with a 500. |
| **`patch-wrangler.mjs`** | Build-time template literals eat regex escapes. Must stay in sync with `public/_headers`. |
| **Two auth listeners** | `lib/auth.tsx` and `lib/auth-store.ts` both exist, each individually guarded. Multiple listeners cause 5-second localStorage lock timeouts. Resolve during rebuild. |
| **Tailwind responsive classes** | A `sm:`/`md:`/`lg:` class on a new or newly-restored element can silently fail to apply, with zero signal from `tsc` or a default-viewport screenshot. Verify with `getComputedStyle` at the real breakpoint. |
| **Detached documents** | A document with `deal_room_id` set to NULL is invisible to the library picker forever (`<>` excludes NULL). Faithful to original behaviour; needs a product decision. |

---

## 14. Where to look

| For | Read |
|---|---|
| Process, defect patterns, full incident history | `CLAUDE.md` — authoritative |
| Pre-feature security pre-flight | `SECURITY-CHECKLIST.md` |
| UI migration state and remaining groups | `LCS_MIGRATION_PLAN.md` |
| LCS primitive contracts | `frontend/src/components/lcs/PRIMITIVES.md` |
| Why `pack_api` exists | `frontend/src/lib/actions/WHY_PACK_API.md` |
| RLS predicate → `authz_*` mapping | `frontend/src/lib/actions/AUTHZ_MAPPING.md` |
| Record canonicalisation | `supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md` |
| Public-site content rules | `PUBLIC-REGISTER.md` |
