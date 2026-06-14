-- Create referrals table
CREATE TABLE public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joinee_email TEXT,
  joinee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals
CREATE POLICY "Users see own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- Anyone can insert a referral
CREATE POLICY "Anyone can insert referral" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- Users can update their own referrals
CREATE POLICY "Users update own referrals" ON public.referrals
  FOR UPDATE USING (referrer_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
