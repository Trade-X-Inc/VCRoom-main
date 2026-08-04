-- ═══════════════════════════════════════════════════════════════════════════
-- Documents feature group — column-coverage completion (Step A, Stage-1 finding).
--
-- The Stage-1 proving run (DocumentWishlist.tsx rewire) found the initial
-- documents-group functions (20260805010000) were INCOMPLETE against the real
-- UI write contract — they silently dropped columns the client actually writes:
--   document_requests.priority     (NOT NULL default 'medium'; UI sends high/med/low)
--   document_requests.for_user_id  (UI sets = requester)
--   document_requests.response_link (the founder "Share link" response path —
--                                     had NO function at all)
--   documents.file_size            (UI sends the uploaded file's byte size)
--
-- Rewiring against the incomplete functions would have been silent data loss.
-- This migration widens the three affected functions and adds one new one, so the
-- gateway path is a FAITHFUL replacement for the current direct-write behaviour,
-- not a lossy one. Authorization is UNCHANGED from 20260805010000 (still exactly
-- the current RLS): document_requests = member, documents write = uploader-forced.
--
-- Same discipline: SECURITY DEFINER, search_path='' fully-qualified, service_role
-- only (re-granted at the bottom for the two functions whose signatures change).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── doc_request_insert — add priority + for_user_id ──────────────────────────
-- priority defaults to 'medium' to match the column default when the caller
-- omits it. for_user_id mirrors the current UI (requester = target); it is a
-- plain data column, not an authorization input.
create or replace function pack_api.doc_request_insert(
  p_uid uuid, p_deal_room_id uuid, p_title text, p_description text,
  p_priority text default 'medium', p_for_user_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_id uuid;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  insert into public.document_requests
    (deal_room_id, requested_by, for_user_id, title, description, priority, status)
  values
    (p_deal_room_id, p_uid, coalesce(p_for_user_id, p_uid), p_title, p_description,
     coalesce(nullif(p_priority,''), 'medium'), 'pending')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$fn$;

-- The 4-arg signature from 20260805010000 is now shadowed by this 6-arg default
-- form for the TS caller (which always passes all six). Drop the old one so there
-- is exactly one doc_request_insert and no ambiguous-overload risk at call time.
drop function if exists pack_api.doc_request_insert(uuid, uuid, text, text);

-- ── doc_request_respond_link — founder "Share link" response (member) ────────
-- Sets response_link and marks fulfilled in one call. Same member authorization
-- as doc_request_set_status; matches the current handleSaveLink direct update.
create or replace function pack_api.doc_request_respond_link(
  p_uid uuid, p_request_id uuid, p_link text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_req public.document_requests;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if coalesce(nullif(btrim(p_link),''), null) is null then
    return jsonb_build_object('ok', false, 'error', 'empty_link');
  end if;
  select * into v_req from public.document_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, v_req.deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.document_requests
    set response_link = btrim(p_link), status = 'fulfilled'
    where id = p_request_id;
  return jsonb_build_object('ok', true, 'id', p_request_id);
end;
$fn$;

-- ── doc_insert — add file_size ───────────────────────────────────────────────
create or replace function pack_api.doc_insert(
  p_uid uuid, p_deal_room_id uuid, p_storage_path text, p_file_name text,
  p_category text, p_uploaded_by_role text, p_file_size bigint default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_id uuid;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if not pack_api.authz_dr_is_open(p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'room_closed');
  end if;
  insert into public.documents
    (deal_room_id, uploader_id, storage_path, file_name, category, uploaded_by_role, file_size, status)
  values
    (p_deal_room_id, p_uid, p_storage_path, p_file_name, p_category, p_uploaded_by_role, p_file_size, 'uploaded')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$fn$;

-- old 6-arg doc_insert shadowed by the 7-arg default form; drop for single-signature clarity.
drop function if exists pack_api.doc_insert(uuid, uuid, text, text, text, text);

-- ── grants: service_role only, for the changed/new signatures ────────────────
do $grants$
declare fn text;
begin
  foreach fn in array array[
    'pack_api.doc_request_insert(uuid,uuid,text,text,text,uuid)',
    'pack_api.doc_request_respond_link(uuid,uuid,text)',
    'pack_api.doc_insert(uuid,uuid,text,text,text,text,bigint)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$grants$;
