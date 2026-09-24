-- Extends finalize_counsel_waiver(uuid) and accept_lawyer_invite(uuid) to
-- take the caller's uid as an EXPLICIT parameter instead of reading
-- auth.uid() internally — found broken live during this pass's own
-- verification (24 Sep 2026, Closing-stage record-wiring): both functions
-- are now called from runAction's handle() via ctx.sb, the SERVICE-ROLE
-- client, which has no user session bound — auth.uid() evaluates to NULL
-- in that context, so accept_lawyer_invite returned not_authenticated for
-- a fully valid, authenticated caller. finalize_counsel_waiver has the
-- identical defect (same auth.uid() dependency, same service-role calling
-- context) though it had not yet been exercised live when this was found.
--
-- SAME PATTERN AS finalize_deal_close's OWN 6-ARG REWRITE
-- (20260924010000_finalize_deal_close_atomic_record.sql): a function
-- reached only through the service-role gateway takes actor identity as
-- an explicit parameter, sourced EXCLUSIVELY from runAction's own
-- requireUser()-verified ctx.uid (src/lib/actions/deal-room-counsel.ts),
-- never from client-supplied input, even indirectly. This is not a
-- weakening of the identity check — it is the same check, relocated from
-- "trust the session JWT auth.uid() resolves inside this function" (true
-- when called client-side, false once the caller is a service-role
-- client acting on a verified identity's behalf) to "trust the caller
-- that already verified identity before invoking this function" — which
-- is exactly runAction's own step-1 requireUser gate.
--
-- NO OTHER AUTHORIZATION LOGIC CHANGES. Every auth.uid()-derived check in
-- both function bodies (not_authenticated, self_acceptance_blocked,
-- not_authorized/membership) is preserved verbatim, just reading the new
-- parameter instead of the old internal variable. Each function has
-- exactly ONE auth.uid() reference (the v_uid declaration) — confirmed by
-- reading both bodies via pg_get_functiondef immediately before writing
-- this migration, not assumed.
--
-- OLD 1-ARG SIGNATURES DROPPED IN THE SAME MIGRATION — unlike
-- finalize_deal_close's old 1-arg overload (deliberately retained because
-- production's deployed frontend still called it), NEITHER of these two
-- functions has ever been reachable by any live frontend build: this
-- entire record-wiring pass, migration, and frontend change are landing
-- together, mid-development, never deployed. There is no dual-signature
-- window to preserve.

drop function if exists public.finalize_counsel_waiver(uuid);
drop function if exists public.accept_lawyer_invite(uuid);

create or replace function public.finalize_counsel_waiver(
  p_deal_room_id uuid,
  p_uid uuid
)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := p_uid;
  v_req deal_room_lawyer_requests%rowtype;
  v_founder_conf uuid;
  v_investor_conf uuid;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;
  if not exists (
    select 1 from deal_room_members
    where deal_room_id = p_deal_room_id and user_id = v_uid and role in ('founder','investor')
  ) then
    return query select false, 'not_authorized'; return;
  end if;
  select * into v_req from deal_room_lawyer_requests
    where deal_room_id = p_deal_room_id and kind = 'waive_counsel' and status = 'approved'
    order by resolved_at desc nulls last limit 1;
  if not found then
    return query select false, 'no_approved_waive_request'; return;
  end if;
  if v_req.side = 'founder' then
    v_founder_conf := v_req.requested_by; v_investor_conf := v_req.approved_by;
  else
    v_investor_conf := v_req.requested_by; v_founder_conf := v_req.approved_by;
  end if;
  perform set_config('app.waiver_ctx', 'on', true);
  update deal_rooms set
    waived_legal_counsel = true,
    waived_legal_counsel_at = now(),
    waived_legal_counsel_founder_confirmed_by = v_founder_conf,
    waived_legal_counsel_investor_confirmed_by = v_investor_conf
  where id = p_deal_room_id;
  perform set_config('app.waiver_ctx', 'off', true);
  return query select true, null::text;
end;
$$;

comment on function public.finalize_counsel_waiver(uuid, uuid) is
  'R14B counsel-waiver finalizer, ported onto the runAction gateway (24 Sep 2026). p_uid replaces the former internal auth.uid() read — the caller (deal-room-counsel.ts, ctx.uid, already verified by runAction''s requireUser) is now trusted explicitly rather than resolved from a session JWT this function no longer has access to as a service-role callee. All other authorization/business logic unchanged from the original 1-arg version.';

revoke all on function public.finalize_counsel_waiver(uuid, uuid) from public;
revoke execute on function public.finalize_counsel_waiver(uuid, uuid) from anon;
revoke execute on function public.finalize_counsel_waiver(uuid, uuid) from authenticated;
grant execute on function public.finalize_counsel_waiver(uuid, uuid) to service_role;


create or replace function public.accept_lawyer_invite(
  p_token uuid,
  p_uid uuid
)
returns table(ok boolean, deal_room_id uuid, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_invite deal_room_lawyer_invites%rowtype;
  v_uid uuid := p_uid;
begin
  if v_uid is null then
    return query select false, null::uuid, 'not_authenticated';
    return;
  end if;

  select * into v_invite from deal_room_lawyer_invites where token = p_token;
  if not found then
    return query select false, null::uuid, 'invalid_token';
    return;
  end if;
  if v_invite.accepted_at is not null then
    return query select false, null::uuid, 'already_accepted';
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select false, null::uuid, 'expired';
    return;
  end if;
  if v_invite.invited_by = v_uid then
    return query select false, null::uuid, 'self_acceptance_blocked';
    return;
  end if;

  insert into deal_room_members (deal_room_id, user_id, role, invited_by)
  values (v_invite.deal_room_id, v_uid, 'lawyer', v_invite.invited_by)
  on conflict do nothing;

  update deal_room_lawyer_invites
    set accepted_at = now(), accepted_by = v_uid
    where id = v_invite.id;

  return query select true, v_invite.deal_room_id, null::text;
end;
$$;

comment on function public.accept_lawyer_invite(uuid, uuid) is
  'R14B lawyer-invite acceptance, ported onto the runAction gateway (24 Sep 2026). p_uid replaces the former internal auth.uid() read — same rationale as finalize_counsel_waiver''s own comment. Called from a caller with NO prior deal_room_members row in this room (that row is what this function creates); authorization is token validity, checked in deal-room-counsel.ts''s own authorize() before this function is ever invoked, not room membership. All other logic (self-acceptance block, expiry, already-accepted) unchanged from the original 1-arg version.';

revoke all on function public.accept_lawyer_invite(uuid, uuid) from public;
revoke execute on function public.accept_lawyer_invite(uuid, uuid) from anon;
revoke execute on function public.accept_lawyer_invite(uuid, uuid) from authenticated;
grant execute on function public.accept_lawyer_invite(uuid, uuid) to service_role;
-- postgres retains implicit execute as function owner on both.
