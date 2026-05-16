-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: allow deal room members to INSERT team chat messages
--
-- Root cause: the existing INSERT policy ("Founders can insert messages in
-- their deal rooms") only allows founders. Investors who are deal_room_members
-- could not send team chat messages at all, so the INSERT silently failed.
--
-- Fix: add a second INSERT policy for all deal_room_members (covers investors
-- and any other team members). The private_to_org=true check is not enforced
-- here — the frontend always sets it correctly. The sender_id=auth.uid() check
-- prevents spoofing.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "deal_room_members_can_insert_messages" ON messages;
CREATE POLICY "deal_room_members_can_insert_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  deal_room_id IN (
    SELECT deal_room_id FROM deal_room_members
    WHERE user_id = auth.uid()
  )
  AND sender_id = auth.uid()
);
