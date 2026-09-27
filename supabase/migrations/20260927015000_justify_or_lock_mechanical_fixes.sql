-- Justify-or-lock audit, Migration 1 (mechanical) — 27 Sep 2026.
-- No frontend coordination needed: no function signature seen by any real
-- caller changes shape or behavior for the callers that legitimately use
-- these functions today. Four parts:
--
-- A. search_path hardening on the 8 function_search_path_mutable findings.
--    All 8 confirmed via pg_get_functiondef to have zero unqualified
--    user-schema object references — every unqualified call resolves to a
--    pg_catalog built-in (now(), current_setting(), coalesce(),
--    array_position()) or an already-schema-qualified auth.uid(). Purely
--    mechanical; none needed special handling.
--
-- B. Drop the anon grant only (keep authenticated) on 9 functions
--    confirmed via pg_get_functiondef to be auth.uid()-gated internally —
--    an anon caller resolves to a null identity and is already correctly
--    rejected by the function's own logic. The anon grant on these is
--    inert, not exploitable, but strictly unnecessary (they are RLS-policy
--    helpers and internal permission checks, never intended as public
--    readers).
--
-- C. Drop 5 functions confirmed dead — zero frontend callers (checked via
--    .rpc() grep AND raw fetch()/rpc endpoint grep), zero references in any
--    other function's body (checked via prosrc ILIKE across every schema),
--    zero RLS policy references (checked against live pg_policies, not
--    migration-file text), zero trigger/event-trigger wiring (checked
--    against live pg_trigger/pg_event_trigger, not assumed from a
--    CREATE TRIGGER grep — this distinction mattered this session:
--    six OTHER functions initially flagged dead by a repo-only grep turned
--    out to be live event triggers, live auth.users triggers, or live RLS-
--    policy helpers, once checked against these live catalogs instead).
--
-- D. Add the profile_published = true gate to
--    get_public_investor_profile_by_user_id and
--    get_public_investor_profiles_by_user_ids, matching the already-correct
--    behavior of the slug-keyed sibling get_public_investor_profile. This
--    was a real inconsistency relative to this codebase's own convention,
--    not an acceptable design choice — an unpublished/incomplete investor
--    profile could otherwise leak its public_fields-whitelisted values
--    before the owner intends.

-- ============================================================================
-- A. search_path hardening — 8 functions, mechanical
-- ============================================================================

alter function public.touch_desk_tasks_updated_at() set search_path = 'public', 'pg_temp';
alter function public.r15a_touch_updated_at() set search_path = 'public', 'pg_temp';
alter function public.enforce_counsel_waiver_write() set search_path = 'public', 'pg_temp';
alter function public.enforce_deal_room_close_guard() set search_path = 'public', 'pg_temp';
alter function public.enforce_workflow_stage_order() set search_path = 'public', 'pg_temp';
alter function public.r15a_guard_config_insert() set search_path = 'public', 'pg_temp';
alter function public.r15a_guard_term_insert() set search_path = 'public', 'pg_temp';
alter function public.r15b_guard_agreement_insert() set search_path = 'public', 'pg_temp';

-- ============================================================================
-- B. Drop anon grant only, keep authenticated — 9 functions, all confirmed
--    auth.uid()-gated internally (anon resolves to null identity, already
--    correctly rejected by the function's own logic)
--
-- CORRECTED before first apply: all 9 carry a bare `=X/postgres` PUBLIC
-- grant in their live proacl, in addition to their own named anon grant —
-- confirmed via pg_proc.proacl, independently re-verified by the reviewer
-- against the same live data. `REVOKE EXECUTE ... FROM anon` alone removes
-- only anon's own named ACL entry; PUBLIC's separate entry stands, and anon
-- inherits execute through it regardless — a no-op against the advisor
-- finding as originally drafted. Each function below gets BOTH
-- `REVOKE ALL ... FROM PUBLIC` (removes the bare `=X` entry) AND
-- `REVOKE EXECUTE ... FROM anon` (removes anon's own named entry, defense
-- in depth in case a future grant re-adds it directly rather than via
-- PUBLIC) — same two-statement pattern already used correctly for
-- global_search/check_and_increment_ai_usage in Migration 2.
-- `REVOKE ... FROM PUBLIC` touches only PUBLIC's own entry; authenticated's
-- separate, explicit grant is untouched by either statement, so no re-grant
-- is needed to preserve it.
-- ============================================================================

revoke all on function public.founder_has_permission(uuid, text) from public;
revoke execute on function public.founder_has_permission(uuid, text) from anon;

revoke all on function public.get_founder_team_role(uuid) from public;
revoke execute on function public.get_founder_team_role(uuid) from anon;

revoke all on function public.get_investor_team_role(uuid) from public;
revoke execute on function public.get_investor_team_role(uuid) from anon;

revoke all on function public.investor_has_permission(uuid, text) from public;
revoke execute on function public.investor_has_permission(uuid, text) from anon;

revoke all on function public.can_appoint_role(uuid, uuid, text) from public;
revoke execute on function public.can_appoint_role(uuid, uuid, text) from anon;

revoke all on function public.drm_can_create_room_member(uuid, uuid) from public;
revoke execute on function public.drm_can_create_room_member(uuid, uuid) from anon;

revoke all on function public.can_access_deal_room_doc_path(text) from public;
revoke execute on function public.can_access_deal_room_doc_path(text) from anon;

revoke all on function public.can_access_founder_doc_path(text) from public;
revoke execute on function public.can_access_founder_doc_path(text) from anon;

revoke all on function public.get_investor_profile_in_room(uuid, uuid) from public;
revoke execute on function public.get_investor_profile_in_room(uuid, uuid) from anon;

-- ============================================================================
-- C. Drop 5 confirmed-dead functions outright
-- ============================================================================

drop function if exists public.get_my_deal_room_startup_ids();
drop function if exists public.get_investor_team_role_by_profile_id(uuid);
drop function if exists public.notify_prep_graduated(uuid, uuid, text, text, text);
drop function if exists public.notify_prep_invite_accepted(uuid, uuid, uuid, text, text, text);
drop function if exists public.roast_question_pool_count(uuid);

-- ============================================================================
-- D. Add profile_published = true gate to the two by-user-id investor
--    profile readers, matching get_public_investor_profile's own gate.
-- ============================================================================

create or replace function public.get_public_investor_profile_by_user_id(p_user_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case when p.id is null then null else (
    select jsonb_object_agg(key, value)
    from jsonb_each(to_jsonb(p))
    where key = 'id' or key = any(p.public_fields)
  ) end
  from investor_profiles p
  where p.user_id = p_user_id
    and p.profile_published = true
  limit 1;
$function$;

comment on function public.get_public_investor_profile_by_user_id(uuid) is
  'Justify-or-lock audit fix (27 Sep 2026). Added profile_published = true, matching the slug-keyed sibling get_public_investor_profile — the by-user-id variant was missing this gate, meaning an unpublished/incomplete investor profile''s public_fields-whitelisted values could be read before the owner intended publication. No signature change; existing callers unaffected except that an unpublished profile now correctly returns null.';

create or replace function public.get_public_investor_profiles_by_user_ids(p_user_ids uuid[])
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  from (
    select (
      select jsonb_object_agg(key, value)
      from jsonb_each(to_jsonb(p))
      where key in ('id', 'user_id') or key = any(p.public_fields)
    ) as row_data
    from investor_profiles p
    where p.user_id = any(p_user_ids)
      and p.profile_published = true
  ) sub;
$function$;

comment on function public.get_public_investor_profiles_by_user_ids(uuid[]) is
  'Justify-or-lock audit fix (27 Sep 2026). Added profile_published = true, matching get_public_investor_profile. Same rationale as get_public_investor_profile_by_user_id''s sibling fix. No signature change; unpublished profiles are now silently excluded from the batch result rather than included.';
