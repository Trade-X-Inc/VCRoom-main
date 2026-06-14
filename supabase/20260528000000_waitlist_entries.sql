-- Create waitlist_entries table
CREATE TABLE public.waitlist_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT,
  company TEXT,
  problem TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Anyone can join waitlist" ON public.waitlist_entries 
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read their own entry (optional)
CREATE POLICY "Users can read own entry" ON public.waitlist_entries 
  FOR SELECT USING (auth.jwt() ->> 'email' = email);
