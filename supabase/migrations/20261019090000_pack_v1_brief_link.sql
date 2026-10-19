-- Recorded migration: pack_v1.brief_link and the four pack_api.brief_link_* functions.
-- APPLIED 2026-10-19 by hand in the Supabase dashboard SQL editor, after a passing production dry run of 114 checks
-- (supabase/drafts/DRAFT_brief_link_dry_run.sql, run as a single DO statement that always raises and rolls back).
-- Everything below the line "-- STATEMENTS" is the apply text, byte for byte
-- (supabase/drafts/DRAFT_brief_link.sql, sha256 f5942a5f21215c75fbe2ca97beb09efeb8db2a105765ac68f2b698a101b36754).
-- Live md5(prosrc) after the apply, re-read from production 2026-10-19:
--   brief_link_create      91b7fa432e2a4889f5095b217ef668ba
--   brief_link_list        1f581a822b9dce246a299f6f14ca3b77
--   brief_link_revoke      e221ed15fd6ac6aee5995a0674f49589
--   brief_link_set_expiry  929b5ca711499070459cd961dc235a01
-- ACL on all four: postgres and service_role execute only. All four are SECURITY DEFINER with search_path = ''.
-- pack_v1.brief_link: row level security enabled, no policies, relacl {postgres=arwdDxtm/postgres} (owner only).
-- The functions append their own record entries (brief_link_created, brief_link_revoked, brief_link_expiry_set)
-- inside the same transaction as the state change; the gateway actions that call them set recordedByHandler.
-- STATEMENTS
-- ═════════════════════════════════════════════════════════════════════════
-- DRAFT — NOT APPLIED. Lives in supabase/drafts/, not supabase/migrations/.
-- Founder-managed Brief links, database half (slice S1): one table and four pack_api functions.
--
-- WHAT A BRIEF LINK IS: a row that lets a founder hand out an unguessable address for the Brief of one pack,
-- with a label, an expiry and a revoke switch. The link TOKEN is generated inside brief_link_create, returned in
-- that one response and never stored: only its SHA-256 is kept (token_hash). Nothing in this file reads a token
-- from a caller or serves a Brief; there is no anonymous or public function here.
--
-- TABLE pack_v1.brief_link
--   token_hash   bytea, exactly 32 bytes, unique: sha256 of the token STRING (its UTF-8 bytes).
--   label        1 to 80 characters after trimming; the function stores the trimmed text.
--   created_by   uuid, no foreign key (same convention as the other pack_v1 tables).
--   expires_at   not null, after created_at. revoked_at null until revoked.
--   pack_id      references pack_v1.pack(id) on delete cascade.
--   Row level security is enabled with no policies, and every privilege is revoked from public, anon,
--   authenticated and service_role. The functions below run as the table owner (SECURITY DEFINER).
--
-- FUNCTIONS (pack_api, all SECURITY DEFINER, search_path = '', every name schema-qualified, no dynamic SQL,
-- return jsonb, EXECUTE for service_role only):
--   brief_link_create(p_uid, p_pack_id, p_label, p_expires_in_days default 30)
--   brief_link_list(p_uid, p_pack_id)
--   brief_link_revoke(p_uid, p_link_id)
--   brief_link_set_expiry(p_uid, p_link_id, p_expires_in_days)
--
-- OWNERSHIP: pack_api.authz_is_startup_founder(p_uid, pack.subject_ref), called inside the single query that
-- finds the pack, so a pack that does not exist and a pack the caller does not own give the SAME answer
-- ({ok:false, error:"not_found"}) and cost the same one lookup. (pack_fields_get and the other Prepare
-- functions answer "forbidden" for a non-owner and "not_found" for an unknown id; these four deliberately do
-- not.) A null p_uid gives not_authenticated before anything is read.
--
-- LIMITS (decided by the owner): default expiry 30 days, allowed 1 to 90 days, no link without an expiry; at
-- most 20 ACTIVE links per pack, where active means not revoked and expires_at later than now(); revoked and
-- expired links do not count. The pack row is locked (FOR UPDATE) by every function that changes a link, so the
-- count check cannot be raced. brief_link_set_expiry also refuses to bring an expired link back to life when the
-- pack already has 20 active links (too_many_links); otherwise extending an expired link could exceed the cap.
--
-- TOKEN: 32 random bytes from extensions.gen_random_bytes (pgcrypto), base64url without padding, 43 characters
-- of A-Z a-z 0-9 - _ (base64 with + and / replaced by - and _, padding and line breaks removed).
--
-- RECORD CHAIN: brief_link_create, brief_link_revoke and brief_link_set_expiry each append ONE entry to the hash
-- chain themselves, in the same transaction as the state change and AFTER it, so the link change and its entry
-- commit or roll back together. The call is the one pack_field_confirm makes, unchanged in shape:
--   perform pack_v1.append_record(v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
--                                 <action>, 'brief_link', <link id>, <data>)
-- (the chain is partitioned by pack.subject_ref, the same org argument pack_field_confirm uses). Action names are
-- free text; nothing needs registering for them (record_entry.action has no enum or check constraint).
--   brief_link_create      'brief_link_created'     data {link_id, expires_at}
--   brief_link_revoke      'brief_link_revoked'     data {link_id}; only when the link was not already revoked
--   brief_link_set_expiry  'brief_link_expiry_set'  data {link_id, expires_at} (the new expiry)
-- The data never contains the token, its hash, the label or any other text a person typed. A call that returns
-- an error, a repeat revoke, and brief_link_list write nothing.
--
-- Re-runnable: create table if not exists, create index if not exists, create or replace function; the
-- revoke and grant statements are idempotent.
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists pack_v1.brief_link (
  id          uuid        not null default gen_random_uuid(),
  pack_id     uuid        not null,
  token_hash  bytea       not null,
  label       text        not null,
  created_by  uuid        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  constraint brief_link_pkey primary key (id),
  constraint brief_link_pack_id_fkey foreign key (pack_id) references pack_v1.pack (id) on delete cascade,
  constraint brief_link_token_hash_key unique (token_hash),
  constraint brief_link_token_hash_len check (octet_length(token_hash) = 32),
  constraint brief_link_label_len check (char_length(btrim(label)) between 1 and 80),
  constraint brief_link_expiry_after_create check (expires_at > created_at)
);

create index if not exists brief_link_pack_id_idx on pack_v1.brief_link (pack_id);

alter table pack_v1.brief_link enable row level security;

revoke all on table pack_v1.brief_link from public, anon, authenticated, service_role;

-- ───────────────────────────── create ─────────────────────────────
create or replace function pack_api.brief_link_create(
  p_uid             uuid,
  p_pack_id         uuid,
  p_label           text,
  p_expires_in_days int default 30
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  -- blank means: space, tab, CR, LF, form feed, vertical tab (chr(11))
  c_blank   constant text := E' \t\r\n\f' || pg_catalog.chr(11);
  c_max     constant int  := 20;
  v_pack    pack_v1.pack;
  v_label   text;
  v_days    int;
  v_active  int;
  v_token   text;
  v_link    pack_v1.brief_link;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.* into v_pack
    from pack_v1.pack p
   where p.id = p_pack_id
     and pack_api.authz_is_startup_founder(p_uid, p.subject_ref)
     for update of p;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_label := pg_catalog.btrim(coalesce(p_label, ''), c_blank);
  if v_label = '' or pg_catalog.char_length(v_label) > 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_label');
  end if;

  v_days := coalesce(p_expires_in_days, 30);
  if v_days < 1 or v_days > 90 then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  select pg_catalog.count(*) into v_active
    from pack_v1.brief_link l
   where l.pack_id = v_pack.id
     and l.revoked_at is null
     and l.expires_at > pg_catalog.now();
  if v_active >= c_max then
    return jsonb_build_object('ok', false, 'error', 'too_many_links');
  end if;

  v_token := pg_catalog.rtrim(
               pg_catalog.translate(
                 pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'),
                 '+/' || E'\n\r', '-_'),
               '=');

  insert into pack_v1.brief_link (pack_id, token_hash, label, created_by, created_at, expires_at)
  values (
    v_pack.id,
    pg_catalog.sha256(pg_catalog.convert_to(v_token, 'UTF8')),
    v_label,
    p_uid,
    pg_catalog.now(),
    pg_catalog.now() + pg_catalog.make_interval(hours => v_days * 24)
  )
  returning * into v_link;

  perform pack_v1.append_record(
    v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
    'brief_link_created', 'brief_link', v_link.id,
    jsonb_build_object('link_id', v_link.id, 'expires_at', v_link.expires_at)
  );

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', v_link.id,
      'label', v_link.label,
      'created_at', v_link.created_at,
      'expires_at', v_link.expires_at
    ),
    'token', v_token
  );
end;
$fn$;

revoke all on function pack_api.brief_link_create(uuid, uuid, text, int) from public, anon, authenticated;
grant execute on function pack_api.brief_link_create(uuid, uuid, text, int) to service_role;

-- ───────────────────────────── list ─────────────────────────────
create or replace function pack_api.brief_link_list(
  p_uid     uuid,
  p_pack_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_pack  pack_v1.pack;
  v_links jsonb;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.* into v_pack
    from pack_v1.pack p
   where p.id = p_pack_id
     and pack_api.authz_is_startup_founder(p_uid, p.subject_ref);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', l.id,
             'label', l.label,
             'created_at', l.created_at,
             'expires_at', l.expires_at,
             'revoked_at', l.revoked_at,
             'status', case
                         when l.revoked_at is not null then 'revoked'
                         when l.expires_at <= pg_catalog.now() then 'expired'
                         else 'active'
                       end
           ) order by l.created_at desc, l.id desc
         ), '[]'::jsonb)
    into v_links
    from pack_v1.brief_link l
   where l.pack_id = v_pack.id;

  return jsonb_build_object('ok', true, 'links', v_links);
end;
$fn$;

revoke all on function pack_api.brief_link_list(uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.brief_link_list(uuid, uuid) to service_role;

-- ───────────────────────────── revoke ─────────────────────────────
create or replace function pack_api.brief_link_revoke(
  p_uid     uuid,
  p_link_id uuid
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_pack pack_v1.pack;
  v_link pack_v1.brief_link;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.* into v_pack
    from pack_v1.pack p
   where p.id = (select l.pack_id from pack_v1.brief_link l where l.id = p_link_id)
     and pack_api.authz_is_startup_founder(p_uid, p.subject_ref)
     for update of p;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select l.* into v_link from pack_v1.brief_link l where l.id = p_link_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_link.revoked_at is null then
    update pack_v1.brief_link l
       set revoked_at = pg_catalog.now()
     where l.id = v_link.id
    returning l.* into v_link;

    perform pack_v1.append_record(
      v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
      'brief_link_revoked', 'brief_link', v_link.id,
      jsonb_build_object('link_id', v_link.id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', v_link.id,
      'status', 'revoked',
      'revoked_at', v_link.revoked_at
    )
  );
end;
$fn$;

revoke all on function pack_api.brief_link_revoke(uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.brief_link_revoke(uuid, uuid) to service_role;

-- ───────────────────────────── set expiry ─────────────────────────────
create or replace function pack_api.brief_link_set_expiry(
  p_uid             uuid,
  p_link_id         uuid,
  p_expires_in_days int
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  c_max    constant int := 20;
  v_pack   pack_v1.pack;
  v_link   pack_v1.brief_link;
  v_active int;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.* into v_pack
    from pack_v1.pack p
   where p.id = (select l.pack_id from pack_v1.brief_link l where l.id = p_link_id)
     and pack_api.authz_is_startup_founder(p_uid, p.subject_ref)
     for update of p;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select l.* into v_link from pack_v1.brief_link l where l.id = p_link_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_expires_in_days is null or p_expires_in_days < 1 or p_expires_in_days > 90 then
    return jsonb_build_object('ok', false, 'error', 'invalid_expiry');
  end if;

  if v_link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'link_revoked');
  end if;

  -- An expired link coming back to life is a new active link: it must fit under the cap.
  if v_link.expires_at <= pg_catalog.now() then
    select pg_catalog.count(*) into v_active
      from pack_v1.brief_link l
     where l.pack_id = v_pack.id
       and l.revoked_at is null
       and l.expires_at > pg_catalog.now();
    if v_active >= c_max then
      return jsonb_build_object('ok', false, 'error', 'too_many_links');
    end if;
  end if;

  update pack_v1.brief_link l
     set expires_at = pg_catalog.now() + pg_catalog.make_interval(hours => p_expires_in_days * 24)
   where l.id = v_link.id
  returning l.* into v_link;

  perform pack_v1.append_record(
    v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
    'brief_link_expiry_set', 'brief_link', v_link.id,
    jsonb_build_object('link_id', v_link.id, 'expires_at', v_link.expires_at)
  );

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', v_link.id,
      'label', v_link.label,
      'created_at', v_link.created_at,
      'expires_at', v_link.expires_at,
      'revoked_at', v_link.revoked_at,
      'status', case
                  when v_link.revoked_at is not null then 'revoked'
                  when v_link.expires_at <= pg_catalog.now() then 'expired'
                  else 'active'
                end
    )
  );
end;
$fn$;

revoke all on function pack_api.brief_link_set_expiry(uuid, uuid, int) from public, anon, authenticated;
grant execute on function pack_api.brief_link_set_expiry(uuid, uuid, int) to service_role;
