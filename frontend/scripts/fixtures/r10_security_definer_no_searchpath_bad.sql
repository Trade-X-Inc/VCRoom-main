-- R10 bad fixture: SECURITY DEFINER function with no SET search_path at all
create or replace function public.fixture_r10_bad()
returns boolean
language plpgsql
security definer
as $$ begin return true; end; $$;
