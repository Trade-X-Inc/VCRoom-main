-- R12C step 0 (pre-work) — found while auditing get_investor_team_role()
-- for the profile-approval-workflow's new RLS: its owner-check compares
-- the caller's p_investor_profile_id parameter against investor_profiles.id,
-- but every real caller (startup_team_accounts.investor_profile_id, R12's
-- own test fixtures, this function's own callers) actually passes
-- investor_profiles.user_id — the value genuinely stored in that FK column
-- despite its name. Result: calling this function with the value that's
-- actually in the FK column returns NULL instead of 'owner' for the fund
-- owner, confirmed empirically (get_investor_team_role(<owner's user_id>)
-- returned null as the owner, when it should return 'owner').
--
-- The identical mismatch was independently baked into four PRE-EXISTING
-- policies that predate R12 entirely: investor_channel_access,
-- investor_message_access, investor_note_access, investor_task_access on
-- team_channels/team_messages/team_notes/team_tasks. Confirmed empirically
-- that the investor owner currently gets ZERO rows querying their own
-- team_channels — a live, real bug in production, not just a latent risk
-- for a future feature.
--
-- Fixed: get_investor_team_role() plus all four investor_*_access
-- policies, all with the same one-line correction (ip.id -> ip.user_id).

create or replace function public.get_investor_team_role(p_investor_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when exists (select 1 from investor_profiles where user_id = p_investor_profile_id and user_id = auth.uid())
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

drop policy if exists "investor_channel_access" on team_channels;
create policy "investor_channel_access"
  on team_channels for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.user_id = team_channels.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_message_access" on team_messages;
create policy "investor_message_access"
  on team_messages for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.user_id = team_messages.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_note_access" on team_notes;
create policy "investor_note_access"
  on team_notes for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.user_id = team_notes.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_task_access" on team_tasks;
create policy "investor_task_access"
  on team_tasks for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.user_id = team_tasks.investor_profile_id and ip.user_id = auth.uid())
  );
