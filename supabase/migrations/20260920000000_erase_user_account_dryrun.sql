-- Account erasure — DRY-RUN ONLY (20 Sep 2026)
--
-- Context: the app's "Delete account" button has never deleted anything.
-- It sets public.users.role = 'deleted' and nothing else (see
-- app.settings.security.tsx's handleDeleteAccount, and CLAUDE.md §19q).
-- The account stays signable-in, and all FK-linked rows stay attached.
--
-- Compounding that, ZERO foreign keys in this database reference
-- auth.users — all 58 target public.users. So a DELETE FROM auth.users
-- cascades nothing, silently. Correct erasure is therefore a two-step
-- sequence (public.users first, which does cascade; then auth.users via
-- the Admin API, which SQL cannot do) plus explicit handling of the 34
-- NO ACTION constraints that would otherwise hard-block the delete.
--
-- THIS MIGRATION SHIPS THE DRY-RUN HALF ONLY.
-- pack_api.erase_user_account_dryrun() computes and returns exactly what
-- a real erasure would do. It performs NO writes of any kind. The
-- live-write counterpart is deliberately NOT in this file and requires
-- its own separate approval before being written or applied (CLAUDE.md
-- §4 confirm-first; a destructive multi-table erasure is precisely the
-- class of change that rule exists for).
--
-- FK tiers, counted live from information_schema before writing this:
--   22 CASCADE     -> removed automatically by deleting public.users
--   34 NO ACTION   -> must be handled explicitly (this function's job)
--    2 SET NULL    -> handled automatically (document_views, profile_views)
--
-- Per-table policy for the NO ACTION tier, by whether the row is solely
-- the user's or is part of a counterparty's transaction record:
--
--   ANONYMIZE (counterparty-shared; the row must survive, the identity
--   must not) — activities, messages, notes, documents, deal_rooms,
--   deal_tasks, decisions, term_sheets, meetings, invites,
--   due_diligence_items, deal_room_members.invited_by,
--   deal_room_invite_links, deal_room_lawyer_invites,
--   deal_room_lawyer_requests, deal_room_dd_analysis, ai_reports,
--   organizations.
--
--   DELETE (solely the user's; no counterparty interest) — roast_audience,
--   roast_questions, roast_race_events, roast_sessions, referrals,
--   referral_bonuses, tasks.
--
--   BLOCK (erasure refused outright) — membership in any deal room whose
--   status is 'active'. A party cannot erase themselves mid-transaction;
--   the counterparty has rights in that record. Also blocks when the user
--   owns a startup that has any deal room attached.
--
-- NOT ERASED, BY DESIGN — pack_v1.record_entry. 367 real entries today,
-- protected by BOTH a no-UPDATE and a no-DELETE trigger (verified via
-- pg_trigger). It carries actor_id, which is personal data, and it is
-- the append-only record §8.3 exists to guarantee. This is the
-- §11.2 erasure-vs-retention tension, unresolved in this codebase and
-- NOT resolved here: the dry-run reports the affected entry count so the
-- number is visible rather than silently ignored, and the UI copy must
-- disclose that these entries are retained pseudonymously.

-- RECONCILED 20 Sep 2026 against pg_get_functiondef immediately after
-- apply, per CLAUDE.md §7.2: once a live apply has happened, the applied
-- object is the source of truth and this file must reproduce it, not a
-- draft. Two differences from the first draft are recorded here rather
-- than left as silent drift: em-dashes inside format() strings became
-- plain hyphens, and two explanatory JSON fields (retained_note,
-- auth_users_note) were dropped from the return payload. The prose those
-- carried is kept in this header instead, where it cannot drift from the
-- function body.

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
    'retained_record_entries', v_record_entries
  );
end;
$function$

revoke execute on function pack_api.erase_user_account_dryrun(uuid) from public;
grant execute on function pack_api.erase_user_account_dryrun(uuid) to service_role;
