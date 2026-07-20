-- R15A step 7 — instrument mutual-reset must require BOTH parties.
--
-- Found in the step-7 security pass: selectInstrument's reset path was gated
-- only by a client-supplied confirmReset flag, so a SINGLE party could delete
-- every negotiated term unilaterally. This is the exact C4 anti-pattern from
-- R14B §38.3 (waived_legal_counsel): a mutual action gated by a client flag
-- instead of proof both sides agreed.
--
-- Fix: a reset requires an APPROVED request whose approver != requester. One
-- party opens a reset request (proposing the new instrument); the counterparty
-- approves; only then may the terms be wiped and re-seeded. Same shape as
-- deal_room_lawyer_requests / finalize_counsel_waiver.

create table deal_room_term_reset_requests (
  id                uuid primary key default gen_random_uuid(),
  deal_room_id      uuid not null references deal_rooms(id) on delete cascade,
  requested_by      uuid not null,
  requested_role    text not null check (requested_role in ('founder', 'investor')),
  target_instrument text not null check (target_instrument in ('safe', 'equity', 'debt', 'company_sale')),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'consumed')),
  resolved_by       uuid,
  resolved_role     text check (resolved_role in ('founder', 'investor')),
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

create index deal_room_term_reset_requests_room_idx
  on deal_room_term_reset_requests(deal_room_id, status);

alter table deal_room_term_reset_requests enable row level security;

-- Principals of the room read reset requests; a requester creates their own.
-- Resolution (approve/reject) is done by the server fn, but the policy also
-- enforces requester = self on insert and principal-scope on all reads.
create policy term_reset_read on deal_room_term_reset_requests
  for select using (dr_is_principal(deal_room_id, auth.uid()));

create policy term_reset_insert on deal_room_term_reset_requests
  for insert with check (
    dr_is_principal(deal_room_id, auth.uid())
    and requested_by = auth.uid()
  );

-- Realtime: the counterparty must see a pending reset request appear live.
alter publication supabase_realtime add table deal_room_term_reset_requests;

comment on table deal_room_term_reset_requests is
  'R15A: mutual-confirmation gate for instrument reset. A reset wipes all terms, '
  'so it requires an approved request whose approver != requester (both sides '
  'agreed). Mirrors deal_room_lawyer_requests / finalize_counsel_waiver (§38.3).';
