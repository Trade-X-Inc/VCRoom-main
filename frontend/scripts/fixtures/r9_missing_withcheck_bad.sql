-- R9 bad fixture: an UPDATE policy with USING but no WITH CHECK at all
create policy fixture_r9_nocheck on public.fixture_r9 for update to authenticated using (id = auth.uid());
