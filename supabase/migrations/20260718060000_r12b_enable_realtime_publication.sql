-- R12B step 1 — audit (step 0) found that of the 9 tables with existing
-- .channel().on('postgres_changes') subscriptions in the codebase, only
-- startup_team_accounts (added in R12) was actually in the
-- supabase_realtime publication. Every other subscription was a silent
-- no-op, masked by adjacent polling where present (notifications: 30s,
-- roast pages: 7-15s) or genuinely stale until manual reload where absent
-- (deal-room chat, deal-room Q&A, team chat, stage transitions).
--
-- This migration adds the 8 remaining tables backing existing subscription
-- code, plus 3 new deal-room-scoped tables that need subscriptions built
-- in step 2 (term sheets, closing items/reports, NDA acceptances).
--
-- Explicitly NOT included: activity_log. It has no deal_room_id column —
-- it's a founder/investor account-level audit trail (account_type/
-- account_id), not deal-room-scoped. DealRoomTimeline.tsx's query against
-- it (.eq("deal_room_id", dealRoomId)) is a pre-existing, unrelated bug
-- querying a column that doesn't exist on this table. No realtime
-- subscription can fix a broken query — flagged for a future session.

alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table deal_room_stage_transitions;
alter publication supabase_realtime add table deal_room_qa;
alter publication supabase_realtime add table team_messages;
alter publication supabase_realtime add table roast_sessions;
alter publication supabase_realtime add table roast_race_events;
alter publication supabase_realtime add table roast_audience;
alter publication supabase_realtime add table roast_questions;

-- New deal-room-scoped tables, no existing subscription code yet (step 2
-- builds it). Anticipates R15's active-closing work per task instructions.
alter publication supabase_realtime add table deal_room_term_sheets;
alter publication supabase_realtime add table deal_room_closing_items;
alter publication supabase_realtime add table deal_room_closure_reports;
alter publication supabase_realtime add table nda_acceptances;
