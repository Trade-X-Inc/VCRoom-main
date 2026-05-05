CREATE TABLE ai_usage (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid        REFERENCES users(id) ON DELETE CASCADE,
  action     text        NOT NULL DEFAULT 'email_gen',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_own" ON ai_usage
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
