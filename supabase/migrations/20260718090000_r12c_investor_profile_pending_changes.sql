-- R12C — pending-approval workflow for investor fund profile edits.
-- Owner/Admin edits apply immediately (unchanged, via investor_profiles_own).
-- Associate edits are staged here as a diff (one row per proposed field
-- change, not a duplicate of the whole profile row) and require Owner/
-- Admin approval before the live investor_profiles row changes.
--
-- fund_owner_user_id identifies which fund this belongs to — the value
-- stored in investor_profiles.user_id (same shape as
-- startup_team_accounts.investor_profile_id, per CLAUDE.md §30 — this
-- table intentionally uses the .user_id-shaped meaning, matching the
-- newer R12-era convention, not the .id-shaped meaning some older
-- team_channels-family tables use).

-- investor_has_permission() (R12) hardcodes each role's permission
-- whitelist as its own copy of INVESTOR_PERMISSIONS (frontend/src/lib/
-- roles.ts) — it must be kept in sync by hand, same as founder_has_permission.
-- Adding edit_profile/approve_profile_changes here to match the TS-side
-- addition in this same branch; without this the DB-level check silently
-- returns false for every role, since the SQL copy didn't know these
-- permission keys existed.
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
    return p_permission in ('view_discovery','request_access','view_all_deal_rooms','run_ai_analysis','edit_profile');
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

create table investor_profile_pending_changes (
  id uuid primary key default gen_random_uuid(),
  fund_owner_user_id uuid not null references investor_profiles(user_id) on delete cascade,
  proposed_by uuid not null references auth.users(id) on delete cascade,
  field_key text not null,
  old_value jsonb,
  new_value jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text
);

create index investor_profile_pending_changes_fund_idx on investor_profile_pending_changes(fund_owner_user_id, status);
create index investor_profile_pending_changes_proposer_idx on investor_profile_pending_changes(proposed_by, status);

alter table investor_profile_pending_changes enable row level security;

-- Owner/Admin: read + approve/reject all of their own fund's pending
-- changes. Reuses investor_has_permission('approve_profile_changes'),
-- consistent with R12's PermissionGate/RLS pattern — no parallel
-- permission-check logic invented. approve_profile_changes is true only
-- for owner/admin (hardcoded in the v_role in ('owner','admin') branch
-- above, which returns true for ANY permission string — same bypass
-- pattern founder_has_permission already uses for owner/admin).
create policy "pending_changes_owner_manage"
  on investor_profile_pending_changes for all
  using (investor_has_permission(fund_owner_user_id, 'approve_profile_changes'))
  with check (investor_has_permission(fund_owner_user_id, 'approve_profile_changes'));

-- Associate: can read and create their OWN pending changes (not another
-- Associate's queue), cannot approve/reject (no update beyond what the
-- owner-manage policy above already grants the owner) and cannot read
-- other funds' or other associates' rows.
create policy "pending_changes_associate_own_read"
  on investor_profile_pending_changes for select
  using (proposed_by = auth.uid());

create policy "pending_changes_associate_propose"
  on investor_profile_pending_changes for insert
  with check (
    proposed_by = auth.uid()
    and status = 'pending'
    and investor_has_permission(fund_owner_user_id, 'edit_profile')
  );
