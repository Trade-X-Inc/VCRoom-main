ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;
