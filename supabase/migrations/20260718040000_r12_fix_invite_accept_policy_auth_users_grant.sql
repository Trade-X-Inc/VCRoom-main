-- R12 step 4 — team_accounts_self_accept_invite's with_check queried
-- `auth.users` directly to resolve the caller's own email:
--   (select users.email from auth.users where users.id = auth.uid())
-- The `authenticated` role has no SELECT grant on auth.users by default
-- (Supabase restricts this table), so every accept-invite INSERT failed
-- with "permission denied for table users" (42501) — confirmed live via a
-- direct simulated INSERT as a real invited test user. This was caught
-- only by an actual end-to-end Playwright run of the join flow, not by
-- reading the policy in isolation, since `select ... from auth.users`
-- reads as reasonable SQL and doesn't fail in the security-definer helper
-- functions elsewhere in this schema (which don't hit this grant issue
-- because they don't touch auth.users at all). Fixed by using auth.email(),
-- Supabase's own helper built exactly for this, which needs no extra grant.

drop policy if exists "team_accounts_self_accept_invite" on startup_team_accounts;

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
        and lower(ti.email) = lower(auth.email())
        and (ti.invited_by is null or ti.invited_by <> auth.uid())
    )
  );
