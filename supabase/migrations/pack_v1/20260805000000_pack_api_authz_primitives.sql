-- ═══════════════════════════════════════════════════════════════════════════
-- pack_api authorization primitives — the membership/permission logic ported
-- from the live RLS layer, so migrated gateway actions authorize AT LEAST as
-- strongly as the RLS they replace (Step-0 audit found the gateway placeholder
-- was WEAKER: org-ownership only, not membership-scoped).
--
-- THE ONE TRANSFORMATION, applied uniformly and non-negotiably:
--   the source RLS functions derive identity from auth.uid() — the RLS querying
--   context. The gateway runs as service_role, where auth.uid() IS NULL. So a
--   naive copy is BROKEN (everything returns false/empty). Every auth.uid() in
--   the source is replaced by an explicit p_uid parameter: the token-verified
--   uid that defineAction resolves via requireUser(). p_uid is the SUBJECT whose
--   access is being tested; it is never proof of identity (that is proven
--   upstream, and the service_role-only grant is what stops a forged p_uid).
--
-- Discipline (every function): SECURITY DEFINER, SET search_path = '' (strictest
-- §7.2 form — all refs fully-qualified public.*), service_role-only, zero tables.
--
-- Each function's source RLS/function body and the exact line-by-line mapping is
-- in AUTHZ_MAPPING.md. Do not re-derive this logic per feature — check every
-- migrated action's authorize() against that document.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── authz_get_user_deal_room_ids ────────────────────────────────────────────
-- Source: rls_private.get_user_deal_room_ids(p_user_id)  [already parameterised,
-- no auth.uid() — a straight namespace move]
--   select deal_room_id from public.deal_room_members
--   where user_id = p_user_id and deal_room_id is not null;
create or replace function pack_api.authz_get_user_deal_room_ids(p_uid uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $fn$
  select deal_room_id from public.deal_room_members
  where user_id = p_uid and deal_room_id is not null;
$fn$;

-- ── authz_is_deal_room_member ───────────────────────────────────────────────
-- Not a source function per se, but the membership predicate every deal-room RLS
-- policy expresses inline:  deal_room_id IN (SELECT ... deal_room_members WHERE
-- user_id = auth.uid()).  Provided as a single primitive so no migrated action
-- re-inlines it (and gets the null-handling subtly wrong).
create or replace function pack_api.authz_is_deal_room_member(p_uid uuid, p_deal_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select p_uid is not null and p_deal_room_id is not null and exists (
    select 1 from public.deal_room_members
    where user_id = p_uid and deal_room_id = p_deal_room_id
  );
$fn$;

-- ── authz_dr_is_open ────────────────────────────────────────────────────────
-- Source: rls_private.dr_is_open(p_deal_room_id)  [no auth.uid(); namespace move]
--   select coalesce((select status is distinct from 'closed'
--                    from public.deal_rooms where id = p_deal_room_id), false);
create or replace function pack_api.authz_dr_is_open(p_deal_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select coalesce(
    (select status is distinct from 'closed' from public.deal_rooms where id = p_deal_room_id),
    false);
$fn$;

-- ── authz_is_startup_founder ────────────────────────────────────────────────
-- Source: public.is_startup_founder(startup_id)
--   SELECT EXISTS (SELECT 1 FROM startups WHERE id = startup_id
--                  AND founder_id = (SELECT auth.uid()));
-- auth.uid() → p_uid.
create or replace function pack_api.authz_is_startup_founder(p_uid uuid, p_startup_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select p_uid is not null and exists (
    select 1 from public.startups
    where id = p_startup_id and founder_id = p_uid
  );
$fn$;

-- ── authz_get_founder_team_role ─────────────────────────────────────────────
-- Source: public.get_founder_team_role(p_startup_id)  [auth.uid() → p_uid, x2]
--   case when exists(startups where id=p_startup_id and founder_id=auth.uid())
--        then 'owner'
--        else (select role from startup_team_accounts
--              where startup_id=p_startup_id and user_id=auth.uid()
--                and status='active' limit 1) end;
create or replace function pack_api.authz_get_founder_team_role(p_uid uuid, p_startup_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $fn$
  select case
    when p_uid is null then null
    when exists (select 1 from public.startups
                 where id = p_startup_id and founder_id = p_uid)
      then 'owner'
    else (
      select role from public.startup_team_accounts
      where startup_id = p_startup_id
        and user_id = p_uid
        and status = 'active'
      limit 1
    )
  end;
$fn$;

-- ── authz_founder_has_permission ────────────────────────────────────────────
-- Source: public.founder_has_permission(p_startup_id, p_permission)
--   v_role := get_founder_team_role(p_startup_id);
--   null → false; owner/admin → true;
--   manager → permission in (edit_profile,create_deal_room,view_all_deal_rooms,
--                            upload_documents,edit_pipeline,view_analytics,use_ai_advisor);
--   analyst → permission in (upload_documents,use_ai_advisor);
--   viewer → false; else false.
-- NOTE preserved exactly: source checks role in ('owner','admin') even though
-- get_founder_team_role only ever RETURNS 'owner' (never 'admin') — porting the
-- source's boolean verbatim, not "fixing" it, per the line-by-line rule. If
-- 'admin' should be reachable that's a separate, flagged decision, not a silent
-- change here.
create or replace function pack_api.authz_founder_has_permission(p_uid uuid, p_startup_id uuid, p_permission text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_role text := pack_api.authz_get_founder_team_role(p_uid, p_startup_id);
begin
  if v_role is null then return false; end if;
  if v_role in ('owner','admin') then return true; end if;
  if v_role = 'manager' then
    return p_permission in ('edit_profile','create_deal_room','view_all_deal_rooms',
                            'upload_documents','edit_pipeline','view_analytics','use_ai_advisor');
  end if;
  if v_role = 'analyst' then
    return p_permission in ('upload_documents','use_ai_advisor');
  end if;
  if v_role = 'viewer' then
    return false;
  end if;
  return false;
end;
$fn$;

-- ── authz_drm_can_create_room_member ────────────────────────────────────────
-- Source: public.drm_can_create_room_member(p_deal_room_id, p_user_id)
--   exists(select 1 from deal_rooms dr join startups s on s.id=dr.startup_id
--          where dr.id=p_deal_room_id
--            and founder_has_permission(s.id,'create_deal_room'));
-- NOTE the source's second param p_user_id is UNUSED in its own body (it relies
-- on founder_has_permission → auth.uid()). Here we thread p_uid through
-- explicitly so the permission check is actually against the caller.
create or replace function pack_api.authz_drm_can_create_room_member(p_uid uuid, p_deal_room_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.deal_rooms dr
    join public.startups s on s.id = dr.startup_id
    where dr.id = p_deal_room_id
      and pack_api.authz_founder_has_permission(p_uid, s.id, 'create_deal_room')
  );
$fn$;

-- ── authz_get_investor_startup_ids ──────────────────────────────────────────
-- Source: public.get_investor_startup_ids()   [auth.uid() → p_uid]
--   SELECT dr.startup_id FROM deal_rooms dr
--   INNER JOIN deal_room_members drm ON dr.id=drm.deal_room_id
--   WHERE drm.user_id=(SELECT auth.uid());
create or replace function pack_api.authz_get_investor_startup_ids(p_uid uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $fn$
  select dr.startup_id
  from public.deal_rooms dr
  join public.deal_room_members drm on dr.id = drm.deal_room_id
  where drm.user_id = p_uid;
$fn$;

-- ── authz_get_investor_team_role ────────────────────────────────────────────
-- Source: public.get_investor_team_role(p_investor_profile_id)  [auth.uid() → p_uid, x2]
--   case when exists(investor_profiles where user_id=p_investor_profile_id
--                    and user_id=auth.uid()) then 'owner'
--        else (select role from startup_team_accounts
--              where investor_profile_id=p_investor_profile_id
--                and user_id=auth.uid() and status='active' limit 1) end;
create or replace function pack_api.authz_get_investor_team_role(p_uid uuid, p_investor_profile_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $fn$
  select case
    when p_uid is null then null
    when exists (select 1 from public.investor_profiles
                 where user_id = p_investor_profile_id and user_id = p_uid)
      then 'owner'
    else (
      select role from public.startup_team_accounts
      where investor_profile_id = p_investor_profile_id
        and user_id = p_uid
        and status = 'active'
      limit 1
    )
  end;
$fn$;

-- ── grants: service_role only, every function ───────────────────────────────
do $grants$
declare fn text;
begin
  foreach fn in array array[
    'pack_api.authz_get_user_deal_room_ids(uuid)',
    'pack_api.authz_is_deal_room_member(uuid,uuid)',
    'pack_api.authz_dr_is_open(uuid)',
    'pack_api.authz_is_startup_founder(uuid,uuid)',
    'pack_api.authz_get_founder_team_role(uuid,uuid)',
    'pack_api.authz_founder_has_permission(uuid,uuid,text)',
    'pack_api.authz_drm_can_create_room_member(uuid,uuid)',
    'pack_api.authz_get_investor_startup_ids(uuid)',
    'pack_api.authz_get_investor_team_role(uuid,uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$grants$;
