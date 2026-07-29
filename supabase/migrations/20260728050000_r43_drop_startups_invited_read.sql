-- R43 -- drop startups_invited_read: an over-permissive RLS policy found
-- while live-testing the getFounderContext fix (unrelated to that fix
-- itself). See CLAUDE.md for the full writeup.
--
-- The policy (added R12, 20260718030000) used
-- rls_private.startup_id_has_open_invite(p_startup_id), whose body is:
--   select exists (select 1 from team_invites where startup_id = p_startup_id)
-- This checks only that SOME invite exists for the startup -- never that the
-- CALLER is the invitee. Live-verified: the test-founder's own real token
-- retrieved the FULL startups row (all ~70 columns via select=*, including
-- founder_email, revenue, burn_rate, valuation, current_investors) for a
-- startup they have no relationship to, solely because that startup has one
-- team_invites row -- which is itself already accepted (accepted_at is set)
-- and has no bearing on the check at all, since the function never looks at
-- accepted_at or expires_at either.
--
-- The policy's own stated purpose (R12 comment): let the join.team.$token.tsx
-- flow show a company name to an invitee who isn't a team member yet. That
-- flow is dead code -- confirmed zero live links to /join/team/:token
-- anywhere in the app (only the auto-generated route tree references it),
-- and it reads a completely different, also-legacy `invites` table, not
-- team_invites. The active team-join flow (routes/join.tsx, rebuilt in R40)
-- never reads startups directly at all -- org_name/inviter_name/role/email
-- are resolved entirely server-side inside the preview_team_invite /
-- accept_team_invite SECURITY DEFINER RPCs, which is the correct pattern.
--
-- With zero legitimate live readers, the fix is to remove the surface
-- rather than secure it (same reasoning as the join.$token.tsx deletion).

drop policy if exists "startups_invited_read" on public.startups;
drop function if exists rls_private.startup_id_has_open_invite(uuid);

-- investor_profiles_invited_read is the same pattern, same migration, same
-- flaw: rls_private.investor_user_id_has_open_invite(p_investor_user_id)
-- only checks that SOME team_invites row references that investor_profile_id
-- -- never that the caller is the invitee. Its only plausible live consumer
-- would be an investor-team-invite acceptance flow; the actual one that
-- exists (routes/join-investor.$token.tsx, a DIFFERENT invite mechanism --
-- investor_invite_links, not team_invites) already explicitly avoids relying
-- on any bare peer-read of investor_profiles ("investor_profiles has no bare
-- peer-read RLS anymore" -- its own comment), using the safe
-- get_public_investor_profile_by_user_id() whitelist RPC instead. No route
-- reads investor_profiles via this policy today.
drop policy if exists "investor_profiles_invited_read" on public.investor_profiles;
drop function if exists rls_private.investor_user_id_has_open_invite(uuid);
