-- cutoff self-test: a LEGACY-dated migration (timestamp < 20261008000000)
-- containing a real violation (GRANT to anon). The whole-directory guard
-- must classify this as legacy and NOT scan it -- legacy migrations are
-- governed by live-database audit, not this guard. This file's own name
-- carries the violation deliberately, named so a human reading the
-- fixtures directory immediately understands what it proves.
grant select on public.cutoff_fixture to anon;
