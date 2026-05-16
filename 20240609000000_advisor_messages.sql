-- ─────────────────────────────────────────────────────────────────────────────
-- RUN IN SUPABASE SQL EDITOR
--
-- Creates advisor_messages table for persisting AI Advisor chat history.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_messages" ON advisor_messages;
CREATE POLICY "own_messages" ON advisor_messages
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS advisor_messages_user_created
  ON advisor_messages (user_id, created_at DESC);
