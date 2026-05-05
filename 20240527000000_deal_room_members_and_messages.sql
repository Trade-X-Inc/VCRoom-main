-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: deal_room_members table + messages enhancements
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. deal_room_members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_room_members (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_room_id uuid NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'viewer',
  invited_by   uuid REFERENCES users(id),
  accepted_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (deal_room_id, user_id)
);

ALTER TABLE deal_room_members ENABLE ROW LEVEL SECURITY;

-- Members can read their own row
CREATE POLICY member_select ON deal_room_members
  FOR SELECT USING (user_id = auth.uid());

-- Founders (room creator) can see all members of their rooms
CREATE POLICY founder_member_select ON deal_room_members
  FOR SELECT USING (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON dr.startup_id = s.id
      WHERE s.founder_id = auth.uid()
    )
  );

-- Any authenticated user can insert themselves (e.g., on NDA acceptance)
CREATE POLICY member_insert ON deal_room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Members can update their own row (e.g., to set accepted_at)
CREATE POLICY member_update ON deal_room_members
  FOR UPDATE USING (user_id = auth.uid());

-- 2. messages — add is_qa and metadata columns ────────────────────────────────
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_qa     boolean      DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata  jsonb        DEFAULT '{}';

-- Index for fast Q&A queries
CREATE INDEX IF NOT EXISTS messages_deal_room_is_qa_idx
  ON messages (deal_room_id, is_qa);

-- 3. deal_rooms — add created_by for founder ownership ────────────────────────
ALTER TABLE deal_rooms ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- Allow founders to select rooms they created (in addition to startup-linked rooms)
CREATE POLICY founder_deal_rooms_created ON deal_rooms
  FOR SELECT USING (created_by = auth.uid());

-- Allow authenticated users to insert deal rooms
CREATE POLICY deal_room_insert ON deal_rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow creators to update their rooms
CREATE POLICY deal_room_update ON deal_rooms
  FOR UPDATE USING (
    created_by = auth.uid()
    OR startup_id IN (SELECT id FROM startups WHERE founder_id = auth.uid())
  );

-- 4. decisions — unique constraint for upsert ─────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS decisions_deal_room_decided_by_idx
  ON decisions (deal_room_id, decided_by);

-- RLS on decisions (if not already enabled)
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY decisions_select ON decisions
  FOR SELECT USING (
    decided_by = auth.uid()
    OR deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON dr.startup_id = s.id
      WHERE s.founder_id = auth.uid()
    )
  );

CREATE POLICY decisions_insert ON decisions
  FOR INSERT WITH CHECK (decided_by = auth.uid());

CREATE POLICY decisions_update ON decisions
  FOR UPDATE USING (decided_by = auth.uid());
