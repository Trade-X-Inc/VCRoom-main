-- Applied to production by hand on 2026-10-18 via the dashboard SQL editor, after an 11/11 dry run; recorded here for the migration history.
-- pack_api.pack_schedule_get(p_uid, p_pack_id): returns the schedule a pack is pinned to
-- (pack.schedule_id), in the same {ok, schedule, fields} shape as pack_api.schedule_get.
-- Live body md5 (md5(prosrc)): 4ef2cda8a80cd4cf9465f4f43edca339.
-- The function is read-only (no writes, no record entry) and executable by service_role only.
-- Authorization is the same as pack_fields_get: the caller must be the founder of the pack's startup.
-- The statements below are re-runnable (create or replace; revoke and grant are idempotent).

create or replace function pack_api.pack_schedule_get(
  p_uid     uuid,
  p_pack_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_pack     pack_v1.pack;
  v_schedule pack_v1.schedule;
  v_fields   jsonb;
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

  select * into v_schedule from pack_v1.schedule where id = v_pack.schedule_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', f.id,
             'value_type', f.value_type,
             'evidence_ladder', f.evidence_ladder,
             'is_required', f.is_required,
             'sort_order', f.sort_order,
             'section_key', f.section_key,
             'default_visibility_tier', f.default_visibility_tier,
             'default_release_class', f.default_release_class,
             'label', l.label,
             'help_text', l.help_text
           ) order by f.sort_order
         ), '[]'::jsonb)
    into v_fields
    from pack_v1.schedule_field f
    left join pack_v1.schedule_field_label l
      on l.schedule_field_id = f.id and l.locale = 'en'
   where f.schedule_id = v_schedule.id;

  return jsonb_build_object('ok', true, 'schedule', to_jsonb(v_schedule), 'fields', v_fields);
end;
$fn$;

revoke all on function pack_api.pack_schedule_get(uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.pack_schedule_get(uuid, uuid) to service_role;
