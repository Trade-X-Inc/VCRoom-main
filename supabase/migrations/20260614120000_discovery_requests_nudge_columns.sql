-- Add nudge tracking columns to discovery_requests
ALTER TABLE public.discovery_requests
  ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage int NOT NULL DEFAULT 1;
