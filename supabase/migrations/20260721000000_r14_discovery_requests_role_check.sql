-- R14 step 7 — adversarial testing found discovery_requests' INSERT policy
-- (investor_insert_own) checks only `investor_id = auth.uid()`, with no
-- role check at all. Any authenticated investor-side team member — including
-- analyst/external roles, which INVESTOR_PERMISSIONS (roles.ts) explicitly
-- mark request_access: false — could still insert a real row via a direct
-- API call, bypassing the UI-only gate on RequestAccessButton (and on
-- Directory's identical Connect flow, which shares this same table/policy
-- and has had the same gap since it was built). Per CLAUDE.md §33's
-- established rule, a UI-only permission check is not a security boundary.
--
-- Fixed with a SECURITY DEFINER helper mirroring get_investor_team_role()'s
-- existing pattern (owner check against investor_profiles, then role lookup
-- in startup_team_accounts — the actual investor team/role table, keyed by
-- .user_id per CLAUDE.md §30's documented convention for this table,
-- distinct from investor_team_members which is R13B's key-person PROFILE
-- table, not an account/permissions table).

create or replace function investor_can_request_access(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from investor_profiles where user_id = p_user_id)
    or exists (
      select 1 from startup_team_accounts
      where user_id = p_user_id
        and investor_profile_id is not null
        and status = 'active'
        and role in ('admin', 'associate')
    );
$$;

drop policy "investor_insert_own" on discovery_requests;

create policy "investor_insert_own"
  on discovery_requests for insert
  with check (
    investor_id = auth.uid()
    and investor_can_request_access(auth.uid())
  );
