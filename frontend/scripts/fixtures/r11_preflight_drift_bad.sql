-- R11 bad fixture: the preflight v_expected map disagrees with the file's
-- own GRANT column lists in both directions at once — "c" is granted but
-- missing from v_expected, and "d" is in v_expected but never granted.
do $preflight$
declare
  v_expected jsonb := '{"fixture_r11": ["a", "b", "d"]}'::jsonb;
begin
  null;
end $preflight$;

revoke insert, update on public.fixture_r11 from anon, authenticated;
grant insert (a, b, c) on public.fixture_r11 to authenticated;
