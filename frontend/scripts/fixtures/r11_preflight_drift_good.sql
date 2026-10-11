-- R11 good fixture: v_expected exactly matches the file's own GRANT
-- column lists for every table/privilege it names.
do $preflight$
declare
  v_expected jsonb := '{"fixture_r11": ["a", "b"]}'::jsonb;
begin
  null;
end $preflight$;

revoke insert, update on public.fixture_r11 from anon, authenticated;
grant insert (a, b) on public.fixture_r11 to authenticated;
