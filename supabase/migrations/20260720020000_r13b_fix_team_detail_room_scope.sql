-- R13B step 7 fix — adversarial testing found that
-- team_member_details_unlocked_room_member joins deal_rooms by startup_id
-- only, so ANY unlocked room between an investor and a startup satisfies
-- the check for EVERY room between that same pair — including a second,
-- still-locked room. Empirically confirmed: inserted a locked temp room
-- between the same test investor/founder who already share an unlocked
-- room elsewhere, queried team_member_details as that investor, and the
-- founder's gated bio still came back.
--
-- This diverges from the established pattern: get_investor_profile_in_room()
-- explicitly scopes its disclosure check to `d.deal_room_id = p_deal_room_id`
-- (the exact room being viewed), with a comment stating this is precisely
-- so it "can't be satisfied by some other unlocked room the same two users
-- happen to also share." investor_team_member_details_unlocked_founder
-- (the mirror policy on the investor side, added in the same original
-- migration) already got this right — it joins deal_room_members and
-- deal_room_profile_disclosures to the SAME dr.id. Only the founder-side
-- policy below had the gap; bringing it in line with that existing correct
-- shape rather than inventing a new pattern.

drop policy "team_member_details_unlocked_room_member" on team_member_details;

create policy "team_member_details_unlocked_room_member"
  on team_member_details for select
  using (
    exists (
      select 1
      from team_members tm
      join deal_rooms dr on dr.startup_id = tm.startup_id
      join deal_room_members caller on caller.deal_room_id = dr.id and caller.user_id = auth.uid()
      join deal_room_profile_disclosures dpd
        on dpd.deal_room_id = dr.id and dpd.investor_user_id = auth.uid()
      where tm.id = team_member_details.team_member_id
    )
  );
