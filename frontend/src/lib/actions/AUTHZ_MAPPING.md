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

Related: [`WHY_PACK_API.md`](./WHY_PACK_API.md) (why the RPC layer exists),
[`../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md`](../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md).
