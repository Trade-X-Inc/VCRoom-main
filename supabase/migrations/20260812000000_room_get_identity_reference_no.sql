-- deal-room-core step 6 (DESIGN v2 presentation rebuild): ReferenceLine needs
-- reference_no to render anything. The column and backfilled data have existed
-- since migration 20260809060000, but room_get_identity (20260809050000)
-- predates it and never selected it. One-column addition to an existing
-- jsonb_build_object list — no authorization logic touched, no new grants,
-- same function signature, same security definer, same search_path.
--
-- Verified live post-deploy, not assumed:
--   - genuine member: ok:true, reference_no present (e.g. "000001-ROM-2026-000001-52")
--   - genuine non-member: forbidden (unchanged)
--   - null identity: not_authenticated (unchanged)
--   - anon role: EXECUTE denied at the grant level, unchanged (service_role/postgres only)
create or replace function pack_api.room_get_identity(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_row jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select jsonb_build_object(
    'id', d.id, 'startup_id', d.startup_id, 'status', d.status,
    'created_at', d.created_at, 'updated_at', d.updated_at,
    'investor_name', d.investor_name, 'investor_email', d.investor_email,
    'investor_company', d.investor_company, 'created_by', d.created_by,
    'investor_decision', d.investor_decision, 'closed_at', d.closed_at,
    'investor_user_id', d.investor_user_id,
    'reference_no', d.reference_no
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'room', v_row);
end;
$function$;
