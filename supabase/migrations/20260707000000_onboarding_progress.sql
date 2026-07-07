CREATE TABLE IF NOT EXISTS onboarding_progress (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_type  text        NOT NULL CHECK (account_type IN ('founder', 'investor')),
  current_step  text        NOT NULL DEFAULT 'tour',
  steps         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_onboarding_progress" ON onboarding_progress;
CREATE POLICY "own_onboarding_progress" ON onboarding_progress
  FOR ALL USING (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_progress_user_unique
  ON onboarding_progress (user_id);

CREATE INDEX IF NOT EXISTS onboarding_progress_user_updated
  ON onboarding_progress (user_id, updated_at DESC);
