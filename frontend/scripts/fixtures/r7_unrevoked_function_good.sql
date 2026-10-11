-- R7 good fixture: CREATE FUNCTION with a matching, same-signature REVOKE
create or replace function public.fixture_r7_revoked(p_x uuid)
returns boolean
language sql
as $$ select true $$;
revoke all on function public.fixture_r7_revoked(uuid) from public;
revoke execute on function public.fixture_r7_revoked(uuid) from anon;
grant execute on function public.fixture_r7_revoked(uuid) to service_role;
