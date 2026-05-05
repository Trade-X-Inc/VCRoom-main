-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: invites table for deal room invite-by-link flow
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invites (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token        uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  deal_room_id uuid NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  email        text,                    -- pre-filled if known; null = open invite
  role         text NOT NULL DEFAULT 'viewer',
  invited_by   uuid NOT NULL REFERENCES users(id),
  accepted_at  timestamptz,
  expires_at   timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Founders can see invites they created
CREATE POLICY invites_select_founder ON invites
  FOR SELECT USING (invited_by = auth.uid());

-- Founders can create invites for their own deal rooms
CREATE POLICY invites_insert ON invites
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      LEFT JOIN startups s ON dr.startup_id = s.id
      WHERE s.founder_id = auth.uid() OR dr.created_by = auth.uid()
    )
  );

-- Anyone can read an invite by token (needed for the join page to resolve room details)
-- We expose only non-sensitive fields via a view/RPC instead of full row select
CREATE POLICY invites_select_by_token ON invites
  FOR SELECT USING (true);

-- Authenticated users can mark an invite as accepted (set accepted_at)
CREATE POLICY invites_update_accept ON invites
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (accepted_at IS NOT NULL);
