-- ─────────────────────────────────────────────────────────────────────────────
-- RUN IN SUPABASE SQL EDITOR
--
-- FIX 1: Consolidate documents SELECT policies so investors (deal_room_members)
--        can read documents. The 20240605 migration has two separate SELECT
--        policies; consolidate them into one that also covers uploader access.
--
-- FIX 2: Allow deal_room_members to SELECT startups linked to their deal rooms.
--        Without this, `deal_rooms.select("*, startups(*)")` returns null for
--        startups when queried by an investor → overview shows "Company" + blank.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. documents SELECT — consolidated (DROP old → CREATE new) ───────────────

DROP POLICY IF EXISTS "Members can select documents" ON documents;
DROP POLICY IF EXISTS "Founders can select their deal room documents" ON documents;
DROP POLICY IF EXISTS "deal_room_members_read_docs" ON documents;

CREATE POLICY "deal_room_members_read_docs"
ON documents FOR SELECT TO authenticated
USING (
  deal_room_id IN (
    SELECT deal_room_id FROM deal_room_members
    WHERE user_id = auth.uid()
  )
  OR uploader_id = auth.uid()
  OR deal_room_id IN (
    SELECT dr.id FROM deal_rooms dr
    JOIN startups s ON s.id = dr.startup_id
    WHERE s.founder_id = auth.uid()
  )
);


-- ── 2. startups SELECT — allow investors in deal rooms to read startup data ───
-- The default startups RLS only allows founders (founder_id = auth.uid()).
-- Investors who open a deal room see a `deal_rooms.select("*, startups(*)")` join
-- that returns null for startups because they lack SELECT permission on startups.
-- Fix: allow any deal_room_member to SELECT the startup linked to their deal room.

DROP POLICY IF EXISTS "deal_room_members_can_read_startups" ON startups;
CREATE POLICY "deal_room_members_can_read_startups" ON startups
  FOR SELECT TO authenticated
  USING (
    founder_id = auth.uid()
    OR id IN (
      SELECT dr.startup_id FROM deal_rooms dr
      JOIN deal_room_members drm ON drm.deal_room_id = dr.id
      WHERE drm.user_id = auth.uid()
        AND dr.startup_id IS NOT NULL
    )
  );
