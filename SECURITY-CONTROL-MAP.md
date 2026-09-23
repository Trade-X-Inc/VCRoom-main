# SECURITY-CONTROL-MAP.md

Scaffold only. This is the shape of a future SOC 2 / ISO 27001 control map, not a
completed one — per §11.3, controls get built before the audit, and this file exists
to give that eventual audit a place to land, not to pre-empt it. Do **not** fill this
out exhaustively as a side effect of unrelated work; add a row only when a real
control is built and verified, the same discipline `SECURITY-CHECKLIST.md` already
holds for its own entries.

**Columns:**

| Column | Meaning |
|---|---|
| Control ID | Short stable slug, referenced from commit messages / CLAUDE.md entries once one exists. |
| Control | The control statement, with a SOC 2 Trust Services Criteria or ISO 27001 Annex A reference where one applies. No reference is invented if none fits cleanly — leave it blank rather than force a mapping. |
| Satisfied by | The actual architecture/mechanism enforcing it. Named code, not a description of intent. |
| Status | `LIVE` (built, deployed, adversarially verified), `PARTIAL` (built but with a known, tracked gap), `PLANNED` (decided, not built), `NOT STARTED`. |
| Evidence | Where the verification lives — a CLAUDE.md section, a commit hash, a migration file. Not a restatement of the control; a pointer to where it was actually checked. |

A control with no real, verified mechanism behind it does not get a `LIVE` row here —
that is exactly the fabricated-signal failure mode Foundation §3.8 and CLAUDE.md's
§7.4 "acknowledged fabrication is worse than unlabeled" rule already prohibit, applied
to this document's own contents.

---

## Access control

| Control ID | Control | Satisfied by | Status | Evidence |
|---|---|---|---|---|
| AC-1 | Row-level security enforced per table | Postgres RLS policies, one per table, no service-role backstop assumed | LIVE (with known gaps) | CLAUDE.md §7.1/§7.2; 137/137 tables RLS-enabled per live query, §20 amendment log 8 Sep 2026 |
| AC-2 | Caller identity derived from session, never trusted from a request parameter | `requireUser()` / `resolveUid()` (`supabase/functions/_shared/auth.ts`) | LIVE | CLAUDE.md §19d.1 |
| AC-3 | Role-scoped authorization inside the action layer, not just at RLS | `authz_*` Postgres primitives (`authz_is_deal_room_member`, `authz_is_room_lawyer`, etc.), called from `pack_api` functions | PARTIAL | CLAUDE.md §20.1 steps 2a/2b — client path closed; §20.1's "interim gap" — 18 service-role functions in `src/lib` not yet carrying the same role distinction |
| AC-4 | Single chokepoint for client→database reads/writes | `runAction()` / `callAction()`, enforced by `scripts/check-action-split.mjs` in `postbuild` | LIVE | CLAUDE.md §20.11 (the eleven-day outage this guard was built to prevent from recurring silently) |
| AC-5 | MFA required, not optional | *(not yet traced in this scaffold — do not assume from Foundation §11.1's stated intent)* | NOT STARTED | — |

## Data protection

| Control ID | Control | Satisfied by | Status | Evidence |
|---|---|---|---|---|
| DP-1 | Public/anonymous surfaces return a whitelisted field set, never `select(*)` | `get_public_founder_profile()`, `get_public_investor_profile()` — `SECURITY DEFINER`, re-check publish state, explicit field list | LIVE | CLAUDE.md §19f |
| DP-2 | Secrets never reach the client bundle | No `VITE_`/`envPrefix`-exposed secret vars; verified against the built artifact, not source | LIVE (process, not a static guarantee — re-verify on every secret/build-config change) | CLAUDE.md §19e; `SECURITY-CHECKLIST.md` §2 |
| DP-3 | TLS enforced, legacy versions blocked | Cloudflare edge termination | PLANNED (stated in Foundation §11.1; not independently re-verified in this codebase's own audit trail) | — |
| DP-4 | AES-256 at rest with managed key rotation | Supabase-managed | PLANNED (stated in Foundation §11.1; not independently re-verified here) | — |
| DP-5 | Content-Security-Policy enforced, not report-only | Per-request nonce, `script-src` without `'unsafe-inline'` | LIVE | CLAUDE.md §20 amendment log, 13 Sep 2026 |

## The record (audit trail)

| Control ID | Control | Satisfied by | Status | Evidence |
|---|---|---|---|---|
| RC-1 | Append-only, hash-chained record of every action | `pack_v1.record_entry`, `append_record()`, UPDATE/DELETE blocked by trigger | PARTIAL — built and verified, not yet promoted out of the isolated `pack_v1` schema into `public` | CLAUDE.md §8.3 |
| RC-2 | Canonicalization of the hashed payload is spec'd and versioned | `supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md` | LIVE (within `pack_v1`) | CLAUDE.md §8.3 |
| RC-3 | Reference numbers are gapless, check-digit verified, per org/type/year | `pack_v1.next_reference()`, ISO 7064 MOD 97-10 | LIVE (within `pack_v1`; not yet on a public-facing table outside `deal_rooms`) | CLAUDE.md §8.4, §20.6 |

## Document handling

| Control ID | Control | Satisfied by | Status | Evidence |
|---|---|---|---|---|
| DH-1 | Document release is a Commit-class action — never AI-executable | `documents.grantRelease` action, explicit human trigger only | LIVE | CLAUDE.md §8.2 |
| DH-2 | Uploaded documents scanned/gated before becoming visible to a counterparty | `runUploadSecurityGate()` | LIVE | `frontend/src/lib/actions/library.ts`; wired into every upload handler per this session's branch-reconciliation merge |
| DH-3 | AI extraction proposes, never asserts — human confirmation is the warranty | Per-field confirm/correct flow, citation to source location | PARTIAL — real in the Pack Builder sandbox preview; not yet wired to a production document pipeline | `deals-preview.vault.tsx` (2 Sep 2026 entry, §20 amendment log) |

## AI usage boundaries

| Control ID | Control | Satisfied by | Status | Evidence |
|---|---|---|---|---|
| AI-1 | No AI-generated scoring, ranking, or recommendation surfaces to a user | Removed from `review-document`, `verify-investor`, `match-investors`, `generate-deal-brief`, Deal Intake, `profile_checklists`, others | LIVE (per-instance; not a structural guarantee against a new instance shipping) | CLAUDE.md §19, §19a–§19p |
| AI-2 | Uploaded document content delivered to a model as data, never as instruction | Explicit delimiting in every AI-calling function's prompt construction | LIVE (not independently re-audited as a standalone control in this scaffold) | Foundation §10 (source rule); no dedicated CLAUDE.md verification entry yet |
| AI-3 | Every AI-calling function derives caller identity, none trust a body parameter | Shared `resolveUid()` helper | LIVE | CLAUDE.md §19d.1 |

---

## Explicitly not scored

Per this scaffold's own scope: rate limiting, incident response process, vendor/sub-processor
management, and employee access controls are real SOC 2 domains with no rows here yet —
not because they don't matter, but because populating them without a real underlying
control would be exactly the fabricated-completeness failure this file exists to avoid.
Add them when there is something real to cite, not before.
