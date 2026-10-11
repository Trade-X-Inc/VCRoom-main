-- R7 bad fixture: CREATE FUNCTION with no matching REVOKE for its own signature.
-- Also includes an unrelated ALTER DEFAULT PRIVILEGES statement for a
-- DIFFERENT schema, to prove the file-wide exemption bug from the prior
-- guard version is actually fixed -- this must NOT silently cover the
-- function below, since the default-privilege statement here targets a
-- different schema than the function and contains no REVOKE of it.
alter default privileges in schema pack_v1 revoke execute on functions from public, anon, authenticated;

create or replace function public.fixture_r7_unrevoked(p_x uuid)
returns boolean
language sql
as $$ select true $$;
