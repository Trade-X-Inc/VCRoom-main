-- ═══════════════════════════════════════════════════════════════════════════
-- Documents feature group — pack_api data functions (Phase 1 client migration,
-- Step A backend). Membership-authorized documents + document_requests only.
-- founder_documents (founder-ownership, app.documents.tsx) is DEFERRED to the
-- profile/founder group — see AUTHZ_MAPPING.md note. Not touched here.
--
-- AUTHORIZATION MATCHES THE EXACT CURRENT RLS (traced, not assumed):
--   documents policies:
--     documents_own      ALL    uploader_id = auth.uid()          → WRITES = uploader-only
--     documents_room_read SELECT deal_room_id ∈ member rooms      → READS  = member OR own
--   document_requests:
--     doc_requests_access ALL    deal_room_id ∈ member rooms      → member
--   document_views:
--     authenticated_insert_doc_views INSERT auth.role()=authenticated → any authed caller
--
-- CRITICAL: writes to `documents` are UPLOADER-scoped, NOT membership. A room
-- member who is not the uploader can READ a doc but cannot UPDATE it under
-- current RLS. Porting membership for writes would be a WEAKENING (any member
-- editing any doc). These functions replicate uploader_id = p_uid for writes,
-- exactly as documents_own does.
--
-- Every function: SECURITY DEFINER, search_path='' (fully-qualified public.*),
-- service_role-only. Reuses the 9398d03 authz_* primitives (no re-inlined
-- membership logic).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── documents.list — read a deal room's documents (member OR own) ───────────
-- Mirrors: documents_room_read (member) unioned with documents_own (uploader).
create or replace function pack_api.doc_list(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  -- read authorization: caller must be a member of the room (documents_room_read).
  -- (Own-but-not-member docs are covered per-row by the OR below, matching the
  -- union of documents_room_read and documents_own.)
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'documents', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.created_at desc)
    from public.documents d
    where d.deal_room_id = p_deal_room_id
      and (d.deal_room_id in (select pack_api.authz_get_user_deal_room_ids(p_uid))
           or d.uploader_id = p_uid)
  ), '[]'::jsonb));
end;
$fn$;

-- ── documents.insert — upload metadata (member of room; room open per §8) ────
-- Source insert path had no explicit CHECK beyond documents_own (uploader=self);
-- membership is required to attach to a room, and §8 requires the room be open.
-- The inserted uploader_id is FORCED to p_uid (never client-supplied) — this is
-- the documents_own invariant made non-forgeable.
create or replace function pack_api.doc_insert(
  p_uid uuid, p_deal_room_id uuid, p_storage_path text, p_file_name text,
  p_category text, p_uploaded_by_role text
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
  insert into public.documents (deal_room_id, uploader_id, storage_path, file_name, category, uploaded_by_role, status)
  values (p_deal_room_id, p_uid, p_storage_path, p_file_name, p_category, p_uploaded_by_role, 'uploaded')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$fn$;

-- ── documents.update — visibility / ai_summary / attach-detach (UPLOADER only)─
-- Matches documents_own (uploader_id = p_uid). A member who is not the uploader
-- is forbidden — exactly as current RLS enforces. p_patch is a constrained jsonb
-- of allowed columns only; anything else is ignored.
create or replace function pack_api.doc_update(p_uid uuid, p_document_id uuid, p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_doc public.documents;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into v_doc from public.documents where id = p_document_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  -- WRITE authorization = uploader-only (documents_own), NOT membership.
  if v_doc.uploader_id <> p_uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.documents set
    visibility  = coalesce(p_patch->>'visibility', visibility),
    ai_summary  = coalesce(p_patch->>'ai_summary', ai_summary),
    summary_edited = coalesce((p_patch->>'summary_edited')::boolean, summary_edited),
    -- attach/detach: deal_room_id may be set to a uuid or explicitly nulled.
    deal_room_id = case
      when p_patch ? 'deal_room_id' then nullif(p_patch->>'deal_room_id','')::uuid
      else deal_room_id end,
    updated_at = now()
  where id = p_document_id;
  return jsonb_build_object('ok', true, 'id', p_document_id);
end;
$fn$;

-- ── document_views.insert — view tracking (any authenticated caller) ─────────
-- Matches authenticated_insert_doc_views (check: auth.role()='authenticated').
-- In the gateway a non-null p_uid IS the authenticated caller.
create or replace function pack_api.doc_view_insert(
  p_uid uuid, p_deal_room_id uuid, p_document_id uuid, p_founder_document_id uuid, p_duration_seconds integer
)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  insert into public.document_views (deal_room_id, document_id, founder_document_id, viewer_id, duration_seconds)
  values (p_deal_room_id, p_document_id, p_founder_document_id, p_uid, coalesce(p_duration_seconds,0));
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$fn$;

-- ── document_requests.list / insert / fulfill / delete (MEMBER of room) ──────
-- Matches doc_requests_access (ALL: deal_room_id ∈ member rooms).
create or replace function pack_api.doc_request_list(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'requests', coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
    from public.document_requests r where r.deal_room_id = p_deal_room_id), '[]'::jsonb));
end;
$fn$;

create or replace function pack_api.doc_request_insert(
  p_uid uuid, p_deal_room_id uuid, p_title text, p_description text
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
  insert into public.document_requests (deal_room_id, requested_by, title, description, status)
  values (p_deal_room_id, p_uid, p_title, p_description, 'pending')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$fn$;

-- fulfill (status→fulfilled) and delete: caller must be a member of the request's room.
create or replace function pack_api.doc_request_set_status(p_uid uuid, p_request_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_req public.document_requests;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if p_status not in ('pending','fulfilled') then return jsonb_build_object('ok', false, 'error', 'bad_status'); end if;
  select * into v_req from public.document_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, v_req.deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.document_requests set status = p_status where id = p_request_id;
  return jsonb_build_object('ok', true, 'id', p_request_id);
end;
$fn$;

create or replace function pack_api.doc_request_delete(p_uid uuid, p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
declare v_req public.document_requests;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select * into v_req from public.document_requests where id = p_request_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, v_req.deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.document_requests where id = p_request_id;
  return jsonb_build_object('ok', true, 'id', p_request_id);
end;
$fn$;

-- ── grants: service_role only ───────────────────────────────────────────────
do $grants$
declare fn text;
begin
  foreach fn in array array[
    'pack_api.doc_list(uuid,uuid)',
    'pack_api.doc_insert(uuid,uuid,text,text,text,text)',
    'pack_api.doc_update(uuid,uuid,jsonb)',
    'pack_api.doc_view_insert(uuid,uuid,uuid,uuid,integer)',
    'pack_api.doc_request_list(uuid,uuid)',
    'pack_api.doc_request_insert(uuid,uuid,text,text)',
    'pack_api.doc_request_set_status(uuid,uuid,text)',
    'pack_api.doc_request_delete(uuid,uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$grants$;
