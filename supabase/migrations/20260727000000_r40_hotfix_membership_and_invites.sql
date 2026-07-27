-- R40 security hotfix: deal_room_members self-insert/self-promote, invites
-- anon-readable tokens, invites_update universal-write, notifications
-- cross-user insert. See CLAUDE.md SS40 (lawyer RLS audit) follow-up
-- escalations. Deal-room invite tokens are removed as a concept entirely
-- (join.$token.tsx deleted in the same branch) — membership now comes only
-- from (a) a founder self-inserting into their own startup's room, or
-- (b) the existing service-role approveConnectionRequest path, which
-- bypasses RLS and is unaffected by anything below.

-- ── 1. deal_room_members ────────────────────────────────────────────
-- Replace the single `drm_own` ALL policy (INSERT/UPDATE/DELETE all gated
-- only by user_id = auth.uid(), with no invite check and no role
-- restriction) with explicit per-command policies.

drop policy if exists "drm_own" on deal_room_members;

-- SELECT: unchanged behaviour (was covered by drm_own for self-rows; the
-- pre-existing drm_room_members_read policy already covers member-visible
-- reads across the room, so a self-read policy is redundant but harmless
-- to restate explicitly for clarity).
create policy "drm_self_read" on deal_room_members
  for select
  using (user_id = auth.uid());

-- INSERT: only a founder inserting themselves into a room belonging to
-- their own startup. This is the one legitimate client-side INSERT path
-- (app.deal-rooms.index.tsx:679, room creation). No invite-based insert
-- path exists anymore. The service-role approveConnectionRequest path
-- bypasses RLS and does not need a policy here.
--
-- Uses a SECURITY DEFINER helper rather than a raw subquery against
-- deal_rooms: a raw `deal_room_id IN (SELECT dr.id FROM deal_rooms dr ...)`
-- inside this policy triggers deal_rooms' OWN RLS for that subquery, and
-- one of deal_rooms' select policies (deal_rooms_member_read) queries
-- deal_room_members again — a cross-table recursion cycle
-- (deal_room_members -> deal_rooms -> deal_room_members), confirmed
-- empirically (42P17 infinite recursion) while testing the NDA-sign path.
-- Same class of bug as CLAUDE.md SS5.1/SS34; fixed the established way,
-- mirroring is_startup_founder/dr_is_principal/dr_is_room_member.
create or replace function public.drm_is_founder_of_room(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from deal_rooms dr
    join startups s on s.id = dr.startup_id
    where dr.id = p_deal_room_id
      and s.founder_id = p_user_id
  );
$$;

create policy "drm_founder_self_insert" on deal_room_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'founder'
    and drm_is_founder_of_room(deal_room_id, auth.uid())
  );

-- UPDATE: removed entirely. Nothing legitimate changes a role after
-- insert — the NDA-sign upsert (app.deal-rooms.$id.nda.tsx:228) writes
-- role but only ever re-writes the caller's own existing value, so it
-- does not need write access to actually change it. Column grant revoke
-- (below) is the real guard, since RLS cannot restrict columns.
--
-- KNOWN PRE-EXISTING ISSUE, reported not fixed (out of scope for this
-- branch): that NDA upsert uses `on_conflict=deal_room_id,user_id`, but no
-- unique constraint exists on that column pair (confirmed via
-- pg_constraint — only a bare `id` primary key and two FKs) — so the
-- upsert has always failed with 42P10 regardless of RLS. Separately, if
-- that constraint bug is ever fixed, the upsert's payload includes `role`
-- unchanged, which will then hit the column-grant revoke below and fail
-- with 42501 (verified empirically: a PATCH with accepted_at alone
-- succeeds, the same PATCH with role added fails). Fixing either requires
-- changing app.deal-rooms.$id.nda.tsx to omit `role` from the upsert body
-- (it never needs to change), which is out of scope here.

-- DELETE: self only, unchanged.
create policy "drm_self_delete" on deal_room_members
  for delete
  using (user_id = auth.uid());

-- Freeze the role column: no client (anon or authenticated) may write it
-- via UPDATE, regardless of policy. RLS is row-level only (CLAUDE.md SS33);
-- this is the actual mechanism that stops a role change.
--
-- A column-specific REVOKE alone does NOT work here: a broader table-level
-- UPDATE grant (no column list, covering every column) already existed for
-- both roles, and Postgres privilege checks are permissive-union -- any
-- grant covering the column allows it, so a narrower REVOKE cannot override
-- a wider GRANT. Verified empirically via has_column_privilege() still
-- returning true after a bare column-specific revoke. The correct fix is to
-- revoke the table-level UPDATE grant entirely, then re-grant UPDATE only
-- on the columns legitimate code still needs (accepted_at, for the
-- NDA-sign upsert at app.deal-rooms.$id.nda.tsx:228) -- excluding role.
revoke update on deal_room_members from authenticated, anon;
grant update (accepted_at) on deal_room_members to authenticated, anon;

-- ── 2. invites: remove anon/public read entirely ────────────────────
-- Tokens and emails must not be publicly readable. This breaks the client
-- read in join.team.$token.tsx (the route that reads FROM the `invites`
-- table, filtered deal_room_id IS NULL — accepted, restored by a future
-- SECURITY DEFINER RPC refactor, out of scope for this branch).
drop policy if exists "invites_token_select" on invites;

-- ── 3. team_invites: same class of exposure, same fix ───────────────
-- This breaks the client read in join.tsx (the route that reads FROM the
-- `team_invites` table — a separate table/route from join.team.$token.tsx
-- despite the similar name; also accepted, same future-RPC restoration).
drop policy if exists "team_invites_public_token_read" on team_invites;

-- ── 4. invites_update: was universally true for any authenticated user
-- (USING had `OR auth.uid() IS NOT NULL`; WITH CHECK was omitted, so
-- USING was reused as the check). Rewrite to: only the invite's own
-- recipient (by email) may update it, and only to mark acceptance.
drop policy if exists "invites_update" on invites;

create policy "invites_recipient_accept" on invites
  for update
  using (
    email = (select u.email from auth.users u where u.id = auth.uid())
    and accepted_at is null
    and expires_at > now()
  )
  with check (
    email = (select u.email from auth.users u where u.id = auth.uid())
  );

-- ── 5. notifications: drop the two policies that let any authenticated
-- user insert a notification targeting an arbitrary user_id. The existing
-- `notifications_own` ALL policy (USING user_id = auth.uid()) already
-- covers legitimate self-notifications; service-role writes bypass RLS
-- and are unaffected.
drop policy if exists "authenticated_insert_any" on notifications;
drop policy if exists "notifications_authenticated_insert" on notifications;
