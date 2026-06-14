-- Discovery access requests (investor -> founder)
CREATE TABLE IF NOT EXISTS public.discovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'withdrawn')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(investor_id, startup_id)
);

-- RLS
ALTER TABLE public.discovery_requests ENABLE ROW LEVEL SECURITY;

-- Investors can insert their own requests
CREATE POLICY "investor_insert_own" ON public.discovery_requests
  FOR INSERT WITH CHECK (investor_id = auth.uid());

-- Investors can see their own requests
CREATE POLICY "investor_read_own" ON public.discovery_requests
  FOR SELECT USING (investor_id = auth.uid());

-- Founders can see requests targeting their startup
CREATE POLICY "founder_read_incoming" ON public.discovery_requests
  FOR SELECT USING (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  );

-- Founders can update status of requests to their startup
CREATE POLICY "founder_update_status" ON public.discovery_requests
  FOR UPDATE USING (
    startup_id IN (
      SELECT id FROM public.startups WHERE founder_id = auth.uid()
    )
  );
