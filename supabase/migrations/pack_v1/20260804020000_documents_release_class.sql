-- ═══════════════════════════════════════════════════════════════════════════
-- documents + release-class model (Phase 1 step 7b), in pack_v1.
--
-- Foundation §8: three release classes. Enforcement lives in pack_api functions
-- (the action layer), never in a passive column — the mistake public.documents
-- made (a freetext `visibility` nobody enforced).
--
--   view_only          → server produces a rendered artifact; the file bytes
--                        never reach the browser. IMAGE (server re-encode) and
--                        SPREADSHEET (server parse → JSON) satisfy this strictly
--                        with no new infra. PDF view_only is DEFERRED — client
--                        PDF.js needs the bytes to rasterize, and server-side
--                        rasterization is unverified Workers infra (separate
--                        decision). view_only PDF therefore falls to
--                        release_on_request until that infra exists.
--   release_on_request → a Release row (§8.1) is created status=pending; no URL
--                        is minted until an approver action grants it.
--   open_release       → a signed URL is minted immediately, but a Release row
--                        is written FIRST — no unrecorded path out of a room.
-- ═══════════════════════════════════════════════════════════════════════════

create type pack_v1.release_status as enum ('pending','granted','declined','revoked');

-- ── documents ───────────────────────────────────────────────────────────────
-- The 9th table (deferred from sub-milestone A). storage_path points into the
-- private Supabase 'documents' bucket. release_class governs egress. pack_field_id
-- links a document back to the pack field it evidences (nullable — some docs are
-- closing artifacts, not field evidence).
create table pack_v1.documents (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  deal_room_ref  uuid,                                   -- soft ref until cutover
  pack_field_id  uuid references pack_v1.pack_field(id) on delete set null,
  storage_bucket text not null default 'documents',
  storage_path   text not null,
  file_name      text not null,
  content_type   text,                                   -- mime, drives render path
  release_class  pack_v1.release_class not null default 'view_only',
  version        integer not null default 1,             -- artifact version (§8.1)
  uploaded_by    uuid not null,
  created_at     timestamptz not null default now()
);
create index documents_org_idx on pack_v1.documents(org_id);
create index documents_field_idx on pack_v1.documents(pack_field_id);

-- ── release (§8.1) ──────────────────────────────────────────────────────────
-- Every authorised disclosure — inside or outside the platform — is a row here.
-- requester, approver, recipient, artifact version, timestamp, governing NDA.
create table pack_v1.release (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  document_id   uuid not null references pack_v1.documents(id) on delete cascade,
  document_version integer not null,                     -- artifact version at release time
  requester_id  uuid not null,
  recipient_id  uuid not null,
  approver_id   uuid,                                    -- null while pending
  governing_nda uuid,                                    -- ref to the NDA that permits it
  status        pack_v1.release_status not null default 'pending',
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz
);
create index release_document_idx on pack_v1.release(document_id);
create index release_org_idx on pack_v1.release(org_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- pack_api functions — all SECURITY DEFINER, search_path=pack_v1,pg_temp,
-- service_role-only. The action layer is the sole caller (WHY_PACK_API.md).
-- These functions do the RELEASE-CLASS DECISION and write Release rows; the
-- actual signed-URL minting happens in the TS action (it needs the Storage
-- API, not SQL) AFTER these authorize and record.
-- ═══════════════════════════════════════════════════════════════════════════

-- documents.requestAccess — the release-class decision point.
-- Returns a directive telling the action layer what to do next:
--   { ok, mode: 'render' | 'mint' | 'pending' | 'deferred', ... }
-- It NEVER returns a URL itself (URLs come from the Storage API in TS). It
-- authorizes (org ownership), classifies, and writes the Release row where
-- §8.1 requires one.
create or replace function pack_api.document_request_access(
  p_uid         uuid,
  p_org_id      uuid,
  p_document_id uuid,
  p_recipient   uuid,
  p_governing_nda uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pack_v1, pg_temp
as $fn$
declare
  v_doc pack_v1.documents;
  v_ext text;
  v_is_pdf boolean;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_doc from pack_v1.documents where id = p_document_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_doc.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_ext := lower(coalesce(nullif(regexp_replace(v_doc.file_name, '^.*\.', ''), v_doc.file_name), ''));
  v_is_pdf := (v_ext = 'pdf') or (v_doc.content_type = 'application/pdf');

  -- ── view_only, strictly-renderable types (image / spreadsheet) ─────────
  -- Server renders, file bytes never reach the browser (strict §8). No Release
  -- row: nothing leaves the platform, so there is no disclosure to record.
  if v_doc.release_class = 'view_only' and v_ext in ('png','jpg','jpeg','gif','webp') then
    return jsonb_build_object('ok', true, 'mode', 'render', 'render_kind', 'image',
                              'document_id', v_doc.id, 'storage_path', v_doc.storage_path);
  end if;
  if v_doc.release_class = 'view_only' and v_ext in ('xlsx','xls','csv') then
    return jsonb_build_object('ok', true, 'mode', 'render', 'render_kind', 'spreadsheet',
                              'document_id', v_doc.id, 'storage_path', v_doc.storage_path);
  end if;

  -- ── release_on_request  (also: view_only PDF and any view_only type with no
  --    strict renderer both fall here — the honest "no weaker version" path) ──
  -- A Release row is created status=pending; NO url until an approver grants it.
  if v_doc.release_class = 'release_on_request'
     or v_doc.release_class = 'view_only' then   -- remaining view_only = pdf/other → deferred to request
    insert into pack_v1.release
      (org_id, document_id, document_version, requester_id, recipient_id, governing_nda, status)
    values
      (v_doc.org_id, v_doc.id, v_doc.version, p_uid, p_recipient, p_governing_nda, 'pending');
    return jsonb_build_object('ok', true, 'mode', 'pending',
      'reason', case when v_doc.release_class = 'view_only' and v_is_pdf then 'view_only_pdf_deferred'
                     when v_doc.release_class = 'view_only' then 'no_view_only_renderer'
                     else 'release_on_request' end);
  end if;

  -- ── open_release ───────────────────────────────────────────────────────
  -- Release row written FIRST (granted), THEN the TS action mints the URL.
  if v_doc.release_class = 'open_release' then
    insert into pack_v1.release
      (org_id, document_id, document_version, requester_id, recipient_id, approver_id, governing_nda, status, decided_at)
    values
      (v_doc.org_id, v_doc.id, v_doc.version, p_uid, p_recipient, p_uid, p_governing_nda, 'granted', now());
    return jsonb_build_object('ok', true, 'mode', 'mint',
                              'document_id', v_doc.id, 'storage_path', v_doc.storage_path);
  end if;

  return jsonb_build_object('ok', false, 'error', 'unhandled_release_class');
end;
$fn$;

revoke all on function pack_api.document_request_access(uuid,uuid,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pack_api.document_request_access(uuid,uuid,uuid,uuid,uuid) to service_role;

-- documents.grantRelease — an approver action flips a pending Release to granted.
-- Returns mint directive on success (the TS action then mints the URL).
create or replace function pack_api.document_grant_release(
  p_approver  uuid,
  p_org_id    uuid,
  p_release_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pack_v1, pg_temp
as $fn$
declare
  v_rel pack_v1.release;
  v_doc pack_v1.documents;
begin
  if p_approver is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_rel from pack_v1.release where id = p_release_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_rel.org_id <> p_org_id then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  if v_rel.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;

  update pack_v1.release
     set status = 'granted', approver_id = p_approver, decided_at = now()
   where id = p_release_id;

  select * into v_doc from pack_v1.documents where id = v_rel.document_id;
  return jsonb_build_object('ok', true, 'mode', 'mint',
                            'document_id', v_doc.id, 'storage_path', v_doc.storage_path);
end;
$fn$;

revoke all on function pack_api.document_grant_release(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function pack_api.document_grant_release(uuid,uuid,uuid) to service_role;
