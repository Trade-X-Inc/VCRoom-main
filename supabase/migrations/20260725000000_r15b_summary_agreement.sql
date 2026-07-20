-- R15B — Gates 2–3 of the closing pipeline: summary generation + agreement
-- upload/review. Three new tables, all inside the deal room, on the post-lock
-- Term Sheet stage. R15A's term-negotiation tables are UNCHANGED (lawyer stays
-- blocked on them per R15A step 7 / §40).
--
-- Membership model for RLS:
--   dr_is_principal(room, uid)     -> founder + investor ONLY (from R15A). Used
--                                     for the term tables and for APPROVING a
--                                     re-open (a mutual decision between parties).
--   dr_is_room_member(room, uid)   -> founder + investor + LAWYER (new here).
--                                     Used for summary/agreement reads: the
--                                     lawyer's whole purpose is to draft from the
--                                     summary and handle the agreement, so they
--                                     must see both — but NOT the negotiation
--                                     history (that's on R15A tables, still gated
--                                     by dr_is_principal; a lawyer gets 0 rows).
--
-- §40 / R15C NOTE (do not remove): dr_is_room_member INCLUDES the lawyer. Any
-- future R15C table carrying fee/payment/close data MUST NOT use this helper or
-- store files under the lawyer-readable <room_id>/… documents path — the lawyer
-- must never see R15C financial content. R15C tables should scope to
-- dr_is_principal (or a payment-party-only helper), never dr_is_room_member.

-- ── Membership helper incl. lawyer (SECURITY DEFINER, no self-reference) ──────
create or replace function dr_is_room_member(p_deal_room_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from deal_room_members dm
    where dm.deal_room_id = p_deal_room_id
      and dm.user_id = p_user_id
      and dm.role in ('founder', 'investor', 'lawyer')
  );
$$;

comment on function dr_is_room_member(uuid, uuid) is
  'R15B: founder + investor + lawyer member of the room. For summary/agreement '
  'reads only. NOT for R15A term tables (those stay dr_is_principal — lawyer '
  'blocked) and NOT for any R15C fee/payment table (§40).';

-- ── deal_room_summaries — generated summary of the locked term set ───────────
-- One 'active' summary per room; previous ones archived (never deleted) when
-- terms re-open + re-lock. content is STRUCTURED JSON, not a rendered blob —
-- the UI (and a future PDF export) render from it.
create table deal_room_summaries (
  id            uuid primary key default gen_random_uuid(),
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,
  status        text not null default 'active' check (status in ('active', 'archived')),
  instrument_type text not null,
  content       jsonb not null,        -- { instrument, terms[], parties, deal_room_ref, generated_at, disclaimer }
  disclaimer    text not null,
  -- Ties the summary to the exact lock it was generated from — if terms re-lock,
  -- a new summary carries the new locked_at; the old one is archived.
  terms_locked_at timestamptz,
  archived_reason text,                 -- set when archived (e.g. 'terms re-opened')
  generated_at  timestamptz not null default now(),
  archived_at   timestamptz
);
create index deal_room_summaries_room_idx on deal_room_summaries(deal_room_id, status);

-- ── deal_room_agreements — uploaded agreement files, version history ──────────
-- Each upload = a NEW row (version). Never overwritten, never deleted (append-
-- only: no client UPDATE/DELETE policy). Its OWN review metadata lives here, not
-- on the generic documents table (kept cleanly separate per the R15B clarification).
create table deal_room_agreements (
  id            uuid primary key default gen_random_uuid(),
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,
  version       integer not null,       -- 1,2,3… per room
  storage_path  text not null,          -- <room_id>/agreements/<ts>-<name> in the documents bucket
  file_name     text not null,
  file_size     bigint,
  uploaded_by   uuid not null,
  uploader_role text not null check (uploader_role in ('founder', 'investor', 'lawyer')),
  -- Per-party review of THIS version. Founder always reviews the content;
  -- the uploader confirms it's their final version. status is derived in the fn
  -- from these flags + any change request.
  status        text not null default 'pending'
                  check (status in ('pending', 'changes_requested', 'accepted', 'superseded')),
  accepted_by_founder  boolean not null default false,
  accepted_by_investor boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (deal_room_id, version)
);
create index deal_room_agreements_room_idx on deal_room_agreements(deal_room_id, version);

-- ── deal_room_agreement_comments — change-request comments (append-only) ─────
-- Written when a reviewer requests changes; visible to founder+investor+lawyer.
create table deal_room_agreement_comments (
  id            uuid primary key default gen_random_uuid(),
  agreement_id  uuid not null references deal_room_agreements(id) on delete cascade,
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,   -- denormalized for RLS
  author_user_id uuid not null,
  author_role   text not null check (author_role in ('founder', 'investor', 'lawyer')),
  comment       text not null,
  created_at    timestamptz not null default now()
);
create index deal_room_agreement_comments_agr_idx on deal_room_agreement_comments(agreement_id, created_at);

-- ── deal_room_term_reopen_requests — mutual-confirm re-open (R15A reset shape) ─
-- Either party OR the lawyer may REQUEST a re-open; a PRINCIPAL counterparty
-- (never the requester) must APPROVE. Same anti-self-approval mechanic as R15A's
-- reset request. On approval (in the server fn): unlock terms, archive summary,
-- cancel in-progress agreement review.
create table deal_room_term_reopen_requests (
  id            uuid primary key default gen_random_uuid(),
  deal_room_id  uuid not null references deal_rooms(id) on delete cascade,
  requested_by  uuid not null,
  requested_role text not null check (requested_role in ('founder', 'investor', 'lawyer')),
  reason        text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'consumed')),
  resolved_by   uuid,
  resolved_role text check (resolved_role in ('founder', 'investor')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index deal_room_term_reopen_requests_room_idx on deal_room_term_reopen_requests(deal_room_id, status);

-- ── updated_at maintenance for agreements ────────────────────────────────────
create trigger trg_agreements_touch before update on deal_room_agreements
  for each row execute function r15a_touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table deal_room_summaries             enable row level security;
alter table deal_room_agreements            enable row level security;
alter table deal_room_agreement_comments    enable row level security;
alter table deal_room_term_reopen_requests  enable row level security;

-- Summaries: founder+investor+lawyer READ. Writes are service-role only (the
-- generation fn) — no client insert/update/delete policy, so a client can never
-- fabricate or edit a summary.
create policy summaries_member_read on deal_room_summaries
  for select using (dr_is_room_member(deal_room_id, auth.uid()));

-- Agreements: founder+investor+lawyer READ (version history visible to all).
-- INSERT allowed for members (upload a version); a guard trigger forces safe
-- initial state (pending, both accept flags false) so a client can't insert a
-- pre-accepted version. NO client UPDATE/DELETE (append-only + fn-owned status).
create policy agreements_member_read on deal_room_agreements
  for select using (dr_is_room_member(deal_room_id, auth.uid()));
create policy agreements_member_insert on deal_room_agreements
  for insert with check (
    dr_is_room_member(deal_room_id, auth.uid())
    and uploaded_by = auth.uid()
  );

create or replace function r15b_guard_agreement_insert()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.status := 'pending';
    new.accepted_by_founder := false;
    new.accepted_by_investor := false;
  end if;
  return new;
end;
$$;
create trigger trg_guard_agreement_insert before insert on deal_room_agreements
  for each row execute function r15b_guard_agreement_insert();

-- Comments: members READ; author inserts their own (append-only, no update/delete).
create policy agreement_comments_read on deal_room_agreement_comments
  for select using (dr_is_room_member(deal_room_id, auth.uid()));
create policy agreement_comments_insert on deal_room_agreement_comments
  for insert with check (
    dr_is_room_member(deal_room_id, auth.uid())
    and author_user_id = auth.uid()
  );

-- Re-open requests: members READ (lawyer may request, so lawyer must see them);
-- requester inserts their own. Resolution is service-role (the fn enforces
-- approver is a principal ≠ requester).
create policy reopen_read on deal_room_term_reopen_requests
  for select using (dr_is_room_member(deal_room_id, auth.uid()));
create policy reopen_insert on deal_room_term_reopen_requests
  for insert with check (
    dr_is_room_member(deal_room_id, auth.uid())
    and requested_by = auth.uid()
  );

-- ── Realtime — counterparty/lawyer see summary + agreement changes live ──────
alter publication supabase_realtime add table deal_room_summaries;
alter publication supabase_realtime add table deal_room_agreements;
alter publication supabase_realtime add table deal_room_agreement_comments;
alter publication supabase_realtime add table deal_room_term_reopen_requests;
