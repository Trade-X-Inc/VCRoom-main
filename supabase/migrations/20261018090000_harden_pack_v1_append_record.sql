-- Applied to production by hand on 2026-10-18 via the dashboard SQL editor
-- after a 10/10 dry run; recorded here for the migration history.
--
-- Production's body md5 for pack_v1.append_record is
-- faee1d0250a0d0aa21c09a23470e58a2. The function body is not changed here.
--
-- The foundation migration (pack_v1/20260804000000_pack_v1_foundation.sql)
-- defines this function with search_path = pg_catalog, pg_temp, pack_v1, and
-- its body differs from production's (repo body md5
-- 2465d170a1dbf6f523baaee8cb277f61). The cause of the difference is not
-- established here.
--
-- This migration sets the final search_path, pg_catalog, extensions, pg_temp
-- (extensions is required because the body calls digest() unqualified), and
-- revokes EXECUTE from public, anon and authenticated. No grant is made to
-- any role.
--
-- Both statements are safe to run again.

alter function pack_v1.append_record(uuid, uuid, pack_v1.actor_type, text, text, uuid, jsonb)
  set search_path = pg_catalog, extensions, pg_temp;

revoke all on function pack_v1.append_record(uuid, uuid, pack_v1.actor_type, text, text, uuid, jsonb)
  from public, anon, authenticated;
