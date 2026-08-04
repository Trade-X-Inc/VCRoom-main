-- ═══════════════════════════════════════════════════════════════════════════
-- Documents feature group — three named read functions + doc_view_insert column
-- completion (Step A, Stage-2 trace-first audit findings).
--
-- The 30-site route (app.deal-rooms.$id.documents.tsx) reads `documents` in THREE
-- distinct shapes, each with its own authorization and its own uploader join. A
-- single doc_list can't serve them faithfully, so — per the reviewer's decision —
-- three independently-authorized named functions, matching current RLS exactly:
--
--   doc_list_room     member of the room (documents_room_read ∪ documents_own).
--                     All docs in the room. Join: uploader{full_name}.
--                     [route: docs query, line ~219]
--   doc_list_library  UPLOADER-scoped (documents_own): uploader_id = caller AND
--                     deal_room_id <> the current room (the "add from library"
--                     picker). NOT membership — a user's own docs elsewhere.
--                     Join: none (route selects '*'). [route: line ~233]
--   doc_list_investor member of the room (documents_room_read), filtered to
--                     uploaded_by_role='investor'. Join: uploader{full_name,
--                     avatar_url}. [route: line ~261]
--
-- Each returns rows shaped so the client's `doc.uploader?.full_name` keeps working
-- (uploader nested object), created_at desc, matching the current queries.
--
-- doc_view_insert: WIDENED to carry startup_id, viewer_role, viewer_name — the
-- route's trackDocumentView writes all three (viewer_name derived from an
-- investor_profiles read on the client). The initial function silently dropped
-- them (Stage-1-class gap). Authorization UNCHANGED: any authenticated caller,
-- matching authenticated_insert_doc_views (with_check auth.role()='authenticated').
--
-- Discipline: SECURITY DEFINER, search_path='' fully-qualified, service_role only.
-- ═══════════════════════════════════════════════════════════════════════════

-- helper: a document row + nested uploader object (full_name[, avatar_url]).
-- Inlined per function rather than shared, to keep each read's select explicit.

-- ── doc_list_room — member of room; all docs; uploader{full_name} ────────────
create or replace function pack_api.doc_list_room(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'documents', coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select d.*,
             jsonb_build_object('full_name', u.full_name) as uploader
      from public.documents d
      left join public.users u on u.id = d.uploader_id
      where d.deal_room_id = p_deal_room_id
    ) x
  ), '[]'::jsonb));
end;
$fn$;

-- ── doc_list_library — UPLOADER-scoped; own docs NOT in the current room ─────
-- documents_own (uploader_id = caller). No membership needed; this is the user's
-- own library. Excludes the current room (the picker offers docs to ADD).
create or replace function pack_api.doc_list_library(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  -- IMPORTANT: use <> (not `is distinct from`) to match the ORIGINAL PostgREST
  -- query's `.neq("deal_room_id", ROOM)` EXACTLY — SQL `<>` is NULL/unknown for
  -- rows with deal_room_id IS NULL, so those rows are EXCLUDED, precisely as the
  -- old query excluded them. `is distinct from` would INCLUDE detached (null) docs
  -- — a behavioural change. Whether detached docs *should* appear in the library
  -- is a separate product question, flagged in the Stage-2 report, NOT silently
  -- changed here. Faithful replacement first.
  return jsonb_build_object('ok', true, 'documents', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.created_at desc)
    from public.documents d
    where d.uploader_id = p_uid
      and d.deal_room_id <> p_deal_room_id
  ), '[]'::jsonb));
end;
$fn$;

-- ── doc_list_investor — member of room; uploaded_by_role='investor' ──────────
-- documents_room_read, filtered. uploader{full_name, avatar_url}.
create or replace function pack_api.doc_list_investor(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'documents', coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select d.*,
             jsonb_build_object('full_name', u.full_name, 'avatar_url', u.avatar_url) as uploader
      from public.documents d
      left join public.users u on u.id = d.uploader_id
      where d.deal_room_id = p_deal_room_id
        and d.uploaded_by_role = 'investor'
    ) x
  ), '[]'::jsonb));
end;
$fn$;

-- ── doc_view_insert — widen with startup_id, viewer_role, viewer_name ────────
-- Authorization UNCHANGED (any authenticated caller). Old 5-arg form dropped for
-- single-signature clarity, mirroring the Stage-1 widening convention.
create or replace function pack_api.doc_view_insert(
  p_uid uuid, p_deal_room_id uuid, p_document_id uuid, p_founder_document_id uuid,
  p_duration_seconds integer, p_startup_id uuid default null,
  p_viewer_role text default null, p_viewer_name text default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  insert into public.document_views
    (deal_room_id, document_id, founder_document_id, viewer_id, duration_seconds,
     startup_id, viewer_role, viewer_name)
  values
    (p_deal_room_id, p_document_id, p_founder_document_id, p_uid, coalesce(p_duration_seconds,0),
     p_startup_id, p_viewer_role, p_viewer_name);
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$fn$;

drop function if exists pack_api.doc_view_insert(uuid, uuid, uuid, uuid, integer);

-- ── grants: service_role only ───────────────────────────────────────────────
do $grants$
declare fn text;
begin
  foreach fn in array array[
    'pack_api.doc_list_room(uuid,uuid)',
    'pack_api.doc_list_library(uuid,uuid)',
    'pack_api.doc_list_investor(uuid,uuid)',
    'pack_api.doc_view_insert(uuid,uuid,uuid,uuid,integer,uuid,text,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$grants$;
