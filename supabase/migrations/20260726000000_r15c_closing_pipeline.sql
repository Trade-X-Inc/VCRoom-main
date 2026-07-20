-- R15C — Gates 4–7 of the closing pipeline (fee → download → signing → payment
-- → mutual close → invoice → archival). The revenue event.
--
-- HARD RULES enforced here:
--  1. Every R15C table is scoped to dr_is_principal (founder+investor) ONLY —
--     never dr_is_room_member (which includes the lawyer, R15B). The lawyer sees
--     0 rows on every R15C table (fees, signed agreements, payment proof, close,
--     invoices) — verified in step 7. §40 lesson: do not repeat the member-scoped
--     accidental-lawyer-read pattern.
--  2. Sensitive fee/payment columns are fn-owned: no client UPDATE/DELETE on the
--     status/confirmation columns; transitions go through service-role fns that
--     enforce mutual confirmation (§33/§38.3 pattern).
--  3. Room-wide READ-ONLY at the DB level once deal_rooms.status='closed', via a
--     single dr_is_open(room) helper AND-ed into every room-content write policy.
--  4. deal_rooms close is one-way: a column-guard trigger blocks unilateral close
--     AND any re-open (closed stays closed — no reopen path in R15C).

-- ─────────────────────────────────────────────────────────────────────────────
-- PART A — dr_is_open(): room is open (status <> 'closed'). Read-only lever.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function dr_is_open(p_deal_room_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select status is distinct from 'closed' from deal_rooms where id = p_deal_room_id), false);
$$;
comment on function dr_is_open(uuid) is
  'R15C: true iff the deal room is not closed. AND-ed into every room-content '
  'write policy so a closed room rejects direct client writes at the DB level '
  '(not just hidden buttons). Service-role fns bypass RLS, so those fns ALSO '
  'check status=closed themselves.';

-- ─────────────────────────────────────────────────────────────────────────────
-- PART B — R15C tables (all dr_is_principal, no lawyer)
-- ─────────────────────────────────────────────────────────────────────────────

-- Gate 4: fee determination + who-pays + payment placeholder.
create table deal_room_fees (
  deal_room_id       uuid primary key references deal_rooms(id) on delete cascade,
  deal_amount        numeric not null,           -- founder-confirmed closed amount
  instrument_type    text,                         -- from R15A config (safe/equity/debt/company_sale)
  instrument_details jsonb,                         -- snapshot of the figures used
  calculated_fee     numeric not null,             -- from lib/fee-schedule.ts (1.5%, $500–$15,000)
  fee_payer          text not null check (fee_payer in ('founder', 'investor')),
  -- payment_status: pending -> beta_bypass (Stripe not live) | paid (future) | waived.
  -- TODO(stripe): when Stripe goes live, 'beta_bypass' becomes 'paid' via a real charge.
  payment_status     text not null default 'pending'
                       check (payment_status in ('pending', 'beta_bypass', 'paid', 'waived')),
  confirmed_by       uuid,                          -- who confirmed the (placeholder) payment
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Gate 5: per-party signed copies. One row per room; each party fills their side.
create table deal_room_signed_agreements (
  deal_room_id            uuid primary key references deal_rooms(id) on delete cascade,
  founder_storage_path    text,
  founder_file_name       text,
  founder_uploaded_at     timestamptz,
  investor_storage_path   text,
  investor_file_name      text,
  investor_uploaded_at    timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Gate 6: investor payment proof + founder confirm/discrepancy. Version history:
-- each proof upload = new row (append-only, revised proofs kept). founder_status
-- on the latest row drives the gate.
create table deal_room_payment_proof (
  id                 uuid primary key default gen_random_uuid(),
  deal_room_id       uuid not null references deal_rooms(id) on delete cascade,
  version            integer not null,
  storage_path       text not null,
  file_name          text not null,
  uploaded_by        uuid not null,               -- investor
  founder_status     text not null default 'pending'
                       check (founder_status in ('pending', 'confirmed', 'discrepancy')),
  discrepancy_comment text,
  created_at         timestamptz not null default now(),
  unique (deal_room_id, version)
);
create index deal_room_payment_proof_room_idx on deal_room_payment_proof(deal_room_id, version);

-- Gate 7: mutual close confirmations. One row per room.
create table deal_room_close (
  deal_room_id        uuid primary key references deal_rooms(id) on delete cascade,
  investor_confirmed  boolean not null default false,   -- confirmed receipt of deliverable
  founder_confirmed   boolean not null default false,   -- confirmed delivery
  investor_confirmed_at timestamptz,
  founder_confirmed_at  timestamptz,
  closed_at           timestamptz,                        -- set when both confirmed
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Gate 7: auto-generated invoices (one per party). content = structured JSON the
-- UI renders as an HTML invoice (no PDF lib in the stack; HTML is beta-acceptable).
create table deal_room_invoices (
  id             uuid primary key default gen_random_uuid(),
  deal_room_id   uuid not null references deal_rooms(id) on delete cascade,
  invoice_number text not null unique,
  bill_to_role   text not null check (bill_to_role in ('founder', 'investor')),
  content        jsonb not null,                  -- {parties, deal_ref, deal_amount, fee, fee_payer, dates, …}
  generated_at   timestamptz not null default now()
);
create index deal_room_invoices_room_idx on deal_room_invoices(deal_room_id);

-- updated_at maintenance (reuse R15A's touch fn)
create trigger trg_fees_touch before update on deal_room_fees
  for each row execute function r15a_touch_updated_at();
create trigger trg_signed_touch before update on deal_room_signed_agreements
  for each row execute function r15a_touch_updated_at();
create trigger trg_close_touch before update on deal_room_close
  for each row execute function r15a_touch_updated_at();

-- ── RLS — dr_is_principal ONLY (lawyer excluded) ─────────────────────────────
alter table deal_room_fees              enable row level security;
alter table deal_room_signed_agreements enable row level security;
alter table deal_room_payment_proof     enable row level security;
alter table deal_room_close             enable row level security;
alter table deal_room_invoices          enable row level security;

-- Fees: principals read; the fee row is created + all status transitions are
-- service-role only (the Gate-4 fn) — no client insert/update/delete policy, so
-- a client cannot fabricate a fee, change the amount/payer, or self-confirm.
create policy fees_principal_read on deal_room_fees
  for select using (dr_is_principal(deal_room_id, auth.uid()));

-- Signed agreements: principals read; each party's own upload path is written by
-- a service-role fn (which enforces founder writes founder_*, investor writes
-- investor_*). No client write policy.
create policy signed_principal_read on deal_room_signed_agreements
  for select using (dr_is_principal(deal_room_id, auth.uid()));

-- Payment proof: principals read; investor INSERTs a version (guarded: gated on
-- room open + own uploaded_by). founder_status/discrepancy are fn-owned (no
-- client update). Append-only (no delete policy).
create policy payment_proof_read on deal_room_payment_proof
  for select using (dr_is_principal(deal_room_id, auth.uid()));
create policy payment_proof_insert on deal_room_payment_proof
  for insert with check (
    dr_is_principal(deal_room_id, auth.uid())
    and uploaded_by = auth.uid()
    and dr_is_open(deal_room_id)
  );

-- Close: principals read; all confirmations + closed_at are service-role only
-- (the mutual-close fn enforces both parties). No client write policy.
create policy close_principal_read on deal_room_close
  for select using (dr_is_principal(deal_room_id, auth.uid()));

-- Invoices: principals read; generated service-role only. A founder sees the
-- founder invoice, investor sees theirs — but both are principals so both may
-- read the row; content is not lawyer-visible (dr_is_principal). No client write.
create policy invoices_principal_read on deal_room_invoices
  for select using (dr_is_principal(deal_room_id, auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- PART C — Room-wide READ-ONLY: AND dr_is_open() into every content-write policy.
-- Each policy is dropped + recreated preserving its EXACT existing logic plus the
-- open-room check. Chosen approach: ONE shared dr_is_open() helper (centralized
-- logic), applied per-policy (Postgres has no "amend policy"). Tables covered are
-- the content surfaces the spec names (terms, agreement/summary, DD/docs, Q&A,
-- notes, messages, meetings, stage). NOT covered (must work post-close):
-- deal_room_members (exit), lawyer invites/requests, team assignments, deal_rooms
-- (its own close-guard trigger governs it).
-- ─────────────────────────────────────────────────────────────────────────────

-- Term negotiation (dr_is_principal-based, R15A)
drop policy terms_insert on deal_room_terms;
create policy terms_insert on deal_room_terms for insert
  with check (dr_is_principal(deal_room_id, auth.uid()) and dr_is_open(deal_room_id));

drop policy term_proposals_insert on deal_room_term_proposals;
create policy term_proposals_insert on deal_room_term_proposals for insert
  with check (dr_is_principal(deal_room_id, auth.uid()) and actor_user_id = auth.uid() and dr_is_open(deal_room_id));

drop policy term_config_insert on deal_room_term_config;
create policy term_config_insert on deal_room_term_config for insert
  with check (dr_is_principal(deal_room_id, auth.uid()) and dr_is_open(deal_room_id));

drop policy term_reset_insert on deal_room_term_reset_requests;
create policy term_reset_insert on deal_room_term_reset_requests for insert
  with check (dr_is_principal(deal_room_id, auth.uid()) and requested_by = auth.uid() and dr_is_open(deal_room_id));

drop policy reopen_insert on deal_room_term_reopen_requests;
create policy reopen_insert on deal_room_term_reopen_requests for insert
  with check (dr_is_room_member(deal_room_id, auth.uid()) and requested_by = auth.uid() and dr_is_open(deal_room_id));

-- Agreement / comments (dr_is_room_member-based, R15B)
drop policy agreements_member_insert on deal_room_agreements;
create policy agreements_member_insert on deal_room_agreements for insert
  with check (dr_is_room_member(deal_room_id, auth.uid()) and uploaded_by = auth.uid() and dr_is_open(deal_room_id));

drop policy agreement_comments_insert on deal_room_agreement_comments;
create policy agreement_comments_insert on deal_room_agreement_comments for insert
  with check (dr_is_room_member(deal_room_id, auth.uid()) and author_user_id = auth.uid() and dr_is_open(deal_room_id));

-- Q&A (member ALL → split: reads stay, writes gated). Recreate the ALL as SELECT +
-- gated write commands.
drop policy qa_deal_room_members on deal_room_qa;
create policy qa_members_read on deal_room_qa for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));
create policy qa_members_write on deal_room_qa for insert
  with check (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));
create policy qa_members_update on deal_room_qa for update
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));
create policy qa_members_delete on deal_room_qa for delete
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));

-- Notes (own ALL → keep reads, gate writes)
drop policy deal_room_notes_own on deal_room_notes;
create policy deal_room_notes_own_read on deal_room_notes for select using (user_id = auth.uid());
create policy deal_room_notes_own_write on deal_room_notes for insert
  with check (user_id = auth.uid() and dr_is_open(deal_room_id));
create policy deal_room_notes_own_update on deal_room_notes for update
  using (user_id = auth.uid() and dr_is_open(deal_room_id));
create policy deal_room_notes_own_delete on deal_room_notes for delete
  using (user_id = auth.uid() and dr_is_open(deal_room_id));

-- Messages (member ALL → keep reads, gate writes)
drop policy deal_room_message_access on deal_room_messages;
create policy deal_room_message_read on deal_room_messages for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));
create policy deal_room_message_write on deal_room_messages for insert
  with check (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));

-- Meetings (insert/update/delete gated; select unchanged, keeps the lawyer scope)
drop policy deal_room_meetings_insert on deal_room_meetings;
create policy deal_room_meetings_insert on deal_room_meetings for insert
  with check (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));
drop policy deal_room_meetings_update on deal_room_meetings;
create policy deal_room_meetings_update on deal_room_meetings for update
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id))
  with check (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));
drop policy deal_room_meetings_delete on deal_room_meetings;
create policy deal_room_meetings_delete on deal_room_meetings for delete
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));

-- Stage transition requests (member ALL → gate writes)
drop policy deal_room_stage_request_access on deal_room_stage_requests;
create policy deal_room_stage_request_read on deal_room_stage_requests for select
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()));
create policy deal_room_stage_request_write on deal_room_stage_requests for insert
  with check (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));
create policy deal_room_stage_request_update on deal_room_stage_requests for update
  using (deal_room_id in (select deal_room_id from deal_room_members where user_id = auth.uid()) and dr_is_open(deal_room_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- PART D — deal_rooms close/reopen guard: one-way close, no unilateral, no reopen
-- ─────────────────────────────────────────────────────────────────────────────
-- The status column is changed to 'closed' ONLY by finalize_deal_close() (marked
-- by a txn-local GUC). A BEFORE UPDATE trigger blocks any direct client change to
-- status: it cannot be set to 'closed' outside the fn (blocks unilateral close via
-- the broad founder ALL policy), and once 'closed' it cannot be changed back to
-- anything (blocks silent re-open — closed stays closed). Mirrors R14B's
-- finalize_counsel_waiver column-guard (§38.3).
-- status may only become 'closed' when the close GUC matches this room, and
-- 'closed' is terminal.
create or replace function enforce_deal_room_close_guard()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'closed' then
      raise exception 'deal room is closed; status is immutable (no re-open)';
    end if;
    if new.status = 'closed'
       and coalesce(current_setting('app.deal_close_ctx', true), '') <> old.id::text then
      raise exception 'deal room can only be closed via finalize_deal_close()';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_deal_room_close_guard before update on deal_rooms
  for each row execute function enforce_deal_room_close_guard();

comment on function enforce_deal_room_close_guard() is
  'R15C: status->closed only inside finalize_deal_close() (GUC app.deal_close_ctx = '
  'room id), and closed is terminal (no re-open). Blocks unilateral close via the '
  'broad deal_rooms founder ALL policy and any silent re-open.';
