-- R13 step 8 security fix — verified live (Node script against a real
-- anonymous Supabase Realtime WebSocket subscription, not assumed) that
-- roast_sessions.payment_status leaks to ANY unauthenticated visitor of a
-- public roast session via the raw postgres_changes payload. Postgres RLS
-- and Supabase Realtime have no column-level redaction on
-- postgres_changes — a table's realtime channel exposes every column of
-- every row visible under its SELECT policy, regardless of what the
-- subscribing client's JS callback reads. roast_sessions_public_read
-- (qual: is_public = true OR founder_id = auth.uid()) makes the whole row
-- readable once a session is public, so payment_status rode along even
-- though getRoastPublicState (the server function) was separately fixed
-- to strip it from its own response in the same branch.
--
-- Fix: move payment_status off roast_sessions entirely, into a new table
-- that is NOT added to supabase_realtime and whose RLS never grants
-- public/anonymous read — only the owning founder (and, later, an admin
-- review surface) can read it. roast_sessions itself no longer carries
-- this column, so there is nothing left to leak on its already-public
-- realtime channel.

create table roast_session_payments (
  session_id uuid primary key references roast_sessions(id) on delete cascade,
  payment_status text not null default 'pending_payment'
    check (payment_status in ('not_required', 'pending_payment', 'paid', 'waived')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

insert into roast_session_payments (session_id, payment_status)
select id, payment_status from roast_sessions;

alter table roast_sessions drop column payment_status;

alter table roast_session_payments enable row level security;

-- Founder-only. No public/anonymous policy exists at all — the whole
-- point of splitting this table out.
create policy "roast_session_payments_founder_read"
  on roast_session_payments for select
  using (
    exists (
      select 1 from roast_sessions rs
      where rs.id = roast_session_payments.session_id
        and rs.founder_id = auth.uid()
    )
  );
