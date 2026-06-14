ALTER TABLE public.discovery_requests
  ADD COLUMN IF NOT EXISTS detail_pack_requested boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_pack_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS detail_pack_requested_at timestamptz;
