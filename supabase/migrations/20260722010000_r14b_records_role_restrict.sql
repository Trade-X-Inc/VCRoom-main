-- R14B pre-step-2 hardening. The live External-role test (test-lawyer
-- assigned to the Atlas/Dr Henry room via deal_room_team_assignments)
-- returned 0 rows for both deal_room_meeting_private_notes and
-- deal_room_meeting_records — but for records that was incidental, not
-- structural: the policy accepted ANY deal_room_members row, and only
-- blocked the lawyer because externals route through
-- deal_room_team_assignments instead of membership. If any future flow
-- ever gives an External a members row, they'd read every stage's
-- transcript. Locked lawyer scope is term sheet + deal summary only;
-- External access to meeting records (if any) is a step-4 gate decision,
-- likely investment_terms only. Restrict reads to the two principal
-- roles now so the rule is structural.

drop policy "meeting_records_room_members" on deal_room_meeting_records;

create policy "meeting_records_room_members"
  on deal_room_meeting_records for select
  using (
    deal_room_id is not null
    and deal_room_id in (
      select deal_room_id from deal_room_members
      where user_id = auth.uid()
        and role in ('founder', 'investor')
    )
  );
