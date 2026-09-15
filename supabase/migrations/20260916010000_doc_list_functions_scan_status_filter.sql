-- Read-side of the upload-security gate for the deal-room documents table.
--
-- Companion to 20260916000000 (which added `documents.scan_status`,
-- already approved and applied separately). Without this filter, a
-- document still 'pending' (gate hasn't resolved yet) is genuinely
-- returned and rendered by the deal-room documents UI — visible during
-- the gate's real execution window, not just a theoretical race. This
-- closes that for the one surface currently in scope: `documents`
-- (deal-room uploads). founder_documents' equivalent read-side fix is a
-- route-level query filter (app.documents.tsx), not a SQL change, since
-- that table is read directly rather than through a pack_api function.
--
-- Scope check performed before writing this: both doc_list_room and
-- doc_list_investor read ONLY public.documents (no join into any other
-- document-bearing table); doc_list_library reads ONLY public.documents
-- as well. None of the three touches a closing-stage table
-- (deal_room_signed_agreements / deal_room_payment_proof /
-- deal_room_agreements) — those remain out of scope for this pass, per
-- the explicit deferral, and are unaffected by this migration.
--
-- Grandfathering check performed before writing this: 20260916000000 sets
-- every existing `documents` row's scan_status to 'clean' BEFORE this
-- filter is added — so no currently-visible document disappears when
-- these functions are redeployed. Only genuinely new, still-'pending'
-- uploads are held back, which is the intended behavior.
--
-- Bodies below are byte-identical to the live functions (confirmed
-- against pg_get_functiondef before writing this migration, per CLAUDE.md
-- §7.2's reconciliation rule) except for the one added `and
-- d.scan_status = 'clean'` clause in each — no other behavior changes.

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
        and d.scan_status = 'clean'
    ) x
  ), '[]'::jsonb));
end;
$fn$;

create or replace function pack_api.doc_list_library(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  return jsonb_build_object('ok', true, 'documents', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.created_at desc)
    from public.documents d
    where d.uploader_id = p_uid
      and d.deal_room_id <> p_deal_room_id
      and d.scan_status = 'clean'
  ), '[]'::jsonb));
end;
$fn$;

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
        and d.scan_status = 'clean'
    ) x
  ), '[]'::jsonb));
end;
$fn$;
