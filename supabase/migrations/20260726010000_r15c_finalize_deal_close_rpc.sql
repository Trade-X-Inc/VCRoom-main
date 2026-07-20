-- R15C: the ONLY sanctioned path to set deal_rooms.status='closed'. Sets the
-- txn-local GUC the close-guard trigger checks, then updates status + closed_at.
-- Requires BOTH parties confirmed in deal_room_close (mutual close). Idempotent.
create or replace function finalize_deal_close(p_deal_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_close deal_room_close%rowtype; v_status text;
begin
  select status into v_status from deal_rooms where id = p_deal_room_id;
  if v_status = 'closed' then return; end if;
  select * into v_close from deal_room_close where deal_room_id = p_deal_room_id;
  if v_close.deal_room_id is null or not v_close.investor_confirmed or not v_close.founder_confirmed then
    raise exception 'both parties must confirm before close (investor=%, founder=%)',
      coalesce(v_close.investor_confirmed,false), coalesce(v_close.founder_confirmed,false);
  end if;
  perform set_config('app.deal_close_ctx', p_deal_room_id::text, true);
  update deal_rooms set status = 'closed', closed_at = now() where id = p_deal_room_id;
  perform set_config('app.deal_close_ctx', '', true);
end;
$$;
comment on function finalize_deal_close(uuid) is
  'R15C: mutual-close finalizer. Requires both deal_room_close flags true, then sets deal_rooms.status=closed + closed_at inside the app.deal_close_ctx GUC so the close-guard trigger allows it. The only path to a closed room.';
