-- ─────────────────────────────────────────────────────────────────────────────
-- RUN IN SUPABASE SQL EDITOR
--
-- FIX 1: Clean up orphaned documents (deal_room_id points to a deleted room).
--        Then add ON DELETE CASCADE so future deal room deletes auto-cascade
--        to documents — even though handleDelete already deletes them manually,
--        the CASCADE is a safety net for direct DB deletes or future code paths.
--
-- FIX 2: Allow all MIME types in the 'documents' storage bucket so PNG, JPG,
--        PPTX, MP4, etc. are not rejected by the bucket policy.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Clean up orphaned documents ───────────────────────────────────────────

DELETE FROM documents
WHERE deal_room_id IS NOT NULL
  AND deal_room_id NOT IN (SELECT id FROM deal_rooms);


-- ── 2. Add ON DELETE CASCADE FK on documents.deal_room_id ────────────────────

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_deal_room_id_fkey;

ALTER TABLE documents
  ADD CONSTRAINT documents_deal_room_id_fkey
  FOREIGN KEY (deal_room_id)
  REFERENCES deal_rooms(id)
  ON DELETE CASCADE;


-- ── 3. Allow all MIME types in the documents storage bucket ──────────────────
-- Supabase rejects uploads whose MIME type is not in allowed_mime_types when
-- that column is non-null. Setting it to NULL lifts the restriction entirely.

UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'documents';
