-- Create lead_stage enum for data consistency
DO $$ BEGIN
    CREATE TYPE public.lead_stage AS ENUM (
        'New',
        'Contacted',
        'Replied',
        'Meeting',
        'Interested',
        'Deal Room',
        'Rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vc_leads table
CREATE TABLE IF NOT EXISTS public.vc_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Founder owner
    name TEXT NOT NULL,
    firm TEXT NOT NULL,
    stage public.lead_stage DEFAULT 'New' NOT NULL,
    check_size TEXT,
    thesis TEXT,
    initials TEXT,
    is_hot BOOLEAN DEFAULT false NOT NULL
);

-- Enable RLS
ALTER TABLE public.vc_leads ENABLE ROW LEVEL SECURITY;

-- Policies: Founders can only see and manage leads for their own startups
CREATE POLICY "Founders can view their own leads" ON public.vc_leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.startups
            WHERE startups.id = vc_leads.startup_id
            AND startups.user_id = auth.uid()
        )
    );

CREATE POLICY "Founders can manage their own leads" ON public.vc_leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.startups
            WHERE startups.id = vc_leads.startup_id
            AND startups.user_id = auth.uid()
        )
    );

-- Automated updated_at trigger
CREATE TRIGGER set_vc_leads_updated_at
BEFORE UPDATE ON public.vc_leads
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();