ALTER TABLE public.profile_views
  ADD COLUMN IF NOT EXISTS duration_seconds integer;
