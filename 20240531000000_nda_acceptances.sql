-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: nda_acceptances — store per-user NDA signatures for deal rooms
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nda_acceptances (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_room_id  uuid        REFERENCES deal_rooms(id) ON DELETE CASCADE,
  user_id       uuid        REFERENCES users(id) ON DELETE CASCADE,
  role          text        NOT NULL CHECK (role IN ('founder', 'investor')),
  accepted_at   timestamptz DEFAULT now(),
  ip_address    text,
  user_agent    text,
  nda_version   text        DEFAULT 'v1.0',
  nda_html      text,
  UNIQUE (deal_room_id, user_id)
);

ALTER TABLE nda_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can only read their own NDA acceptances
CREATE POLICY nda_own ON nda_acceptances
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own NDA acceptance
CREATE POLICY nda_insert ON nda_acceptances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
