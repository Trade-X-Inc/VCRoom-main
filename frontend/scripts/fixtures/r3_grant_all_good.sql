-- R3 good fixture: explicit, named, column-scoped privileges instead of ALL
grant select on public.fixture_r3 to authenticated;
grant insert (name) on public.fixture_r3 to authenticated;
