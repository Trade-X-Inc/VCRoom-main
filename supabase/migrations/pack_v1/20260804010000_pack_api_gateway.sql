-- ═══════════════════════════════════════════════════════════════════════════
-- pack_api — the exposed gateway schema for the action layer (Phase 1 step 5).
--
-- pack_v1 is NOT exposed to PostgREST (.schema('pack_v1') fails with PGRST106
-- even for service_role — verified, not assumed; see
-- frontend/src/lib/actions/WHY_PACK_API.md). The action layer reaches pack_v1
-- ONLY through the SECURITY DEFINER functions in this schema, called via .rpc().
--
-- pack_api contains functions ONLY — zero tables. The exposed REST surface is
-- therefore a hand-written, auditable function allowlist, not queryable tables.
--
-- Every function here:
--   • SECURITY DEFINER, SET search_path = pack_v1, pg_temp  (pg_temp LAST,
--     never 'public' alone, never pg_temp implicit-first — CLAUDE.md §7.2)
--   • service_role ONLY (revoked from public/anon/authenticated). pack_api is
--     REST-exposed, so anon COULD reach a function granted to it; the action
--     layer (holding the service key server-side, after requireUser() verifies
--     the caller's token) is the sole sanctioned caller. p_uid is the subject
--     whose access is checked, NEVER proof of identity — that's proven upstream.
--   • authorizes internally against the caller's asserted context.
--
-- NOTE: pack_api was added to the project's PostgREST exposed-schemas allowlist
-- by the product owner (dashboard, 4 Aug 2026). This migration is the DB-side;
-- the allowlist entry is project config, not captured here.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists pack_api;
grant usage on schema pack_api to service_role;

-- ── pack_get (Read) — fetch a pack by id, authorized to the caller's org ─────
create or replace function pack_api.pack_get(
  p_uid     uuid,
  p_org_id  uuid,
  p_pack_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pack_v1, pg_temp
as $fn$
declare
  v_pack   pack_v1.pack;
  v_fields jsonb;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_pack from pack_v1.pack where id = p_pack_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- authorization: the caller's asserted org must own this pack.
  -- TODO(cutover): tighten to "p_uid ∈ organization_members(v_pack.org_id)"
  -- once public.organization_members is linked. Today pack_v1 has no membership
  -- table; this checks org-ownership of the object, which is real but not yet
  -- a membership check.
  if v_pack.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(to_jsonb(f) order by f.updated_at), '[]'::jsonb)
    into v_fields
    from pack_v1.pack_field f
   where f.pack_id = p_pack_id;

  return jsonb_build_object('ok', true, 'pack', to_jsonb(v_pack), 'fields', v_fields);
end;
$fn$;

revoke all on function pack_api.pack_get(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pack_api.pack_get(uuid,uuid,uuid) to service_role;

-- ── append_record — gateway wrapper over pack_v1.append_record (§8.3) ────────
-- Lets the action layer's single pack_api/.rpc() path cover record-writing too.
create or replace function pack_api.append_record(
  p_org_id      uuid,
  p_actor_id    uuid,
  p_actor_type  text,
  p_action      text,
  p_object_type text,
  p_object_id   uuid,
  p_data        jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pack_v1, pg_temp
as $fn$
declare
  v pack_v1.record_entry;
begin
  v := pack_v1.append_record(
        p_org_id, p_actor_id, p_actor_type::pack_v1.actor_type,
        p_action, p_object_type, p_object_id, p_data);
  return jsonb_build_object('ok', true, 'seq', v.seq, 'entry_hash', v.entry_hash, 'id', v.id);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$fn$;

revoke all on function pack_api.append_record(uuid,uuid,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function pack_api.append_record(uuid,uuid,text,text,text,uuid,jsonb) to service_role;
