-- Build Step 2: deal-room preparation gate + founder/investor invite link.
--
-- Prep is a THIRD independently-owned axis on deal_rooms, orthogonal to
-- both status (open/closed, real, trigger-guarded) and workflow_stage
-- (the canonical 5-stage sequence, Build Step 1) — same architectural
-- shape as the existing status/workflow_stage split (CLAUDE.md §7.4: two
-- same-shaped columns are not automatically the same concept, and a "fix"
-- that points one at the other is wrong). workflow_stage is NOT touched
-- by this migration — no 6th stage is prepended to Step 1's sequence.
--
-- Confirmed live before writing this: no prep/ready/state/checklist
-- column exists anywhere on deal_rooms today. Genuinely greenfield.
--
-- RECONCILIATION NOTICE, 14 Sep 2026 — every function body below is
-- reproduced VERBATIM from pg_get_functiondef against the live database,
-- pulled fresh at the time this file was rewritten, not retyped from an
-- earlier draft, memory, or a summary of what changed. This file went
-- through repeated divergence from live during this build (three
-- separate function-body mismatches found across two review passes:
-- graduate_deal_room_prep and accept_deal_room_invite_link the first
-- time, then get_deal_room_invite_by_token and cancel_deal_room_prep the
-- second time) — see CLAUDE.md's new standing-rule entry for the general
-- lesson. The table/column DDL (sections 1-3) was never part of any
-- divergence and is unchanged from the original draft, confirmed against
-- information_schema.columns before this rewrite.

-- ── 1. Prep-state columns on deal_rooms ─────────────────────────────────
-- Column default 'live' is the fallback for any creation path that
-- doesn't explicitly set this column (defense in depth, matching the
-- existing pattern where workflow_stage's own default carries a similar
-- role). Both known creation paths set it explicitly:
--   - app.deal-rooms.index.tsx (founder self-create, "new flow"):
--     explicit 'in_prep'
--   - connection-request-fn.ts's approveConnectionRequest (existing-user
--     approve flow): explicit 'live' — this path is for users who
--     already have accounts/profiles by construction, so the prep gate
--     (built for new users with no profile/documents yet) is skipped
--     entirely, per direct product decision.
alter table deal_rooms add column prep_status text not null default 'live'
  check (prep_status in ('in_prep', 'live', 'cancelled'));
alter table deal_rooms add column founder_prep_complete_at timestamptz;
alter table deal_rooms add column investor_prep_complete_at timestamptz;

-- ── 2. Prep checklist — modelled on dd_checklist_items' shape (the ─────
-- closest existing precedent: a named item, a checked boolean, scoped to
-- one deal room), not on onboarding_progress's single-owner jsonb blob
-- (wrong shape for a two-party, per-side checklist with independent
-- read/write per side).
create table deal_room_prep_checklist_items (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references deal_rooms(id) on delete cascade,
  side text not null check (side in ('founder', 'investor')),
  item_key text not null,
  label text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_item_per_room_side_key
  on deal_room_prep_checklist_items (deal_room_id, side, item_key);

alter table deal_room_prep_checklist_items enable row level security;

-- Room members can read the full checklist (both sides) — the prep board
-- shows both parties' progress, same visibility shape as
-- deal_room_lawyer_requests' "room members can see" read policy.
create policy "prep_checklist_room_read"
  on deal_room_prep_checklist_items for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));

-- No direct client UPDATE policy — checklist toggles go through the
-- server-fn layer (deal-room-prep-fn.ts), which authorizes the caller's
-- own side before writing, using the service-role key. Same shape as
-- dd-fn.ts's toggleChecklistItem (service-role, membership+role-checked
-- in application code, not RLS). INSERT (seeding) is also service-role
-- only — no client INSERT policy.

-- ── 3. Deal-room invite link — adapted from deal_room_lawyer_invites' ──
-- proven shape (room-scoped, token-based, single-use via partial unique
-- index, expiring, self-accept blocked). NOT team_invites — that table
-- has no room concept at all.
create table deal_room_invite_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  deal_room_id uuid not null references deal_rooms(id) on delete cascade,
  intended_role text not null check (intended_role in ('founder', 'investor')),
  recipient_email text,
  invited_by uuid not null references users(id),
  accepted_at timestamptz,
  accepted_by uuid references users(id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- Max one ACCEPTED link per intended_role per room — mirrors
-- one_accepted_lawyer_per_side exactly. Multiple pending/expired links
-- for the same role don't collide; only acceptance is exclusive.
create unique index one_accepted_invite_per_room_role
  on deal_room_invite_links (deal_room_id, intended_role)
  where accepted_at is not null;

alter table deal_room_invite_links enable row level security;

-- Room members can see invite links for their room (so the prep board
-- can show "invite sent, awaiting acceptance" state) — mirrors
-- lawyer_invites_room_read.
create policy "invite_links_room_read"
  on deal_room_invite_links for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));

create policy "invite_links_insert"
  on deal_room_invite_links for insert
  with check (
    invited_by = auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

-- ── 4. Public, unauthenticated token lookup ──────────────────────────────
-- The join screen runs before the visitor has a session. Returns display
-- fields (company_name via startups, investor_name via deal_rooms) plus
-- pre-computed accepted/expired booleans rather than raw accepted_at,
-- via a SECURITY DEFINER function rather than a broad anon SELECT policy
-- — same intent as get_lawyer_invite_by_token, different return shape
-- (that one returns accepted_at/side raw; this one was live-corrected
-- 14 Sep 2026 to compute accepted/expired as booleans and join
-- startups.company_name — NOT startups.name, that column does not carry
-- the display name — confirmed against pg_get_functiondef, not assumed).
create or replace function public.get_deal_room_invite_by_token(p_token uuid)
returns table(deal_room_id uuid, intended_role text, expires_at timestamp with time zone, accepted boolean, expired boolean, company_name text, investor_name text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_link deal_room_invite_links%rowtype;
  v_company_name text;
  v_investor_name text;
begin
  select * into v_link from deal_room_invite_links where token = p_token;
  if v_link.id is null then
    return;
  end if;

  select s.company_name, dr.investor_name
    into v_company_name, v_investor_name
  from deal_rooms dr
  left join startups s on s.id = dr.startup_id
  where dr.id = v_link.deal_room_id;

  return query select
    v_link.deal_room_id,
    v_link.intended_role,
    v_link.expires_at,
    (v_link.accepted_at is not null),
    (v_link.expires_at <= now()),
    v_company_name,
    v_investor_name;
end;
$function$;

revoke all on function get_deal_room_invite_by_token(uuid) from public;
revoke execute on function get_deal_room_invite_by_token(uuid) from anon;
grant execute on function get_deal_room_invite_by_token(uuid) to authenticated;
-- Deliberately ALSO granted to anon: this function's whole purpose is a
-- pre-authentication join-screen preview, the same as
-- get_lawyer_invite_by_token's live anon grant. The Step 0 "revoke
-- execute from anon" lesson applies to functions that must NOT be
-- anon-reachable (accept/graduate below) — this one must be, by design,
-- since the visitor has no session yet when the join screen loads.
grant execute on function get_deal_room_invite_by_token(uuid) to anon;

-- ── 5. Accept an invite link ──────────────────────────────────────────────
-- Verifies the token, ROLE-LOCKS the accepting user against
-- intended_role, creates the deal_room_members row, marks the link
-- accepted. SECURITY DEFINER because the caller has no deal_room_members
-- row yet (same chicken-and-egg as accept_lawyer_invite — RLS on
-- deal_room_members would otherwise block their own INSERT). Returns
-- only (ok, error) — NOT deal_room_id; the room id for post-accept
-- navigation must come from the token preview
-- (get_deal_room_invite_by_token), fetched before accept and stable for
-- the life of the token, not from this function's return.
--
-- ROLE-LOCK, the load-bearing new security line (not present in the
-- lawyer-invite precedent, which has no role-matching concept — every
-- lawyer invite always grants role='lawyer'). users.role has SIX live
-- values, verified against the live CHECK constraint, not assumed from
-- an earlier five-value recon:
--   founder, investor, investor_member, admin, deleted, challenger
-- Role-FAMILY matching, not strict equality:
--   intended_role='investor' accepts: investor, investor_member
--     (investor_member is a real investor-side team-account principal,
--     per useAccountContext.ts — excluding it would wrongly reject a
--     legitimate investor-side user from an investor-intended link)
--   intended_role='founder' accepts: founder
--   admin, deleted, challenger: rejected (wrong_role) for BOTH intended
--     roles. challenger is a real live role but belongs to the entirely
--     unrelated Roast feature (a public Q&A audience participant,
--     roast-fn.ts/roast.$id.tsx) — never a deal-room principal, verified
--     against live usage before excluding it.
create or replace function public.accept_deal_room_invite_link(p_token uuid)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_caller_role text;
  v_link deal_room_invite_links%rowtype;
  v_role_allowed boolean;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;

  select * into v_link from deal_room_invite_links where token = p_token for update;
  if v_link.id is null then
    return query select false, 'invalid_token'; return;
  end if;
  if v_link.accepted_at is not null then
    return query select false, 'already_accepted'; return;
  end if;
  if v_link.expires_at <= now() then
    return query select false, 'expired'; return;
  end if;
  if v_link.invited_by = v_uid then
    return query select false, 'self_accept_not_allowed'; return;
  end if;

  select role into v_caller_role from users where id = v_uid;

  -- Role-family match. All six live users.role values handled:
  -- founder, investor, investor_member (accepted per family), admin,
  -- deleted, challenger (Roast audience participant -- all three
  -- rejected via the else-false fallthrough, not an oversight).
  v_role_allowed := case
    when v_link.intended_role = 'investor' then v_caller_role in ('investor', 'investor_member')
    when v_link.intended_role = 'founder' then v_caller_role = 'founder'
    else false
  end;

  if not v_role_allowed then
    return query select false, 'wrong_role'; return;
  end if;

  insert into deal_room_members (deal_room_id, user_id, role)
  values (v_link.deal_room_id, v_uid, v_link.intended_role)
  on conflict do nothing;

  update deal_room_invite_links
    set accepted_at = now(), accepted_by = v_uid
    where id = v_link.id;

  return query select true, null::text;
end;
$function$;

revoke all on function accept_deal_room_invite_link(uuid) from public;
revoke execute on function accept_deal_room_invite_link(uuid) from anon;
grant execute on function accept_deal_room_invite_link(uuid) to authenticated;

-- ── 6. Graduation RPC — two-sided AND, server-enforced ──────────────────
-- Mirrors finalize_deal_close()'s shape exactly (Build Step 1 precedent):
-- re-derive and re-check both flags from the row itself, never trust a
-- client-supplied "I'm ready" boolean. A single side calling this cannot
-- flip the room live — both founder_prep_complete_at AND
-- investor_prep_complete_at must already be set on the row. Row-locked
-- (for update) for race-safety against a concurrent markPrepReady write.
create or replace function public.graduate_deal_room_prep(p_deal_room_id uuid)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_room deal_rooms%rowtype;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;
  if not exists (select 1 from deal_room_members where deal_room_id = p_deal_room_id and user_id = v_uid) then
    return query select false, 'not_authorized'; return;
  end if;

  select * into v_room from deal_rooms where id = p_deal_room_id for update;
  if v_room.id is null then
    return query select false, 'not_found'; return;
  end if;

  if v_room.prep_status <> 'in_prep' then
    return query select false, 'not_in_prep'; return;
  end if;

  if v_room.founder_prep_complete_at is null or v_room.investor_prep_complete_at is null then
    return query select false, 'waiting_on_other_side'; return;
  end if;

  update deal_rooms set prep_status = 'live' where id = p_deal_room_id;
  return query select true, null::text;
end;
$function$;

revoke all on function graduate_deal_room_prep(uuid) from public;
revoke execute on function graduate_deal_room_prep(uuid) from anon;
grant execute on function graduate_deal_room_prep(uuid) to authenticated;

-- ── 7. Cancel prep — either side, one-way ────────────────────────────────
-- Row-locked (for update) and explicit not_found/not_in_prep guards, same
-- shape as graduate_deal_room_prep — a cancel attempt on a room that
-- isn't in_prep returns a real error rather than a silent no-op reported
-- as success (the CLAUDE.md §7.4 "a caught failure that renders a
-- plausible success state is worse than an uncaught one" pattern; an
-- earlier applied version of this function lacked the not_in_prep guard
-- and was fixed live 14 Sep 2026).
create or replace function public.cancel_deal_room_prep(p_deal_room_id uuid)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_room deal_rooms%rowtype;
begin
  if v_uid is null then
    return query select false, 'not_authenticated'; return;
  end if;
  if not exists (select 1 from deal_room_members where deal_room_id = p_deal_room_id and user_id = v_uid) then
    return query select false, 'not_authorized'; return;
  end if;

  select * into v_room from deal_rooms where id = p_deal_room_id for update;
  if v_room.id is null then
    return query select false, 'not_found'; return;
  end if;
  if v_room.prep_status <> 'in_prep' then
    return query select false, 'not_in_prep'; return;
  end if;

  update deal_rooms set prep_status = 'cancelled' where id = p_deal_room_id;
  return query select true, null::text;
end;
$function$;

revoke all on function cancel_deal_room_prep(uuid) from public;
revoke execute on function cancel_deal_room_prep(uuid) from anon;
grant execute on function cancel_deal_room_prep(uuid) to authenticated;

-- ── 8. Cross-user notification RPCs ──────────────────────────────────────
-- Mirrors notify_invite_recipient()'s exact shape (Build Step 0): re-
-- derives justification from a real row via WHERE EXISTS rather than
-- trusting the caller, since notifications_own RLS restricts a plain
-- client insert to the caller's own user_id. Not reusing
-- notify_invite_recipient itself — it's hard-coupled to the unrelated
-- `invites`/deal_room_id table pair from a different feature.
create or replace function public.notify_prep_invite_accepted(p_invite_link_id uuid, p_recipient_user_id uuid, p_deal_room_id uuid, p_title text, p_body text, p_action_url text)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  insert into notifications (user_id, kind, title, body, meta, action_url, read)
  select p_recipient_user_id, 'deal_room_invite', p_title, p_body,
         jsonb_build_object('deal_room_id', p_deal_room_id), p_action_url, false
  where exists (
    select 1 from deal_room_invite_links
    where id = p_invite_link_id and deal_room_id = p_deal_room_id
  );
$function$;

revoke all on function notify_prep_invite_accepted(uuid, uuid, uuid, text, text, text) from public;
revoke execute on function notify_prep_invite_accepted(uuid, uuid, uuid, text, text, text) from anon;
grant execute on function notify_prep_invite_accepted(uuid, uuid, uuid, text, text, text) to authenticated;

create or replace function public.notify_prep_graduated(p_deal_room_id uuid, p_recipient_user_id uuid, p_title text, p_body text, p_action_url text)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  insert into notifications (user_id, kind, title, body, meta, action_url, read)
  select p_recipient_user_id, 'deal_room', p_title, p_body,
         jsonb_build_object('deal_room_id', p_deal_room_id), p_action_url, false
  where exists (
    select 1 from deal_rooms where id = p_deal_room_id and prep_status = 'live'
  );
$function$;

revoke all on function notify_prep_graduated(uuid, uuid, text, text, text) from public;
revoke execute on function notify_prep_graduated(uuid, uuid, text, text, text) from anon;
grant execute on function notify_prep_graduated(uuid, uuid, text, text, text) to authenticated;

-- ── 9. room_get_identity extended with prep fields ──────────────────────
-- prep_status is a room-identity/lifecycle fact, not a workflow_stage
-- fact — added here, NOT to room_get_workflow_state, keeping that
-- function correctly scoped to Step 1's canonical sequence only.
-- useDealRoomContext.ts's existing spread ({ ...identity.room,
-- ...workflow.workflow }) picks these up automatically — zero action-
-- layer (deal-room-core.ts) changes needed, confirmed by reading
-- roomGetDef's generic factory before writing this.
--
-- Also carries reference_no (Build Step 1 / prior work's identity field,
-- unrelated to this migration) — included here so this create-or-replace
-- does not silently drop it from every room's identity payload; confirmed
-- present live before writing this version.
create or replace function pack_api.room_get_identity(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_row jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select jsonb_build_object(
    'id', d.id, 'startup_id', d.startup_id, 'status', d.status,
    'created_at', d.created_at, 'updated_at', d.updated_at,
    'investor_name', d.investor_name, 'investor_email', d.investor_email,
    'investor_company', d.investor_company, 'created_by', d.created_by,
    'investor_decision', d.investor_decision, 'closed_at', d.closed_at,
    'investor_user_id', d.investor_user_id,
    'reference_no', d.reference_no,
    'prep_status', d.prep_status,
    'founder_prep_complete_at', d.founder_prep_complete_at,
    'investor_prep_complete_at', d.investor_prep_complete_at
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'room', v_row);
end;
$function$;
