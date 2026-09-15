-- Documents bucket: server-side size cap + MIME allowlist.
--
-- Reproduces a live hand-edit made directly against the `documents` storage
-- bucket (product-owner decision, applied via the dashboard/API outside this
-- migration history) — this file exists so the repo's migration record
-- matches the live schema, per CLAUDE.md §7.2's reconciliation rule. The
-- values below were pulled fresh via a live `select` against
-- `storage.buckets` immediately before writing this file, not retyped from
-- a summary or a draft.
--
-- Bucket state as of 2026-09-15:
--   file_size_limit:     52428800 bytes (50 MB) — was NULL (unconfigured)
--   allowed_mime_types:  7 types  — was NULL (unconfigured)
--
-- Decision: CSV is the only accepted tabular format. xlsx/xls are
-- deliberately EXCLUDED — easier and safer to parse, no binary/macro
-- surface, AI-friendly. xlsx is now rejected at upload by the bucket
-- itself, before any application code runs. See the companion recon on
-- whether `xlsx` (SheetJS, vulnerable at 0.18.5) can still be reached by
-- any live code path now that upload is blocked at this layer.
--
-- No `INSERT` — the bucket already exists (created 2026-05-15). This is a
-- targeted `UPDATE` of exactly the two columns that changed.

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'image/png',
    'image/jpeg'
  ]::text[]
WHERE id = 'documents';
