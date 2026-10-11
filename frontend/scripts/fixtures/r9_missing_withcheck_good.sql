-- R9 good fixture: an UPDATE policy with both USING and an explicit WITH CHECK
create policy fixture_r9_check on public.fixture_r9 for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
