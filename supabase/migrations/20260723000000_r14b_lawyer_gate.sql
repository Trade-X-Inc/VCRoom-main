-- R14B step 4 — Investment Terms lawyer gate + room-native counsel invite.
--
-- Design constraint from the audit: the existing invite system
-- (team_invites -> startup_team_accounts, optionally scoped further via
-- deal_room_team_assignments) has no way to express "an account that only
-- ever belongs to one room." A lawyer accepting that flow becomes a real
-- fund-wide team member (visible on the fund's Team page, counts toward
-- team limits) even before any room scoping is applied — the opposite of
-- the locked design ("a lawyer never gains access beyond this one room").
-- So counsel is modelled as what it already structurally is: a
-- deal_room_members row with role = 'lawyer' in exactly one room, nothing
-- else. No startup_team_accounts row is ever created for a lawyer. This is
-- the one sanctioned new table in this step — everything around it (NDA
-- signing, notifications, Resend templates, RLS patterns) reuses existing
-- machinery.

-- ── 1. Mutual-approval requests: invite a lawyer, or waive counsel ──────
--
-- Mirrors deal_room_stage_transitions' proven shape exactly (requested_by /
-- approved_by / status / resolved_at), including its RLS predicate style:
-- only a room member can insert their own request, only the OTHER party
-- can approve/decline (requested_by <> auth.uid()).

create table deal_room_lawyer_requests (
  id uuid primary key default gen_random_uuid(),
  deal_room_id uuid not null references deal_rooms(id) on delete cascade,
  kind text not null check (kind in ('invite_lawyer', 'waive_counsel')),
  -- Which side is requesting (or, for invite_lawyer, which side the new
  -- lawyer will represent) — 'founder' or 'investor'.
  side text not null check (side in ('founder', 'investor')),
  lawyer_email text, -- required for kind='invite_lawyer', null for waive_counsel
  requested_by uuid not null references users(id),
  approved_by uuid references users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Only one live request per room+kind+side at a time — mirrors the
-- "block if a pending transition already exists" client-side check in
-- useStageTransition.ts, made structural. A plain unique partial index
-- (not an exclusion constraint) since btree_gist isn't installed and this
-- is a pure equality constraint, no range overlap involved.
create unique index one_pending_per_room_kind_side
  on deal_room_lawyer_requests (deal_room_id, kind, side)
  where status = 'pending';

alter table deal_room_lawyer_requests enable row level security;

create policy "lawyer_requests_read"
  on deal_room_lawyer_requests for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));

create policy "lawyer_requests_insert"
  on deal_room_lawyer_requests for insert
  with check (
    requested_by = auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

-- Only the counterparty resolves a pending request — same mutual-approval
-- shape as transitions_update.
create policy "lawyer_requests_resolve"
  on deal_room_lawyer_requests for update
  using (
    status = 'pending'
    and requested_by <> auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

-- ── 2. The actual counsel invite (token-based, mirrors team_invites'
--    shape) — created once a request is approved. Public SELECT by token
--    only (same as team_invites' unauthenticated join-page lookup).

create table deal_room_lawyer_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  deal_room_id uuid not null references deal_rooms(id) on delete cascade,
  side text not null check (side in ('founder', 'investor')),
  email text not null,
  invited_by uuid not null references users(id),
  request_id uuid references deal_room_lawyer_requests(id),
  accepted_at timestamptz,
  accepted_by uuid references users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- Max one ACCEPTED lawyer per side per room. A partial unique index (not a
-- table-wide unique constraint) so multiple pending/declined/expired
-- invites for the same side don't collide — only acceptance is exclusive.
create unique index one_accepted_lawyer_per_side
  on deal_room_lawyer_invites (deal_room_id, side)
  where accepted_at is not null;

alter table deal_room_lawyer_invites enable row level security;

-- Room members can see invites for their room (so the UI can show "invite
-- pending" state). Public unauthenticated lookup by exact token happens
-- through a SECURITY DEFINER RPC (below), not a broad anon policy — mirrors
-- discovery via token without opening a table-wide anon SELECT.
create policy "lawyer_invites_room_read"
  on deal_room_lawyer_invites for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));

create policy "lawyer_invites_insert"
  on deal_room_lawyer_invites for insert
  with check (
    invited_by = auth.uid()
    and deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid())
  );

-- Public, unauthenticated invite lookup by token — the join page runs
-- before the visitor has a session. Returns only the fields the join page
-- needs, never the full row, and only for a live (unaccepted, unexpired)
-- invite.
create or replace function get_lawyer_invite_by_token(p_token uuid)
returns table (
  id uuid,
  deal_room_id uuid,
  side text,
  email text,
  expires_at timestamptz,
  accepted_at timestamptz,
  company_name text,
  investor_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.id, i.deal_room_id, i.side, i.email, i.expires_at, i.accepted_at,
    s.company_name, dr.investor_name
  from deal_room_lawyer_invites i
  join deal_rooms dr on dr.id = i.deal_room_id
  left join startups s on s.id = dr.startup_id
  where i.token = p_token;
$$;

-- Accept an invite: verifies the token, creates the deal_room_members row
-- (role='lawyer'), marks the invite accepted. SECURITY DEFINER because the
-- caller has no deal_room_members row yet (chicken-and-egg — RLS on
-- deal_room_members would otherwise block their own INSERT). Mirrors the
-- self-acceptance guard from CLAUDE.md §5.2's team-invite lesson.
create or replace function accept_lawyer_invite(p_token uuid)
returns table (ok boolean, deal_room_id uuid, error text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite deal_room_lawyer_invites%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return query select false, null::uuid, 'not_authenticated';
    return;
  end if;

  select * into v_invite from deal_room_lawyer_invites where token = p_token;
  if not found then
    return query select false, null::uuid, 'invalid_token';
    return;
  end if;
  if v_invite.accepted_at is not null then
    return query select false, null::uuid, 'already_accepted';
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select false, null::uuid, 'expired';
    return;
  end if;
  if v_invite.invited_by = v_uid then
    return query select false, null::uuid, 'self_acceptance_blocked';
    return;
  end if;

  insert into deal_room_members (deal_room_id, user_id, role, invited_by)
  values (v_invite.deal_room_id, v_uid, 'lawyer', v_invite.invited_by)
  on conflict do nothing;

  update deal_room_lawyer_invites
    set accepted_at = now(), accepted_by = v_uid
    where id = v_invite.id;

  return query select true, v_invite.deal_room_id, null::text;
end;
$$;

-- ── 3. Waived-counsel record on the room — mutual skip, same honesty
--    pattern as skipped meetings (§26.2's "never silent" rule).

alter table deal_rooms add column waived_legal_counsel boolean not null default false;
alter table deal_rooms add column waived_legal_counsel_at timestamptz;
alter table deal_rooms add column waived_legal_counsel_founder_confirmed_by uuid references users(id);
alter table deal_rooms add column waived_legal_counsel_investor_confirmed_by uuid references users(id);

-- ── 4. Records access: an investment_terms-stage lawyer reads only that
--    stage's records. Founder/investor access is unchanged (still gated
--    to founder/investor deal_room_members, per the pre-step-2 hardening).

drop policy "meeting_records_room_members" on deal_room_meeting_records;

create policy "meeting_records_room_members"
  on deal_room_meeting_records for select
  using (
    deal_room_id is not null
    and (
      deal_room_id in (
        select deal_room_id from deal_room_members
        where user_id = auth.uid() and role in ('founder', 'investor')
      )
      or (
        meeting_id in (
          select id from deal_room_meetings where stage_slug = 'investment_terms'
        )
        and deal_room_id in (
          select deal_room_id from deal_room_members
          where user_id = auth.uid() and role = 'lawyer'
        )
      )
    )
  );
