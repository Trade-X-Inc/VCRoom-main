-- Migration: 20240526000000_harden_remaining_rls.sql
-- Enable RLS on remaining tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Organizations are visible to their members
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Organization members can view other members in the same org
CREATE POLICY "Members can view fellow organization members" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Document requests: Founders can manage for their startups
CREATE POLICY "Founders can manage document requests for their startups" ON public.document_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.startups
            WHERE startups.id = document_requests.startup_id
            AND startups.user_id = auth.uid()
        )
    );

-- Document requests: Investors can view requests they made or related to their deal rooms
CREATE POLICY "Investors can view their document requests" ON public.document_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = document_requests.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );