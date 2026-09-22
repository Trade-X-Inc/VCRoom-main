-- Fix: can_access_deal_room_doc_path() calls get_user_deal_room_ids() (which
-- lives in rls_private, not public) without schema-qualifying it. Its own
-- search_path is 'public, pg_temp' (correctly pg_temp-last per CLAUDE.md
-- §7.2), which never includes rls_private, so the call fails at runtime with
-- 42883 (undefined function) — confirmed live: every signed-URL request
-- against a real deal-room document path (any /:room_id/:user_id/... object
-- in the documents bucket) returns 500 DatabaseError, code 42883. This is
-- the RLS SELECT policy behind storage.createSignedUrl(), so it also blocks
-- the founder-facing document Preview/Download actions and any AI-summary
-- extraction step that re-downloads a just-uploaded file via a signed URL.
--
-- Found live 22 Sep 2026 while verifying the upload-security-gate wiring —
-- unrelated to that fix; this bug predates it and blocks any deal-room
-- document read, not just the newly-gated upload paths.
--
-- Fix: schema-qualify the call at its one call site rather than widen the
-- function's search_path, per CLAUDE.md §7.2 ("fully-qualified names" is
-- the alternative to a wider search_path, and is preferred when only one
-- reference needs it).

create or replace function public.can_access_deal_room_doc_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_sub text;
begin
  begin
    v_room_id := ((storage.foldername(object_name))[1])::uuid;
    v_sub     := (storage.foldername(object_name))[2];
  exception when others then
    return false;
  end;
  -- Agreement files are fee-gated: never granted to the client directly; only the
  -- downloadAgreement service-role fn (which checks fee status) may read them.
  if v_sub = 'agreements' then
    return false;
  end if;
  return v_room_id in (select rls_private.get_user_deal_room_ids(auth.uid()));
end;
$$;
