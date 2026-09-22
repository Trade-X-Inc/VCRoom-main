-- Audit logging for auth_admin.expire_stale_sessions() (22 Sep 2026)
--
-- Checked for a reusable mechanism first, per instruction — none fits:
--   - activity_log: account_type/account_id/actor_user_id/actor_name are
--     all NOT NULL, shaped for a real user acting on their own account.
--     A session-expiry sweep has no such actor.
--   - pack_v1.record_entry: org_id NOT NULL, scoped to one org's
--     hash-chained deal-room audit trail (§8.3). A stale-session sweep
--     spans every org at once and isn't attributable to a single org_id;
--     also the isolated, unpromoted pack_v1 schema, wrong tier entirely.
--   - nudge_log / email_log / email_events / roast_race_events: all
--     purpose-built for specific features, none generically shaped.
--   - cron.job_run_details: captures that the job ran and generic
--     success/failure, but not the function's own semantic return value
--     (expired_count) as queryable data.
-- None fit, so a new minimal table was warranted.
--
-- Same "no direct table grant, function-only access" boundary this
-- schema already established for auth.sessions itself — only the
-- function below can reach this table; not even service_role gets a
-- direct grant.
--
-- expire_stale_sessions() converted from `language sql` to `plpgsql`:
-- the original was a single CTE with no room for a second statement.
-- Same signature, same delete predicate, same SECURITY DEFINER /
-- service-role-only access — the only behavioral addition is the log
-- insert between the delete and the return. auth_admin added to
-- search_path (needed to see the new table unqualified), pg_temp kept
-- last per CLAUDE.md §7.2.
--
-- Verified live before considered done (not assumed):
--   - has_function_privilege: service_role EXECUTE, anon/authenticated
--     denied. has_table_privilege: nobody, including service_role, has
--     direct SELECT on session_expiry_log.
--   - Real invocation (not rolled back): returned expired_count matched
--     a real persisted log row exactly.
--   - The existing cron job (jobid 9, expire-stale-sessions, */15) was
--     left running unmodified and its next real scheduled fire (09:45
--     UTC) was checked against cron.job_run_details afterward — the
--     resulting session_expiry_log row's run_at matches that run's
--     start_time to the same second, confirming the live cron path
--     (not just a manual call) exercises the new function body.

create table auth_admin.session_expiry_log (
  id uuid primary key default gen_random_uuid(),
  expired_count integer not null,
  run_at timestamptz not null default now()
);

revoke all on auth_admin.session_expiry_log from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION auth_admin.expire_stale_sessions()
 RETURNS TABLE(expired_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'auth_admin', 'pg_temp'
AS $function$
declare
  v_count integer;
begin
  with deleted as (
    delete from auth.sessions
    where (refreshed_at is not null and refreshed_at < now() - interval '2 hours')
       or created_at < now() - interval '24 hours'
    returning id
  )
  select count(*) into v_count from deleted;

  insert into auth_admin.session_expiry_log (expired_count) values (v_count);

  return query select v_count;
end;
$function$;

revoke execute on function auth_admin.expire_stale_sessions() from public;
grant execute on function auth_admin.expire_stale_sessions() to service_role;
