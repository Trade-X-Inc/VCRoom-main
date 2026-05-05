-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: documents storage bucket + RLS policies
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Deal room members can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM deal_room_members
    WHERE deal_room_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Deal room members can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM deal_room_members
    WHERE deal_room_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);
