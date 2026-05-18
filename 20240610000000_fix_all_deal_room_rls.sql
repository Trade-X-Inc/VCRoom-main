-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: fix all deal room RLS — notes table, deal_tasks founder path,
--            messages UPDATE policy for Q&A answers
--
-- Findings from audit:
--   1. notes table has no RLS policies → all INSERT/SELECT fail or are insecure
--   2. deal_tasks "deal_tasks_members" policy only covers deal_room_members;
--      founders who own the deal room but aren't in deal_room_members cannot
--      read or create tasks
--   3. messages has no UPDATE policy → saveAnswer() silently updates 0 rows
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. notes table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_room_id uuid        NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  author_id    uuid        NOT NULL REFERENCES users(id),
  body         text        NOT NULL,
  private      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- SELECT: author always sees their own notes; anyone in the deal room (member
-- or founder) sees non-private notes.
DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes
  FOR SELECT USING (
    author_id = auth.uid()
    OR (
      private = false
      AND (
        deal_room_id IN (
          SELECT deal_room_id FROM deal_room_members
          WHERE user_id = auth.uid()
        )
        OR
        deal_room_id IN (
          SELECT dr.id FROM deal_rooms dr
          JOIN startups s ON s.id = dr.startup_id
          WHERE s.founder_id = auth.uid()
        )
      )
    )
  );

-- INSERT: any deal room participant (member or founder) can insert their own note.
DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      deal_room_id IN (
        SELECT deal_room_id FROM deal_room_members
        WHERE user_id = auth.uid()
      )
      OR
      deal_room_id IN (
        SELECT dr.id FROM deal_rooms dr
        JOIN startups s ON s.id = dr.startup_id
        WHERE s.founder_id = auth.uid()
      )
    )
  );

-- UPDATE / DELETE: author only.
DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes
  FOR DELETE USING (author_id = auth.uid());


-- ── 2. deal_tasks — add founder path to the existing members-only policy ─────
-- Drop both old policies (members-only) and replace with a single policy that
-- covers both deal_room_members AND founders who own the startup.

DROP POLICY IF EXISTS "deal_tasks_members" ON deal_tasks;
DROP POLICY IF EXISTS "deal_tasks_founders" ON deal_tasks;
DROP POLICY IF EXISTS "deal_tasks_all" ON deal_tasks;

CREATE POLICY "deal_tasks_all" ON deal_tasks
  FOR ALL USING (
    deal_room_id IN (
      SELECT deal_room_id FROM deal_room_members
      WHERE user_id = auth.uid()
    )
    OR
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );


-- ── 3. messages — UPDATE policy for Q&A answers ──────────────────────────────
-- saveAnswer() does UPDATE on messages.metadata to attach the founder's answer.
-- No UPDATE policy existed → the update silently returned 0 rows.
-- Only the founder who owns the deal room should be able to post answers.

DROP POLICY IF EXISTS "messages_update_answers" ON messages;
CREATE POLICY "messages_update_answers" ON messages
  FOR UPDATE
  USING (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    deal_room_id IN (
      SELECT dr.id FROM deal_rooms dr
      JOIN startups s ON s.id = dr.startup_id
      WHERE s.founder_id = auth.uid()
    )
  );
