-- ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- DRAFT — NOT APPLIED. Lives in supabase/drafts/, not supabase/migrations/.   Job G1-1 (Tier-1 lock), 21 Oct 2026.
-- Close the Tier-1 policy holes: tables whose RLS tested nothing but "signed in" (or "true"), and read policies with no tenant filter.
-- Policy: LOCK NOW, DELETE LATER. No table, column, row, function or trigger is dropped or changed; only client policies and
-- client privileges (anon, authenticated) are removed. service_role (RLS-bypassing) and the table owner are untouched, and so are the
-- SECURITY DEFINER functions that name these tables (pack_api.erase_user_account, erase_user_account_dryrun, doc_view_insert).
--
-- A  LOCKED, service_role only (no client path in the code, 0 rows): ai_reports, due_diligence_items, tasks, organizations,
--    organization_members, referrals, referral_bonuses. Their policies are dropped; all privileges are revoked from anon and authenticated.
--    (Referrals are a CLAUDE.md §15 non-goal; organizations may later become the pack_v1 org link, so they are locked, not dropped.)
-- B  document_views: clients keep SELECT only (the founder reads their own views). Rows are written by pack_api.doc_view_insert, which
--    derives startup_id from the room, the viewer from the verified session and the role from membership (read and checked 21 Oct 2026).
--    The insert policy (any signed-in user) is dropped and INSERT/UPDATE/DELETE are revoked. anon loses everything.
-- C  profile_views: recording is switched off for now (the browser wrote it directly; anyone could forge rows). The insert policy is
--    dropped, clients keep SELECT only (the founder and team analytics reads are unchanged). The rebuild comes later (CLAUDE.md §20.21 (m)).
-- D  Read leaks, pinned by removing the client path (none exists in the code): startup_profile_visibility (a public-role read of every
--    startup's rows), investor_verifications (any signed-in user could read every row), nudge_log (same). Locked like A; all their
--    policies are dropped, including the correctly pinned investor_read_own_verification, because no client reads these tables.
-- E  waitlist_entries: the "insert with true" policy is dropped and anon loses everything; authenticated keeps SELECT, so the
--    "Admin reads waitlist" policy keeps working. The row is now written by the submitWaitlistForm server function (service role).
--    contact_submissions: no client path (the contact form already uses a server function); locked like A.
--
-- Every table on this list also loses TRUNCATE, REFERENCES, TRIGGER and MAINTAIN for anon and authenticated.
-- The migration is one implicit transaction in the SQL editor: the preflight stops it before anything changes, and the final check
-- stops it (and rolls everything back) if the end state is not exactly the one described here.
-- ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

do $preflight$
declare
  v_pf text[] := array[]::text[];
  v_rec record;
  v_txt text;
  v_n bigint;
  v_oids oid[];
  c_acl constant text := '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}';
  v_tables constant text[] := array['ai_reports', 'due_diligence_items', 'tasks', 'organizations', 'organization_members', 'referrals', 'referral_bonuses',
    'document_views', 'profile_views', 'startup_profile_visibility', 'investor_verifications', 'nudge_log', 'waitlist_entries', 'contact_submissions'];
  v_empty constant text[] := array['ai_reports', 'due_diligence_items', 'tasks', 'organizations', 'organization_members', 'referrals', 'referral_bonuses',
    'document_views', 'profile_views', 'startup_profile_visibility', 'investor_verifications', 'nudge_log'];
begin
  for v_rec in select * from (values ('anon'), ('authenticated'), ('service_role')) t(r) loop
    if not exists (select 1 from pg_roles where rolname = v_rec.r) then v_pf := array_append(v_pf, 'role ' || v_rec.r || ' is missing'); end if;
  end loop;

  -- every table: present, RLS on, the exact default privileges, no column privileges, no triggers
  foreach v_txt in array v_tables loop
    if to_regclass('public.' || v_txt) is null then v_pf := array_append(v_pf, 'table public.' || v_txt || ' does not exist'); continue; end if;
    v_oids := array_append(v_oids, to_regclass('public.' || v_txt)::oid);
    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || v_txt)) then v_pf := array_append(v_pf, v_txt || ' does not have row level security enabled'); end if;
    if (select relacl::text from pg_class where oid = to_regclass('public.' || v_txt)) is distinct from c_acl then
      v_pf := array_append(v_pf, 'DRIFT: ' || v_txt || ' privileges are ' || coalesce((select relacl::text from pg_class where oid = to_regclass('public.' || v_txt)), 'NULL') || ', expected ' || c_acl);
    end if;
    select count(*) into v_n from pg_attribute where attrelid = to_regclass('public.' || v_txt) and attnum > 0 and attacl is not null;
    if v_n > 0 then v_pf := array_append(v_pf, 'DRIFT: ' || v_txt || ' has column-level privileges; this file assumes none'); end if;
    select count(*) into v_n from pg_trigger where tgrelid = to_regclass('public.' || v_txt) and not tgisinternal;
    if v_n > 0 then v_pf := array_append(v_pf, 'DRIFT: ' || v_txt || ' has ' || v_n || ' trigger(s); this file assumes none'); end if;
  end loop;

  -- the tables this job locks must still be empty (live 21 Oct 2026: all 12 at 0 rows); stop and look if that has changed
  foreach v_txt in array v_empty loop
    if to_regclass('public.' || v_txt) is null then continue; end if;
    execute format('select count(*) from public.%I', v_txt) into v_n;
    if v_n > 0 then v_pf := array_append(v_pf, v_txt || ' now holds ' || v_n || ' row(s); it was empty when this file was written. Look at them before locking'); end if;
  end loop;

  -- the exact policy set on the 14 tables: name, command, roles and a whitespace-insensitive fingerprint of the expressions
  for v_rec in
    select e.tbl, e.pol, e.cmd ecmd, e.fp efp, p.policyname found, p.cmd pcmd, p.roles::text proles,
           md5(regexp_replace(lower(coalesce(p.qual, '') || '|' || coalesce(p.with_check, '')), '\s+', '', 'g')) pfp
      from (values
        ('ai_reports',                 'ai_reports_owner',                     'ALL',    'ac319d2754ae6d73374c2e0acca7abaa'),
        ('due_diligence_items',        'dd_items_authenticated',               'ALL',    'ac319d2754ae6d73374c2e0acca7abaa'),
        ('tasks',                      'tasks_authenticated',                  'ALL',    'ac319d2754ae6d73374c2e0acca7abaa'),
        ('organizations',              'organizations_authenticated',          'ALL',    'ac319d2754ae6d73374c2e0acca7abaa'),
        ('organization_members',       'org_members_authenticated',            'ALL',    'ac319d2754ae6d73374c2e0acca7abaa'),
        ('referrals',                  'Users see own referrals',              'SELECT', '6eb3a92cdf3c50b6f5ddc511694424ae'),
        ('referrals',                  'authenticated_insert_referral',        'INSERT', '822ff88421467911d10c0dc88e488655'),
        ('referral_bonuses',           'Users see own bonuses',                'SELECT', '6eb3a92cdf3c50b6f5ddc511694424ae'),
        ('document_views',             'authenticated_insert_doc_views',       'INSERT', '822ff88421467911d10c0dc88e488655'),
        ('document_views',             'founder_read_own_doc_views',           'SELECT', '2f05a350bb8f8b7e3296ff7a1f67c279'),
        ('profile_views',              'anyone_insert_view',                   'INSERT', '663636083cb0c137dbd994f4505e5127'),
        ('profile_views',              'founder_read_own_views',               'SELECT', '2f05a350bb8f8b7e3296ff7a1f67c279'),
        ('profile_views',              'profile_views_team_read',              'SELECT', 'e80156701851bb07d2fd5e98bf40f71d'),
        ('startup_profile_visibility', 'founder_manage_visibility',            'ALL',    '7c8af543425d55a003eabeff501ee1af'),
        ('startup_profile_visibility', 'investor_read_dealroom_visibility',    'SELECT', 'b5a585edf1788e742d6729a6364dbedb'),
        ('investor_verifications',     'authenticated_read_verifications',     'SELECT', '109c304086461d054c5f87f856d8f508'),
        ('investor_verifications',     'investor_read_own_verification',       'SELECT', 'f67cf4df6bb694b914efc657ac0e4e02'),
        ('investor_verifications',     'service_write_verifications',          'ALL',    '0f3806d548dd3760016c85b428c9cb63'),
        ('nudge_log',                  'admin_read_nudge_log',                 'SELECT', '109c304086461d054c5f87f856d8f508'),
        ('waitlist_entries',           'Admin reads waitlist',                 'SELECT', '4ca46077787eba5fc57ee1de8f83e663'),
        ('waitlist_entries',           'Anyone can join waitlist',             'INSERT', '663636083cb0c137dbd994f4505e5127'),
        ('contact_submissions',        'anyone_insert_contact',                'INSERT', '663636083cb0c137dbd994f4505e5127'),
        ('contact_submissions',        'service_read_contact',                 'SELECT', '0f3806d548dd3760016c85b428c9cb63')
      ) as e(tbl, pol, cmd, fp)
      left join pg_policies p on p.schemaname = 'public' and p.tablename = e.tbl and p.policyname = e.pol
  loop
    if v_rec.found is null then v_pf := array_append(v_pf, format('policy %s.%s does not exist', v_rec.tbl, v_rec.pol)); continue; end if;
    if v_rec.pcmd <> v_rec.ecmd or v_rec.proles <> '{public}' then
      v_pf := array_append(v_pf, format('DRIFT: policy %s.%s is %s to %s, expected %s to {public}', v_rec.tbl, v_rec.pol, v_rec.pcmd, v_rec.proles, v_rec.ecmd));
    end if;
    if v_rec.pfp <> v_rec.efp then v_pf := array_append(v_pf, format('DRIFT: the expressions of policy %s.%s have changed (fingerprint %s, expected %s)', v_rec.tbl, v_rec.pol, v_rec.pfp, v_rec.efp)); end if;
  end loop;
  select string_agg(p.tablename || '.' || p.policyname, ', ') into v_txt from pg_policies p
   where p.schemaname = 'public' and p.tablename = any(v_tables)
     and (p.tablename || '.' || p.policyname) <> all (array[
       'ai_reports.ai_reports_owner', 'due_diligence_items.dd_items_authenticated', 'tasks.tasks_authenticated', 'organizations.organizations_authenticated',
       'organization_members.org_members_authenticated', 'referrals.Users see own referrals', 'referrals.authenticated_insert_referral', 'referral_bonuses.Users see own bonuses',
       'document_views.authenticated_insert_doc_views', 'document_views.founder_read_own_doc_views', 'profile_views.anyone_insert_view', 'profile_views.founder_read_own_views',
       'profile_views.profile_views_team_read', 'startup_profile_visibility.founder_manage_visibility', 'startup_profile_visibility.investor_read_dealroom_visibility',
       'investor_verifications.authenticated_read_verifications', 'investor_verifications.investor_read_own_verification', 'investor_verifications.service_write_verifications',
       'nudge_log.admin_read_nudge_log', 'waitlist_entries.Admin reads waitlist', 'waitlist_entries.Anyone can join waitlist', 'contact_submissions.anyone_insert_contact',
       'contact_submissions.service_read_contact']);
  if v_txt is not null then v_pf := array_append(v_pf, 'DRIFT: unexpected extra policy(ies): ' || v_txt); end if;

  -- nothing else may depend on these tables through a policy or a view (revoking client privileges would break it for the client)
  select string_agg(distinct pol.polrelid::regclass::text || ' policy ' || pol.polname || ' -> ' || d.refobjid::regclass::text, ', ') into v_txt
    from pg_depend d join pg_policy pol on d.classid = 'pg_policy'::regclass and d.objid = pol.oid
   where d.refclassid = 'pg_class'::regclass and d.refobjid = any(v_oids) and d.refobjid <> pol.polrelid;
  if v_txt is not null then v_pf := array_append(v_pf, 'a policy on another table reads one of these tables: ' || v_txt); end if;
  select string_agg(distinct r.ev_class::regclass::text || ' -> ' || d.refobjid::regclass::text, ', ') into v_txt
    from pg_depend d join pg_rewrite r on d.classid = 'pg_rewrite'::regclass and d.objid = r.oid
   where d.refclassid = 'pg_class'::regclass and d.refobjid = any(v_oids) and r.ev_class <> d.refobjid;
  if v_txt is not null then v_pf := array_append(v_pf, 'a view or rule reads one of these tables: ' || v_txt); end if;

  -- every function that names one of these tables must be SECURITY DEFINER (runs as its owner, unaffected by client privileges)
  select string_agg(n.nspname || '.' || p.proname, ', ') into v_txt from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname !~ '^pg_(temp|toast)' and not p.prosecdef
     and p.prosrc ~ '\m(ai_reports|due_diligence_items|tasks|organizations|organization_members|referrals|referral_bonuses|document_views|profile_views|startup_profile_visibility|investor_verifications|nudge_log|waitlist_entries|contact_submissions)\M';
  if v_txt is not null then v_pf := array_append(v_pf, 'a SECURITY INVOKER function names one of these tables: ' || v_txt); end if;

  -- the three functions that must keep working: present, SECURITY DEFINER, owned by the table owner, callable by service_role only
  for v_rec in select * from (values ('pack_api.erase_user_account(uuid)'), ('pack_api.erase_user_account_dryrun(uuid)'),
      ('pack_api.doc_view_insert(uuid,uuid,uuid,uuid,integer,uuid,text,text)')) t(fn) loop
    if to_regprocedure(v_rec.fn) is null then v_pf := array_append(v_pf, 'function ' || v_rec.fn || ' does not exist'); continue; end if;
    if not (select prosecdef from pg_proc where oid = to_regprocedure(v_rec.fn)) then v_pf := array_append(v_pf, v_rec.fn || ' is not SECURITY DEFINER'); end if;
    if (select proacl::text from pg_proc where oid = to_regprocedure(v_rec.fn)) is distinct from '{postgres=X/postgres,service_role=X/postgres}' then
      v_pf := array_append(v_pf, 'DRIFT: ' || v_rec.fn || ' privileges are ' || coalesce((select proacl::text from pg_proc where oid = to_regprocedure(v_rec.fn)), 'NULL'));
    end if;
  end loop;
  -- doc_view_insert must still derive startup_id from the room and the role from membership (read and confirmed 21 Oct 2026)
  if to_regprocedure('pack_api.doc_view_insert(uuid,uuid,uuid,uuid,integer,uuid,text,text)') is not null then
    select prosrc into v_txt from pg_proc where oid = to_regprocedure('pack_api.doc_view_insert(uuid,uuid,uuid,uuid,integer,uuid,text,text)');
    if v_txt not like '%select r.startup_id into v_startup_id%from public.deal_rooms r%where r.id = p_deal_room_id%'
       or v_txt not like '%select m.role into v_role%from public.deal_room_members m%m.user_id = p_uid%'
       or v_txt not like '%(p_deal_room_id, p_document_id, p_founder_document_id, p_uid, coalesce(p_duration_seconds, 0),%v_startup_id, v_role, p_viewer_name)%' then
      v_pf := array_append(v_pf, 'DRIFT: pack_api.doc_view_insert no longer derives startup_id, the viewer and the role server-side as read on 21 Oct 2026');
    end if;
  end if;
  -- the helpers the surviving policies call (waitlist admin read, profile_views reads)
  for v_rec in select * from (values ('public.is_admin()', '6f4ebfb4749060b4cec3cd1339f9fbe5'), ('public.is_startup_founder(uuid)', 'd53b84bd83826864a47a8a43f81a8901'),
      ('public.founder_has_permission(uuid,text)', '544c5e92b4865974d83e2aa663472410')) t(fn, md) loop
    if to_regprocedure(v_rec.fn) is null then v_pf := array_append(v_pf, 'function ' || v_rec.fn || ' does not exist');
    elsif (select md5(prosrc) from pg_proc where oid = to_regprocedure(v_rec.fn)) <> v_rec.md then
      v_pf := array_append(v_pf, 'DRIFT: ' || v_rec.fn || ' md5(prosrc) is ' || (select md5(prosrc) from pg_proc where oid = to_regprocedure(v_rec.fn)) || ', expected ' || v_rec.md);
    end if;
  end loop;

  if array_length(v_pf, 1) > 0 then
    raise exception E'PREFLIGHT FAILED. Nothing was applied. Fix these first:\n  - %', array_to_string(v_pf, E'\n  - ');
  end if;
  raise notice 'PREFLIGHT PASSED: privileges, policy fingerprints, empty tables, dependencies and the functions that must keep working all match what this file assumes.';
end $preflight$;

-- ── A. locked, service_role only ───────────────────────────────────────────────────────────────────────
drop policy ai_reports_owner on public.ai_reports;
drop policy dd_items_authenticated on public.due_diligence_items;
drop policy tasks_authenticated on public.tasks;
drop policy organizations_authenticated on public.organizations;
drop policy org_members_authenticated on public.organization_members;
drop policy "Users see own referrals" on public.referrals;
drop policy authenticated_insert_referral on public.referrals;
drop policy "Users see own bonuses" on public.referral_bonuses;
revoke all on table public.ai_reports, public.due_diligence_items, public.tasks, public.organizations, public.organization_members,
  public.referrals, public.referral_bonuses from anon, authenticated;

-- ── B. document_views: clients keep SELECT only ────────────────────────────────────────────────────────
drop policy authenticated_insert_doc_views on public.document_views;
revoke all on table public.document_views from anon;
revoke insert, update, delete, truncate, references, trigger, maintain on table public.document_views from authenticated;

-- ── C. profile_views: recording off, clients keep SELECT only ──────────────────────────────────────────
drop policy anyone_insert_view on public.profile_views;
revoke all on table public.profile_views from anon;
revoke insert, update, delete, truncate, references, trigger, maintain on table public.profile_views from authenticated;

-- ── D. read leaks: no client path exists, so service_role only ─────────────────────────────────────────
drop policy founder_manage_visibility on public.startup_profile_visibility;
drop policy investor_read_dealroom_visibility on public.startup_profile_visibility;
drop policy authenticated_read_verifications on public.investor_verifications;
drop policy investor_read_own_verification on public.investor_verifications;
drop policy service_write_verifications on public.investor_verifications;
drop policy admin_read_nudge_log on public.nudge_log;
revoke all on table public.startup_profile_visibility, public.investor_verifications, public.nudge_log from anon, authenticated;

-- ── E. waitlist_entries (authenticated keeps SELECT for the admin policy), contact_submissions (locked) ───
drop policy "Anyone can join waitlist" on public.waitlist_entries;
revoke all on table public.waitlist_entries from anon;
revoke insert, update, delete, truncate, references, trigger, maintain on table public.waitlist_entries from authenticated;
drop policy anyone_insert_contact on public.contact_submissions;
drop policy service_read_contact on public.contact_submissions;
revoke all on table public.contact_submissions from anon, authenticated;

-- ── final check: the end state is exactly the one described above, or the whole script rolls back ──────
do $post$
declare
  v_bad text[] := array[]::text[];
  v_t text;
  v_locked constant text[] := array['ai_reports', 'due_diligence_items', 'tasks', 'organizations', 'organization_members', 'referrals', 'referral_bonuses',
    'startup_profile_visibility', 'investor_verifications', 'nudge_log', 'contact_submissions'];
  v_select_only constant text[] := array['document_views', 'profile_views', 'waitlist_entries'];
  v_priv text;
begin
  foreach v_t in array v_locked || v_select_only loop
    select string_agg(distinct a.privilege_type, ',') into v_priv from pg_class c, aclexplode(c.relacl) a
     where c.oid = to_regclass('public.' || v_t) and a.grantee = (select oid from pg_roles where rolname = 'anon');
    if v_priv is not null then v_bad := array_append(v_bad, v_t || ': anon still holds ' || v_priv); end if;
    select string_agg(distinct a.privilege_type, ',' order by a.privilege_type) into v_priv from pg_class c, aclexplode(c.relacl) a
     where c.oid = to_regclass('public.' || v_t) and a.grantee = (select oid from pg_roles where rolname = 'authenticated');
    if v_t = any(v_locked) and v_priv is not null then v_bad := array_append(v_bad, v_t || ': authenticated still holds ' || v_priv); end if;
    if v_t = any(v_select_only) and v_priv is distinct from 'SELECT' then v_bad := array_append(v_bad, v_t || ': authenticated holds ' || coalesce(v_priv, 'nothing') || ', expected SELECT only'); end if;
    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || v_t)) then v_bad := array_append(v_bad, v_t || ': row level security is off'); end if;
    if not exists (select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = to_regclass('public.' || v_t) and a.grantee = (select oid from pg_roles where rolname = 'service_role') and a.privilege_type = 'INSERT') then
      v_bad := array_append(v_bad, v_t || ': service_role lost its privileges');
    end if;
  end loop;
  foreach v_t in array v_locked loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = v_t) then v_bad := array_append(v_bad, v_t || ': a policy remains'); end if;
  end loop;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'document_views') <> 1
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profile_views') <> 2
     or (select count(*) from pg_policies where schemaname = 'public' and tablename = 'waitlist_entries') <> 1 then
    v_bad := array_append(v_bad, 'the surviving policy counts are not document_views 1, profile_views 2, waitlist_entries 1');
  end if;
  if array_length(v_bad, 1) > 0 then
    raise exception E'FINAL CHECK FAILED. Everything in this script is rolled back:\n  - %', array_to_string(v_bad, E'\n  - ');
  end if;
end $post$;
