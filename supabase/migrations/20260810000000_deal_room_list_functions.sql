-- Deal-room-core, remaining step 1 of 3 (§20.1): multi-room list functions.
-- Column contract traced from the three actual call sites, not assumed:
--
--   app.deal-rooms.index.tsx   founder, startup_id-scoped
--     select("id, status, created_at, updated_at, investor_name,
--             investor_email, investor_company").eq("startup_id", ...)
--   useRaiseProgress.ts        founder, startup_id-scoped, DIFFERENT columns
--     select("id, status, workflow_stage, term_sheet_status").eq("startup_id", ...)
--   useDealFlowProgress.ts     investor, MEMBERSHIP-scoped, different columns again
--     .from("deal_room_members")...then .from("deal_rooms")
--       .select("id, status, investor_decision").in("id", roomIds)
--
-- Two share an authorization predicate (authz_is_startup_founder) but need
-- different column sets; the third has an entirely different predicate
-- (membership, not startup ownership) and its own columns. Three separate
-- functions, matching the doc_list_room/doc_list_library/doc_list_investor
-- precedent -- not a superset, same reasoning: a caller that only needs one
-- shape has no reason to receive the others' fields.
--
-- Both established rules for this migration group applied:
--   1. Empty result returns [] via the 'rooms' key inside an {ok:true,...}
--      envelope, never 'forbidden' for a legitimate empty list -- distinct
--      from the single-room room_get_* functions, where a non-member
--      genuinely gets rejected. Here, "founder with zero rooms" and
--      "investor with zero memberships" are both real, common, everyday
--      states, not authorization failures. ~17 existing call sites across
--      the app already depend on empty-list-not-error for this exact shape.
--   2. Lawyer scoping verified, not assumed, per function:
--      - room_list_by_startup / room_list_progress_founder: a lawyer is
--        never a startup's founder_id, so authz_is_startup_founder excludes
--        them BY CONSTRUCTION, not via any (b)-style narrowing. No lawyer
--        branch needed -- confirmed in the adversarial matrix, not assumed.
--      - room_list_progress_investor: this one required an actual decision.
--        useDealFlowProgress.ts gates on the CLIENT's global user.role ===
--        "investor", which a room-scoped lawyer can hold (a lawyer's global
--        role is "investor" per useDealRoomContext.ts's established
--        comment) -- membership alone would NOT exclude them. This
--        aggregates diligence-pipeline metrics (active rooms, pending
--        decisions) a lawyer has no diligence access to under (b).
--        Narrowed: excludes any deal_room_members row where role='lawyer'
--        for the calling uid, matching (b)'s diligence-adjacent reasoning
--        rather than reusing authz_is_room_lawyer as-is (that primitive is
--        per-room; this needs "any room where I am a lawyer", applied
--        across the whole list).

-- ── 1. Founder's own room list (app.deal-rooms.index.tsx) ──────────────
create or replace function pack_api.room_list_by_startup(p_uid uuid, p_startup_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_startup_founder(p_uid, p_startup_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object('ok', true, 'rooms', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'status', d.status, 'created_at', d.created_at, 'updated_at', d.updated_at,
      'investor_name', d.investor_name, 'investor_email', d.investor_email, 'investor_company', d.investor_company
    ) order by d.updated_at desc)
    from public.deal_rooms d
    where d.startup_id = p_startup_id
  ), '[]'::jsonb));
end;
$function$;

-- ── 2. Founder's raise-progress room aggregation (useRaiseProgress.ts) ──
create or replace function pack_api.room_list_progress_founder(p_uid uuid, p_startup_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_startup_founder(p_uid, p_startup_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object('ok', true, 'rooms', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'status', d.status, 'workflow_stage', d.workflow_stage, 'term_sheet_status', d.term_sheet_status
    ))
    from public.deal_rooms d
    where d.startup_id = p_startup_id
  ), '[]'::jsonb));
end;
$function$;

-- ── 3. Investor's deal-flow room aggregation (useDealFlowProgress.ts) ───
-- Membership-scoped, not startup-scoped -- an investor has rooms across
-- many different startups. Lawyer-held rooms excluded (see note above).
create or replace function pack_api.room_list_progress_investor(p_uid uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  return jsonb_build_object('ok', true, 'rooms', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'status', d.status, 'investor_decision', d.investor_decision
    ))
    from public.deal_rooms d
    join public.deal_room_members m on m.deal_room_id = d.id
    where m.user_id = p_uid
      and m.role <> 'lawyer'
  ), '[]'::jsonb));
end;
$function$;

revoke execute on function pack_api.room_list_by_startup(uuid, uuid) from public;
revoke execute on function pack_api.room_list_progress_founder(uuid, uuid) from public;
revoke execute on function pack_api.room_list_progress_investor(uuid) from public;

grant execute on function pack_api.room_list_by_startup(uuid, uuid) to service_role;
grant execute on function pack_api.room_list_progress_founder(uuid, uuid) to service_role;
grant execute on function pack_api.room_list_progress_investor(uuid) to service_role;
