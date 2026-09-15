-- Upload-security gate — scan_status on both live document tables, plus a
-- new notifications.kind value for the quarantine notice.
--
-- Scope decision (confirmed with product owner): Library (3a) does not
-- exist yet, so there is no single "Library document row" to attach this
-- to. The two real, live upload targets are founder_documents (personal/
-- profile documents) and documents (deal-room documents) — both get the
-- column. startups.pitch_deck_url (a scalar column, not a document row)
-- is explicitly deferred — different shape, needs its own design.
--
-- Grandfathering: existing rows in both tables default to 'clean', not
-- 'pending' — they were uploaded before this gate existed and must not be
-- retroactively quarantined by a migration. Only NEW uploads, written by
-- gated code going forward, land as 'pending' and must clear the pipeline
-- (bucket -> magic-byte -> scan-interface) before being usable. This
-- migration only adds the column and sets today's data to the grandfathered
-- value; it does not change any upload code path itself.
--
-- Terminal-on-quarantine: 'quarantined' is not expected to transition back
-- to 'clean' — a failed file is removed (storage object deleted), not
-- retried in place. No CHECK constraint enforces this at the DB level
-- (the gate's own logic is the enforcement point, matching the codebase's
-- established pattern of authorization/state logic living in the calling
-- code rather than every constraint being pushed into SQL) — deliberately
-- consistent with founder_documents.status and documents.status, neither
-- of which carries a CHECK constraint either.

ALTER TABLE public.founder_documents
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'pending';

-- Grandfather every row that exists as of this migration. New rows inserted
-- after this point still default to 'pending' via the column default above
-- — this UPDATE only touches what's already here.
UPDATE public.founder_documents SET scan_status = 'clean' WHERE scan_status = 'pending';
UPDATE public.documents SET scan_status = 'clean' WHERE scan_status = 'pending';

COMMENT ON COLUMN public.founder_documents.scan_status IS
  'pending | clean | quarantined. Gated by the upload-security edge function (bucket -> magic-byte -> scan-interface). Row is not usable/servable/addable to a pack until clean. Terminal on quarantined — a failed file is removed, not retried in place. Existing rows as of 2026-09-16 were grandfathered to clean.';

COMMENT ON COLUMN public.documents.scan_status IS
  'pending | clean | quarantined. Gated by the upload-security edge function (bucket -> magic-byte -> scan-interface). Row is not usable/servable/addable to a pack until clean. Terminal on quarantined — a failed file is removed, not retried in place. Existing rows as of 2026-09-16 were grandfathered to clean.';

-- notifications.kind needs a new value for the quarantine notice — verified
-- live before writing this migration that 'document_quarantined' is NOT in
-- the current CHECK constraint (an insert with this kind would throw
-- without this change).
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (kind = ANY (ARRAY[
    'deal'::text, 'message'::text, 'invite'::text, 'system'::text, 'ai'::text,
    'ai_operator'::text, 'document_request'::text, 'dd_update'::text, 'view'::text,
    'access_approved'::text, 'connection_request'::text, 'connection_declined'::text,
    'deal_room'::text, 'deal_activity'::text, 'deal_room_invite'::text,
    'verification'::text, 'decision'::text, 'roast'::text,
    'document_quarantined'::text
  ]));
