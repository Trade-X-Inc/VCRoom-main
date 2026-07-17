-- R12 step 2/3 — make the Team page's permissions matrix TRUE at the
-- database level. Audit found FOUNDER_PERMISSIONS/INVESTOR_PERMISSIONS in
-- frontend/src/lib/roles.ts (the promise shown in the UI) was enforced
-- NOWHERE — useTeamRole() (the only consumer) has zero callers, and every
-- RLS policy on deal_rooms/founder_documents/vc_leads/profile_views either
-- ignores startup_team_accounts.role entirely (team_channels/messages/
-- notes/tasks: any member has full ALL access regardless of role) or
-- doesn't reference team membership at all (deal_rooms/founder_documents/
-- vc_leads/profile_views: team members had ZERO RLS access, full stop).
--
-- This migration is the single source of truth for role -> permission,
-- mirrored exactly from FOUNDER_PERMISSIONS / INVESTOR_PERMISSIONS so the
-- displayed matrix and the enforced matrix can never drift apart silently.

-- ── Helper: caller's role on a given startup's team, or null if not a member.
-- SECURITY DEFINER, queries only startup_team_accounts — never the table
-- being protected, per CLAUDE.md's anti-recursion rule.
create or replace function public.get_founder_team_role(p_startup_id uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when exists (select 1 from startups where id = p_startup_id and founder_id = auth.uid())
      then 'owner'
    else (
      select role from startup_team_accounts
      where startup_id = p_startup_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    )
  end;
$$;

create or replace function public.get_investor_team_role(p_investor_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when exists (select 1 from investor_profiles where id = p_investor_profile_id and user_id = auth.uid())
      then 'owner'
    else (
      select role from startup_team_accounts
      where investor_profile_id = p_investor_profile_id
        and user_id = auth.uid()
        and status = 'active'
      limit 1
    )
  end;
$$;

-- ── Permission matrix, mirrored from frontend/src/lib/roles.ts. Any change
-- to the frontend matrix must be mirrored here in the same commit.
create or replace function public.founder_has_permission(p_startup_id uuid, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_role text := get_founder_team_role(p_startup_id);
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

create or replace function public.investor_has_permission(p_investor_profile_id uuid, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_role text := get_investor_team_role(p_investor_profile_id);
begin
  if v_role is null then return false; end if;
  if v_role in ('owner', 'admin') then return true; end if;
  if v_role = 'associate' then
    return p_permission in ('view_discovery','request_access','view_all_deal_rooms','run_ai_analysis');
  end if;
  if v_role = 'analyst' then
    return p_permission in ('view_discovery','run_ai_analysis');
  end if;
  if v_role = 'external' then
    return p_permission in ('run_ai_analysis');
  end if;
  return false;
end;
$$;

-- ── deal_rooms: team members get access per view_all_deal_rooms. Owner/
-- founder policy already exists (deal_rooms_founder_manage); this ADDS
-- team-member read, it doesn't replace the founder's own full access.
create policy "deal_rooms_team_read"
  on deal_rooms for select
  using (founder_has_permission(startup_id, 'view_all_deal_rooms'));

-- ── founder_documents: team members get access per upload_documents (this
-- permission gates both read and write for documents — a role that can't
-- upload has no reason to browse the vault either, matching the UI's own
-- framing of the permission as document-workspace access).
create policy "founder_documents_team_access"
  on founder_documents for all
  using (founder_has_permission(startup_id, 'upload_documents'))
  with check (founder_has_permission(startup_id, 'upload_documents'));

-- ── vc_leads (CRM / investor pipeline): gated by edit_pipeline.
create policy "vc_leads_team_access"
  on vc_leads for all
  using (founder_has_permission(founder_id, 'edit_pipeline'))
  with check (founder_has_permission(founder_id, 'edit_pipeline'));

-- ── profile_views (profile analytics): gated by view_analytics, read-only
-- (the existing anyone_insert_view policy already allows write for
-- tracking purposes and must not be touched).
create policy "profile_views_team_read"
  on profile_views for select
  using (founder_has_permission(startup_id, 'view_analytics'));

-- ── team_channels / team_messages / team_notes / team_tasks: replace the
-- role-blind "any team member has ALL access" policies with role-aware
-- ones. Read stays available to any active member (matches existing
-- product behavior — everyone sees team chat/notes/tasks); write requires
-- a role above Viewer, matching the Viewer role's "read-only" promise.
drop policy if exists "team_channel_access" on team_channels;
create policy "team_channel_read"
  on team_channels for select
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null);
create policy "team_channel_write"
  on team_channels for insert
  with check (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_channel_modify"
  on team_channels for update
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_channel_delete"
  on team_channels for delete
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));

drop policy if exists "team_message_access" on team_messages;
create policy "team_message_read"
  on team_messages for select
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null);
create policy "team_message_write"
  on team_messages for insert
  with check (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_message_modify"
  on team_messages for update
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_message_delete"
  on team_messages for delete
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));

drop policy if exists "team_note_access" on team_notes;
create policy "team_note_read"
  on team_notes for select
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) is not null)
  );
create policy "team_note_write"
  on team_notes for insert
  with check (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
create policy "team_note_modify"
  on team_notes for update
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
create policy "team_note_delete"
  on team_notes for delete
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );

drop policy if exists "team_task_access" on team_tasks;
create policy "team_task_read"
  on team_tasks for select
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null);
create policy "team_task_write"
  on team_tasks for insert
  with check (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_task_modify"
  on team_tasks for update
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));
create policy "team_task_delete"
  on team_tasks for delete
  using (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer'));

-- ── startup_team_accounts: only Admin (or the founder-owner) may write —
-- appoint_admin permission specifically governs role changes/appointments.
-- The founder's own team_accounts_founder_manage ALL policy already covers
-- the owner. This ADDS admin-level team members' ability to manage other
-- team members' roles (invite/edit/remove), which the UI already implies
-- ("Manage team members" permission) but had no RLS path for at all.
create policy "team_accounts_admin_manage"
  on startup_team_accounts for all
  using (
    (startup_id is not null and founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and investor_has_permission(investor_profile_id, 'manage_team'))
  )
  with check (
    (startup_id is not null and founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and investor_has_permission(investor_profile_id, 'manage_team'))
  );

-- ── Only Admin may appoint another Admin — the specific rule R12 step 3
-- calls out to hold at RLS, not just UI. A non-admin manage_team caller
-- (there currently is none, since manage_team is admin/owner-only in the
-- matrix, but this makes the rule explicit and future-proof against a
-- matrix change that grants manage_team more broadly) cannot write a row
-- with role = 'admin'.
create or replace function public.can_appoint_role(p_startup_id uuid, p_investor_profile_id uuid, p_new_role text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
begin
  if p_new_role != 'admin' then
    return true;
  end if;
  if p_startup_id is not null then
    return get_founder_team_role(p_startup_id) in ('owner', 'admin');
  end if;
  if p_investor_profile_id is not null then
    return get_investor_team_role(p_investor_profile_id) in ('owner', 'admin');
  end if;
  return false;
end;
$$;

drop policy if exists "team_accounts_admin_manage" on startup_team_accounts;
create policy "team_accounts_admin_manage"
  on startup_team_accounts for all
  using (
    (startup_id is not null and founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and investor_has_permission(investor_profile_id, 'manage_team'))
  )
  with check (
    can_appoint_role(startup_id, investor_profile_id, role)
    and (
      (startup_id is not null and founder_has_permission(startup_id, 'manage_team'))
      or (investor_profile_id is not null and investor_has_permission(investor_profile_id, 'manage_team'))
    )
  );

-- ── deal_room_team_assignments: was RLS-enabled with ZERO policies (deny-
-- all, including for the founder-owner — a dead feature for everyone).
-- Owner/admin can assign; any assigned team member can read their own
-- assignment (already partially covered by dr_assignments_member_read on
-- the other side, this is the assignment-table side).
create policy "dr_team_assignments_manage"
  on deal_room_team_assignments for all
  using (
    exists (
      select 1 from deal_rooms dr
      where dr.id = deal_room_team_assignments.deal_room_id
        and founder_has_permission(dr.startup_id, 'manage_team')
    )
  )
  with check (
    exists (
      select 1 from deal_rooms dr
      where dr.id = deal_room_team_assignments.deal_room_id
        and founder_has_permission(dr.startup_id, 'manage_team')
    )
  );

create policy "dr_team_assignments_self_read"
  on deal_room_team_assignments for select
  using (
    team_account_id in (
      select id from startup_team_accounts where user_id = auth.uid()
    )
  );

-- ── startup_team_accounts: allow a newly-invited user to create their OWN
-- row when accepting a valid, unaccepted invite whose email matches their
-- authenticated email. Confirmed via audit: no INSERT policy previously
-- allowed this at all — join.tsx's handleAccept() should have been
-- silently rejected by RLS for every real invite (CLAUDE.md's documented
-- historical bug pattern: WITH CHECK using auth.uid() failing silently).
create policy "team_accounts_self_accept_invite"
  on startup_team_accounts for insert
  with check (
    user_id = auth.uid()
    and invite_id is not null
    and exists (
      select 1 from team_invites ti
      where ti.id = startup_team_accounts.invite_id
        and ti.accepted_at is null
        and (ti.expires_at is null or ti.expires_at > now())
        and lower(ti.email) = lower((select email from auth.users where id = auth.uid()))
        and (ti.invited_by is null or ti.invited_by != auth.uid())
    )
  );
