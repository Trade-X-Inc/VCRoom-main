-- R15A — Term negotiation engine (per-term granularity).
--
-- Three tables live inside the deal room, under the existing Term Sheet stage
-- (/deal-rooms/:id/term-sheets). The legacy deal_room_term_sheets blob table is
-- left UNTOUCHED (R15A audit decision 1) — this is a separate, parallel engine.
--
-- Scope: FOUNDER + INVESTOR only. Per §40 (found in R15A's own audit), almost
-- every existing deal_room_* table is member-scoped with no role restriction,
-- so a lawyer can read them at the DB level. These NEW tables must NOT repeat
-- that gap: RLS is gated by dr_is_principal() (role in ('founder','investor')),
-- a SECURITY DEFINER helper mirroring the §34 owner/role-lookup pattern. A
-- lawyer or External member gets 0 rows even with a direct REST/Realtime call.
--
-- Design (audit decision, per-term not a monolithic JSON blob):
--   deal_room_term_config    — one row per room: chosen instrument_type +
--                              term-set lock timestamp (the R15B seam).
--   deal_room_terms          — one row per term: current value + per-side
--                              mutual-acceptance flags + status.
--   deal_room_term_proposals — append-only audit trail: every propose / counter
--                              / accept / reject, never overwritten (history is
--                              the audit trail R15A step 5 requires).

-- ── Principal-only access helper (founder + investor, never lawyer/External) ──
-- SECURITY DEFINER so the policy can read deal_room_members without the caller
-- needing its own SELECT grant, and so the role check can't be defeated by a
-- self-referential RLS recursion (CLAUDE.md §5 pattern).
create or replace function dr_is_principal(p_deal_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from deal_room_members dm
    where dm.deal_room_id = p_deal_room_id
      and dm.user_id = p_user_id
      and dm.role in ('founder', 'investor')
  );
$$;

comment on function dr_is_principal(uuid, uuid) is
  'R15A: true iff p_user_id is a founder or investor member of the room. '
  'Excludes lawyer/External by design (§40). Use for term-negotiation RLS; '
  'never a bare deal_room_members membership check.';

-- ── deal_room_term_config — one row per deal room ────────────────────────────
create table deal_room_term_config (
  deal_room_id  uuid primary key references deal_rooms(id) on delete cascade,
  -- Chosen instrument. Locked once the first term is proposed (enforced in the
  -- server fn / app layer; changing it mid-negotiation orphans terms and
  -- requires a mutual-confirmed reset). NULL until the first selection.
  instrument_type text check (instrument_type in ('safe', 'equity', 'debt', 'company_sale')),
  instrument_locked boolean not null default false,
  -- Term-set lock (R15A step 6): set once every term is accepted by both sides.
  -- Once non-null, the whole set is finalized and R15A cannot re-open it.
  -- R15B's lawyer/agreement review may clear this — that unlock mechanism is
  -- NOT built here (leave the seam; see §R15A step 6).
  locked_at   timestamptz,
  locked_by   uuid,               -- who triggered the final acceptance
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── deal_room_terms — one row per term (current state) ───────────────────────
create table deal_room_terms (
  id            uuid primary key default gen_random_uuid(),
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,
  instrument_type text not null check (instrument_type in ('safe', 'equity', 'debt', 'company_sale')),
  term_key      text not null,          -- e.g. "valuation_cap"
  term_label    text not null,          -- e.g. "Valuation cap"
  value_type    text not null default 'text'
                  check (value_type in ('currency', 'percentage', 'boolean', 'text', 'date', 'number')),
  is_custom     boolean not null default false,   -- true = added beyond the template
  current_value text,                     -- the latest agreed/proposed value (text-serialized)
  status        text not null default 'unset'
                  check (status in ('unset', 'proposed', 'accepted', 'rejected', 'counter', 'locked')),
  -- Mutual acceptance: a term is finalized only when BOTH are true against the
  -- SAME current_value. Set/cleared exclusively by the server fn (step 5).
  accepted_by_founder  boolean not null default false,
  accepted_by_investor boolean not null default false,
  -- Whose move: which role must act next on this term (null when finalized).
  awaiting_role text check (awaiting_role in ('founder', 'investor')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (deal_room_id, term_key)
);

create index deal_room_terms_room_idx on deal_room_terms(deal_room_id);

-- ── deal_room_term_proposals — append-only audit trail ───────────────────────
create table deal_room_term_proposals (
  id            uuid primary key default gen_random_uuid(),
  term_id       uuid not null references deal_room_terms(id) on delete cascade,
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,  -- denormalized for RLS scoping
  action        text not null check (action in ('propose', 'accept', 'reject', 'counter')),
  proposed_value        text,   -- the value proposed/countered (null for a pure accept/reject)
  suggested_alternative text,   -- free-text suggestion accompanying a reject/counter
  actor_user_id uuid not null,
  actor_role    text not null check (actor_role in ('founder', 'investor')),
  created_at    timestamptz not null default now()
);

create index deal_room_term_proposals_term_idx on deal_room_term_proposals(term_id, created_at);
create index deal_room_term_proposals_room_idx on deal_room_term_proposals(deal_room_id);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function r15a_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_term_config_touch before update on deal_room_term_config
  for each row execute function r15a_touch_updated_at();
create trigger trg_terms_touch before update on deal_room_terms
  for each row execute function r15a_touch_updated_at();

-- ── RLS — founder + investor only, room-scoped ───────────────────────────────
alter table deal_room_term_config    enable row level security;
alter table deal_room_terms          enable row level security;
alter table deal_room_term_proposals enable row level security;

-- Config: principals of the room read/write. (Instrument lock + reset happen
-- through the server fn; a direct write is still principal-gated here.)
create policy term_config_principals on deal_room_term_config
  for all
  using (dr_is_principal(deal_room_id, auth.uid()))
  with check (dr_is_principal(deal_room_id, auth.uid()));

-- Terms: principals read. Writes flow through SECURITY DEFINER server fns
-- (step 5) that enforce the mutual-acceptance logic; a principal MAY still
-- insert/update directly here (gated), but the step-5 fns own status changes so
-- one side can't unilaterally set accepted_by_<other> — that column is only
-- ever written by the fn, never by a client (verified in step 7).
create policy terms_principals on deal_room_terms
  for all
  using (dr_is_principal(deal_room_id, auth.uid()))
  with check (dr_is_principal(deal_room_id, auth.uid()));

-- Proposals: principals read the full audit trail; inserts must be the acting
-- user's own row (actor_user_id = auth.uid()) and principal-scoped. Append-only:
-- no update/delete policy, so history can never be rewritten.
create policy term_proposals_read on deal_room_term_proposals
  for select
  using (dr_is_principal(deal_room_id, auth.uid()));

create policy term_proposals_insert on deal_room_term_proposals
  for insert
  with check (
    dr_is_principal(deal_room_id, auth.uid())
    and actor_user_id = auth.uid()
  );

-- ── Realtime — the counterparty's saved change reaches the other session live ─
-- Per §28: a .channel() on an unpublished table is a silent no-op, so the table
-- must be in the publication. deal_room_terms and _config both carry status/
-- value changes the counterparty must see; proposals drive the live audit trail.
-- Realtime enforces each table's RLS SELECT on the replication path (§29.1), so
-- a lawyer subscribing still receives 0 payloads (verified in step 7).
alter publication supabase_realtime add table deal_room_terms;
alter publication supabase_realtime add table deal_room_term_config;
alter publication supabase_realtime add table deal_room_term_proposals;
