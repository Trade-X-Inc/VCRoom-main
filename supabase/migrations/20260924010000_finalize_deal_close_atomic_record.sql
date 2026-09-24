-- finalize_deal_close_atomic_record: extend finalize_deal_close to atomically
-- append the record entry (§8.3) in the SAME transaction as the
-- status='closed' write, so a closed room can never exist without its record
-- entry (and vice versa — a failed append rolls back the close too, via the
-- exception propagating out of this function).
--
-- Design: the TypeScript ActionDef's record() function remains the single
-- declared source of the payload shape (confirmDeliverableDef.record in
-- deal-room-closing.ts) — this migration does not decide what belongs in the
-- payload. handle() calls record() in TS, then passes the fully-built
-- actor_id/action/object_type/object_id/data down as plain parameters. This
-- function's only new job is the mechanical, atomic write of what it's handed.
--
-- SERVICE-ROLE ONLY, DELIBERATELY, UNLIKE advance_workflow_stage: this
-- signature takes a caller-supplied p_actor_id/p_data with NO internal
-- re-derivation from auth.uid() (finalize_deal_close is SECURITY DEFINER,
-- called only from inside the gateway's own service-role client — it never
-- runs as the end user's session). advance_workflow_stage is safe for
-- `authenticated` to call directly because it derives auth.uid() itself and
-- trusts nothing from the caller; this function is the opposite shape and
-- must never be granted to authenticated/anon/public, or any authenticated
-- principal could close an arbitrary room under a forged actor_id.
--
-- Return shape changes from `void` to a row so the caller (handle(), and the
-- gateway's suppressed-append logic) can tell apart three real outcomes:
--   (closed=false, entry_written=false) -- not yet both-confirmed, pure no-op
--   (closed=true,  entry_written=true)  -- this call actually closed the room
--   (closed=true,  entry_written=false) -- already closed before this call
--     (the existing idempotent early-return path) -- no new entry, because
--     nothing new happened; re-confirming an already-closed room must not
--     fabricate a second "close" event in the record chain.
--
-- NOTE (24 Sep 2026): the old 1-arg finalize_deal_close(uuid) is
-- DELIBERATELY NOT DROPPED here — production's deployed frontend still
-- calls it until this migration's own frontend (confirmDeliverable on the
-- gateway) is live. The drop is a separate, later migration, applied only
-- after that frontend push is confirmed live. This migration is additive
-- only: a new, distinctly-signatured function alongside the old one.
create or replace function finalize_deal_close(
  p_deal_room_id uuid,
  p_actor_id     uuid,
  p_action       text,
  p_object_type  text,
  p_object_id    uuid,
  p_data         jsonb
)
returns table(closed boolean, entry_written boolean, seq bigint, entry_hash text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_close  deal_room_close%rowtype;
  v_status text;
  v_entry  pack_v1.record_entry;
begin
  select status into v_status from deal_rooms where id = p_deal_room_id;

  -- Already closed: idempotent no-op, exactly as before. No new record entry
  -- -- nothing changed, so nothing is recorded. This is the path the
  -- adversarial "confirm again on an already-closed room" test exercises.
  if v_status = 'closed' then
    return query select true, false, null::bigint, null::text;
    return;
  end if;

  select * into v_close from deal_room_close where deal_room_id = p_deal_room_id;
  if v_close.deal_room_id is null or not v_close.investor_confirmed or not v_close.founder_confirmed then
    raise exception 'both parties must confirm before close (investor=%, founder=%)',
      coalesce(v_close.investor_confirmed, false), coalesce(v_close.founder_confirmed, false);
  end if;

  perform set_config('app.deal_close_ctx', p_deal_room_id::text, true);
  update deal_rooms set status = 'closed', closed_at = now() where id = p_deal_room_id;
  perform set_config('app.deal_close_ctx', '', true);

  -- Atomic record append — same transaction as the UPDATE above, and
  -- strictly the LAST statement in this function. If this raises, the
  -- whole transaction (including the UPDATE) rolls back: a closed-but-
  -- unrecorded state cannot exist as an artifact of this function
  -- succeeding partway.
  --
  -- Called as pack_v1.append_record directly (schema-qualified explicitly,
  -- not relying on search_path resolution), NOT pack_api.append_record --
  -- the pack_api wrapper exists for the PostgREST/service-role external
  -- boundary; this is an internal, same-transaction call from one
  -- SECURITY DEFINER function to another, so it goes straight to the real
  -- pack_v1 function. actor_type is the literal constant 'human': this
  -- function is only ever reached via the gateway's confirmDeliverable
  -- action, which is class:"commit" -- runAction's own step 3 already
  -- rejects any isAgent caller before handle() (and therefore this
  -- function) ever runs, so by the time control reaches here the caller is
  -- guaranteed human. p_deal_room_id is passed as the record chain's org_id
  -- -- matching every other deal-room action's scopeId convention exactly
  -- (callAction(action, dealRoomId, ...) across deal-room-core.ts's real
  -- call sites; gateway.ts's own comment: "deal-room actions -> scopeId =
  -- deal_room_id, the deal room's chain") -- so this close event lands in
  -- the SAME chain as every other action already recorded against this
  -- room, not a separate or mismatched partition.
  v_entry := pack_v1.append_record(
    p_deal_room_id, p_actor_id, 'human'::pack_v1.actor_type,
    p_action, p_object_type, p_object_id, p_data
  );

  return query select true, true, v_entry.seq, v_entry.entry_hash;
end;
$$;

comment on function finalize_deal_close(uuid, uuid, text, text, uuid, jsonb) is
  'R15C + record-atomicity fix: mutual-close finalizer. Requires both deal_room_close flags true, then sets deal_rooms.status=closed + closed_at inside the app.deal_close_ctx GUC so the close-guard trigger allows it, then appends the record entry (pack_v1.append_record, org_id=deal_room_id matching every other deal-room action''s chain) in the SAME transaction, so the close and its audit entry commit or roll back together. Idempotent: a call against an already-closed room returns (closed=true, entry_written=false) and writes no new entry. SERVICE-ROLE ONLY -- trusts caller-supplied actor_id/data, must never be reachable by authenticated/anon. The old 1-arg finalize_deal_close(uuid) is retained alongside this one until the frontend calling it is fully migrated -- see this migration''s own header note; its drop is a separate, later migration.';

-- Lock down to service_role only. The new signature trusts a caller-supplied
-- p_actor_id/p_data with no internal re-derivation (unlike
-- advance_workflow_stage, which derives auth.uid() itself and is safe for
-- `authenticated` to call directly) -- this function must only ever be
-- reachable from the gateway's own service-role client, never a session
-- token. Every new SECURITY DEFINER function inherits EXECUTE TO PUBLIC by
-- default (CLAUDE.md §7.2's own standing lesson) -- explicit revoke first,
-- deliberately ordered before the grant per that same section's convention.
revoke all on function finalize_deal_close(uuid, uuid, text, text, uuid, jsonb) from public;
revoke execute on function finalize_deal_close(uuid, uuid, text, text, uuid, jsonb) from anon;
revoke execute on function finalize_deal_close(uuid, uuid, text, text, uuid, jsonb) from authenticated;
grant execute on function finalize_deal_close(uuid, uuid, text, text, uuid, jsonb) to service_role;
-- postgres retains implicit execute as function owner.

-- The old 1-arg finalize_deal_close(uuid) is DELIBERATELY NOT DROPPED in
-- this migration -- see the header note. It remains callable, unchanged,
-- exactly as it was before this migration, until a separate later migration
-- drops it once the frontend calling it (closing-fn.ts's finalizeClose()) is
-- confirmed off production.
