-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
-- DRAFT — NOT APPLIED. Lives in supabase/drafts/, not supabase/migrations/.   Job J2, 20 Oct 2026.
-- Account erasure must also clear invitation data: pack_api.erase_user_account now calls invite_v1.erase_user_data
-- (migration 20261020100000), and pack_api.erase_user_account_dryrun reports what that call would change.
--
-- BASELINE (the repo bodies equal the live fingerprints the reviewer read; md5 of the text between the $function$
--   delimiters, as stored in pg_proc.prosrc):
--     erase_user_account         md5 8d8f02758e1cfa47fdc9c00e97c7027a  length 4279   (migration 20260920010000)
--     erase_user_account_dryrun  md5 5b13c201d29e06d293e7eed1ebb3f933  length 5255   (migration 20260920000000)
-- Both: SECURITY DEFINER, SET search_path TO 'public', 'pg_temp', EXECUTE for postgres and service_role only.
-- CREATE OR REPLACE keeps the owner, the ACL and the proconfig; the signature and the SECURITY and search_path
-- clauses below are copied from the originals, and the original revoke/grant pair is repeated (idempotent).
--
-- THE CHANGE, and nothing else:
--   erase_user_account       declares v_invite jsonb; after the "delete from public.startups where founder_id" block and
--                            before "delete from public.users" it runs  v_invite := invite_v1.erase_user_data(p_uid);
--                            and the returned object gains invite_emails_cleared and invite_rows_unlinked.
--                            The block check above still runs first, so a blocked user's invitations are untouched.
--   erase_user_account_dryrun stays non-destructive: it never calls erase_user_data (which writes). It counts, with the
--                            same predicates, the invitation rows the live call would change, and reports them in ONE new
--                            key, would_erase_invite_data {emails_cleared, rows_unlinked, pending_revoked}. The existing
--                            keys and totals are unchanged. NOTE the predicates are duplicated: if invite_v1.erase_user_data
--                            is edited, edit this block too.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

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
  v_invite jsonb;
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

  -- Invitations (invite_v1): clear the addresses, unlink the user ids, revoke open invitations. Never touches
  -- invite_event. Runs before public.users goes and before the auth.users row is removed (it reads the account's email).
  v_invite := invite_v1.erase_user_data(p_uid);

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
    'auth_users_deleted', false,
    'invite_emails_cleared', v_invite->'emails_cleared',
    'invite_rows_unlinked', v_invite->'rows_unlinked'
  );
end;
$function$;

CREATE OR REPLACE FUNCTION pack_api.erase_user_account_dryrun(p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_exists boolean;
  v_active_rooms int;
  v_owned_startups_with_rooms int;
  v_blocked boolean := false;
  v_block_reasons text[] := '{}';
  v_cascade jsonb := '{}'::jsonb;
  v_anonymize jsonb := '{}'::jsonb;
  v_delete jsonb := '{}'::jsonb;
  v_record_entries int;
  v_inv_email text;
  v_inv_confirmed timestamptz;
  v_inv_emails int := 0;
  v_inv_unlinked int := 0;
  v_inv_revoked int := 0;
  v_total_cascade int := 0;
  v_total_anon int := 0;
  v_total_del int := 0;
  r record;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'uid_required');
  end if;

  select exists(select 1 from public.users where id = p_uid) into v_exists;
  if not v_exists then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  select count(*) into v_active_rooms
  from public.deal_room_members m
  join public.deal_rooms d on d.id = m.deal_room_id
  where m.user_id = p_uid and d.status = 'active';

  if v_active_rooms > 0 then
    v_blocked := true;
    v_block_reasons := v_block_reasons ||
      format('member of %s active deal room(s) - cannot erase mid-transaction', v_active_rooms);
  end if;

  select count(*) into v_owned_startups_with_rooms
  from public.startups s
  where s.founder_id = p_uid
    and exists (select 1 from public.deal_rooms d where d.startup_id = s.id);

  if v_owned_startups_with_rooms > 0 then
    v_blocked := true;
    v_block_reasons := v_block_reasons ||
      format('owns %s startup(s) with attached deal room(s)', v_owned_startups_with_rooms);
  end if;

  for r in
    select t.tbl, t.col from (values
      ('advisor_messages','user_id'),('ai_rate_limits','user_id'),
      ('ai_usage','user_id'),('deal_briefs','investor_id'),
      ('deal_room_links','uploader_id'),('deal_room_members','user_id'),
      ('discovery_requests','investor_id'),('document_requests','for_user_id'),
      ('document_requests','requested_by'),('document_reviews','reviewer_id'),
      ('email_log','user_id'),('investor_dd_lite','investor_id'),
      ('investor_profiles','user_id'),('investor_verifications','investor_id'),
      ('investor_watchlist','investor_id'),('nda_acceptances','user_id'),
      ('notifications','user_id'),('onboarding_progress','user_id'),
      ('organization_members','user_id'),('subscriptions','user_id'),
      ('thesis_alerts','investor_id'),('vc_leads','founder_id')
    ) as t(tbl,col)
  loop
    declare v_n int;
    begin
      execute format('select count(*) from public.%I where %I = $1', r.tbl, r.col)
        into v_n using p_uid;
      if v_n > 0 then
        v_cascade := v_cascade || jsonb_build_object(r.tbl || '.' || r.col, v_n);
        v_total_cascade := v_total_cascade + v_n;
      end if;
    end;
  end loop;

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
    declare v_n int;
    begin
      execute format('select count(*) from public.%I where %I = $1', r.tbl, r.col)
        into v_n using p_uid;
      if v_n > 0 then
        v_anonymize := v_anonymize || jsonb_build_object(r.tbl || '.' || r.col, v_n);
        v_total_anon := v_total_anon + v_n;
      end if;
    end;
  end loop;

  for r in
    select t.tbl, t.col from (values
      ('roast_audience','user_id'),('roast_questions','asker_id'),
      ('roast_race_events','user_id'),('roast_sessions','founder_id'),
      ('referrals','referrer_id'),('referrals','joinee_id'),
      ('referral_bonuses','referrer_id'),('referral_bonuses','joinee_id'),
      ('tasks','owner_id')
    ) as t(tbl,col)
  loop
    declare v_n int;
    begin
      execute format('select count(*) from public.%I where %I = $1', r.tbl, r.col)
        into v_n using p_uid;
      if v_n > 0 then
        v_delete := v_delete || jsonb_build_object(r.tbl || '.' || r.col, v_n);
        v_total_del := v_total_del + v_n;
      end if;
    end;
  end loop;

  -- Invitations (invite_v1). READ-ONLY: this counts, with the same predicates the live erasure uses for invitations,
  -- what that erasure would change. It does not call the writing function.
  select lower(u.email), u.email_confirmed_at into v_inv_email, v_inv_confirmed from auth.users u where u.id = p_uid;
  if v_inv_confirmed is null then v_inv_email := null; end if;
  select count(*),
         count(*) filter (where i.accepted_at is null and i.revoked_at is null)
    into v_inv_emails, v_inv_revoked
    from invite_v1.invite i
   where i.email is not null
     and (i.created_by = p_uid or i.accepted_by = p_uid or (v_inv_email is not null and i.email = v_inv_email));
  select count(*) into v_inv_unlinked
    from invite_v1.invite i
   where i.created_by = p_uid or i.accepted_by = p_uid or i.revoked_by = p_uid;

  select count(*) into v_record_entries
  from pack_v1.record_entry where actor_id = p_uid;

  return jsonb_build_object(
    'ok', true,
    'dry_run', true,
    'wrote_nothing', true,
    'uid', p_uid,
    'blocked', v_blocked,
    'block_reasons', to_jsonb(v_block_reasons),
    'would_cascade_delete', v_cascade,
    'would_anonymize', v_anonymize,
    'would_hard_delete', v_delete,
    'totals', jsonb_build_object(
      'cascade_rows', v_total_cascade,
      'anonymized_rows', v_total_anon,
      'hard_deleted_rows', v_total_del
    ),
    'retained_record_entries', v_record_entries,
    'would_erase_invite_data', jsonb_build_object(
      'emails_cleared', v_inv_emails,
      'rows_unlinked', v_inv_unlinked,
      'pending_revoked', v_inv_revoked
    )
  );
end;
$function$;

revoke execute on function pack_api.erase_user_account(uuid) from public;
grant execute on function pack_api.erase_user_account(uuid) to service_role;
revoke execute on function pack_api.erase_user_account_dryrun(uuid) from public;
grant execute on function pack_api.erase_user_account_dryrun(uuid) to service_role;
