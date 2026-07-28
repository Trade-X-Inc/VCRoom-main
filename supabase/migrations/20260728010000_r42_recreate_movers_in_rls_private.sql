-- R42 (2/4) — batch move: recreate the 11 remaining param-trusting RLS
-- helpers in rls_private. See CLAUDE.md §50. Each was live-proven to leak
-- foreign data to a zero-membership account (room member lists, profile ids,
-- and the founder/investor relationship graph via boolean (room,user)
-- oracles). Bodies pinned search_path='' + fully-qualified.
create schema if not exists rls_private;
grant usage on schema rls_private to authenticated, anon, service_role;
create or replace function rls_private.deal_room_information_unlocked(p_deal_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.deal_rooms dr
    where dr.id = p_deal_room_id
      and dr.workflow_stage in ('initial_review', 'qa', 'diligence', 'term_sheet', 'closed')
  );
$fn$;
grant execute on function rls_private.deal_room_information_unlocked(p_deal_room_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.dr_is_open(p_deal_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select coalesce((select status is distinct from 'closed' from public.deal_rooms where id = p_deal_room_id), false);
$fn$;
grant execute on function rls_private.dr_is_open(p_deal_room_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.dr_is_principal(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.deal_room_members dm
    where dm.deal_room_id = p_deal_room_id
      and dm.user_id = p_user_id
      and dm.role in ('founder', 'investor')
  );
$fn$;
grant execute on function rls_private.dr_is_principal(p_deal_room_id uuid, p_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.dr_is_room_member(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.deal_room_members dm
    where dm.deal_room_id = p_deal_room_id
      and dm.user_id = p_user_id
      and dm.role in ('founder', 'investor', 'lawyer')
  );
$fn$;
grant execute on function rls_private.dr_is_room_member(p_deal_room_id uuid, p_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.drm_is_founder_of_room(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.deal_rooms dr
    join public.startups s on s.id = dr.startup_id
    where dr.id = p_deal_room_id
      and s.founder_id = p_user_id
  );
$fn$;
grant execute on function rls_private.drm_is_founder_of_room(p_deal_room_id uuid, p_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.get_deal_room_member_ids(p_room_id uuid)
returns SETOF uuid
language sql stable security definer
set search_path = ''
as $fn$
  SELECT user_id FROM public.deal_room_members WHERE deal_room_id = p_room_id AND user_id IS NOT NULL;
$fn$;
grant execute on function rls_private.get_deal_room_member_ids(p_room_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.get_investor_profile_id_for_user(p_user_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $fn$
  SELECT id FROM public.investor_profiles WHERE user_id = p_user_id LIMIT 1;
$fn$;
grant execute on function rls_private.get_investor_profile_id_for_user(p_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.investor_can_request_access(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select
    exists (select 1 from public.investor_profiles where user_id = p_user_id)
    or exists (
      select 1 from public.startup_team_accounts
      where user_id = p_user_id
        and investor_profile_id is not null
        and status = 'active'
        and role in ('admin', 'associate')
    );
$fn$;
grant execute on function rls_private.investor_can_request_access(p_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.investor_team_member_owner_user_id(p_investor_profile_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $fn$
  select user_id from public.investor_profiles where id = p_investor_profile_id;
$fn$;
grant execute on function rls_private.investor_team_member_owner_user_id(p_investor_profile_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.investor_user_id_has_open_invite(p_investor_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (select 1 from public.team_invites ti where ti.investor_profile_id = p_investor_user_id);
$fn$;
grant execute on function rls_private.investor_user_id_has_open_invite(p_investor_user_id uuid) to authenticated, anon, service_role;
create or replace function rls_private.startup_id_has_open_invite(p_startup_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (select 1 from public.team_invites ti where ti.startup_id = p_startup_id);
$fn$;
grant execute on function rls_private.startup_id_has_open_invite(p_startup_id uuid) to authenticated, anon, service_role;
