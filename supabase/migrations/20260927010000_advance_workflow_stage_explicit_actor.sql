-- Extends advance_workflow_stage(uuid, text) to take the caller's uid as
-- an EXPLICIT parameter instead of reading auth.uid() internally — same
-- defect class found and fixed twice already this build
-- (finalize_counsel_waiver / accept_lawyer_invite, migration
-- 20260924030000_counsel_lawyer_fns_explicit_actor.sql): the function is
-- now called from runAction's handle() via ctx.sb, the SERVICE-ROLE
-- client, which has no user session bound — auth.uid() evaluates to NULL
-- in that context, breaking the function's own not_authenticated check
-- for a fully valid, authenticated caller.
--
-- SAME PATTERN, ENUMERATED PER INSTRUCTION: exactly ONE auth.uid()
-- reference exists in this function's body (the v_uid declaration line),
-- confirmed by reading the live definition via pg_get_functiondef
-- immediately before writing this migration, not assumed from memory or
-- from the two prior functions' shape. p_uid replaces it, sourced
-- EXCLUSIVELY from runAction's own requireUser()-verified ctx.uid
-- (src/lib/actions/deal-room-stage.ts), never from client input.
--
-- NO OTHER LOGIC CHANGES. The role check (deal_room_members, founder/
-- investor only), the not_found check, the invalid_stage /
-- not_adjacent adjacency checks against the same hardcoded 5-stage
-- array, and the final UPDATE are all preserved verbatim — only the
-- identity source changes.
--
-- OLD 2-ARG SIGNATURE DROPPED IN THE SAME MIGRATION — same reasoning as
-- the counsel-gate migration: this entire record-wiring pass (recon,
-- action design, this migration, and the frontend change wiring
-- useStageTransition.ts onto the gateway) lands together, mid-
-- development, never deployed. There is no dual-signature window to
-- preserve; the old 2-arg signature has never been reachable by a live
-- frontend build with this ported call path.
--
-- GRANTS — advance_workflow_stage currently holds EXECUTE for
-- `authenticated` (flagged by the Supabase security advisor, and the
-- reason this whole pass exists). Recon confirmed the ONLY caller
-- anywhere — frontend, SQL, or edge functions — is
-- useStageTransition.ts's single RPC call site, now migrated onto this
-- gateway action in the same frontend change as this migration. Revoking
-- `authenticated` here, in the same migration, closes the advisor
-- finding with no dual-path window: once this migration and the
-- frontend change both land, there is no code path anywhere that calls
-- this function with a session-bound client.

drop function if exists public.advance_workflow_stage(uuid, text);

create or replace function public.advance_workflow_stage(
  p_deal_room_id uuid,
  p_uid uuid,
  p_to_stage text
)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := p_uid;
  v_role text;
  v_current text;
  v_order text[] := array['nda_signed','qa','diligence','term_sheet','closing_confirmed'];
  v_current_idx int;
  v_target_idx int;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;

  select drm.role into v_role
  from deal_room_members drm
  where drm.deal_room_id = p_deal_room_id and drm.user_id = v_uid
  limit 1;

  if v_role is null or v_role not in ('founder','investor') then
    return query select false, 'not_authorized'; return;
  end if;

  select workflow_stage into v_current from deal_rooms where id = p_deal_room_id;
  if v_current is null then
    return query select false, 'not_found'; return;
  end if;

  v_current_idx := array_position(v_order, v_current);
  v_target_idx := array_position(v_order, p_to_stage);

  if v_target_idx is null then
    return query select false, 'invalid_stage'; return;
  end if;
  if v_current_idx is null or v_target_idx <> v_current_idx + 1 then
    return query select false, 'not_adjacent'; return;
  end if;

  update deal_rooms set workflow_stage = p_to_stage, updated_at = now()
  where id = p_deal_room_id;

  return query select true, null::text;
end;
$$;

comment on function public.advance_workflow_stage(uuid, uuid, text) is
  'Closing-stage record-wiring pass (27 Sep 2026), stage-transition gateway port. p_uid replaces the former internal auth.uid() read — the caller (deal-room-stage.ts, ctx.uid, already verified by runAction''s requireUser) is now trusted explicitly rather than resolved from a session JWT this function no longer has access to as a service-role callee. All other authorization/adjacency logic unchanged from the original 2-arg version.';

revoke all on function public.advance_workflow_stage(uuid, uuid, text) from public;
revoke execute on function public.advance_workflow_stage(uuid, uuid, text) from anon;
revoke execute on function public.advance_workflow_stage(uuid, uuid, text) from authenticated;
grant execute on function public.advance_workflow_stage(uuid, uuid, text) to service_role;
-- postgres retains implicit execute as function owner.
