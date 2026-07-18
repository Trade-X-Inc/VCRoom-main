-- R12C — investor_profiles had NO policy granting a team member (Associate,
-- Analyst, External) read access to their own fund's profile row. Only
-- investor_profiles_own (owner, ALL) and investor_profiles_invited_read
-- (not-yet-accepted invitee) existed. Confirmed empirically: an Associate's
-- authenticated session querying investor_profiles?user_id=eq.<owner's
-- user_id> returned an empty array — this is why app.investor.profile.tsx
-- silently showed an empty/default form for an Associate even after this
-- branch's fix to resolve the correct fundOwnerUserId; the query was
-- correctly scoped, RLS just blocked it.
--
-- Read-only: team members should see the fund's real data (to propose
-- informed edits), but writes stay exclusively via investor_profiles_own
-- (owner only) or investor_profile_pending_changes (Associate proposals).
create policy "investor_profiles_team_read"
  on investor_profiles for select
  using (get_investor_team_role(user_id) is not null);
