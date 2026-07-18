-- R12C step 4 — Associate's session must reflect an approve/reject
-- decision live, per R12B's realtime infrastructure (CLAUDE.md §29).
-- Before adding any new realtime subscription: check pg_publication_tables
-- first, per §29's own instruction — confirming this table isn't already
-- in it (it can't be, it was just created in the prior migration).
alter publication supabase_realtime add table investor_profile_pending_changes;
