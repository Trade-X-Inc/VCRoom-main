-- R13B step 7 fix #2 — adversarial testing found investor_team_members_room_read
-- and investor_team_member_details_unlocked_founder are BOTH permanently
-- unsatisfiable for a founder counterparty: their EXISTS subqueries join
-- through investor_profiles, and investor_profiles has no peer-read RLS
-- policy at all (only own/invited/team-role — see investor_profiles_own,
-- investor_profiles_invited_read, investor_profiles_team_read). A nested
-- RLS-gated join returns zero rows for a party without their own read
-- access to investor_profiles, so the founder-facing policies never
-- matched regardless of unlock state — confirmed empirically: the exact
-- same join succeeded when run as postgres (RLS bypassed) but returned
-- zero rows for the founder under `set local role authenticated`.
--
-- Fix: join from deal_rooms.investor_user_id directly (a plain uuid
-- column, no nested RLS) instead of through investor_profiles.id — the
-- same avoidance useDealRoomContext.ts already documents ("investor_profiles
-- has no bare peer-read policy anymore ... this goes through ... looked up
-- by user_id instead of slug"). investor_team_members.investor_profile_id
-- still identifies the fund's own rows for owner access (unaffected,
-- unchanged); only the counterparty-read policies are rewritten to key off
-- investor_team_members.investor_profile_id -> investor_profiles.user_id
-- resolved via a SECURITY DEFINER helper, avoiding the nested-RLS problem
-- entirely rather than trying to route around it inline.

create or replace function investor_team_member_owner_user_id(p_investor_profile_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id from investor_profiles where id = p_investor_profile_id;
$$;

drop policy "investor_team_members_room_read" on investor_team_members;

create policy "investor_team_members_room_read"
  on investor_team_members for select
  using (
    exists (
      select 1
      from deal_rooms dr
      join deal_room_members drm on drm.deal_room_id = dr.id and drm.user_id = auth.uid()
      where dr.investor_user_id = investor_team_member_owner_user_id(investor_team_members.investor_profile_id)
    )
  );

drop policy "investor_team_member_details_unlocked_founder" on investor_team_member_details;

create policy "investor_team_member_details_unlocked_founder"
  on investor_team_member_details for select
  using (
    exists (
      select 1
      from investor_team_members itm
      join deal_rooms dr
        on dr.investor_user_id = investor_team_member_owner_user_id(itm.investor_profile_id)
      join deal_room_members drm on drm.deal_room_id = dr.id and drm.user_id = auth.uid()
      join deal_room_profile_disclosures dpd
        on dpd.deal_room_id = dr.id and dpd.investor_user_id = dr.investor_user_id
      where itm.id = investor_team_member_details.team_member_id
    )
  );
