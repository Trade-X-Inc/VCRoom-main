-- Gap 1: intelligent post-save fundraising readiness checklist.
-- One row per generation run; the UI reads the latest per startup.

CREATE TABLE IF NOT EXISTS profile_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  readiness_score integer CHECK (readiness_score BETWEEN 0 AND 100),
  overall_readiness text CHECK (overall_readiness IN ('not_ready','early','approaching','investor_ready')),
  summary text,
  gaps jsonb,
  strengths jsonb,
  generated_at timestamptz DEFAULT now(),
  ai_model text DEFAULT 'gpt-4o'
);

CREATE INDEX IF NOT EXISTS idx_profile_checklists_startup
  ON profile_checklists(startup_id, generated_at DESC);

ALTER TABLE profile_checklists ENABLE ROW LEVEL SECURITY;

-- Founder reads their own checklists (writes go through the service role)
CREATE POLICY "founder_read_own_checklists" ON profile_checklists
  FOR SELECT USING (
    startup_id IN (SELECT id FROM startups WHERE founder_id = (SELECT auth.uid()))
  );

-- Deal room investors can read the startup's checklist (readiness panel)
CREATE POLICY "deal_room_member_read_checklists" ON profile_checklists
  FOR SELECT USING (
    startup_id IN (
      SELECT dr.startup_id FROM deal_rooms dr
      JOIN deal_room_members m ON m.deal_room_id = dr.id
      WHERE m.user_id = (SELECT auth.uid())
    )
  );
