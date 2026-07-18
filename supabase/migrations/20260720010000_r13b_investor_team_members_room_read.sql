-- R13B step 4 — two fixes, both correcting step 1's initial split before
-- it's exercised by any real UI.
--
-- (1) contact_email was added to the PUBLIC investor_team_members table
-- in step 1's migration, but the founder's decision only names
-- names/photos/titles as pre-unlock visible — an email address is
-- directly actionable (someone could reach out before any mutual-
-- disclosure relationship exists), closer to "detail" than to a name
-- badge. Move it to the gated investor_team_member_details table
-- alongside bio.
--
-- (2) investor_team_members had NO cross-party read policy at all
-- (confirmed via a direct pg_policies query): only the investor's own
-- account could read it, so a founder counterparty in a shared deal room
-- couldn't see even the investor's key people's public fields (name/
-- photo/designation) — the founder's decision requires this to be
-- symmetric with the founder side. Safe to add now that this table only
-- carries public fields.

alter table investor_team_member_details add column contact_email text;
update investor_team_member_details itmd set contact_email = itm.contact_email
  from investor_team_members itm where itm.id = itmd.team_member_id;
alter table investor_team_members drop column contact_email;

create policy "investor_team_members_room_read"
  on investor_team_members for select
  using (
    exists (
      select 1
      from investor_profiles ip
      join deal_rooms dr on dr.investor_user_id = ip.user_id
      join deal_room_members drm on drm.deal_room_id = dr.id
      where ip.id = investor_team_members.investor_profile_id
        and drm.user_id = auth.uid()
    )
  );
