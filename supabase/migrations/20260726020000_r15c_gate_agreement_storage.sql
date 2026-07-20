-- R15C step 7 fix: the agreement download gate was UI-only. can_access_deal_room_doc_path
-- granted any room member direct storage access to everything under <room_id>/,
-- so a member could createSignedUrl the finalized agreement before the platform
-- fee was confirmed. Fix: exclude the <room_id>/agreements/ subpath from CLIENT
-- storage; agreement files are read ONLY via the downloadAgreement service-role fn
-- (in-review free for members; finalized gated on fee). Signed-copies/payment-proof
-- paths are unaffected (not fee-gated).
create or replace function can_access_deal_room_doc_path(object_name text)
returns boolean language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_room_id uuid; v_sub text;
begin
  begin
    v_room_id := ((storage.foldername(object_name))[1])::uuid;
    v_sub     := (storage.foldername(object_name))[2];
  exception when others then return false; end;
  if v_sub = 'agreements' then return false; end if;
  return v_room_id in (select get_user_deal_room_ids(auth.uid()));
end;
$function$;
comment on function can_access_deal_room_doc_path(text) is
  'R11 deal-room doc storage gate, extended R15C: excludes <room>/agreements/ from client access so the finalized agreement download is fee-gated through the downloadAgreement server fn, not the UI button alone.';
