-- R14B step 6C4 — mutual-skip integrity. Found live: a founder could set
-- deal_rooms.waived_legal_counsel = true via a plain REST PATCH, because
-- deal_rooms has a broad `is_startup_founder` ALL policy and step 4a added
-- the waiver columns onto that broadly-writable table (the §33 anti-pattern:
-- a sensitive column on a table whose write policy is wider than the column's
-- intended audience). That bypasses the locked mutual-approval requirement
-- ("skipping counsel requires BOTH parties") entirely — a founder could force
-- the deal past the Investment Terms gate without legal counsel against the
-- investor's wishes. The investor couldn't do the same (no update policy),
-- which ALSO meant the LawyerGate mechanic silently failed when the investor
-- was the approver (their direct deal_rooms.update was RLS-blocked).
--
-- Fix, enforced at the DB for every writer:
--   1. A trigger blocks ANY direct change to the four waiver columns unless
--      it happens inside finalize_counsel_waiver() (marked by a txn-local
--      GUC). Direct PATCHes — founder's included — are rejected.
--   2. finalize_counsel_waiver() is the ONLY sanctioned path. It requires an
--      APPROVED waive_counsel request to exist for the room (that request's
--      own RLS already enforces approver <> requester, i.e. the mutual
--      approval genuinely happened), and it runs SECURITY DEFINER so either
--      party — not just the founder — can finalize it, fixing the asymmetry.

create or replace function public.finalize_counsel_waiver(p_deal_room_id uuid)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_req deal_room_lawyer_requests%rowtype;
  v_founder_conf uuid;
  v_investor_conf uuid;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;

  -- Caller must be a founder or investor member of this room.
  if not exists (
    select 1 from deal_room_members
    where deal_room_id = p_deal_room_id and user_id = v_uid and role in ('founder','investor')
  ) then
    return query select false, 'not_authorized'; return;
  end if;

  -- A mutually-approved waive request must exist. The resolve on that table
  -- already enforces approver <> requester, so its existence IS the proof
  -- both sides agreed.
  select * into v_req from deal_room_lawyer_requests
    where deal_room_id = p_deal_room_id and kind = 'waive_counsel' and status = 'approved'
    order by resolved_at desc nulls last limit 1;
  if not found then
    return query select false, 'no_approved_waive_request'; return;
  end if;

  -- Map the request's two parties onto the two confirmed_by columns.
  if v_req.side = 'founder' then
    v_founder_conf := v_req.requested_by; v_investor_conf := v_req.approved_by;
  else
    v_investor_conf := v_req.requested_by; v_founder_conf := v_req.approved_by;
  end if;

  perform set_config('app.waiver_ctx', 'on', true);
  update deal_rooms set
    waived_legal_counsel = true,
    waived_legal_counsel_at = now(),
    waived_legal_counsel_founder_confirmed_by = v_founder_conf,
    waived_legal_counsel_investor_confirmed_by = v_investor_conf
  where id = p_deal_room_id;
  perform set_config('app.waiver_ctx', 'off', true);

  return query select true, null::text;
end;
$$;

create or replace function public.enforce_counsel_waiver_write()
returns trigger
language plpgsql
as $$
begin
  if (new.waived_legal_counsel is distinct from old.waived_legal_counsel
      or new.waived_legal_counsel_at is distinct from old.waived_legal_counsel_at
      or new.waived_legal_counsel_founder_confirmed_by is distinct from old.waived_legal_counsel_founder_confirmed_by
      or new.waived_legal_counsel_investor_confirmed_by is distinct from old.waived_legal_counsel_investor_confirmed_by)
     and coalesce(current_setting('app.waiver_ctx', true), 'off') <> 'on' then
    raise exception 'waived_legal_counsel may only be set via finalize_counsel_waiver() after a mutually-approved waive request';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_counsel_waiver_write on deal_rooms;
create trigger enforce_counsel_waiver_write
  before update on deal_rooms
  for each row execute function public.enforce_counsel_waiver_write();
