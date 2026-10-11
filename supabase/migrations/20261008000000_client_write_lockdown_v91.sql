-- Client-write lockdown v9+v9.1 (+authz grant fix) — APPLIED 8 Oct 2026.
--
-- WHAT THIS DOES: replaces wide-open table-level INSERT/UPDATE/DELETE
-- grants to anon/authenticated on public.users, public.documents,
-- public.deal_rooms, public.library_documents and public.discovery_requests
-- with narrow, explicitly column-scoped grants plus RLS policies carrying
-- real WITH CHECK pins (SECURITY.md §1.1/§1.2 — "GRANT the column, PIN
-- the value in WITH CHECK"). Also closes the global default-privilege gap
-- across public/pack_api/pack_v1/rls_private (new functions no longer
-- inherit EXECUTE TO PUBLIC by default), revokes anon SELECT on
-- public.users entirely, and fixes pack_api.authz_is_room_lawyer's grant
-- (anon/public revoked, authenticated+service_role explicit).
--
-- DRY RUN RESULT: pass=31 fail=0, run against disposable fixtures only
-- (cf3dd121-…, 78e9bbab-d82f-4a3c-8328-f25bd2e87b76, d821daae-…) — never
-- against test-founder@/test-investor@/test-lawyer@ or any real account.
-- Covered F1-F3 (fixture relationship proofs), G1-G5 (grant-state
-- proofs), A1-A13 (13 adversarial attacks, each asserting SQLSTATE 42501
-- and, where a WITH CHECK is the blocker, the "row-level security"
-- message text specifically — a missing-column-grant 42501 was not
-- accepted as proof of a WITH CHECK pin), P1-P8 (8 positive controls
-- including the real PostgREST upsert shape with `id` in the ON CONFLICT
-- SET list), and D1 (default-privilege proof on a disposable function).
--
-- REAL-HTTP SMOKE TEST, same day, same disposable fixtures, through the
-- ordinary password-grant flow and real PostgREST endpoints (not SET
-- ROLE simulation — safeupdate and PostgREST transport behaviour are not
-- exercised by SET ROLE, which is exactly what the dry run cannot cover
-- and the smoke test exists to close): room create returned 201 with a
-- real reference_no (confirms Migration A, the pack_v1.next_org_code()
-- safeupdate fix, works end-to-end through the real HTTP path); founder
-- and investor document uploads both 201; memo save and settings save
-- both 2xx with the row actually changed (verified by re-querying, not
-- trusted from status code alone — PostgREST returns 204 with no error
-- on a legitimate 0-row RLS-filtered UPDATE, which is indistinguishable
-- from a real block without checking the row); anon GET /rest/v1/users
-- 401; upsert role=admin 403/42501 with the row-level-security message;
-- document insert with forged uploaded_by_role, cross-room, or
-- status != 'uploaded' all 403; room create with created_by = another
-- user 403; stranger read of another user's row returned empty.
--
-- REVERT REFERENCE: no standalone revert file exists for this migration.
-- Reverting means restoring the wide-open grants and the pre-lockdown
-- policy set (users_own, users_can_read_by_email, deal_rooms_founder_manage,
-- documents_own, the un-narrowed library_documents/discovery_requests
-- grants, and anon SELECT on users) — i.e. undoing every REVOKE/GRANT/
-- DROP POLICY/CREATE POLICY statement below in reverse, plus re-granting
-- EXECUTE TO PUBLIC on functions created after this migration in the four
-- default-privilege schemas. This is deliberately not shipped as a ready
-- file: reverting this migration reopens the exact exposure it closes
-- (anon-readable users.role, forgeable deal_rooms.created_by, etc.) and
-- should never be a one-command action — if ever needed, write and
-- review the revert as its own explicit, approved step, not a reflex.
--
-- Applied once via the Supabase SQL editor. Reproduced here byte-for-byte
-- from the text actually sent for this migration record — not retyped,
-- not reworded, not reconstructed from a later live-state query (see
-- CLAUDE.md §7.2/§19p: the repo must never become the stale side of what
-- was actually applied).

revoke insert, update, delete on public.users from anon, authenticated;
grant insert (id, role, full_name, updated_at) on public.users to authenticated;
grant update (id, role, full_name, avatar_url, notification_prefs, updated_at) on public.users to authenticated;
drop policy if exists users_own on public.users;
drop policy if exists users_can_read_by_email on public.users;
create policy users_select_scoped on public.users for select to authenticated using (
  id = auth.uid()
  or id in (select dm2.user_id from deal_room_members dm1 join deal_room_members dm2 on dm2.deal_room_id = dm1.deal_room_id where dm1.user_id = auth.uid())
  or id in (select sta2.user_id from startup_team_accounts sta1 join startup_team_accounts sta2 on (sta2.startup_id = sta1.startup_id and sta1.startup_id is not null) or (sta2.investor_profile_id = sta1.investor_profile_id and sta1.investor_profile_id is not null) where sta1.user_id = auth.uid())
);
create policy users_insert_own on public.users for insert to authenticated with check (id = auth.uid() and role in ('founder', 'investor'));
create policy users_update_own on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role in ('founder', 'investor'));

revoke insert, update, delete on public.documents from anon, authenticated;
grant insert (deal_room_id, uploader_id, storage_path, category, file_name, file_size, status, uploaded_by_role) on public.documents to authenticated;
drop policy if exists documents_own on public.documents;
create policy documents_select_own on public.documents for select to authenticated using (uploader_id = auth.uid());
create policy documents_insert_own on public.documents for insert to authenticated with check (
  uploader_id = auth.uid() and status = 'uploaded'
  and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  and rls_private.dr_is_open(deal_room_id)
  and uploaded_by_role = (select role from deal_room_members where deal_room_id = documents.deal_room_id and user_id = auth.uid())
);
create policy documents_delete_own on public.documents for delete to authenticated using (uploader_id = auth.uid());

alter default privileges for role postgres revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema pack_api revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema pack_api grant execute on functions to service_role;
alter default privileges for role postgres in schema pack_v1 revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema pack_v1 grant execute on functions to service_role;
alter default privileges for role postgres in schema rls_private revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema rls_private grant execute on functions to service_role;

revoke insert, update on public.deal_rooms from anon, authenticated;
grant insert (startup_id, status, prep_status, investor_name, investor_email, investor_company, created_by) on public.deal_rooms to authenticated;
grant update (investor_memo, memo_generated_at) on public.deal_rooms to authenticated;
drop policy if exists deal_rooms_founder_manage on public.deal_rooms;
create policy deal_rooms_founder_insert on public.deal_rooms for insert to authenticated with check (is_startup_founder(startup_id) and created_by = auth.uid() and prep_status = 'in_prep' and status in ('new', 'pending'));
create policy deal_rooms_founder_delete on public.deal_rooms for delete to authenticated using (is_startup_founder(startup_id));

revoke update on public.library_documents from anon, authenticated;
revoke insert, delete on public.library_documents from anon, authenticated;
grant insert (owner_type, owner_id, source, category, file_path, file_name, file_size) on public.library_documents to authenticated;
grant delete on public.library_documents to authenticated;

revoke insert on public.discovery_requests from anon, authenticated;
drop policy if exists investor_insert_own on public.discovery_requests;

revoke select on public.users from anon;
revoke execute on function pack_api.authz_is_room_lawyer(uuid, uuid) from public, anon;
grant execute on function pack_api.authz_is_room_lawyer(uuid, uuid) to authenticated, service_role;
