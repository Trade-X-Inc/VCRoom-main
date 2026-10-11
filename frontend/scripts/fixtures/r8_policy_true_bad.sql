-- R8 bad fixture: USING (true) and WITH CHECK (true) on a table NOT in
-- the public-data allowlist
create policy fixture_r8_open on public.fixture_r8 for select to authenticated using (true);
create policy fixture_r8_open_write on public.fixture_r8 for update to authenticated using (id = auth.uid()) with check (true);
