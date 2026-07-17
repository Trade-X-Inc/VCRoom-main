-- R11 step 5 — critical fix: the `documents` storage bucket had policies
-- (authenticated_read, authenticated_delete, documents_storage_select,
-- authenticated_upload, documents_storage_insert, documents_storage_update)
-- that checked ONLY bucket_id = 'documents' with zero ownership scoping.
-- Any authenticated user on the platform — any founder or investor account
-- — could read, overwrite, or delete any other founder's uploaded file by
-- path. Table-level RLS on founder_documents/documents looked correct but
-- sat on top of a completely open storage layer.
--
-- The bucket serves three distinct path shapes, each scoped to match its
-- owning table's existing RLS model (never re-derived independently, to
-- avoid the two drifting apart):
--   1. founder-docs/{startup_id}/{template_slug}/{filename}
--      -> IP Vault documents. Mirrors founder_documents' own policies:
--         owner (is_startup_founder) always; investor read-only when the
--         founder approved a detail-pack request AND the document's
--         template is not a stage-3 (financial-model/cap-table/legal-type)
--         slug — closing a real gap where the app's visibility toggle
--         never actually prevented a stage-3 doc from being marked
--         'stage2' and exposed pre-deal-room.
--   2. {deal_room_id}/{user_id}/{timestamp}-{filename}
--      -> deal-room shared documents. Mirrors the `documents` table's own
--         policies: uploader owns it, any deal_room_members row grants read.
--   3. personal/{user_id}/...
--      -> already correctly owner-scoped (unchanged).

drop policy if exists "authenticated_read" on storage.objects;
drop policy if exists "authenticated_delete" on storage.objects;
drop policy if exists "authenticated_upload" on storage.objects;
drop policy if exists "documents_storage_select" on storage.objects;
drop policy if exists "documents_storage_insert" on storage.objects;
drop policy if exists "documents_storage_update" on storage.objects;

-- Helper: does the caller own or have approved/room access to this
-- founder-docs storage path? Mirrors founder_documents' own RLS exactly.
create or replace function public.can_access_founder_doc_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_startup_id uuid;
  v_template_slug text;
  v_stage3_slugs text[] := array['financial-model','cap-table','incorporation-docs','shareholder-agreements','bank-statements','customer-references'];
begin
  -- founder-docs/{startup_id}/{template_slug}/{filename}
  if (storage.foldername(object_name))[1] != 'founder-docs' then
    return false;
  end if;
  v_startup_id := ((storage.foldername(object_name))[2])::uuid;
  v_template_slug := (storage.foldername(object_name))[3];

  -- Owner always has full access.
  if is_startup_founder(v_startup_id) then
    return true;
  end if;

  -- Never expose a stage-3 template's file via detail-pack/room approval
  -- at the storage layer, regardless of what the visibility column says.
  if v_template_slug = any(v_stage3_slugs) then
    return false;
  end if;

  -- Investor with an approved detail-pack request for a stage2-visible doc,
  -- or an active deal room with this startup and deal_room-visible doc.
  return exists (
    select 1 from founder_documents fd
    where fd.startup_id = v_startup_id
      and fd.template_slug = v_template_slug
      and (
        (fd.visibility = 'stage2' and exists (
          select 1 from discovery_requests dr
          where dr.startup_id = v_startup_id
            and dr.investor_id = auth.uid()
            and dr.detail_pack_approved = true
        ))
        or (fd.visibility = 'deal_room' and exists (
          select 1 from deal_rooms d
          where d.startup_id = v_startup_id
            and d.status = 'active'
            and (d.investor_email = auth.email() or d.created_by = auth.uid())
        ))
      )
  );
end;
$$;

-- Helper: is the caller a member of the deal room this shared-document
-- storage path belongs to? Mirrors the `documents` table's own RLS.
create or replace function public.can_access_deal_room_doc_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public'
as $$
declare
  v_room_id uuid;
begin
  begin
    v_room_id := ((storage.foldername(object_name))[1])::uuid;
  exception when others then
    return false;
  end;
  return v_room_id in (select get_user_deal_room_ids(auth.uid()));
end;
$$;

create policy "documents_bucket_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents' and (
      can_access_founder_doc_path(name)
      or can_access_deal_room_doc_path(name)
      or ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (auth.uid())::text)
    )
  );

create policy "documents_bucket_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents' and (
      -- founder-docs: only the owning founder can upload into their own path
      ((storage.foldername(name))[1] = 'founder-docs' and is_startup_founder(((storage.foldername(name))[2])::uuid))
      -- deal-room shared docs: any member of that room can upload
      or ((storage.foldername(name))[1] != 'founder-docs' and (storage.foldername(name))[1] != 'personal'
          and ((storage.foldername(name))[1])::uuid in (select get_user_deal_room_ids(auth.uid())))
      or ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (auth.uid())::text)
    )
  );

create policy "documents_bucket_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents' and (
      ((storage.foldername(name))[1] = 'founder-docs' and is_startup_founder(((storage.foldername(name))[2])::uuid))
      or ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (auth.uid())::text)
    )
  );

create policy "documents_bucket_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents' and (
      ((storage.foldername(name))[1] = 'founder-docs' and is_startup_founder(((storage.foldername(name))[2])::uuid))
      or ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (auth.uid())::text)
    )
  );
