-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 Foundation — sub-milestone A (steps 1-4 of the approved build order)
--
-- Built inside the isolated `pack_v1` schema, NOT `public`. The chain and
-- reference-numbering logic here is first-implementation / unproven; keeping it
-- namespaced means a design mistake is discardable with a single
--   DROP SCHEMA pack_v1 CASCADE;
-- with zero orphaned rows in public. Promotion to public happens only at
-- cutover, post-review (Supabase branching unavailable — project not on Pro;
-- this schema-isolation is the approved substitute. See session log.)
--
-- Additive-only. Touches nothing in public. No existing row read or written.
--
-- Covers:
--   1. schedule + schedule_field + schedule_field_label  (+ Technology/seed seed)
--   2. pack + pack_field + pack_field_evidence            (+ money CHECK constraint)
--   3. record (hash-chained, append-only, per-org global chain)
--   4. reference numbering ({ORG}-{TYP}-{YYYY}-{SEQ}-{CD}, ISO 7064 MOD 97-10)
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists pack_v1;

-- ── enums ──────────────────────────────────────────────────────────────────
create type pack_v1.value_type       as enum ('text','number','money','date','enum','structured');
create type pack_v1.evidence_tier    as enum ('preferred','alternative','minimum','none');
create type pack_v1.visibility_tier  as enum ('brief','presented','room','closing');
create type pack_v1.release_class    as enum ('view_only','release_on_request','open_release');
create type pack_v1.schedule_status  as enum ('draft','published','superseded');
create type pack_v1.pack_status      as enum ('draft','active','archived');
create type pack_v1.actor_type       as enum ('human','agent','system');

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1 — SCHEDULE (the "schedule is data, not code" layer; Foundation §6/§10.2/§17)
-- ═══════════════════════════════════════════════════════════════════════════

create table pack_v1.schedule (
  id            uuid primary key default gen_random_uuid(),
  sector        text        not null,
  stage         text        not null,
  version       integer     not null default 1,
  status        pack_v1.schedule_status not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (sector, stage, version)
);

-- schedule_field.id IS the schedule_field_id: a stable, language-independent,
-- translatable text key (Foundation §6/§17). NOT a uuid — the id itself is the
-- cross-language identifier that pack_field and schedule_field_label key on.
create table pack_v1.schedule_field (
  id                        text        primary key,   -- e.g. 'tech.seed.problem_statement'
  schedule_id               uuid        not null references pack_v1.schedule(id) on delete cascade,
  value_type                pack_v1.value_type not null,
  evidence_ladder           jsonb       not null default '{}'::jsonb,  -- {preferred:[...],alternative:[...],minimum:[...]} per §6.2
  is_required               boolean     not null default false,
  sort_order                integer     not null default 0,
  section_key               text        not null,
  default_visibility_tier   pack_v1.visibility_tier not null default 'room',
  default_release_class     pack_v1.release_class    not null default 'view_only',
  created_at                timestamptz not null default now()
);
create index schedule_field_schedule_idx on pack_v1.schedule_field(schedule_id);

-- §17 structural-translation layer: labels are separate rows keyed on the stable
-- field id, one per locale. The id never translates; the label does.
create table pack_v1.schedule_field_label (
  schedule_field_id text   not null references pack_v1.schedule_field(id) on delete cascade,
  locale            text   not null,
  label             text   not null,
  help_text         text,
  primary key (schedule_field_id, locale)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2 — PACK (Foundation §5/§6 field anatomy)
-- ═══════════════════════════════════════════════════════════════════════════

create table pack_v1.pack (
  id                uuid    primary key default gen_random_uuid(),
  org_id            uuid    not null,        -- FK to public.organizations added only at cutover
  subject_ref       uuid    not null,        -- the raising entity (startup) — soft ref until cutover
  schedule_id       uuid    not null references pack_v1.schedule(id),
  schedule_version  integer not null,        -- pinned at creation; schedule can evolve without mutating live packs
  status            pack_v1.pack_status not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index pack_org_idx on pack_v1.pack(org_id);

create table pack_v1.pack_field (
  id                uuid    primary key default gen_random_uuid(),
  pack_id           uuid    not null references pack_v1.pack(id) on delete cascade,
  schedule_field_id text    not null references pack_v1.schedule_field(id),
  value_type        pack_v1.value_type not null,     -- denormalized from schedule_field for the CHECK below
  value_json        jsonb,                            -- polymorphic; type validated at action layer + schedule
  currency          text,                             -- monetary fields only
  as_of_date        date,                             -- monetary fields only
  locale            text    not null default 'en',
  evidence_tier     pack_v1.evidence_tier not null default 'none',
  visibility_tier   pack_v1.visibility_tier not null,
  release_class     pack_v1.release_class    not null,
  warranted_by      uuid,                             -- users.id — the human warranty act (§6)
  warranted_at      timestamptz,
  updated_at        timestamptz not null default now(),
  unique (pack_id, schedule_field_id),
  -- MANDATED belt-and-suspenders CHECK (in addition to action-layer validation):
  -- a monetary field must carry a currency. DB-enforced, not just code-enforced.
  constraint money_requires_currency
    check (value_type <> 'money' or currency is not null)
);
create index pack_field_pack_idx on pack_v1.pack_field(pack_id);

-- evidence[] normalized: one row per attached artifact per field (§6 evidence[])
create table pack_v1.pack_field_evidence (
  id             uuid primary key default gen_random_uuid(),
  pack_field_id  uuid not null references pack_v1.pack_field(id) on delete cascade,
  document_id    uuid not null,                        -- FK to pack_v1.documents added in milestone B
  tier_satisfied pack_v1.evidence_tier not null,
  attached_by    uuid not null,
  attached_at    timestamptz not null default now()
);
create index pack_field_evidence_field_idx on pack_v1.pack_field_evidence(pack_field_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3 — HASH-CHAINED RECORD (Foundation §9.4/§8.3)
--
-- One global append-only chain per organisation. Each entry carries the
-- immediately-preceding entry's hash for that org. seq is a gapless per-org
-- total order (detects insertion/reordering even within one millisecond).
--   entry_hash = sha256( prev_hash || canonical_json(payload) )
-- Genesis prev_hash = 64 zeros. Canonical json = sorted keys, compact.
-- ═══════════════════════════════════════════════════════════════════════════

create table pack_v1.record_entry (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null,
  seq          bigint      not null,                 -- gapless per org
  prev_hash    text        not null,                 -- 64-hex; genesis = 64 zeros
  entry_hash   text        not null,                 -- sha256 hex
  actor_id     uuid,                                 -- null only for actor_type='system'
  actor_type   pack_v1.actor_type not null,
  action       text        not null,                 -- the action name (matches ActionDef.name)
  object_type  text        not null,
  object_id    uuid,
  data         jsonb       not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  unique (org_id, seq),
  unique (org_id, entry_hash)
);
create index record_entry_org_seq_idx on pack_v1.record_entry(org_id, seq desc);
create index record_entry_object_idx  on pack_v1.record_entry(object_type, object_id);

-- Canonical JSON for hashing: recursively sort object keys, compact separators.
-- Deterministic so an export can be re-hashed and verified byte-for-byte.
create or replace function pack_v1.canonical_json(j jsonb)
returns text
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select case jsonb_typeof(j)
    when 'object' then '{' || coalesce(string_agg(
        to_json(k.key)::text || ':' || pack_v1.canonical_json(j -> k.key),
        ',' order by k.key), '') || '}'
    when 'array' then '[' || coalesce((
        select string_agg(pack_v1.canonical_json(e.val), ',' order by e.ord)
        from jsonb_array_elements(j) with ordinality as e(val, ord)), '') || ']'
    else j::text
  end
  from (select jsonb_object_keys(j) as key where jsonb_typeof(j) = 'object') k;
$$;

-- The append function: computes seq and prev_hash under a per-org advisory lock
-- so concurrent appends can't fork the chain, then chains the hash. This is the
-- ONLY supported way to write to record_entry (the trigger below blocks direct
-- mutation paths that skip it — update/delete — but insert still goes through here).
create or replace function pack_v1.append_record(
  p_org_id      uuid,
  p_actor_id    uuid,
  p_actor_type  pack_v1.actor_type,
  p_action      text,
  p_object_type text,
  p_object_id   uuid,
  p_data        jsonb
) returns pack_v1.record_entry
language plpgsql
set search_path = pg_catalog, pg_temp, pack_v1
as $$
declare
  v_seq       bigint;
  v_prev_hash text;
  v_payload   jsonb;
  v_entry     pack_v1.record_entry;
  v_genesis   constant text := repeat('0', 64);
begin
  -- serialize appends per org so seq + prev_hash are consistent
  perform pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  select coalesce(max(seq), 0) + 1,
         coalesce((select entry_hash from pack_v1.record_entry
                   where org_id = p_org_id order by seq desc limit 1), v_genesis)
    into v_seq, v_prev_hash
    from pack_v1.record_entry where org_id = p_org_id;

  v_payload := jsonb_build_object(
    'seq', v_seq, 'org_id', p_org_id, 'actor_id', p_actor_id,
    'actor_type', p_actor_type, 'action', p_action,
    'object_type', p_object_type, 'object_id', p_object_id,
    'occurred_at', now(), 'data', p_data
  );

  insert into pack_v1.record_entry
    (org_id, seq, prev_hash, entry_hash, actor_id, actor_type, action, object_type, object_id, data)
  values (
    p_org_id, v_seq, v_prev_hash,
    encode(digest(v_prev_hash || pack_v1.canonical_json(v_payload), 'sha256'), 'hex'),
    p_actor_id, p_actor_type, p_action, p_object_type, p_object_id, p_data
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

-- Append-only enforcement at the DB level (belt-and-suspenders, same philosophy
-- as the money CHECK): reject every UPDATE and DELETE on record_entry, for
-- everyone including the service role. The record is immutable once written.
create or replace function pack_v1.record_entry_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  raise exception 'record_entry is append-only: % rejected', tg_op;
end;
$$;

create trigger record_entry_no_update
  before update on pack_v1.record_entry
  for each row execute function pack_v1.record_entry_immutable();

create trigger record_entry_no_delete
  before delete on pack_v1.record_entry
  for each row execute function pack_v1.record_entry_immutable();

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4 — REFERENCE NUMBERING ({ORG}-{TYP}-{YYYY}-{SEQ}-{CD}; Foundation §9.1)
--   ORG: permanent 6-char org code   TYP: RSE/ROM/NDA/REQ/TRM/CPR/REL/CLS
--   SEQ: 6-digit gapless per (org,type,year)   CD: ISO 7064 MOD 97-10 check digit
-- ═══════════════════════════════════════════════════════════════════════════

-- Gapless per-(org,type,year) counter. A row per bucket; incremented under the
-- same advisory-lock discipline as the chain. Foundation §9.2: an observed gap
-- is a records incident, never silently corrected — so this must be gapless by
-- construction (a real sequence would gap on rollback; a counter row does not).
create table pack_v1.reference_counter (
  org_code  text    not null,
  typ       text    not null,
  year      integer not null,
  last_seq  integer not null default 0,
  primary key (org_code, typ, year)
);

-- ISO 7064 MOD 97-10 check digit over the numeric string of the reference body.
-- Letters map to digits (A=10..Z=35), matching the IBAN-family algorithm §9.1 cites.
create or replace function pack_v1.mod97_check_digits(p_input text)
returns text
language plpgsql immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  v_expanded text := '';
  v_ch       text;
  v_code     int;
  v_rem      int := 0;
  i          int;
  v_check    int;
begin
  -- append '00', expand alnum to digits, take mod 97, check = 98 - rem
  for i in 1 .. length(p_input || '00') loop
    v_ch := substr(p_input || '00', i, 1);
    if v_ch ~ '[0-9]' then
      v_expanded := v_expanded || v_ch;
    else
      v_code := ascii(upper(v_ch)) - 55;   -- A=10 .. Z=35
      v_expanded := v_expanded || v_code::text;
    end if;
  end loop;
  -- piecewise mod to avoid bigint overflow on long strings
  for i in 1 .. length(v_expanded) loop
    v_rem := (v_rem * 10 + (substr(v_expanded, i, 1))::int) % 97;
  end loop;
  v_check := 98 - v_rem;
  return lpad(v_check::text, 2, '0');
end;
$$;

-- Mint the next gapless reference for (org, type). Advisory-locked per bucket.
create or replace function pack_v1.next_reference(
  p_org_code text,
  p_typ      text,
  p_year     integer default extract(year from now())::int
) returns text
language plpgsql
set search_path = pg_catalog, pg_temp, pack_v1
as $$
declare
  v_seq   integer;
  v_body  text;
  v_cd    text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org_code || p_typ || p_year::text, 0));

  insert into pack_v1.reference_counter (org_code, typ, year, last_seq)
    values (p_org_code, p_typ, p_year, 1)
  on conflict (org_code, typ, year)
    do update set last_seq = pack_v1.reference_counter.last_seq + 1
  returning last_seq into v_seq;

  v_body := p_org_code || '-' || p_typ || '-' || p_year::text || '-' || lpad(v_seq::text, 6, '0');
  v_cd   := pack_v1.mod97_check_digits(replace(v_body, '-', ''));
  return v_body || '-' || v_cd;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED — ONE real schedule: Technology, seed stage.
-- Fields derived from document_templates' seed-relevant rows (reference, not
-- extension), re-expressed in §6 field-anatomy terms with evidence ladders.
-- ═══════════════════════════════════════════════════════════════════════════

insert into pack_v1.schedule (id, sector, stage, version, status, published_at)
values ('11111111-1111-1111-1111-111111111111', 'technology', 'seed', 1, 'published', now());

insert into pack_v1.schedule_field
  (id, schedule_id, value_type, evidence_ladder, is_required, sort_order, section_key, default_visibility_tier, default_release_class)
values
  ('tech.seed.problem_statement','11111111-1111-1111-1111-111111111111','text',
    '{"preferred":["customer interviews"],"alternative":["market report"],"minimum":["founder narrative"]}','t',1,'market','brief','open_release'),
  ('tech.seed.solution','11111111-1111-1111-1111-111111111111','text',
    '{"preferred":["working product"],"alternative":["prototype"],"minimum":["spec"]}','t',2,'market','presented','open_release'),
  ('tech.seed.market_size_tam','11111111-1111-1111-1111-111111111111','money',
    '{"preferred":["third-party market report"],"alternative":["bottom-up model"],"minimum":["top-down estimate"]}','t',3,'market','presented','view_only'),
  ('tech.seed.business_model','11111111-1111-1111-1111-111111111111','text',
    '{"preferred":["signed contracts"],"alternative":["pricing page + pipeline"],"minimum":["stated model"]}','t',4,'financials','presented','view_only'),
  ('tech.seed.mrr','11111111-1111-1111-1111-111111111111','money',
    '{"preferred":["processor export"],"alternative":["bank statements"],"minimum":["management accounts"]}','t',5,'financials','room','release_on_request'),
  ('tech.seed.traction','11111111-1111-1111-1111-111111111111','text',
    '{"preferred":["analytics export"],"alternative":["dashboard screenshots"],"minimum":["stated metrics"]}','t',6,'market','presented','view_only'),
  ('tech.seed.team','11111111-1111-1111-1111-111111111111','structured',
    '{"preferred":["employment records"],"alternative":["LinkedIn + offer letters"],"minimum":["stated bios"]}','t',7,'team','presented','view_only'),
  ('tech.seed.use_of_funds','11111111-1111-1111-1111-111111111111','text',
    '{"preferred":["board-approved budget"],"alternative":["founder budget"],"minimum":["stated allocation"]}','t',8,'financials','room','view_only'),
  ('tech.seed.cap_table','11111111-1111-1111-1111-111111111111','structured',
    '{"preferred":["cap table software export"],"alternative":["shareholder agreements"],"minimum":["founder-maintained sheet"]}','t',9,'legal','room','release_on_request'),
  ('tech.seed.incorporation','11111111-1111-1111-1111-111111111111','structured',
    '{"preferred":["certificate of incorporation"],"alternative":["registry extract"],"minimum":["stated entity details"]}','t',10,'legal','room','view_only'),
  ('tech.seed.runway_months','11111111-1111-1111-1111-111111111111','number',
    '{"preferred":["bank statements + burn"],"alternative":["management accounts"],"minimum":["stated runway"]}','t',11,'financials','room','view_only');

insert into pack_v1.schedule_field_label (schedule_field_id, locale, label, help_text)
values
  ('tech.seed.problem_statement','en','Problem','What problem, for whom, and why now.'),
  ('tech.seed.solution','en','Solution','Your product and how it addresses the problem.'),
  ('tech.seed.market_size_tam','en','Market size (TAM)','Total addressable market, with methodology.'),
  ('tech.seed.business_model','en','Business model','How the company makes money.'),
  ('tech.seed.mrr','en','Monthly recurring revenue','Current MRR.'),
  ('tech.seed.traction','en','Traction','Key growth and usage metrics.'),
  ('tech.seed.team','en','Team','Founders and key team members.'),
  ('tech.seed.use_of_funds','en','Use of funds','How this raise will be deployed.'),
  ('tech.seed.cap_table','en','Cap table','Current ownership structure.'),
  ('tech.seed.incorporation','en','Incorporation','Legal entity and registration.'),
  ('tech.seed.runway_months','en','Runway (months)','Months of runway at current burn.');
