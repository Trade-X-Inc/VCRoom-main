-- R14B step 4 fix — deal_room_lawyer_requests_resolve had no WITH CHECK,
-- so Postgres reused its USING clause (status = 'pending') as the implicit
-- check on the row AFTER update. Since a real approval changes status to
-- 'approved', every legitimate resolution was rejected — live-verified:
-- the counterparty's approve UPDATE failed with a genuine RLS violation.
--
-- This same bug was found to pre-exist on deal_room_stage_transitions
-- (the pattern this table intentionally mirrors) via the identical live
-- test — out of scope to fix broadly here (CLAUDE.md §31-style deferred
-- item, noted for a future cleanup pass), but it must be fixed in this
-- new table since step 4 depends on mutual approval actually working.
--
-- Fix: add an explicit WITH CHECK that only constrains what must stay true
-- (the room membership + not-self), not the status transition itself —
-- the resolver is allowed to change status away from 'pending'.

drop policy "lawyer_requests_resolve" on deal_room_lawyer_requests;

create policy "lawyer_requests_resolve"
  on deal_room_lawyer_requests for update
  using (
    status = 'pending'
    and requested_by <> auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  )
  with check (
    requested_by <> auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );
