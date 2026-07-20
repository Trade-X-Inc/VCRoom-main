-- R15A step 7 — close the unilateral-acceptance bypass on deal_room_terms.
--
-- Found in the step-7 security pass: deal_room_terms had a single `for all`
-- principal-scoped policy, so a principal could directly PATCH
--   status='locked', accepted_by_founder=true, accepted_by_investor=true
-- via raw REST, bypassing the mutual-acceptance logic that the server fns
-- enforce. Same class as R14B §38.3 (waived_legal_counsel) and §34: the fn
-- enforces the rule, but RLS let the client write the guarded columns directly.
--
-- Fix: clients may SELECT and INSERT (the latter only for custom terms, with
-- acceptance/lock state forced to the initial values by a trigger), but they may
-- NOT UPDATE deal_room_terms at all — every status/value/acceptance change flows
-- through the service-role server fns (proposeTerm/acceptTerm/rejectTerm), which
-- set only the caller's own acceptance flag. A raw client PATCH now returns 0
-- rows (no UPDATE policy => update denied under RLS).
--
-- deal_room_term_config gets the same treatment: locked_at/instrument state is
-- fn-owned. Clients read it; only INSERT (first config row) is allowed, and a
-- trigger forbids a client INSERT from pre-setting locked_at.

-- ── deal_room_terms: replace the ALL policy with SELECT + guarded INSERT ──────
drop policy if exists terms_principals on deal_room_terms;

create policy terms_select on deal_room_terms
  for select using (dr_is_principal(deal_room_id, auth.uid()));

-- INSERT allowed (custom terms), but a trigger forces safe initial state so a
-- client can't insert an already-accepted/locked row. No UPDATE/DELETE policy:
-- all mutation is service-role (server fns), which bypass RLS entirely.
create policy terms_insert on deal_room_terms
  for insert with check (dr_is_principal(deal_room_id, auth.uid()));

create or replace function r15a_guard_term_insert()
returns trigger language plpgsql as $$
begin
  -- Force a client INSERT to the neutral initial state regardless of what was
  -- sent. Service-role writes (the server fns) set auth.uid() to null and are
  -- exempt — they are the sanctioned path for acceptance/lock transitions.
  if auth.uid() is not null then
    new.status := 'unset';
    new.current_value := null;
    new.accepted_by_founder := false;
    new.accepted_by_investor := false;
    new.awaiting_role := null;
    new.is_custom := true;   -- a client can only add CUSTOM terms; templates are seeded server-side
  end if;
  return new;
end;
$$;

create trigger trg_guard_term_insert before insert on deal_room_terms
  for each row execute function r15a_guard_term_insert();

-- ── deal_room_term_config: read for principals, guarded INSERT, no client UPDATE ─
drop policy if exists term_config_principals on deal_room_term_config;

create policy term_config_select on deal_room_term_config
  for select using (dr_is_principal(deal_room_id, auth.uid()));

create policy term_config_insert on deal_room_term_config
  for insert with check (dr_is_principal(deal_room_id, auth.uid()));

create or replace function r15a_guard_config_insert()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    -- a client-created config row can never arrive pre-locked
    new.locked_at := null;
    new.locked_by := null;
  end if;
  return new;
end;
$$;

create trigger trg_guard_config_insert before insert on deal_room_term_config
  for each row execute function r15a_guard_config_insert();
