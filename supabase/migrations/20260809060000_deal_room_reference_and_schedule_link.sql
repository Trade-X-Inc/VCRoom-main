-- Deal-room-core step 2d: reference_no + schedule link, both room-creation
-- paths, as one unit.
--
-- PREREQUISITE DISCOVERED MID-STEP, BUILT HERE: pack_v1.next_reference()
-- requires an org_code as input and none existed anywhere in the schema
-- (confirmed: zero columns matching org_code on startups). Without it
-- reference_no cannot be minted at all, so the allocator is a hard
-- dependency of this step, not scope creep -- flagging explicitly since it
-- was not named in the instruction. Design was already reviewed this
-- session (base-36, 6 characters, dedicated singleton counter, distinct
-- from pack_v1.reference_counter which is keyed BY org_code and wrong-
-- shaped to allocate one): base-36 gives 36^6 = 2,176,782,336 codes,
-- avoiding the headroom-planning a 6-digit numeric-only scheme would need;
-- reference_counter's schema (org_code, typ, year, last_seq) is scoped BY
-- org_code, a chicken-and-egg mismatch if reused to mint the org_code
-- itself, which is exactly why this is a separate, simpler mechanism.
--
-- ALSO DISCOVERED MID-STEP: a schedule entity already exists --
-- pack_v1.schedule (id, sector, stage, version, status, published_at) --
-- one published row (technology/seed, v1, published 4 Aug 2026, from the
-- Phase 1 foundation work). The original step-0 audit's "no schedule
-- entity exists" finding was checked only against public schema tables and
-- missed this. startups.sector is free text ("B2B SaaS", "Robotics") with
-- no controlled-vocabulary mapping to pack_v1.schedule.sector yet -- that
-- mapping is explicitly NOT built here (checklist seeding, additional
-- sector packs, and DDWorkstation's hardcoded CATEGORIES all stay
-- untouched per instruction). This step only establishes the LINK COLUMN
-- and pins it at creation; deal_rooms.schedule_id may be null when no
-- schedule resolves, which is the honest state until the sector-mapping
-- work exists.
--
-- Reference minting MUST share the insert's transaction -- next_reference()
-- takes pg_advisory_xact_lock, so gaplessness only holds inside one
-- transaction. A raw PostgREST POST (connection-request-fn.ts's sbFetch
-- path) cannot be sequenced with a separate application-level mint call in
-- the same transaction -- there is no transaction boundary exposed to it.
-- A BEFORE INSERT trigger is the only mechanism that guarantees this for
-- BOTH creation paths (the service-role sbFetch POST in
-- connection-request-fn.ts AND the RLS-governed client insert in
-- app.deal-rooms.index.tsx) without requiring either call site to change
-- its transaction handling -- the trigger fires inside whatever
-- transaction the INSERT itself is already in, which is what makes "both
-- paths must migrate as a unit" actually hold: the mechanism is agnostic
-- to which path performed the insert.

-- ── 1. Org-code allocator ────────────────────────────────────────────────
create or replace function pack_v1.to_base36(p_n bigint)
returns text
language plpgsql
immutable
set search_path to 'pg_catalog', 'pg_temp'
as $$
declare
  v_digits text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  v_result text := '';
  v_n bigint := p_n;
begin
  if v_n = 0 then return '0'; end if;
  while v_n > 0 loop
    v_result := substr(v_digits, (v_n % 36)::int + 1, 1) || v_result;
    v_n := v_n / 36;
  end loop;
  return v_result;
end;
$$;

-- Singleton counter -- deliberately NOT keyed by anything. Org codes carry
-- no semantic content (no name derivation, which collides and leaks
-- company identity into a permanent public identifier per the reviewed
-- design), so allocation is a flat global sequence.
create table if not exists pack_v1.org_code_counter (
  id boolean primary key default true check (id),
  last_seq bigint not null default 0
);
insert into pack_v1.org_code_counter (id) values (true) on conflict do nothing;

create or replace function pack_v1.next_org_code()
returns text
language plpgsql
set search_path to 'pg_catalog', 'pg_temp', 'pack_v1'
as $$
declare
  v_seq bigint;
begin
  perform pg_advisory_xact_lock(hashtext('org_code_counter'));
  update pack_v1.org_code_counter set last_seq = last_seq + 1
    returning last_seq into v_seq;
  return upper(lpad(pack_v1.to_base36(v_seq), 6, '0'));
end;
$$;

-- ── 2. Columns ────────────────────────────────────────────────────────────
alter table public.startups add column if not exists org_code text;
alter table public.startups add constraint startups_org_code_unique unique (org_code);

alter table public.deal_rooms add column if not exists reference_no text;
alter table public.deal_rooms add constraint deal_rooms_reference_no_unique unique (reference_no);

alter table public.deal_rooms add column if not exists schedule_id uuid references pack_v1.schedule(id);

comment on column public.deal_rooms.schedule_id is
  'The schedule governing this room''s diligence checklist and disclosure requirements, PINNED AT CREATION -- never derived live from startups.sector. A founder editing their sector mid-deal must not change the schedule governing an open negotiation, same principle as pack.schedule_version pinning (CLAUDE.md §8.3). May be null when no schedule resolves for the startup''s sector/stage at creation time -- honest state, not a bug, until sector-to-schedule mapping is built (out of scope for this step).';

-- ── 3. Atomic mint trigger — fires inside the insert's own transaction ────
create or replace function pack_api.deal_rooms_mint_reference()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'pg_temp'
as $$
declare
  v_org_code text;
  v_year int := extract(year from now())::int;
begin
  -- Allocate the startup's org_code once, on its first room. Same
  -- transaction as this INSERT, so a concurrent second room for a
  -- startup with no code yet cannot allocate two different codes --
  -- the UPDATE below serializes on the row lock.
  select org_code into v_org_code from public.startups where id = new.startup_id for update;

  if v_org_code is null then
    v_org_code := pack_v1.next_org_code();
    update public.startups set org_code = v_org_code where id = new.startup_id;
  end if;

  new.reference_no := pack_v1.next_reference(v_org_code, 'ROM', v_year);

  -- Pin the schedule at creation. Only one published schedule exists today
  -- (technology/seed, v1) -- resolve it directly rather than build a
  -- sector-mapping layer this step explicitly excludes. Null is the
  -- correct outcome when no schedule is published, not an error.
  if new.schedule_id is null then
    select id into new.schedule_id
    from pack_v1.schedule
    where status = 'published'
    order by published_at desc
    limit 1;
  end if;

  return new;
end;
$$;

create trigger trg_deal_rooms_mint_reference
  before insert on public.deal_rooms
  for each row
  execute function pack_api.deal_rooms_mint_reference();

-- ── 4. Backfill existing rows ─────────────────────────────────────────────
-- Deterministic order (created_at) per §9.2's gapless-sequence requirement
-- -- an observed gap is a records incident, so backfill order matters even
-- though these are pre-existing rows, not new allocations racing each
-- other.
do $$
declare
  r record;
  v_org_code text;
begin
  for r in
    select s.id as startup_id
    from public.startups s
    where s.org_code is null
      and exists (select 1 from public.deal_rooms dr where dr.startup_id = s.id)
    order by s.created_at
  loop
    v_org_code := pack_v1.next_org_code();
    update public.startups set org_code = v_org_code where id = r.startup_id;
  end loop;

  for r in
    select dr.id as room_id, dr.startup_id
    from public.deal_rooms dr
    where dr.reference_no is null
    order by dr.created_at
  loop
    select org_code into v_org_code from public.startups where id = r.startup_id;
    update public.deal_rooms
    set reference_no = pack_v1.next_reference(v_org_code, 'ROM', extract(year from now())::int),
        schedule_id = coalesce(schedule_id, (select id from pack_v1.schedule where status = 'published' order by published_at desc limit 1))
    where id = r.room_id;
  end loop;
end;
$$;
