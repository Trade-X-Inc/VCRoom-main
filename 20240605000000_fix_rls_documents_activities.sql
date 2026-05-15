-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix missing RLS policies for documents, activities, meetings, notes
-- Root cause: schema.sql enables RLS on documents but adds no policies.
--             20240525000000_add_rls_policies.sql uses startups.user_id which
--             doesn't exist (correct column is startups.founder_id).
-- Apply via: Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. documents ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can insert documents" ON documents;
CREATE POLICY "Members can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
    AND uploader_id = auth.uid()
  );

DROP POLICY IF EXISTS "Members can select documents" ON documents;
CREATE POLICY "Members can select documents"
  ON documents FOR SELECT
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Founders can select their deal room documents" ON documents;
CREATE POLICY "Founders can select their deal room documents"
  ON documents FOR SELECT
  USING (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Founders can insert their deal room documents" ON documents;
CREATE POLICY "Founders can insert their deal room documents"
  ON documents FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
    AND uploader_id = auth.uid()
  );

-- ── 2. activities ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can insert activities" ON activities;
CREATE POLICY "Members can insert activities"
  ON activities FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Founders can insert activities in their deal rooms" ON activities;
CREATE POLICY "Founders can insert activities in their deal rooms"
  ON activities FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can select activities" ON activities;
CREATE POLICY "Members can select activities"
  ON activities FOR SELECT
  USING (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Founders can select activities in their deal rooms" ON activities;
CREATE POLICY "Founders can select activities in their deal rooms"
  ON activities FOR SELECT
  USING (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );

-- ── 3. meetings ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can insert meetings" ON meetings;
CREATE POLICY "Members can insert meetings"
  ON meetings FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Founders can insert meetings in their deal rooms" ON meetings;
CREATE POLICY "Founders can insert meetings in their deal rooms"
  ON meetings FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );

-- ── 4. notes ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can insert notes" ON notes;
CREATE POLICY "Members can insert notes"
  ON notes FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members WHERE user_id = auth.uid()
    )
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "Founders can insert notes in their deal rooms" ON notes;
CREATE POLICY "Founders can insert notes in their deal rooms"
  ON notes FOR INSERT
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
    AND author_id = auth.uid()
  );
