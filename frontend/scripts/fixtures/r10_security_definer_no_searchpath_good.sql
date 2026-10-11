-- R10 good fixture: SECURITY DEFINER with SET search_path ending in
-- pg_temp. Also includes a matching REVOKE so this fixture doesn't
-- incidentally trip R7 (every CREATE FUNCTION is checked by R7
-- independently of R10 -- a fixture isolating one rule must not leave
-- another rule's condition unmet by accident).
create or replace function public.fixture_r10_good()
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$ begin return true; end; $$;
revoke all on function public.fixture_r10_good() from public;
revoke execute on function public.fixture_r10_good() from anon;
grant execute on function public.fixture_r10_good() to service_role;
