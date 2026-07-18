-- R12C — corrective follow-up to 20260718070000. That migration was
-- WRONG for team_channels/team_messages/team_notes/team_tasks: it changed
-- their investor_channel_access/message/note/task_access policies from
-- `ip.id = investor_profile_id` to `ip.user_id = investor_profile_id`,
-- based on an incorrect assumption that all `investor_profile_id` columns
-- across the schema mean the same thing.
--
-- Confirmed via information_schema.constraint_column_usage: they don't.
--   startup_team_accounts.investor_profile_id  -> FK to investor_profiles.user_id
--   team_channels.investor_profile_id          -> FK to investor_profiles.id
--   team_messages.investor_profile_id          -> FK to investor_profiles.id
--   team_notes.investor_profile_id             -> FK to investor_profiles.id
--   team_tasks.investor_profile_id             -> FK to investor_profiles.id
-- No damage was done (zero rows existed in any of these four tables at
-- the time), but the policy text was wrong for its own table's schema.
-- Reverting to the original, correct `ip.id` comparison for these four.
--
-- get_investor_team_role() (fixed in the prior migration, comparing
-- against investor_profiles.user_id) stays as-is — it's correct for every
-- OTHER caller in the schema, which all pass a .user_id-shaped value
-- (startup_team_accounts.investor_profile_id, R12's investor_has_permission,
-- this branch's new pending-changes RLS). A second, distinctly-named
-- function is added for the .id-shaped case these four tables actually
-- need, rather than overloading one function to silently handle two
-- different meanings of the same parameter name.
--
-- The underlying inconsistency (same column name, two different FK
-- targets, across five tables) is a real schema-cleanup item, logged in
-- CLAUDE.md rather than fixed here — standardizing it means picking a
-- canonical meaning and migrating the FK + every dependent policy on
-- team_channels/messages/notes/tasks, which is bigger and riskier than
-- this branch's actual task warrants.

drop policy if exists "investor_channel_access" on team_channels;
create policy "investor_channel_access"
  on team_channels for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.id = team_channels.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_message_access" on team_messages;
create policy "investor_message_access"
  on team_messages for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.id = team_messages.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_note_access" on team_notes;
create policy "investor_note_access"
  on team_notes for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.id = team_notes.investor_profile_id and ip.user_id = auth.uid())
  );

drop policy if exists "investor_task_access" on team_tasks;
create policy "investor_task_access"
  on team_tasks for all
  using (
    investor_profile_id is not null
    and exists (select 1 from investor_profiles ip where ip.id = team_tasks.investor_profile_id and ip.user_id = auth.uid())
  );

-- Distinct function for the .id-shaped case, so no single function
-- pretends both column meanings are the same. Not currently wired into
-- any policy (the four tables above use an inline EXISTS, matching their
-- pre-existing pattern) — provided for any future policy on these four
-- tables that needs team-member (not just owner) role resolution.
create or replace function public.get_investor_team_role_by_profile_id(p_investor_profile_row_id uuid)
returns text
language sql
stable
security definer
set search_path = 'public'
as $$
  select case
    when exists (select 1 from investor_profiles where id = p_investor_profile_row_id and user_id = auth.uid())
      then 'owner'
    else (
      select sta.role from startup_team_accounts sta
      join investor_profiles ip on ip.user_id = sta.investor_profile_id
      where ip.id = p_investor_profile_row_id
        and sta.user_id = auth.uid()
        and sta.status = 'active'
      limit 1
    )
  end;
$$;
