-- Create referral_bonuses table
CREATE TABLE public.referral_bonuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joinee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL DEFAULT 'joined',
  extra_deal_rooms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;

-- Users can see their own bonuses
CREATE POLICY "Users see own bonuses" ON public.referral_bonuses
  FOR SELECT USING (referrer_id = auth.uid());

-- Only admin can insert (via trigger or server function)
CREATE POLICY "Admins can insert bonuses" ON public.referral_bonuses
  FOR INSERT WITH CHECK (false);

-- Create index for performance
CREATE INDEX idx_referral_bonuses_referrer_id ON public.referral_bonuses(referrer_id);
CREATE INDEX idx_referral_bonuses_joinee_id ON public.referral_bonuses(joinee_id);
