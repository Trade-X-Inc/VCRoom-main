-- ─────────────────────────────────────────────────────────────────────────────
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
--
-- Fixes 3 things:
--   1. deal_rooms SELECT policy for investors (CRITICAL — was completely missing;
--      caused DD + Analysis pages to show no companies because the PostgREST join
--      chain deal_room_members → deal_rooms → startups returned null for deal_rooms)
--
--   2. workspace_channel column on messages + RLS so Team Chat works without
--      deal_room_id (workspace messages are not tied to a specific deal room)
--
--   3. Belt-and-suspenders: ensure deal_room_members member_select policy exists
--      so investors can always read their own membership rows
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. deal_rooms: investors can read rooms they are members of ───────────────
-- This was the missing piece. Without it PostgREST returns null for the
-- deal_rooms node in any nested select, making DD + Analysis pages show nothing.

DROP POLICY IF EXISTS "Members can read their deal rooms" ON public.deal_rooms;
CREATE POLICY "Members can read their deal rooms" ON public.deal_rooms
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR startup_id IN (SELECT id FROM public.startups WHERE founder_id = auth.uid())
    OR id IN (SELECT deal_room_id FROM public.deal_room_members WHERE user_id = auth.uid())
  );


-- ── 2. deal_room_members: ensure members can always read their own rows ───────

DROP POLICY IF EXISTS "member_select" ON public.deal_room_members;
CREATE POLICY "member_select" ON public.deal_room_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Founders can read all members in their deal rooms
DROP POLICY IF EXISTS "founder_member_select" ON public.deal_room_members;
CREATE POLICY "founder_member_select" ON public.deal_room_members
  FOR SELECT TO authenticated
  USING (
    deal_room_id IN (
      SELECT dr.id FROM public.deal_rooms dr
      JOIN public.startups s ON dr.startup_id = s.id
      WHERE s.founder_id = auth.uid()
    )
  );


-- ── 3. messages: workspace_channel support for Team Chat ─────────────────────

-- Add the column (idempotent)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS workspace_channel TEXT;

-- Drop NOT NULL on deal_room_id so workspace messages can omit it
ALTER TABLE public.messages ALTER COLUMN deal_room_id DROP NOT NULL;

-- Replace the SELECT policy with one that covers both deal_room and workspace messages
DROP POLICY IF EXISTS "deal_room_members_can_read_messages" ON public.messages;
DROP POLICY IF EXISTS "workspace_messages_select" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages in their workspace" ON public.messages;

CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    -- Deal room messages (existing path)
    (deal_room_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.deal_room_members
        WHERE deal_room_id = messages.deal_room_id
          AND user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.deal_rooms dr
        JOIN public.startups s ON s.id = dr.startup_id
        WHERE dr.id = messages.deal_room_id
          AND s.founder_id = auth.uid()
      )
    ))
    -- Workspace channel messages (Team Chat)
    OR sender_id = auth.uid()
    OR workspace_channel = auth.uid()::text
    OR workspace_channel IN (
      SELECT id::text FROM public.startups WHERE founder_id = auth.uid()
    )
  );

-- Replace INSERT policy to allow both deal_room and workspace messages
DROP POLICY IF EXISTS "deal_room_members_can_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "workspace_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages with workspace_channel" ON public.messages;

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Deal room message: sender must be a member or founder
      (deal_room_id IS NOT NULL AND (
        deal_room_id IN (
          SELECT deal_room_id FROM public.deal_room_members WHERE user_id = auth.uid()
        )
        OR deal_room_id IN (
          SELECT dr.id FROM public.deal_rooms dr
          JOIN public.startups s ON s.id = dr.startup_id
          WHERE s.founder_id = auth.uid()
        )
      ))
      -- Workspace message: no deal_room_id needed, just valid workspace_channel
      OR (deal_room_id IS NULL AND workspace_channel IS NOT NULL)
    )
  );
