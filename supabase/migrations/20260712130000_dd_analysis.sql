-- Task 2: confrontational DD analysis runs.
CREATE TABLE IF NOT EXISTS deal_room_dd_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id uuid NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  run_by uuid REFERENCES users(id),
  run_at timestamptz DEFAULT now(),
  findings jsonb,
  no_contradictions_reasoning text,
  documents_analysed integer DEFAULT 0,
  claims_checked integer DEFAULT 0,
  ai_model text DEFAULT 'gpt-4o'
);

CREATE INDEX IF NOT EXISTS idx_dd_analysis_room ON deal_room_dd_analysis(deal_room_id, run_at DESC);

ALTER TABLE deal_room_dd_analysis ENABLE ROW LEVEL SECURITY;

-- Any member of the deal room can read runs (writes via service role only)
CREATE POLICY "dd_analysis_member_read" ON deal_room_dd_analysis
  FOR SELECT USING (
    deal_room_id IN (SELECT deal_room_id FROM deal_room_members WHERE user_id = (SELECT auth.uid()))
  );
