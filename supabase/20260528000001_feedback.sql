-- Create feedback table
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  type TEXT,
  rating INT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Anyone can submit feedback" ON public.feedback 
  FOR INSERT WITH CHECK (true);
