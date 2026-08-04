# Authorization mapping — RLS predicate → pack_api.authz_* function

**Read this before writing any migrated action's `authorize()`.** Every migrated
feature's authorization is the RLS predicate that currently protects its table,
re-expressed through these primitives. Do NOT re-derive membership/permission
logic per feature — check each action's `authorize()` against this table. Getting
it subtly wrong per-feature is the exact failure this document exists to prevent.

Migration: `supabase/migrations/pack_v1/20260805000000_pack_api_authz_primitives.sql`.
All functions: `SECURITY DEFINER`, `search_path = ''` (fully-qualified `public.*`),
service_role-only, zero tables. Verified live 5 Aug 2026 — see the bottom section.

## The one transformation (why these aren't a copy-paste of the RLS functions)

The source RLS functions derive identity from **`auth.uid()`** — the RLS querying
context. The gateway runs as **service_role, where `auth.uid()` is NULL**. A naive
copy is therefore *broken* (everything returns false/empty). **Every `auth.uid()`
in the source is replaced by an explicit `p_uid` parameter** — the token-verified
uid `defineAction` resolves via `requireUser()`. `p_uid` is the *subject whose
access is tested*, never proof of identity (that's proven upstream; the
service_role-only grant is what stops a forged `p_uid`).

## The mapping

| pack_api function | Source (schema.fn) | Rule (identical boolean, `auth.uid()`→`p_uid`) |
|---|---|---|
| `authz_get_user_deal_room_ids(p_uid)` | `rls_private.get_user_deal_room_ids(p_user_id)` | `deal_room_id` where `user_id = p_uid and deal_room_id is not null`. Source was already parameterised (no `auth.uid()`) — a pure namespace move. |
| `authz_is_deal_room_member(p_uid, p_deal_room_id)` | *(inline predicate in every deal-room RLS policy)* | `exists(deal_room_members where user_id=p_uid and deal_room_id=p_deal_room_id)`, plus explicit null-guards. Extracted to a primitive so no action re-inlines it and mishandles null. |
| `authz_dr_is_open(p_deal_room_id)` | `rls_private.dr_is_open(p_deal_room_id)` | `coalesce(status is distinct from 'closed', false)`. No `auth.uid()`; namespace move. |
| `authz_is_startup_founder(p_uid, p_startup_id)` | `public.is_startup_founder(startup_id)` | `exists(startups where id=p_startup_id and founder_id=p_uid)`. |
| `authz_get_founder_team_role(p_uid, p_startup_id)` | `public.get_founder_team_role(p_startup_id)` | founder ⇒ `'owner'`; else `startup_team_accounts.role` where `(startup_id,user_id=p_uid,status='active')`; else null. |
| `authz_founder_has_permission(p_uid, p_startup_id, p_permission)` | `public.founder_has_permission(p_startup_id, p_permission)` | role via `authz_get_founder_team_role`; null⇒false; owner/admin⇒true; manager⇒{edit_profile,create_deal_room,view_all_deal_rooms,upload_documents,edit_pipeline,view_analytics,use_ai_advisor}; analyst⇒{upload_documents,use_ai_advisor}; viewer⇒false. |
| `authz_drm_can_create_room_member(p_uid, p_deal_room_id)` | `public.drm_can_create_room_member(p_deal_room_id, p_user_id)` | `exists(deal_rooms join startups where dr.id=p_deal_room_id and authz_founder_has_permission(p_uid, startup, 'create_deal_room'))`. **See divergence note.** |
| `authz_get_investor_startup_ids(p_uid)` | `public.get_investor_startup_ids()` | `dr.startup_id` from `deal_rooms join deal_room_members where drm.user_id=p_uid`. |
| `authz_get_investor_team_role(p_uid, p_investor_profile_id)` | `public.get_investor_team_role(p_investor_profile_id)` | profile-owner (`investor_profiles.user_id=p_investor_profile_id and =p_uid`) ⇒ `'owner'`; else `startup_team_accounts.role` where `(investor_profile_id,user_id=p_uid,status='active')`; else null. |

## Two deliberate divergences from the source (flagged, not silent)

1. **`authz_drm_can_create_room_member` — corrected an accidental-in-RLS behaviour.**
   The source `drm_can_create_room_member(p_deal_room_id, p_user_id)` has an
   **unused `p_user_id` parameter**: its body relied on `founder_has_permission →
   auth.uid()`, so the caller-supplied id was dead and it only worked because RLS
   supplied identity ambiently. In the gateway there is no `auth.uid()`, so the
   port threads `p_uid` through to `authz_founder_has_permission` — making the
   permission check actually test the caller. This is the *corrected* boolean the
   source only got right by accident of its execution context. Verified live: a
   non-founder correctly gets `false` (the source, run outside RLS, could not have
   distinguished this).

2. **`'admin'` role branch preserved verbatim though unreachable.**
   `authz_founder_has_permission` checks `v_role in ('owner','admin')`, but
   `authz_get_founder_team_role` never returns `'admin'` (only `'owner'`). Ported
   the source's boolean exactly rather than "fixing" it. If `'admin'` should be a
   reachable founder-team role, that is a separate, flagged product decision — not
   a silent change here.

## How a migrated action uses these

```ts
authorize: async (ctx, input) => {
  // e.g. a deal-room document read: caller must be a room member.
  const { data } = await ctx.sb.schema("pack_api")
    .rpc("authz_is_deal_room_member", { p_uid: ctx.uid, p_deal_room_id: input.dealRoomId });
  return data === true;
}
```
The action passes `ctx.uid` (token-verified) as `p_uid`. Never pass a
client-supplied id as identity. For set-returning primitives
(`authz_get_user_deal_room_ids`, `authz_get_investor_startup_ids`) use them inside
the pack_api data function's `where … in (select …)`, not round-tripped to TS.

## Live verification (5 Aug 2026) — proven, not inferred

- **Equivalence** to the two directly-callable source functions, real uids:
  `get_user_deal_room_ids` identical for investor-member (2 rooms), founder-member
  (3 rooms), non-member (null), null uid (null); `dr_is_open` identical for
  open (true) and nonexistent (false). Closed branch proven on the shared
  `status is distinct from 'closed'` expression (a production guard,
  `enforce_deal_room_close_guard`, correctly blocks creating a closed row to test
  on real data — not bypassed).
- **Adversarial matrix, 31 cases, all actual==expected:** founder / non-founder /
  null / nonexistent-startup; team roles owner/viewer/analyst/associate/external/
  stranger/null; permission tiers (owner-any, viewer-none, analyst upload-yes
  edit-no, stranger-no, null-no); membership member/non-member/wrong-room/null;
  investor startup-ids member(2)/non-member(0)/null(0); drm_create founder-true/
  non-founder-false/null-false/nonexistent-false.
- **Grants:** all 9 functions service_role-only (`anon`/`authenticated` execute =
  false). Isolation holds.

---

## Record scope (`scopeId`) — the record-chain partition key per feature class

`defineAction` appends a record entry on every action, keyed by `scopeId` (the
envelope's `scopeId` field; passed to `pack_api.append_record` as its generic
`p_org_id` partition-key param — not renamed in SQL to avoid churning the proven
signature). **`scopeId` is NOT an authorization input** — authorization lives in
the pack_api functions on the real object ids. It only decides *which append-only
chain* the audit entry joins. Foundation §9.4's record is per-scope; the scope
depends on the feature class:

| Feature class | `scopeId` = | Why |
|---|---|---|
| Deal-room actions (documents, requests, qa, dd, closing) | `deal_room_id` | The deal room is the audit-trail unit — one chain per room. |
| Founder / profile actions (future group) | `startup_id` | The raising entity's record. |
| Org-level actions | `org_id` | Once `organizations` is real and used (0 rows today). |
| Pack actions (pack.get etc., pack_v1-native) | the pack's `org_id` | pack_v1 IS org-scoped; for these, scope == org. |

**Verified (5 Aug 2026) that the chain logic is scope-agnostic — the rename is not
inert-by-assumption:** re-ran the full chain proof with real `deal_room_id`s as
scope — genesis + link per scope, two deal_room_ids → two independent chains,
hash recomputes, UPDATE rejected. Identical behaviour to the original org_id proof.

## Documents feature group (Step A) — RLS → pack_api.doc_* mapping

Migration `20260805010000_pack_api_documents_group.sql`. Membership-authorized;
`founder_documents` (founder vault) is a SEPARATE feature deferred to the
profile/founder group — see note below.

| pack_api function | Source RLS policy | Rule |
|---|---|---|
| `doc_list_room` | `documents_room_read` (+`documents_own`) | member of room; all its docs; uploader{full_name} join. [route docs query] |
| `doc_list_library` | `documents_own` | UPLOADER-scoped: `uploader_id=caller AND deal_room_id<>current`. NOT membership — the user's own docs elsewhere. [route library picker] **Uses SQL `<>` not `is distinct from`, so detached (deal_room_id IS NULL) docs are EXCLUDED — faithfully matching the original PostgREST `.neq`. A functional-equivalence test caught the `is distinct from` version diverging (it included null docs). Whether detached docs *should* show in the library is a separate product question, flagged not silently changed.** |
| `doc_list_investor` | `documents_room_read` | member of room; filtered `uploaded_by_role='investor'`; uploader{full_name,avatar_url}. [route investor-docs] |
| `doc_list` (orphaned) | — | superseded by the three named reads above; no caller. Left in DB (harmless, service_role-only); flag for a cleanup pass, do not drop silently. |
| `doc_insert` | `documents_own` + membership + §8 open | member of room AND room open (`authz_dr_is_open`); `uploader_id` forced = caller (documents_own made non-forgeable). |
| `doc_update` | `documents_own` | **UPLOADER only** — a member who is not the uploader is forbidden. Do NOT upgrade to membership (that would weaken RLS). Verified live. |
| `doc_view_insert` | `authenticated_insert_doc_views` | any authenticated caller (non-null p_uid). |
| `doc_request_*` | `doc_requests_access` | member of the request's room (`authz_is_deal_room_member`). |
| `doc_request_respond_link` | `doc_requests_access` | member; sets `response_link` + status→fulfilled (founder "Share link" path). |

**doc_view_insert widened (Stage-2 finding, migration `20260805030000`):** the route's
`trackDocumentView` writes `startup_id`, `viewer_role`, `viewer_name` (viewer_name derived
from an `investor_profiles` read on the client). The initial function dropped all three —
same silent-drop class as Stage 1. Widened; authorization UNCHANGED (any authenticated
caller, `authenticated_insert_doc_views`). Old 5-arg signature dropped.

**Column-coverage note (Stage-1 finding, migration `20260805020000`):** the initial
functions silently dropped columns the real UI writes — `document_requests.priority`
/ `for_user_id`, `documents.file_size`, and the `response_link` path had no function
at all. Widened so the gateway is a faithful (not lossy) replacement. Authorization
unchanged. `doc_request_insert` and `doc_insert` were re-created with default-valued
params (priority/for_user_id; file_size) and the old narrower signatures dropped, so
each has exactly one signature.

**Deferred (NOT migrated in Step A): `founder_documents` / `app.documents.tsx`.**
Founder-ownership auth (`is_startup_founder` / `founder_has_permission('upload_documents')`),
NOT membership. Belongs to the profile/founder migration group. **Coupling to
carry forward:** its investor-read RLS (`investor_read_approved_docs`) joins
through `discovery_requests` (`detail_pack_approved`), coupling founder_documents
to the investor group too — whoever scopes the profile/founder step must handle
both the ownership auth and this discovery-request read path.

Related: [`WHY_PACK_API.md`](./WHY_PACK_API.md) (why the RPC layer exists),
[`../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md`](../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md).
