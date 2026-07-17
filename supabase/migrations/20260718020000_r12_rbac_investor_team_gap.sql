-- R12 follow-up — team_channels/team_messages/team_tasks policies added in
-- the prior migration only covered the founder (startup_id) branch,
-- missing the investor_profile_id branch that team_notes correctly
-- includes. Without this, an investor TEAM MEMBER (analyst/associate/
-- external — as opposed to the investor owner, who already has full access
-- via the pre-existing investor_*_access policies) would have zero access
-- to team channels/messages/tasks. Bringing all three in line with
-- team_notes' complete pattern.

drop policy if exists "team_channel_read" on team_channels;
create policy "team_channel_read"
  on team_channels for select
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) is not null)
  );
drop policy if exists "team_channel_write" on team_channels;
create policy "team_channel_write"
  on team_channels for insert
  with check (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_channel_modify" on team_channels;
create policy "team_channel_modify"
  on team_channels for update
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_channel_delete" on team_channels;
create policy "team_channel_delete"
  on team_channels for delete
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );

drop policy if exists "team_message_read" on team_messages;
create policy "team_message_read"
  on team_messages for select
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) is not null)
  );
drop policy if exists "team_message_write" on team_messages;
create policy "team_message_write"
  on team_messages for insert
  with check (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_message_modify" on team_messages;
create policy "team_message_modify"
  on team_messages for update
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_message_delete" on team_messages;
create policy "team_message_delete"
  on team_messages for delete
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );

drop policy if exists "team_task_read" on team_tasks;
create policy "team_task_read"
  on team_tasks for select
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) is not null))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) is not null)
  );
drop policy if exists "team_task_write" on team_tasks;
create policy "team_task_write"
  on team_tasks for insert
  with check (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_task_modify" on team_tasks;
create policy "team_task_modify"
  on team_tasks for update
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
drop policy if exists "team_task_delete" on team_tasks;
create policy "team_task_delete"
  on team_tasks for delete
  using (
    (startup_id is not null and (is_startup_founder(startup_id) or get_founder_team_role(startup_id) not in ('viewer')))
    or (investor_profile_id is not null and get_investor_team_role(investor_profile_id) not in ('external'))
  );
