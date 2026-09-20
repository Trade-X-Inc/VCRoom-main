-- Account erasure — LIVE WRITE PATH (20 Sep 2026)
--
-- Armed by explicit approval after the dry-run (20260920000000) was
-- verified across three scenarios. Replaces the previous "Delete account"
-- behaviour, which set public.users.role = 'deleted' and nothing else:
-- the account stayed signable-in with every FK-linked row attached
-- (CLAUDE.md §19q, §19q.2).
--
-- THIS FUNCTION IS HALF THE OPERATION. It handles everything in the
-- public schema and returns auth_users_deleted: false, always. Deleting
-- auth.users is what actually disables sign-in, and SQL cannot do it:
-- ZERO foreign keys in this database reference auth.users. The caller
-- (src/lib/erase-account-fn.ts) completes step 2 via the Admin API and
-- must not report success until that returns ok.
--
-- Block/classification predicates are IDENTICAL to the dry-run's by
-- construction, so the two cannot diverge in what they consider blocked,
-- anonymisable, or deletable. If one is edited, edit both.
--
-- Ordering inside the function matters and is deliberate:
--   1. block checks return BEFORE any write statement executes
--   2. anonymise (counterparty-shared rows survive, identity replaced)
--   3. hard delete (rows with no counterparty interest)
--   4. delete public.users LAST — this is what fires the 22 CASCADE FKs
--
-- The sentinel user (00000000-dead-4000-a000-000000000000, "Deleted
-- user") is the permanent anonymous reference. It is created idempotently
-- above the function and is itself un-erasable (guarded explicitly), so a
-- bug can never cascade every anonymised row away by erasing it.
--
-- pack_v1.record_entry is NOT touched — append-only, protected by both a
-- no-UPDATE and a no-DELETE trigger (§8.3). Its actor_id entries are
-- retained and the count is returned so the UI can disclose it honestly.
-- This is the §11.2 erasure-vs-retention tension, disclosed rather than
-- resolved.
--
-- VERIFIED LIVE before this file was written (§6, not traced):
--   - block path refused a REAL account (test-investor@, 2 active rooms)
--     with its stated reason, writing nothing
--   - full erasure driven through the REAL UI button on a disposable
--     fixture: public.users gone, cascade rows gone, an attributed note
--     SURVIVED reattributed to the sentinel, auth.users removed, and
--     sign-in afterwards returned invalid_credentials on the exact path
--     that returned 200 beforehand
--   - anon EXECUTE denied with a real 42501
--
-- KNOWN LIMITATION, tracked in §19q.2: the anonymise branch has only ever
-- run against synthetic data. Every real user with anonymisable rows is
-- currently blocked (all deal rooms are status='active'), so the branch
-- is unreachable in production until a deal actually closes. Re-run the
-- dry-run against the first real user who becomes erasable after a
-- genuine close and confirm the counts before trusting it.

-- Sentinel user — the permanent anonymous reference.
insert into public.users (id, role, full_name)
values ('00000000-dead-4000-a000-000000000000', 'founder', 'Deleted user')
on conflict (id) do nothing;

CREATE OR REPLACE FUNCTION pack_api.erase_user_account(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_sentinel constant uuid := '00000000-dead-4000-a000-000000000000';
  v_exists boolean;
  v_active_rooms int;
  v_owned_startups_with_rooms int;
  v_block_reasons text[] := '{}';
  v_anonymized int := 0;
  v_hard_deleted int := 0;
  v_record_entries int;
  v_n int;
  r record;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'uid_required');
  end if;

  if p_uid = v_sentinel then
    return jsonb_build_object('ok', false, 'error', 'cannot_erase_sentinel');
  end if;

  select exists(select 1 from public.users where id = p_uid) into v_exists;
  if not v_exists then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  -- BLOCK checks - identical predicates to erase_user_account_dryrun.
  select count(*) into v_active_rooms
  from public.deal_room_members m
  join public.deal_rooms d on d.id = m.deal_room_id
  where m.user_id = p_uid and d.status = 'active';

  if v_active_rooms > 0 then
    v_block_reasons := v_block_reasons ||
      format('member of %s active deal room(s) - cannot erase mid-transaction', v_active_rooms);
  end if;

  select count(*) into v_owned_startups_with_rooms
  from public.startups s
  where s.founder_id = p_uid
    and exists (select 1 from public.deal_rooms d where d.startup_id = s.id);

  if v_owned_startups_with_rooms > 0 then
    v_block_reasons := v_block_reasons ||
      format('owns %s startup(s) with attached deal room(s)', v_owned_startups_with_rooms);
  end if;

  if array_length(v_block_reasons, 1) > 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'blocked',
      'block_reasons', to_jsonb(v_block_reasons)
    );
  end if;

  -- ANONYMIZE - counterparty-shared rows survive, identity is replaced.
  for r in
    select t.tbl, t.col from (values
      ('activities','actor_id'),('messages','sender_id'),('notes','author_id'),
      ('documents','uploader_id'),('deal_rooms','created_by'),
      ('deal_rooms','waived_legal_counsel_founder_confirmed_by'),
      ('deal_rooms','waived_legal_counsel_investor_confirmed_by'),
      ('deal_tasks','assignee_id'),('deal_tasks','created_by'),
      ('decisions','decided_by'),('term_sheets','investor_id'),
      ('meetings','created_by'),('invites','invited_by'),
      ('due_diligence_items','owner_id'),('deal_room_members','invited_by'),
      ('deal_room_invite_links','invited_by'),('deal_room_invite_links','accepted_by'),
      ('deal_room_lawyer_invites','invited_by'),('deal_room_lawyer_invites','accepted_by'),
      ('deal_room_lawyer_requests','requested_by'),('deal_room_lawyer_requests','approved_by'),
      ('deal_room_dd_analysis','run_by'),('ai_reports','generated_by'),
      ('organizations','created_by')
    ) as t(tbl,col)
  loop
    execute format('update public.%I set %I = $1 where %I = $2', r.tbl, r.col, r.col)
      using v_sentinel, p_uid;
    get diagnostics v_n = row_count;
    v_anonymized := v_anonymized + v_n;
  end loop;

  -- HARD DELETE - solely the user's, no counterparty interest.
  for r in
    select t.tbl, t.col from (values
      ('roast_audience','user_id'),('roast_questions','asker_id'),
      ('roast_race_events','user_id'),('roast_sessions','founder_id'),
      ('referrals','referrer_id'),('referrals','joinee_id'),
      ('referral_bonuses','referrer_id'),('referral_bonuses','joinee_id'),
      ('tasks','owner_id')
    ) as t(tbl,col)
  loop
    execute format('delete from public.%I where %I = $1', r.tbl, r.col)
      using p_uid;
    get diagnostics v_n = row_count;
    v_hard_deleted := v_hard_deleted + v_n;
  end loop;

  -- Startups with no attached deal room (the blocked case already returned).
  delete from public.startups where founder_id = p_uid;
  get diagnostics v_n = row_count;
  v_hard_deleted := v_hard_deleted + v_n;

  select count(*) into v_record_entries
  from pack_v1.record_entry where actor_id = p_uid;

  -- The cascade tier goes with this delete (22 FKs, ON DELETE CASCADE).
  delete from public.users where id = p_uid;

  return jsonb_build_object(
    'ok', true,
    'uid', p_uid,
    'anonymized_rows', v_anonymized,
    'hard_deleted_rows', v_hard_deleted,
    'retained_record_entries', v_record_entries,
    'public_users_deleted', true,
    'auth_users_deleted', false
  );
end;
$function$

revoke execute on function pack_api.erase_user_account(uuid) from public;
grant execute on function pack_api.erase_user_account(uuid) to service_role;
