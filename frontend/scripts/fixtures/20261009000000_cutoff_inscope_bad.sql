-- cutoff self-test: an IN-SCOPE-dated migration (timestamp >= 20261008000000)
-- containing a real violation (GRANT to anon). Proves the cutoff
-- classifier correctly marks this "in-scope" and that an in-scope file
-- IS still scanned by the real rule engine (unlike the legacy fixture,
-- which must be skipped entirely).
grant select on public.cutoff_fixture to anon;
