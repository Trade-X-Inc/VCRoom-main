-- R14B step 4 — found during live lawyer-view verification: the room-native
-- lawyer role (deal_room_members.role = 'lawyer') matched the existing
-- deal_room_meetings_members policy (a single `for all` policy), which
-- grants every room member full read/write on all 5 meeting rows,
-- including notes_shared (freeform text) and action_items for stages 1-4.
-- Per the locked design, a lawyer must never read prior-stage meeting
-- content. Per CLAUDE.md §33, notes_shared can't be hidden column-by-column
-- on a shared-row policy — the row itself must be scoped. Mirrors the
-- stage-restriction already applied to deal_room_meeting_records in
-- 20260723000000_r14b_lawyer_gate.sql.
--
-- RLS permissive policies OR together, so a broad `for all` policy and a
-- narrower `for select` policy would combine into the WIDER of the two for
-- SELECT (the restriction would be silently defeated). Split into
-- per-command policies instead: insert/update/delete keep the exact
-- pre-existing membership-only check (a lawyer has no legitimate write path
-- here today, so leaving those commands role-agnostic is a deliberate
-- no-op, not an oversight); select is the only command that needs the
-- lawyer/stage restriction.

drop policy "deal_room_meetings_members" on deal_room_meetings;

create policy "deal_room_meetings_select"
  on deal_room_meetings for select
  using (
    deal_room_id in (
      select dm.deal_room_id from deal_room_members dm
      where dm.user_id = auth.uid()
        and (dm.role <> 'lawyer' or deal_room_meetings.stage_slug = 'investment_terms')
    )
  );

create policy "deal_room_meetings_insert"
  on deal_room_meetings for insert
  with check (
    deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

create policy "deal_room_meetings_update"
  on deal_room_meetings for update
  using (
    deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  )
  with check (
    deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

create policy "deal_room_meetings_delete"
  on deal_room_meetings for delete
  using (
    deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );
