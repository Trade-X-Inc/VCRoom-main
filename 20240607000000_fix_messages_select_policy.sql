-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix messages SELECT RLS policy
--
-- Root cause: 20240530000000_tab_columns.sql used "CREATE POLICY IF NOT EXISTS"
-- which is INVALID PostgreSQL syntax. The migration's ALTER TABLE column
-- additions succeeded, but all CREATE POLICY lines failed with syntax errors.
-- Result: messages table has RLS enabled but NO SELECT policy → 0 rows returned
-- on every SELECT (messages appear to disappear after reload).
--
-- Fix: create the SELECT policy using correct DROP + CREATE syntax.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "deal_room_members_can_read_messages" ON messages;
CREATE POLICY "deal_room_members_can_read_messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deal_room_members
    WHERE deal_room_id = messages.deal_room_id
    AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM deal_rooms dr
    JOIN startups s ON s.id = dr.startup_id
    WHERE dr.id = messages.deal_room_id
    AND s.founder_id = auth.uid()
  )
);
