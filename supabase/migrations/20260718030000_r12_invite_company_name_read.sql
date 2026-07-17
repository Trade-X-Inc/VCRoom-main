-- R12 step 4 — the /join page's join to startups(company_name, founder_name)
-- and investor_profiles(your_name, fund_name) silently returned null for an
-- invitee who isn't a team member yet: `startups` only has startups_own
-- (founder reads their own) and startups_investor_read (investor with deal
-- room/discovery access) — an invited-but-not-yet-accepted user matches
-- neither, so the join drops the row and the page falls back to generic
-- "the company" copy instead of the real name. team_invites itself is
-- already publicly token-readable (team_invites_public_token_read).
--
-- First attempt at this fix used a plain `exists (select 1 from
-- team_invites ...)` USING clause directly on startups/investor_profiles —
-- that caused `infinite recursion detected in policy for relation
-- "team_invites"` (42P17), because team_invites_founder_manage's own qual
-- queries startups, and the new startups policy queried team_invites right
-- back — a two-table cycle, the same anti-pattern CLAUDE.md's "RLS
-- self-reference recursion" note warns about, just spanning two tables
-- instead of one. Fixed the correct way: a SECURITY DEFINER function,
-- which evaluates with row security bypassed internally and breaks the
-- cycle, matching the is_startup_founder()-style pattern used everywhere
-- else in this schema.

create or replace function public.startup_id_has_open_invite(p_startup_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from team_invites ti where ti.startup_id = p_startup_id
  );
$$;

create or replace function public.investor_user_id_has_open_invite(p_investor_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from team_invites ti where ti.investor_profile_id = p_investor_user_id
  );
$$;

create policy "startups_invited_read"
  on startups for select
  to public
  using (startup_id_has_open_invite(id));

create policy "investor_profiles_invited_read"
  on investor_profiles for select
  to public
  using (investor_user_id_has_open_invite(user_id));
