-- R8 good fixture: a real, scoped predicate, not a bare (true)
create policy fixture_r8_scoped on public.fixture_r8 for select to authenticated using (owner_id = auth.uid());
create policy fixture_r8_scoped_write on public.fixture_r8 for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
