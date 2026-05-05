-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add missing columns for Notes/Timeline/Meetings/Messages tabs
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

-- messages: add private_to_org flag (public Q&A vs org-private chat)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS private_to_org boolean NOT NULL DEFAULT false;

-- notes: body, author, privacy
ALTER TABLE notes ADD COLUMN IF NOT EXISTS body       text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_id  uuid REFERENCES users(id);
ALTER TABLE notes ADD COLUMN IF NOT EXISTS private    boolean NOT NULL DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- activities: actor + free-text action + optional metadata
ALTER TABLE activities ADD COLUMN IF NOT EXISTS actor_id   uuid REFERENCES users(id);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS action     text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata   jsonb DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- meetings: scheduling fields
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title        text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes        text;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES users(id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at   timestamptz DEFAULT now();

-- Enable RLS on messages (if not yet)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Deal room members can read messages"
  ON messages FOR SELECT
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Deal room members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Notes: private notes only visible to their author; non-private visible to room members
CREATE POLICY IF NOT EXISTS "Notes visibility"
  ON notes FOR SELECT
  USING (
    (private = false AND deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    ))
    OR author_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Members can insert notes"
  ON notes FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
    AND author_id = auth.uid()
  );
