-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
-- DRAFT — NOT APPLIED. Lives in supabase/drafts/, not supabase/migrations/.   Job J3c-0, 21 Oct 2026.
-- Close the team-membership write holes on public.startup_team_accounts (and the same shape on team_invites).
--
-- THE HOLE (read from the live policies on 21 Oct 2026, and reproduced BEFORE/AFTER by the companion dry run):
--   team_accounts_investor_manage   ALL to authenticated, WITH CHECK (investor_profile_id = auth.uid())
--   team_accounts_founder_manage    ALL to authenticated, WITH CHECK (startup_id IN (own startups))
--   team_accounts_admin_manage      ALL to {public}, WITH CHECK (can_appoint_role(...) AND manage_team on the row's scope)
--   team_accounts_self_accept_invite INSERT to {public}, WITH CHECK (user_id = auth.uid() AND an unaccepted team_invites
--                                   row addressed to the caller's email exists with that invite_id)
-- None pins startup_id, user_id or role against the thing that grants the right. So any signed-in user with an
-- investor_profiles row could insert (user_id = self, investor_profile_id = self, startup_id = <any startup>,
-- role = 'admin', status = 'active') and get_founder_team_role / founder_has_permission / get_user_team_startup_ids
-- then treated them as an admin of that startup. A second route: one account creates its own team_invites row (policy
-- team_invites_founder_manage, invited_by NULL) and then self-inserts using it; the self-accept policy pins neither the
-- startup nor the role to that invitation. A third route (found while verifying): team_invites_investor_manage pins only
-- investor_profile_id, so an investor can create a team_invites row with investor_profile_id = self AND
-- startup_id = <victim>, and the old SECURITY DEFINER public.accept_team_invite then inserts a membership at the victim.
-- There is no trigger and no CHECK on either table, and anon and authenticated hold ALL privileges including TRUNCATE
-- (which bypasses row level security).
--
-- WHAT THIS CHANGES, and nothing else:
--  1. Drops team_accounts_self_accept_invite.
--  2. Membership rows are created only by invite_v1.accept_invite (SECURITY DEFINER, service role). INSERT is revoked from
--     anon and authenticated on public.startup_team_accounts, and the three ALL policies are dropped, so no policy can
--     admit an INSERT either. Code check, 21 Oct 2026: NO client or server code inserts into startup_team_accounts. The
--     only writers are: public.accept_team_invite (old, SECURITY DEFINER; unaffected, it runs as the table owner),
--     invite_v1.accept_invite (new, SECURITY DEFINER) and tests/fixtures using the service key.
--  3. Role change and removal stay (J3d moves them to the gateway) but are made safe:
--       - the three ALL policies are replaced by SELECT, UPDATE and DELETE policies for authenticated only
--         (SELECT is kept so owners and admins still list their team; the other three SELECT policies are untouched);
--       - UPDATE is revoked table-wide and granted only on the columns the code proves it updates:
--           role        (app.users.tsx:174,184  app.investor.team.tsx:152,162)
--           avatar_url  (app.member-profile.tsx:245, the avatar mirror)
--         startup_id, investor_profile_id, user_id, invite_id, invited_by, status, display_name, joined_at and created_at
--         can no longer be updated by authenticated at all, which is stronger than a WITH CHECK that compares against the
--         old row (a WITH CHECK cannot see the old row). status is NOT granted: no code writes it (removal is a DELETE).
--       - the UPDATE WITH CHECK keeps the manage_team test on the (unchanged) scope and keeps can_appoint_role.
--     Known and unchanged: an admin can still demote or remove another admin; a member who is not an owner or admin cannot
--     update their own row, so the avatar mirror in app.member-profile.tsx stays a silent 0-row update for them, as today.
--  4. CHECK constraints (the tables are empty, checked in the preflight):
--       startup_team_accounts: role in (admin, manager, analyst, viewer, associate, external); status = 'active' (the only
--         value any code writes or reads); exactly one of startup_id / investor_profile_id; and the role must belong to the
--         scope (startup: admin, manager, analyst, viewer; fund: admin, associate, analyst, external).
--       team_invites: the same role, scope and role-for-scope checks (this closes the third route above).
--  5. startup_team_accounts.invited_by and team_invites.invited_by: ON DELETE SET NULL. They ALREADY ARE on the live
--     project (verified 21 Oct 2026: confdeltype 'n'). An earlier report called them NO ACTION; that was a misreading of
--     the catalog letter. The block below recreates a foreign key only if it is not already SET NULL, so live this is a no-op.
--  6. Privileges: everything revoked from anon on startup_team_accounts and team_invites; on team_member_profiles anon
--     keeps SELECT ONLY (the public CV page, src/routes/cv.$slug.tsx, reads team_profiles_public_read rows as anon; the
--     policy limits it to is_public rows) and loses INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
--     TRUNCATE, REFERENCES, TRIGGER and MAINTAIN are revoked from authenticated on all three tables.
--
-- NOT CHANGED (listed so nobody assumes otherwise): team_invites keeps its two ALL policies and authenticated keeps
-- INSERT/UPDATE/DELETE on it until the legacy pages and public.accept_team_invite are removed (J3c-3/J3c-4). The old RPC
-- is a legitimate consent path (the invitee's confirmed address is checked) and, with the scope CHECK above, cannot be fed
-- a cross-scope invitation any more.
--
-- LIVE BASELINE this file was written against (21 Oct 2026, read-only catalog queries): see the fingerprints in the
-- preflight below; the preflight stops, writing nothing, if any of them differs.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

do $preflight$
declare
  v_expected jsonb := '{"startup_team_accounts": ["role","avatar_url"]}'::jsonb;
  v_pf text[] := array[]::text[];
  v_rec record;
  v_table text;
  v_col text;
  v_real_cols text[];
  v_n int;
  v_txt text;
  c_acl constant text := '{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}';
begin
  -- roles and tables
  for v_rec in select * from (values ('anon'), ('authenticated'), ('service_role')) t(r) loop
    if not exists (select 1 from pg_roles where rolname = v_rec.r) then v_pf := array_append(v_pf, 'role ' || v_rec.r || ' is missing'); end if;
  end loop;
  for v_rec in select * from (values ('startup_team_accounts'), ('team_invites'), ('team_member_profiles')) t(tbl) loop
    if to_regclass('public.' || v_rec.tbl) is null then
      v_pf := array_append(v_pf, 'table public.' || v_rec.tbl || ' does not exist');
    else
      if not (select relrowsecurity from pg_class where oid = ('public.' || v_rec.tbl)::regclass) then v_pf := array_append(v_pf, v_rec.tbl || ' does not have row level security enabled'); end if;
      select relacl::text into v_txt from pg_class where oid = ('public.' || v_rec.tbl)::regclass;
      if v_txt is distinct from c_acl then v_pf := array_append(v_pf, 'DRIFT: ' || v_rec.tbl || ' privileges are ' || coalesce(v_txt, 'NULL') || ', expected ' || c_acl); end if;
      select count(*) into v_n from pg_attribute where attrelid = ('public.' || v_rec.tbl)::regclass and attnum > 0 and attacl is not null;
      if v_n > 0 then v_pf := array_append(v_pf, 'DRIFT: ' || v_rec.tbl || ' has column-level privileges (' || v_n || ' column(s)); this file assumes none'); end if;
    end if;
  end loop;

  -- the exact policy set on the three tables: name, command, roles and a whitespace-insensitive fingerprint of the expressions
  for v_rec in
    select e.tbl, e.pol, e.cmd ecmd, e.roles eroles, e.fp efp, p.policyname found, p.cmd pcmd, p.roles::text proles,
           md5(regexp_replace(lower(coalesce(p.qual, '') || '|' || coalesce(p.with_check, '')), '\s+', '', 'g')) pfp
      from (values
        ('startup_team_accounts', 'team_accounts_admin_manage',         'ALL',    '{public}',        'baaf97b1d501098caf6af86098368345'),
        ('startup_team_accounts', 'team_accounts_founder_manage',       'ALL',    '{authenticated}', 'dc6f4fc7241a588db15082fcfc4a539d'),
        ('startup_team_accounts', 'team_accounts_investor_manage',      'ALL',    '{authenticated}', '00694965822afd1aba84d6f2de83ff31'),
        ('startup_team_accounts', 'team_accounts_investor_self_read',   'SELECT', '{authenticated}', '36f229f7776a204ef9c4caf3356f9e6c'),
        ('startup_team_accounts', 'team_accounts_same_startup_read',    'SELECT', '{authenticated}', '014663bd4e5223ea1044e078061389e7'),
        ('startup_team_accounts', 'team_accounts_self_accept_invite',   'INSERT', '{public}',        '9068de976850c0bc583ed4bc58502c50'),
        ('startup_team_accounts', 'team_accounts_self_read',            'SELECT', '{authenticated}', '36f229f7776a204ef9c4caf3356f9e6c'),
        ('team_invites',          'team_invites_founder_manage',        'ALL',    '{authenticated}', 'dc6f4fc7241a588db15082fcfc4a539d'),
        ('team_invites',          'team_invites_investor_manage',       'ALL',    '{authenticated}', '00694965822afd1aba84d6f2de83ff31'),
        ('team_member_profiles',  'team_profiles_own_manage',           'ALL',    '{authenticated}', '819c2921102685bcf5ecf6593e31f3d9'),
        ('team_member_profiles',  'team_profiles_public_read',          'SELECT', '{public}',        '46438826fbb4c5ebec6b1e789512d42d'),
        ('team_member_profiles',  'team_profiles_same_startup_read',    'SELECT', '{authenticated}', 'd5113dc4b43d78d762477ec46e564a24')
      ) as e(tbl, pol, cmd, roles, fp)
      left join pg_policies p on p.schemaname = 'public' and p.tablename = e.tbl and p.policyname = e.pol
  loop
    if v_rec.found is null then
      v_pf := array_append(v_pf, format('policy %s.%s does not exist', v_rec.tbl, v_rec.pol));
      continue;
    end if;
    if v_rec.pcmd <> v_rec.ecmd or v_rec.proles <> v_rec.eroles then
      v_pf := array_append(v_pf, format('DRIFT: policy %s.%s is %s to %s, expected %s to %s', v_rec.tbl, v_rec.pol, v_rec.pcmd, v_rec.proles, v_rec.ecmd, v_rec.eroles));
    end if;
    if v_rec.pfp <> v_rec.efp then
      v_pf := array_append(v_pf, format('DRIFT: the expressions of policy %s.%s have changed (fingerprint %s, expected %s)', v_rec.tbl, v_rec.pol, v_rec.pfp, v_rec.efp));
    end if;
  end loop;
  select string_agg(p.tablename || '.' || p.policyname, ', ') into v_txt
    from pg_policies p
   where p.schemaname = 'public' and p.tablename in ('startup_team_accounts', 'team_invites', 'team_member_profiles')
     and p.policyname not in ('team_accounts_admin_manage', 'team_accounts_founder_manage', 'team_accounts_investor_manage', 'team_accounts_investor_self_read',
                              'team_accounts_same_startup_read', 'team_accounts_self_accept_invite', 'team_accounts_self_read',
                              'team_invites_founder_manage', 'team_invites_investor_manage',
                              'team_profiles_own_manage', 'team_profiles_public_read', 'team_profiles_same_startup_read');
  if v_txt is not null then v_pf := array_append(v_pf, 'DRIFT: unexpected extra policy(ies): ' || v_txt); end if;
  select string_agg(p.policyname, ', ') into v_txt from pg_policies p
   where p.schemaname = 'public' and p.tablename = 'startup_team_accounts' and p.policyname in ('team_accounts_managers_read', 'team_accounts_managers_update', 'team_accounts_managers_delete');
  if v_txt is not null then v_pf := array_append(v_pf, 'the new policy name(s) already exist: ' || v_txt); end if;

  -- the helper functions the new policies call, and the ones the proof relies on, must be the bodies this file was written against
  for v_rec in select * from (values
    ('public.founder_has_permission(uuid,text)',          '544c5e92b4865974d83e2aa663472410'),
    ('public.investor_has_permission(uuid,text)',         'd9af65d1bae8abe1dc225e1c9c382b7a'),
    ('public.can_appoint_role(uuid,uuid,text)',           '400fb107a97f5ab7cde53a818ab84ee4'),
    ('public.get_founder_team_role(uuid)',                'a85ca170db7b4c6c8b2301e3c1c486c5'),
    ('public.get_investor_team_role(uuid)',               '1070e2ee746841569f2ffce2f108063b'),
    ('public.get_user_team_startup_ids()',                '0fbacf1a8337be608deeabb5b7b0f571')
  ) as t(fn, md) loop
    if to_regprocedure(v_rec.fn) is null then v_pf := array_append(v_pf, 'function ' || v_rec.fn || ' does not exist');
    elsif (select md5(prosrc) from pg_proc where oid = to_regprocedure(v_rec.fn)) <> v_rec.md then
      v_pf := array_append(v_pf, 'DRIFT: ' || v_rec.fn || ' md5(prosrc) is ' || (select md5(prosrc) from pg_proc where oid = to_regprocedure(v_rec.fn)) || ', expected ' || v_rec.md);
    end if;
  end loop;

  -- the constraints this file adds must not exist yet; the invited_by foreign keys must exist
  select string_agg(conname, ', ') into v_txt from pg_constraint
   where conname in ('startup_team_accounts_role_check', 'startup_team_accounts_status_check', 'startup_team_accounts_scope_check', 'startup_team_accounts_role_scope_check',
                     'team_invites_role_check', 'team_invites_scope_check', 'team_invites_role_scope_check')
     and conrelid in ('public.startup_team_accounts'::regclass, 'public.team_invites'::regclass);
  if v_txt is not null then v_pf := array_append(v_pf, 'constraint(s) already exist: ' || v_txt); end if;
  for v_rec in select * from (values ('startup_team_accounts', 'startup_team_accounts_invited_by_fkey'), ('team_invites', 'team_invites_invited_by_fkey')) t(tbl, c) loop
    if not exists (select 1 from pg_constraint where conrelid = ('public.' || v_rec.tbl)::regclass and conname = v_rec.c and contype = 'f') then
      v_pf := array_append(v_pf, 'foreign key ' || v_rec.c || ' does not exist');
    end if;
  end loop;

  -- rows that would violate the new CHECKs (the tables are empty live; a malicious row would be caught here and stop the migration)
  select count(*) into v_n from public.startup_team_accounts
   where not (role in ('admin', 'manager', 'analyst', 'viewer', 'associate', 'external') and status = 'active' and num_nonnulls(startup_id, investor_profile_id) = 1
              and ((startup_id is not null and role in ('admin', 'manager', 'analyst', 'viewer')) or (investor_profile_id is not null and role in ('admin', 'associate', 'analyst', 'external'))));
  if v_n > 0 then v_pf := array_append(v_pf, v_n || ' existing startup_team_accounts row(s) violate the new CHECKs; inspect them (they may be a planted membership) before applying'); end if;
  select count(*) into v_n from public.team_invites
   where not (role in ('admin', 'manager', 'analyst', 'viewer', 'associate', 'external') and num_nonnulls(startup_id, investor_profile_id) = 1
              and ((startup_id is not null and role in ('admin', 'manager', 'analyst', 'viewer')) or (investor_profile_id is not null and role in ('admin', 'associate', 'analyst', 'external'))));
  if v_n > 0 then v_pf := array_append(v_pf, v_n || ' existing team_invites row(s) violate the new CHECKs; inspect them before applying'); end if;

  -- every column named in this migration's column GRANT must exist (check-grants rule R11 compares this map to the GRANT)
  for v_table in select jsonb_object_keys(v_expected) loop
    select array_agg(column_name::text) into v_real_cols from information_schema.columns where table_schema = 'public' and table_name = v_table;
    for v_col in select jsonb_array_elements_text(v_expected -> v_table) loop
      if v_real_cols is null or not (v_col = any(v_real_cols)) then v_pf := array_append(v_pf, 'column ' || v_table || '.' || v_col || ' does not exist'); end if;
    end loop;
  end loop;

  if array_length(v_pf, 1) > 0 then
    raise exception E'PREFLIGHT FAILED. Nothing was applied. Fix these first:\n  - %', array_to_string(v_pf, E'\n  - ');
  end if;
  raise notice 'PREFLIGHT PASSED: policy set, fingerprints, privileges, helper functions and row checks all match what this file assumes.';
end $preflight$;

-- ── 1 and 3. policies ─────────────────────────────────────────────────────────────────────────────────────────
drop policy team_accounts_self_accept_invite on public.startup_team_accounts;
drop policy team_accounts_admin_manage on public.startup_team_accounts;
drop policy team_accounts_founder_manage on public.startup_team_accounts;
drop policy team_accounts_investor_manage on public.startup_team_accounts;

-- "can manage this row's team": the founder or an active admin of the startup, or the fund owner or an active admin of the
-- fund. The permission functions already treat the founder and the investor-profile owner as 'owner'.
create policy team_accounts_managers_read on public.startup_team_accounts
  as permissive for select to authenticated
  using (
    (startup_id is not null and public.founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and public.investor_has_permission(investor_profile_id, 'manage_team'))
  );

create policy team_accounts_managers_update on public.startup_team_accounts
  as permissive for update to authenticated
  using (
    (startup_id is not null and public.founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and public.investor_has_permission(investor_profile_id, 'manage_team'))
  )
  with check (
    public.can_appoint_role(startup_id, investor_profile_id, role)
    and (
      (startup_id is not null and public.founder_has_permission(startup_id, 'manage_team'))
      or (investor_profile_id is not null and public.investor_has_permission(investor_profile_id, 'manage_team'))
    )
  );

create policy team_accounts_managers_delete on public.startup_team_accounts
  as permissive for delete to authenticated
  using (
    (startup_id is not null and public.founder_has_permission(startup_id, 'manage_team'))
    or (investor_profile_id is not null and public.investor_has_permission(investor_profile_id, 'manage_team'))
  );

-- ── 2, 3 and 6. privileges ────────────────────────────────────────────────────────────────────────────────────
revoke all on table public.startup_team_accounts from anon;
revoke insert, update, truncate, references, trigger, maintain on table public.startup_team_accounts from authenticated;
grant update (role, avatar_url) on table public.startup_team_accounts to authenticated;

revoke all on table public.team_invites from anon;
revoke truncate, references, trigger, maintain on table public.team_invites from authenticated;

revoke insert, update, delete, truncate, references, trigger, maintain on table public.team_member_profiles from anon;
revoke truncate, references, trigger, maintain on table public.team_member_profiles from authenticated;

-- ── 4. CHECK constraints ──────────────────────────────────────────────────────────────────────────────────────
alter table public.startup_team_accounts drop constraint if exists startup_team_accounts_role_check;
alter table public.startup_team_accounts drop constraint if exists startup_team_accounts_status_check;
alter table public.startup_team_accounts drop constraint if exists startup_team_accounts_scope_check;
alter table public.startup_team_accounts drop constraint if exists startup_team_accounts_role_scope_check;
alter table public.startup_team_accounts add constraint startup_team_accounts_role_check
  check (role in ('admin', 'manager', 'analyst', 'viewer', 'associate', 'external'));
alter table public.startup_team_accounts add constraint startup_team_accounts_status_check
  check (status in ('active'));
alter table public.startup_team_accounts add constraint startup_team_accounts_scope_check
  check (num_nonnulls(startup_id, investor_profile_id) = 1);
alter table public.startup_team_accounts add constraint startup_team_accounts_role_scope_check
  check ((startup_id is not null and role in ('admin', 'manager', 'analyst', 'viewer'))
      or (investor_profile_id is not null and role in ('admin', 'associate', 'analyst', 'external')));

alter table public.team_invites drop constraint if exists team_invites_role_check;
alter table public.team_invites drop constraint if exists team_invites_scope_check;
alter table public.team_invites drop constraint if exists team_invites_role_scope_check;
alter table public.team_invites add constraint team_invites_role_check
  check (role in ('admin', 'manager', 'analyst', 'viewer', 'associate', 'external'));
alter table public.team_invites add constraint team_invites_scope_check
  check (num_nonnulls(startup_id, investor_profile_id) = 1);
alter table public.team_invites add constraint team_invites_role_scope_check
  check ((startup_id is not null and role in ('admin', 'manager', 'analyst', 'viewer'))
      or (investor_profile_id is not null and role in ('admin', 'associate', 'analyst', 'external')));

-- ── 5. invited_by must never block deleting an inviter's account: ON DELETE SET NULL ──────────────────────────
-- Live they already are (confdeltype 'n'), so on the real project this loop finds nothing and changes nothing.
do $fk$
declare
  r record;
begin
  for r in
    select conrelid::regclass::text as tbl, conname
      from pg_constraint
     where contype = 'f' and confdeltype <> 'n'
       and conname in ('startup_team_accounts_invited_by_fkey', 'team_invites_invited_by_fkey')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (invited_by) references auth.users(id) on delete set null', r.tbl, r.conname);
  end loop;
end $fk$;
