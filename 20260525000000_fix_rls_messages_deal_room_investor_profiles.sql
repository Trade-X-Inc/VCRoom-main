-- ─────────────────────────────────────────────────────────────────────────────
-- RUN IN SUPABASE SQL EDITOR
--
-- FIX 1: Add workspace_channel column + RLS policies for team chat
--        Also drop NOT NULL on deal_room_id so workspace messages can omit it
-- FIX 2: Deal room members RLS so members AND startup founders can see members
-- FIX 3: Investor profiles RLS so deal room members can view profiles
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Messages: workspace_channel column + policies ─────────────────────────

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_channel TEXT;

-- Allow workspace_channel messages to omit deal_room_id (it was NOT NULL)
ALTER TABLE public.messages ALTER COLUMN deal_room_id DROP NOT NULL;

-- Drop old conflicting policies if any exist
DROP POLICY IF EXISTS "Users can insert messages with workspace_channel" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages in their workspace" ON public.messages;

CREATE POLICY "Users can insert messages with workspace_channel"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read messages in their workspace"
  ON public.messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR workspace_channel = auth.uid()::text
    OR workspace_channel IN (
      SELECT id::text FROM public.startups WHERE founder_id = auth.uid()
    )
  );


-- ── 2. Deal room members: allow members + startup founders to see members ─────

DROP POLICY IF EXISTS "Members can view other members" ON public.deal_room_members;
DROP POLICY IF EXISTS "Founders can view their deal room members" ON public.deal_room_members;

CREATE POLICY "Members can view other members"
  ON public.deal_room_members FOR SELECT
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM public.deal_room_members WHERE user_id = auth.uid()
    )
  );

-- Belt-and-suspenders: startup founders can always see members in their rooms
CREATE POLICY "Founders can view their deal room members"
  ON public.deal_room_members FOR SELECT
  USING (
    deal_room_id IN (
      SELECT dr.id FROM public.deal_rooms dr
      JOIN public.startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );


-- ── 3. Investor profiles: visible to deal room peers ─────────────────────────

DROP POLICY IF EXISTS "Anyone in deal room can view investor profiles" ON public.investor_profiles;

CREATE POLICY "Anyone in deal room can view investor profiles"
  ON public.investor_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT user_id FROM public.deal_room_members
      WHERE deal_room_id IN (
        SELECT deal_room_id FROM public.deal_room_members WHERE user_id = auth.uid()
      )
    )
  );
