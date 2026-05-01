-- Enable RLS for tables
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for decisions
-- Founders can view/manage decisions related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room decisions" ON public.decisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = decisions.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage decisions in deal rooms they are members of
CREATE POLICY "Investors can manage decisions in their deal rooms" ON public.decisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = decisions.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );

-- Policies for ai_reports
-- Founders can view/manage AI reports related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room AI reports" ON public.ai_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = ai_reports.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage AI reports in deal rooms they are members of
CREATE POLICY "Investors can manage AI reports in their deal rooms" ON public.ai_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = ai_reports.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );

-- Policies for notes
-- Founders can view/manage notes related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room notes" ON public.notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = notes.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage notes in deal rooms they are members of
CREATE POLICY "Investors can manage notes in their deal rooms" ON public.notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = notes.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );

-- Policies for activities
-- Founders can view/manage activities related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room activities" ON public.activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = activities.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage activities in deal rooms they are members of
CREATE POLICY "Investors can manage activities in their deal rooms" ON public.activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = activities.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );

-- Policies for meetings
-- Founders can view/manage meetings related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room meetings" ON public.meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = meetings.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage meetings in deal rooms they are members of
CREATE POLICY "Investors can manage meetings in their deal rooms" ON public.meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = meetings.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );

-- Policies for tasks
-- Founders can view/manage tasks related to their startups' deal rooms
CREATE POLICY "Founders can manage their deal room tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_rooms
            WHERE deal_rooms.id = tasks.deal_room_id
            AND deal_rooms.startup_id IN (SELECT id FROM public.startups WHERE user_id = auth.uid())
        )
    );

-- Investors can view/manage tasks in deal rooms they are members of
CREATE POLICY "Investors can manage tasks in their deal rooms" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.deal_room_members
            WHERE deal_room_members.deal_room_id = tasks.deal_room_id
            AND deal_room_members.user_id = auth.uid()
        )
    );