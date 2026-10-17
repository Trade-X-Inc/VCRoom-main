-- Applied to production by hand on 2026-10-16 via the dashboard SQL editor; recorded here for the migration history.
-- ═══════════════════════════════════════════════════════════════════════════
-- pack_api.pack_fields_get(p_uid, p_pack_id). Applied to production by hand
-- and recorded here; it was reviewed as a draft before being applied.
--
-- WHY THIS EXISTS: pack_api.pack_get (20260804010000_pack_api_gateway.sql)
-- authorizes ONLY on a caller-supplied p_org_id matching pack.org_id — it
-- never checks p_uid against the pack's real owner at all. p_uid is read
-- from the function signature but is never compared to anything; the sole
-- authorization gate is "does the org_id you supplied match the pack's
-- org_id", which the caller supplies itself. This is the exact §7.1
-- identity-parameter shape CLAUDE.md already warns against ("a user_id in
-- a request body is spoofable... derive identity from the session,
-- always") — here the spoofable parameter is p_org_id, not a user_id, but
-- the structural defect is the same: nothing ties p_uid to the caller
-- actually owning that org. pack_get must NOT be used by the pack
-- screens — this function is the real, founder-checked replacement for
-- the one thing the screens need from it (reading a pack's own fields).
--
-- Same authorization shape as pack_api.pack_missing_fields, deliberately
-- copied rather than re-derived: p_uid null -> not_authenticated; pack not
-- found -> not_found; caller is not pack_api.authz_is_startup_founder
-- against the pack's own subject_ref -> forbidden. No p_org_id parameter
-- at all — the only identity input is p_uid, and the only authorization
-- check is against the real, derived founder relationship, never a
-- caller-supplied org id.
--
-- No existing function is touched. pack_api.pack_get is left exactly as
-- it is (out of scope for this draft — flagged above, not fixed here);
-- pack_api.pack_missing_fields, pack_field_set, pack_field_confirm,
-- pack_create, schedule_get are all unmodified.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── pack_api.pack_fields_get — Read, pack-owner only ────────────────────────
-- Returns the pack row itself plus every pack_field row for it, ordered by
-- the pack's OWN pinned schedule's schedule_field.sort_order (pack_field
-- carries no sort_order column of its own — the join against
-- pack_v1.schedule_field is what provides the ordering, same join shape
-- pack_missing_fields already uses). A pack with zero saved fields
-- returns fields: [] (coalesce), never null — the same "empty list is a
-- normal state, not an absent one" contract pack_missing_fields and the
-- deal-room-core list functions already established (CLAUDE.md §20.1
-- Finding 1).
create or replace function pack_api.pack_fields_get(
  p_uid     uuid,
  p_pack_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
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

  if not pack_api.authz_is_startup_founder(p_uid, v_pack.subject_ref) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(to_jsonb(pf) order by sf.sort_order), '[]'::jsonb)
    into v_fields
    from pack_v1.pack_field pf
    join pack_v1.schedule_field sf
      on sf.id = pf.schedule_field_id and sf.schedule_id = v_pack.schedule_id
   where pf.pack_id = p_pack_id;

  return jsonb_build_object('ok', true, 'pack', to_jsonb(v_pack), 'fields', v_fields);
end;
$fn$;

revoke all on function pack_api.pack_fields_get(uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.pack_fields_get(uuid, uuid) to service_role;
