# Why the action layer reaches pack_v1 through `pack_api` RPCs (not `.schema('pack_v1')`)

**Read this before writing any action that touches pack_v1.** It exists so no
future session wastes time reaching for `.schema('pack_v1').from(...)` (it does
not work) or wonders why there is an RPC layer instead of raw table access.

## The empirical finding (4 Aug 2026)

`pack_v1` is the isolated, design-proving schema for the Phase 1 rebuild (pack,
schedule, record chain, reference numbering). It is deliberately **NOT** exposed
to PostgREST — keeping the unproven schema off the REST API is part of the
isolation.

We tested, on this project, whether the action layer could still reach pack_v1
via the supabase-js client:

| Attempt | Result |
|---|---|
| `serviceRole.schema('pack_v1').from('schedule_field').select()` | **`PGRST106 Invalid schema: pack_v1`** |
| `anon.schema('pack_v1').from('schedule_field').select()` | `PGRST106 Invalid schema: pack_v1` |
| `serviceRole.from('startups')` (control, public) | works |

**`.schema()` cannot bypass PostgREST's exposed-schemas allowlist — not even for
`service_role`.** `.schema()` only sets the `Accept-Profile`/`Content-Profile`
header; PostgREST still validates the schema against its server-side `db-schemas`
config and rejects anything not on it. The service-role key changes
*authorization within* an exposed schema; it does not widen the exposed set.

This was verified, not assumed. Do not re-litigate it by trying `.schema('pack_v1')`
again — it will fail the same way until/unless pack_v1 is deliberately exposed
(which erodes the isolation and would require a full RLS pass first, since
pack_v1 has no RLS — it was built for gateway-only access).

## The pattern that works

One schema, **`pack_api`**, is exposed to PostgREST (product owner added it to
the allowlist, 4 Aug 2026). It contains **only `SECURITY DEFINER` functions —
zero tables**. Each function reaches into the still-unexposed `pack_v1`
internally. The exposed surface is therefore a **hand-written, auditable function
allowlist**, not a set of queryable tables — which is *more* aligned with the
gateway philosophy (§13.2) than raw table access, not a compromise of it.

```
client → createServerFn (defineAction) → serviceRole.schema('pack_api').rpc('fn', args)
       → pack_api.fn (SECURITY DEFINER, service_role-only, search_path=pack_v1,pg_temp)
       → pack_v1.<table>
```

Confirmed working end-to-end: `serviceRole.schema('pack_api').rpc('pack_get',…)`
returns real pack_v1 data; `.schema('pack_v1').from(...)` still fails. The
isolation boundary holds through the config change.

## Rules for every `pack_api` function (no exceptions)

1. **`SECURITY DEFINER`**, and **`SET search_path = pack_v1, pg_temp`** — pg_temp
   LAST, never `public` alone, never pg_temp implicit-first (CLAUDE.md §7.2).
2. **`service_role` only.** `REVOKE ALL ... FROM public, anon, authenticated;`
   then `GRANT EXECUTE ... TO service_role;`. Because `pack_api` is exposed,
   anon **can** reach any function granted to it — so a function reachable by
   anon that trusts a `uid` argument is an open door. The action layer (which
   holds the service key server-side, after verifying the caller's token via
   `requireUser`) is the ONLY sanctioned caller. The `p_uid` argument is the
   *subject whose access is checked*, never proof of identity — identity is
   proven upstream in `defineAction`, and the service_role-only grant is what
   stops anyone else calling in with a forged `p_uid`.
3. **Authorize inside the function** against the caller's asserted context
   (e.g. pack.org_id must equal the passed org_id). Return a
   `{ok:false, error:'forbidden'}` shape, never raise, so the action layer can
   map it cleanly.

## What NOT to do

- ❌ `.schema('pack_v1').from(...)` — fails, always.
- ❌ Exposing `pack_v1` to PostgREST to "simplify" — reintroduces the isolation
  breach and needs a full RLS pass first (pack_v1 has none).
- ❌ A direct `pg` connection from server actions — considered and explicitly
  deferred: Cloudflare Workers can't hold long-lived TCP, and Hyperdrive/HTTP-
  pooler compatibility on this stack is unverified. If ever wanted, it needs its
  own Workers-specific verification pass as a separate decision, not adoption by
  default.
- ❌ Granting a `pack_api` function to `anon`/`authenticated` — service_role only.

Related: [`../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md`](../../../supabase/migrations/pack_v1/CANONICAL_JSON_SPEC.md)
(the record-hash canonicalisation spec).
