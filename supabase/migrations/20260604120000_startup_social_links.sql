ALTER TABLE public.startups
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;
