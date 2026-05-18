-- ─────────────────────────────────────────────────────────────────────────────
-- RUN IN SUPABASE SQL EDITOR
--
-- FIX: deal_rooms status stays "Pending" after investor accepts NDA.
--
-- Root cause: join.$token.tsx calls
--   supabase.from("deal_rooms").update({ status: "active" }).eq("id", ...)
-- using the anon client (investor's JWT). The existing deal_rooms UPDATE policy
-- only allows founders (startup owner). The investor's update silently returns
-- 0 rows updated — no error is thrown, but the status never changes.
--
-- Fix: add a policy allowing deal_room_members to update the status field of
-- their own deal room. Scoped to UPDATE only (not DELETE/INSERT).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "investors_can_activate_deal_room" ON deal_rooms;
CREATE POLICY "investors_can_activate_deal_room"
ON deal_rooms FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT deal_room_id FROM deal_room_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT deal_room_id FROM deal_room_members
    WHERE user_id = auth.uid()
  )
);
