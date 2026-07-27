-- R40 follow-up: three items.
--
-- 1. CRITICAL CORRECTION: `SET search_path TO 'public'` (a non-empty, named
--    schema) does NOT stop pg_temp shadowing of SECURITY DEFINER function
--    bodies -- proven wrong empirically in this session. drm_is_founder_of_room
--    (added in the prior R40 hotfix migration with this exact pattern,
--    believed safe at the time) was re-tested by shadowing its SECOND
--    joined table (startups) rather than the first (deal_rooms) -- the
--    earlier "safe" verdict was a test-construction flaw: the fake room id
--    used in that first test had no matching row in the real (unshadowed)
--    startups table, so the join correctly returned zero rows regardless
--    of whether deal_rooms was shadowed, proving nothing. Shadowing
--    `startups` instead, with a row matching a REAL room's real
--    startup_id owned by someone else, flipped the result to `true` for a
--    room the caller does not own.
--
--    Also found two genuinely UNPINNED (no search_path clause at all)
--    SECURITY DEFINER functions via a full-database audit:
--    get_user_deal_room_ids and get_deal_room_member_ids. A real pg_temp
--    shadow attack, run as `authenticated` (confirmed to hold TEMP
--    privilege) against a genuine non-member, successfully returned a
--    foreign deal_room_id from get_user_deal_room_ids, and a real
--    downstream data read through nda_room_members_read (which calls that
--    function) returned all 4 real nda_acceptances rows for a foreign
--    room, including full NDA text and real signer names -- a working
--    privilege escalation, worse than the vulnerability the original R40
--    hotfix closed.
--
--    The ONLY fix proven to hold: `SET search_path = ''` (empty, not a
--    named schema) with every table reference fully qualified
--    (public.table_name). Verified immune across all attack variants:
--    shadowing deal_room_members, deal_rooms, and startups all correctly
--    fail to influence the result after this fix.
--
--    NOTE: a full-database audit found ~38 other SECURITY DEFINER
--    functions using the same `SET search_path TO 'public'` pattern
--    (is_startup_founder, dr_is_principal, dr_is_room_member,
--    investor_can_request_access, can_access_deal_room_doc_path, etc.).
--    These are LIKELY equally vulnerable to the same false-safety pattern,
--    but auditing/fixing all of them is out of scope for this branch --
--    flagged for a dedicated follow-up session, per the standing
--    "report everything, fix only what's asked" rule. founder_has_permission
--    and get_founder_team_role were pinned in this migration because item 3
--    below builds directly on them; do not read their presence here as
--    covering the other ~36.

create or replace function public.get_user_deal_room_ids(p_user_id uuid)
returns setof uuid
language sql
stable security definer
set search_path = ''
as $$
  SELECT deal_room_id
  FROM   public.deal_room_members
  WHERE  user_id = p_user_id
    AND  deal_room_id IS NOT NULL;
$$;

create or replace function public.get_deal_room_member_ids(p_room_id uuid)
returns setof uuid
language sql
stable security definer
set search_path = ''
as $$
  SELECT user_id
  FROM   public.deal_room_members
  WHERE  deal_room_id = p_room_id
    AND  user_id IS NOT NULL;
$$;

create or replace function public.drm_is_founder_of_room(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.deal_rooms dr
    join public.startups s on s.id = dr.startup_id
    where dr.id = p_deal_room_id
      and s.founder_id = p_user_id
  );
$$;

-- ── 2. Restore /join (team invites) after team_invites went deny-all ────
-- Product decision: the invitation system stays live. Two SECURITY
-- DEFINER RPCs replace the client's direct team_invites access entirely --
-- team_invites itself stays deny-all for anon AND authenticated; nothing
-- selects it directly anymore.
--
-- Security model: the token (gen_random_uuid() default, confirmed a real
-- 122-bit CSPRNG UUID, not sequential/short) is possession-based
-- authorization to VIEW the invite preview, same as a password-reset
-- link. It is explicitly NOT the authorization for ACCEPTING -- that
-- requires the authenticated caller's real email to match the invite's
-- email, checked server-side inside accept_team_invite, never trusted
-- from the client. Preview returns email (deliberately, to prefill/power
-- the not-yet-registered signup flow) but ONLY for a valid, unexpired,
-- unaccepted token -- an invalid/expired/accepted token returns only
-- {valid:false}, nothing else, so a dead token can't be used to probe
-- which state it's in.

create or replace function public.preview_team_invite(p_token uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_invite record;
  v_org_name text;
  v_inviter_name text;
begin
  select ti.id, ti.email, ti.role, ti.startup_id, ti.investor_profile_id,
         ti.expires_at, ti.accepted_at
  into v_invite
  from public.team_invites ti
  where ti.token = p_token;

  if v_invite.id is null
     or v_invite.accepted_at is not null
     or (v_invite.expires_at is not null and v_invite.expires_at < now())
  then
    return jsonb_build_object('valid', false);
  end if;

  if v_invite.startup_id is not null then
    select s.company_name, s.founder_name into v_org_name, v_inviter_name
    from public.startups s where s.id = v_invite.startup_id;
  elsif v_invite.investor_profile_id is not null then
    select coalesce(ip.fund_name, ip.your_name), ip.your_name into v_org_name, v_inviter_name
    from public.investor_profiles ip where ip.user_id = v_invite.investor_profile_id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'org_name', coalesce(v_org_name, 'the team'),
    'inviter_name', coalesce(v_inviter_name, 'The team'),
    'role', v_invite.role,
    'expires_at', v_invite.expires_at,
    'email', v_invite.email
  );
end;
$$;

revoke all on function public.preview_team_invite(uuid) from public;
grant execute on function public.preview_team_invite(uuid) to anon, authenticated;

create or replace function public.accept_team_invite(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite record;
  v_caller_email text;
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select u.email into v_caller_email from auth.users u where u.id = v_caller_id;

  -- Row-locked for the transaction so two concurrent accept attempts on
  -- the same token can't both pass the accepted_at check before either
  -- commits (single-use enforcement under race).
  select ti.id, ti.email, ti.role, ti.startup_id, ti.investor_profile_id,
         ti.invited_by, ti.expires_at, ti.accepted_at
  into v_invite
  from public.team_invites ti
  where ti.token = p_token
  for update;

  if v_invite.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if v_invite.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_accepted');
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- The actual access-control check. Token possession only got the caller
  -- this far (a preview + a signup form); this is what actually gates
  -- joining. Never trust an email passed from the client -- always the
  -- authenticated session's own real email, looked up server-side.
  if v_caller_email is null or lower(v_caller_email) <> lower(v_invite.email) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  if v_caller_id = v_invite.invited_by then
    return jsonb_build_object('ok', false, 'error', 'self_acceptance');
  end if;

  insert into public.startup_team_accounts
    (startup_id, investor_profile_id, user_id, role, invite_id, invited_by, display_name, avatar_url)
  values
    (v_invite.startup_id, v_invite.investor_profile_id, v_caller_id, v_invite.role,
     v_invite.id, v_invite.invited_by, '', null)
  on conflict do nothing;

  update public.team_invites set accepted_at = now() where id = v_invite.id;

  insert into public.team_member_profiles (user_id) values (v_caller_id)
  on conflict (user_id) do nothing;

  return jsonb_build_object('ok', true, 'org_name',
    coalesce(
      (select s.company_name from public.startups s where s.id = v_invite.startup_id),
      (select coalesce(ip.fund_name, ip.your_name) from public.investor_profiles ip where ip.user_id = v_invite.investor_profile_id),
      'the team'
    ),
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.accept_team_invite(uuid) from public;
grant execute on function public.accept_team_invite(uuid) to authenticated;

-- ── 3. Fix room creation for non-founder principal admins ──────────────
-- drm_founder_self_insert only recognized the literal startups.founder_id,
-- but app.deal-rooms.index.tsx's own canCreateRoom gate permits owner/
-- admin/manager roles (FOUNDER_PERMISSIONS[...].create_deal_room) to start
-- room creation -- admin/manager are explicitly non-founder team members.
-- A non-founder principal admin would 403 on the self-insert step.
-- Extended to use founder_has_permission(startup_id, 'create_deal_room')
-- instead of only s.founder_id = p_user_id -- covers owner/admin/manager
-- per that function's existing role table, without widening to any
-- authenticated user (viewer/analyst/no-role still correctly excluded --
-- verified live with a real manager-role fixture: 201; a genuine outsider
-- with zero relationship to the startup: 403).
--
-- founder_has_permission / get_founder_team_role pinned here too (same
-- search_path='' fix) since this new function calls them directly --
-- building on an unpinned dependency would just move the same hole one
-- layer down.

create or replace function public.get_founder_team_role(p_startup_id uuid)
returns text
language sql
stable security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.startups where id = p_startup_id and founder_id = auth.uid())
      then 'owner'
    else (
      select role from public.startup_team_accounts
      where startup_id = p_startup_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    )
  end;
$$;

create or replace function public.founder_has_permission(p_startup_id uuid, p_permission text)
returns boolean
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_role text := public.get_founder_team_role(p_startup_id);
begin
  if v_role is null then return false; end if;
  if v_role in ('owner', 'admin') then return true; end if;
  if v_role = 'manager' then
    return p_permission in ('edit_profile','create_deal_room','view_all_deal_rooms','upload_documents','edit_pipeline','view_analytics','use_ai_advisor');
  end if;
  if v_role = 'analyst' then
    return p_permission in ('upload_documents','use_ai_advisor');
  end if;
  if v_role = 'viewer' then
    return false;
  end if;
  return false;
end;
$$;

create or replace function public.drm_can_create_room_member(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.deal_rooms dr
    join public.startups s on s.id = dr.startup_id
    where dr.id = p_deal_room_id
      and public.founder_has_permission(s.id, 'create_deal_room')
  );
$$;

drop policy if exists "drm_founder_self_insert" on deal_room_members;

create policy "drm_founder_self_insert" on deal_room_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'founder'
    and drm_can_create_room_member(deal_room_id, auth.uid())
  );
