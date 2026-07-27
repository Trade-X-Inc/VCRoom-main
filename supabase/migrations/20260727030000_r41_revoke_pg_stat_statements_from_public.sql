-- R41 item 4 (views / owner-rights bypass class). There are ZERO views over
-- application tables in this database, so the classic "owner-rights view
-- bypasses RLS on the underlying app table" class does not exist here. The
-- only views outside pg_catalog are Supabase-internal:
--   vault.decrypted_secrets  -- already unreachable: authenticated has no
--     USAGE on the vault schema and no SELECT on the view. Left untouched.
--   extensions.pg_stat_statements / _info  -- postgres-owned; SELECT is
--     granted to PUBLIC (relacl `=r/postgres`), so anon + authenticated could
--     read normalized query text at the DATABASE level (verified: 4750 rows,
--     357 referencing deal_room/nda/investor). pg_stat_statements normalizes
--     literals to $1, so no row DATA leaks, but query shapes / schema do. It
--     is NOT reachable through any API an app user actually has -- PostgREST
--     refuses the extensions schema ("Only the following schemas are exposed:
--     public, graphql_public") and Realtime does not cover it -- so this is a
--     latent DB-level exposure, not a live leak. Revoked anyway as cheap
--     defence-in-depth; the app never queries these.
--
-- NOTE: SELECT here is a PUBLIC grant, so `REVOKE ... FROM anon, authenticated`
-- is a no-op (same lesson as TEMP-from-PUBLIC, CLAUDE.md §49.3). Must revoke
-- from PUBLIC and grant back explicitly to the roles that should keep it.
-- postgres and dashboard_user keep their own explicit grants; service_role is
-- re-granted for server-side observability.
revoke select on extensions.pg_stat_statements from public;
revoke select on extensions.pg_stat_statements_info from public;
grant select on extensions.pg_stat_statements to service_role;
grant select on extensions.pg_stat_statements_info to service_role;
