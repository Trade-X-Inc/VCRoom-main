-- R4 good fixture: column-scoped INSERT, and a bare DELETE (which is
-- correct and must NOT be flagged -- Postgres has no column-scoped DELETE)
grant insert (name, owner_id) on public.fixture_r4 to authenticated;
grant delete on public.fixture_r4 to authenticated;
