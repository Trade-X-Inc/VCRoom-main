-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix messages/deal_tasks 400 errors
--
-- Findings:
--   - messages RLS: uses deal_room_members (correct — no startups.user_id bug)
--   - deal_tasks RLS: uses deal_room_members (correct — no startups.user_id bug)
--
--   Root causes of 400 errors:
--   1. is_qa / metadata columns may not exist on messages if the
--      20240527 migration was not fully applied → .eq("is_qa", true) returns 400
--   2. users table RLS only allows self-view, so JOIN results (sender names,
--      assignee names) return null — not 400, but names are blank.
--      Adding a deal-room-members visibility policy fixes blank names.
--   3. The deal_rooms list query referenced "deal_room_documents" (wrong table
--      name) — fixed in frontend code, no SQL needed.
--
-- Apply via: Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. messages — ensure is_qa and metadata columns exist ─────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_qa     boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata  jsonb   DEFAULT '{}';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS private_to_org boolean NOT NULL DEFAULT false;

-- ── 2. users — allow deal room members to see each other's basic info ─────────
-- The current "Users can view own profile" policy blocks name joins on messages
-- (sender name), deal_tasks (assignee name), and deal_room_members (member names).
-- This policy lets any authenticated deal room member read full_name/email of
-- other members in the same deal room.

DROP POLICY IF EXISTS "Deal room members can view each other" ON users;
CREATE POLICY "Deal room members can view each other"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM deal_room_members
      WHERE deal_room_id IN (
        SELECT deal_room_id FROM deal_room_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- ── 3. deal_tasks — ensure table and policy exist (safety net) ────────────────
-- The 20240603000000_deal_tasks.sql migration creates the table and policy.
-- This is a no-op if already applied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deal_tasks' AND policyname = 'deal_tasks_members'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "deal_tasks_members" ON deal_tasks
        FOR ALL USING (
          deal_room_id IN (
            SELECT deal_room_id FROM deal_room_members
            WHERE user_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ── 4. messages INSERT policy — ensure founders can also send messages ─────────
DROP POLICY IF EXISTS "Founders can insert messages in their deal rooms" ON messages;
CREATE POLICY "Founders can insert messages in their deal rooms"
  ON messages FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );
