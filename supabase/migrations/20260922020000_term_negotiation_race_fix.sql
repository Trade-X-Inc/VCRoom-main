-- Term-negotiation race fix (22 Sep 2026) — proposeTerm/acceptTerm/
-- rejectTerm's read-then-write (two separate HTTP round-trips, no lock,
-- no compare-and-swap) let a concurrent write from either side land
-- between the read and the write, so a decision computed against one
-- state could be applied on top of a DIFFERENT state that arrived in
-- between. Reproduced live in a synthetic room: an investor's Accept on
-- current_value='5000000' locked the term at current_value='4000000'
-- (the founder's counter-proposal, which landed mid-flight) with
-- accepted_by_founder=false in the final row — an internally
-- contradictory "locked" state nobody actually agreed to.
--
-- FIX SHAPE: each action becomes one atomic SECURITY DEFINER function —
-- SELECT ... FOR UPDATE locks the row (serializes concurrent calls on the
-- SAME term; a second caller simply waits for the first to commit, then
-- sees real current data), followed by a STALENESS CHECK against the
-- client-supplied expected_value/expected_status (what the UI actually
-- showed the user when they clicked). FOR UPDATE alone would still let a
-- second caller's stale decision silently apply to fresh state it never
-- saw — worse than the original race in one way, since it wouldn't even
-- surface to the user that anything happened. The staleness check is
-- what prevents that: on a mismatch, the function returns
-- {ok:false, error:'TERM_CHANGED'} instead of proceeding, and the client
-- must refresh and force the user to explicitly re-decide.
--
-- What did NOT move into SQL: the post-lock side effect (locking
-- deal_room_term_config + generating the room summary via
-- buildSummaryForRoom, summary-fn.ts) stays in TypeScript — it's real
-- application logic (template-ordered term list, party metadata,
-- structured JSON), not something to duplicate into a DB function. The
-- new accept_term_atomic() function returns whether the WHOLE SET just
-- became fully locked (both_after, same meaning as the old bothAfter);
-- term-negotiation-fn.ts's acceptTerm wrapper checks that flag and calls
-- maybeLockSet() exactly as it did before this change, just one layer up.
--
-- Grants: service_role only, matching every other pack-style function in
-- this session (session_expiry_log, step_up_tokens) — no direct table
-- grant to any role, verified live post-apply via has_function_privilege
-- / has_table_privilege before this is considered done.

CREATE OR REPLACE FUNCTION public.propose_term_atomic(
  p_term_id uuid,
  p_deal_room_id uuid,
  p_uid uuid,
  p_role text,
  p_value text,
  p_is_counter boolean,
  p_suggested_alternative text,
  p_expected_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
declare
  v_term record;
  v_other_role text;
begin
  select * into v_term
  from deal_room_terms
  where id = p_term_id and deal_room_id = p_deal_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'term_not_found');
  end if;

  if v_term.status = 'locked' then
    return jsonb_build_object('ok', false, 'error', 'term_locked');
  end if;

  -- Staleness check: the client's expected_status must match what's
  -- actually stored NOW, under the lock — not what it read before this
  -- call started. A mismatch means the term moved under the user
  -- between their last fetch and this click; do not proceed with their
  -- stale intent against the new state.
  if p_expected_status is not null and v_term.status <> p_expected_status then
    return jsonb_build_object(
      'ok', false, 'error', 'TERM_CHANGED',
      'current_status', v_term.status, 'current_value', v_term.current_value
    );
  end if;

  v_other_role := case when p_role = 'founder' then 'investor' else 'founder' end;

  update deal_room_terms
  set current_value = p_value,
      status = case when p_is_counter then 'counter' else 'proposed' end,
      accepted_by_founder = false,
      accepted_by_investor = false,
      awaiting_role = v_other_role
  where id = p_term_id;

  insert into deal_room_term_proposals
    (term_id, deal_room_id, action, proposed_value, suggested_alternative, actor_user_id, actor_role)
  values
    (p_term_id, p_deal_room_id, case when p_is_counter then 'counter' else 'propose' end,
     p_value, p_suggested_alternative, p_uid, p_role);

  return jsonb_build_object('ok', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_term_atomic(
  p_term_id uuid,
  p_deal_room_id uuid,
  p_uid uuid,
  p_role text,
  p_expected_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
declare
  v_term record;
  v_mine_column text;
  v_both_after boolean;
  v_other_role text;
begin
  select * into v_term
  from deal_room_terms
  where id = p_term_id and deal_room_id = p_deal_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'term_not_found');
  end if;

  if v_term.status = 'locked' then
    return jsonb_build_object('ok', true, 'already_locked', true);
  end if;

  if v_term.current_value is null or v_term.status not in ('proposed', 'counter', 'accepted') then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_accept');
  end if;

  -- Staleness check: the value being accepted must be the value ACTUALLY
  -- stored right now, under the lock. This is the exact case the
  -- reproduction exploited — accepting a value that changed underneath
  -- the caller between their read and this call.
  if p_expected_value is not null and v_term.current_value <> p_expected_value then
    return jsonb_build_object(
      'ok', false, 'error', 'TERM_CHANGED',
      'current_status', v_term.status, 'current_value', v_term.current_value
    );
  end if;

  v_other_role := case when p_role = 'founder' then 'investor' else 'founder' end;

  if p_role = 'founder' then
    v_mine_column := 'accepted_by_founder';
    v_both_after := true and v_term.accepted_by_investor;
  else
    v_mine_column := 'accepted_by_investor';
    v_both_after := v_term.accepted_by_founder and true;
  end if;

  if v_both_after then
    update deal_room_terms
    set accepted_by_founder = (case when p_role = 'founder' then true else accepted_by_founder end),
        accepted_by_investor = (case when p_role = 'investor' then true else accepted_by_investor end),
        status = 'locked',
        awaiting_role = null
    where id = p_term_id;
  else
    update deal_room_terms
    set accepted_by_founder = (case when p_role = 'founder' then true else accepted_by_founder end),
        accepted_by_investor = (case when p_role = 'investor' then true else accepted_by_investor end),
        status = 'accepted',
        awaiting_role = v_other_role
    where id = p_term_id;
  end if;

  insert into deal_room_term_proposals
    (term_id, deal_room_id, action, actor_user_id, actor_role)
  values
    (p_term_id, p_deal_room_id, 'accept', p_uid, p_role);

  return jsonb_build_object('ok', true, 'term_locked', v_both_after);
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_term_atomic(
  p_term_id uuid,
  p_deal_room_id uuid,
  p_uid uuid,
  p_role text,
  p_suggested_alternative text,
  p_expected_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
declare
  v_term record;
  v_other_role text;
begin
  select * into v_term
  from deal_room_terms
  where id = p_term_id and deal_room_id = p_deal_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'term_not_found');
  end if;

  if v_term.status = 'locked' then
    return jsonb_build_object('ok', false, 'error', 'term_locked');
  end if;

  if p_expected_status is not null and v_term.status <> p_expected_status then
    return jsonb_build_object(
      'ok', false, 'error', 'TERM_CHANGED',
      'current_status', v_term.status, 'current_value', v_term.current_value
    );
  end if;

  v_other_role := case when p_role = 'founder' then 'investor' else 'founder' end;

  update deal_room_terms
  set status = 'rejected',
      accepted_by_founder = false,
      accepted_by_investor = false,
      awaiting_role = v_other_role
  where id = p_term_id;

  insert into deal_room_term_proposals
    (term_id, deal_room_id, action, suggested_alternative, actor_user_id, actor_role)
  values
    (p_term_id, p_deal_room_id, 'reject', p_suggested_alternative, p_uid, p_role);

  return jsonb_build_object('ok', true);
end;
$function$;

-- IMPORTANT: `revoke ... from public` alone does NOT close this project's
-- default EXECUTE grant to anon/authenticated — confirmed live: every new
-- function in this schema comes back with anon=X/authenticated=X already
-- in pg_proc.proacl (same as the pre-existing finalize_deal_close), which
-- is a per-role grant independent of PUBLIC's own ACL entry, so revoking
-- from PUBLIC does not touch it. Found live on THIS migration, closed the
-- same session, before any call site went live against it. Matches the
-- established fix for the identical class of bug on accept_team_invite
-- (migration 20260727010000): revoke explicitly from anon AND
-- authenticated, not just public.
revoke all on function public.propose_term_atomic(uuid, uuid, uuid, text, text, boolean, text, text) from anon, authenticated, public;
grant execute on function public.propose_term_atomic(uuid, uuid, uuid, text, text, boolean, text, text) to service_role;

revoke all on function public.accept_term_atomic(uuid, uuid, uuid, text, text) from anon, authenticated, public;
grant execute on function public.accept_term_atomic(uuid, uuid, uuid, text, text) to service_role;

revoke all on function public.reject_term_atomic(uuid, uuid, uuid, text, text, text) from anon, authenticated, public;
grant execute on function public.reject_term_atomic(uuid, uuid, uuid, text, text, text) to service_role;
