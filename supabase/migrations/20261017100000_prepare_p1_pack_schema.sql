-- Applied to production by hand on 2026-10-16 via the dashboard SQL editor; recorded here for the migration history.
-- ═══════════════════════════════════════════════════════════════════════════
-- Prepare slice P1: pack gateway functions (technology sector,
-- founder-only). REVISION 3. Applied to production by hand and recorded
-- here; it was reviewed as a draft before being applied.
--
-- REVISION 3 CHANGES, each tied to the instruction that produced it:
--   B1 — two false comments corrected. Header A2 and the comment above
--        pack_field_set's ON CONFLICT clause both claimed
--        warranted_by/warranted_at are "NOT in this column list" /
--        pack_field_set "never touches" them — false: its own ON
--        CONFLICT DO UPDATE SET clause clears both to null on a changed
--        value, voiding an existing warranty. The true, narrower
--        guarantee — the one that actually matters — is that this
--        function can only CLEAR these columns, never SET them to a
--        non-null value; only pack_field_confirm ever writes a real
--        value into either column. See the corrected comments inline,
--        below, at both sites.
--   B2 — pack_field_value_matches_type's money branch tightened: currency
--        must match ^[A-Z]{3}$ exactly (a lowercase or mixed-case code
--        is now REJECTED as an invalid shape, not silently accepted and
--        upper-cased by the validator — the caller's own
--        upper(p_value_json ->> 'currency') write to the pack_field.currency
--        COLUMN is unchanged, but a value that needs normalizing to pass
--        validation is not treated as a valid value here); amount must
--        be >= 0, with its own distinct error ('money_amount_negative')
--        rather than folding into the generic bad-shape error, since a
--        negative amount is shape-valid JSON but not a valid money
--        value — a different kind of failure, not another instance of
--        the same one.
--   No other logic changes in this revision. search_path = '' unchanged
--   on every function.
--
-- REVISION 2 LIVE-RUN FINDING, found by actually executing the dry run
-- against production (not just scanning the text): the hash in A4's
-- payload calls digest(...), from pgcrypto, which lives ONLY in the
-- extensions schema. Under search_path='' (every function in this file),
-- an unqualified digest(...) call fails with 42883 function does not
-- exist. Fixed by fully-qualifying as extensions.digest(...) — kept
-- search_path='' everywhere (the stricter, already-established
-- convention) rather than widening any function's search_path to include
-- extensions, matching the search_path='' philosophy of "fully-qualify
-- the one external name you need" rather than widening what's searched.
-- SEPARATE, PRE-EXISTING FINDING surfaced by tracing why append_record's
-- OWN unqualified digest(...) call (in the already-deployed
-- 20260804000000 migration) still works: the LIVE, deployed
-- pack_v1.append_record's search_path is
-- "pg_catalog, pg_temp, pack_v1, extensions, public" — it includes
-- extensions and public. The MIGRATION FILE's text says only
-- "pg_catalog, pg_temp, pack_v1" — no extensions, no public. This is
-- real repo-vs-deployed drift (CLAUDE.md §7.2's standing lesson,
-- applied to a function none of this session's prior work had reason to
-- re-check), not something this draft caused — append_record was
-- presumably hand-patched live at some point after its original
-- migration, and the fix was never written back to the migration file.
-- Flagged for a separate reconciliation pass; not fixed here (out of
-- this job's scope, and not this draft's function to touch).
--
-- Scope: six pack_api functions + one DDL statement over the existing
-- pack_v1 schema (20260804000000_pack_v1_foundation.sql). No existing
-- function left unchanged by name is touched; pack_field_set's OLD
-- five-argument (with p_confirm) signature is REPLACED by two new
-- functions per this revision's instruction — see below. No touch to
-- public.startups or app.profile.tsx.
--
-- REVISION 2 CHANGES, each tied to the instruction that produced it:
--   A1 — pack_field_set/pack_field_confirm now write pack_field.currency
--        (upper-cased from value->>'currency') on every insert/update of a
--        money-typed field. The OLD revision never wrote this column at
--        all, so every money field insert would have hit
--        money_requires_currency's CHECK constraint and failed outright —
--        a real, would-have-been-fatal bug in revision 1, not cosmetic.
--   A2 — pack_field_set(p_uid,p_pack_id,p_field_key,p_value_json) is now
--        Prepare-class ONLY: it can only CLEAR warranted_by/warranted_at
--        (sets them to null, on a changed value, voiding an existing
--        warranty) — it can never SET them to a real value.
--        pack_field_confirm(p_uid,p_pack_id,p_field_key,p_expected_value)
--        is the ONLY function in this file that ever sets
--        warranted_by/warranted_at to a non-null value — enforced by
--        construction (no other function's UPDATE/INSERT statement
--        writes a non-null value into either column, not just by
--        comment). REVISION 3 CORRECTION: this comment previously said
--        pack_field_set "never touches" these columns, which was false —
--        its own ON CONFLICT DO UPDATE clears them to null on a changed
--        value. "Never SETS them" is the true, narrower claim; found and
--        fixed per direct instruction, not by this draft's own review.
--   A3 — pack_v1.pack gets a real UNIQUE constraint as this file's FIRST
--        statement (pack_v1.pack has 0 live rows — confirmed before
--        drafting this statement, not assumed; see the dry run's own
--        preflight for the same check run live).
--   A4 — record payloads no longer carry a raw value or previous_value.
--        See this file's own comment block above pack_field_confirm/
--        pack_field_set for the finding this is based on, and the
--        design note for the full write-up. Short version: NO existing
--        record entry anywhere in this codebase (finalize_deal_close's
--        confirm_deliverable/confirm_deliverable_partial,
--        deal-room-counsel.ts's five actions) carries a raw business
--        value in its data payload — every one carries only
--        action/status/id-shaped metadata. Keeping a value out of this
--        draft's payloads is therefore CONSISTENT with existing
--        convention, not a deviation needing special justification.
--        Payload = {pack_id, field_key, value_sha256} — a SHA-256 hex
--        digest of the value's canonical-JSON form (pack_v1.canonical_json,
--        the EXACT function append_record's own entry_hash already uses —
--        not a second, parallel canonicalization), so a future verifier
--        with access to the real pack_field row can confirm the record
--        entry corresponds to that exact value, without the chain itself
--        ever holding the value.
--   A5 — tightened validation: text must be non-blank after btrim(); date
--        must match ^\d{4}-\d{2}-\d{2}$ BEFORE the ::date cast (so a
--        string that merely LOOKS date-shaped to Postgres's lenient date
--        parser, e.g. '1/2/2026' or '20260101', is rejected rather than
--        silently accepted in some other format); size cap is a NAMED
--        constant (c_max_value_bytes) checked via
--        octet_length(p_value_json::text), not pg_column_size (see A5 note
--        inline, below); enum fields fail closed with 'enum_not_supported'
--        — this slice has no allowed-value list to check against, so an
--        enum field is rejected outright rather than accepted on a
--        shape-only check that cannot actually validate it.
--   A6 — pack_create now does the existing-pack lookup BEFORE the
--        schedule-published check, so a caller retrying against an
--        already-created pack gets the fast, idempotent path even if the
--        schedule has since been superseded/unpublished — the schedule
--        check only matters for genuinely creating a NEW pack.
--   A7 — the redundant closing DO $grants$ block is removed. Every
--        function's own explicit REVOKE/GRANT pair (immediately below its
--        CREATE OR REPLACE) is the only grant statement for it now,
--        including the new pack_field_confirm and the unchanged helper.
--
-- Pattern sources read before drafting (cited, not re-derived; unchanged
-- from revision 1 except where a new source is cited inline above):
--   - pack_api.pack_get / pack_api.append_record
--     (20260804010000_pack_api_gateway.sql) — the {ok,error} envelope shape.
--   - pack_api.authz_is_startup_founder(p_uid, p_startup_id)
--     (20260805000000_pack_api_authz_primitives.sql) — reused verbatim.
--   - pack_api.doc_insert / doc_update / doc_request_* — the write-function
--     shape (not_authenticated -> forbidden -> not_found ordering).
--   - finalize_deal_close / deal-room-counsel.ts's five actions — read
--     AGAIN for this revision specifically to answer A4 (see above); the
--     atomic-append-as-last-statement pattern is otherwise unchanged from
--     revision 1.
--   - pack_v1/CANONICAL_JSON_SPEC.md — canonical_json is reused directly
--     for the A4 hash (same function append_record calls internally),
--     never reimplemented.
--
-- record-chain org_id convention for pack actions — UNCHANGED from
-- revision 1: every append_record call uses p_startup_id (the pack's
-- subject_ref) as org_id, mirroring finalize_deal_close's own
-- deal_room_id-as-org_id convention for deal-room actions.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── A3: real unique constraint, FIRST statement in this file ────────────────
-- pack_v1.pack has zero live rows (confirmed before drafting this
-- statement — re-confirmed live by this file's own dry run's preflight
-- guard, which checks row count, not just column existence, before
-- proceeding). Adding this constraint is therefore a pure, risk-free DDL
-- addition — no existing row to violate it, no backfill needed, none of
-- CLAUDE.md §7.2's backfill-then-constraint ordering hazard applies
-- because there is nothing to backfill. pack_create's own idempotent-read
-- logic and its unique_violation exception handler both depend on this
-- constraint actually existing — without it, two concurrent first-calls
-- for the same (subject_ref, schedule_id) would silently create two
-- pack rows instead of racing safely into one.
--
-- RE-RUNNABILITY: ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS form,
-- and this constraint already exists in production (the file was applied by
-- hand). The DO block below runs the identical ALTER only when no constraint
-- named pack_subject_schedule_uniq exists on pack_v1.pack, so running this
-- file a second time does not fail on this statement.
do $guard$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'pack_subject_schedule_uniq'
       and conrelid = 'pack_v1.pack'::pg_catalog.regclass
  ) then
    alter table pack_v1.pack
      add constraint pack_subject_schedule_uniq unique (subject_ref, schedule_id);
  end if;
end
$guard$;


-- ── pack_api.schedule_get — Read, any authenticated user ────────────────────
-- Unchanged from revision 1. Returns the one published schedule for
-- (sector, stage) and its fields + labels (locale fixed to 'en' for this
-- slice — see design note). No authorization beyond "caller is a real
-- authenticated user" — a schedule is the published requirement list
-- every pack of that sector/stage is measured against, not founder-private.
create or replace function pack_api.schedule_get(
  p_uid    uuid,
  p_sector text,
  p_stage  text
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_schedule pack_v1.schedule;
  v_fields   jsonb;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_schedule
    from pack_v1.schedule
   where sector = p_sector and stage = p_stage and status = 'published'
   order by version desc
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', f.id,
             'value_type', f.value_type,
             'evidence_ladder', f.evidence_ladder,
             'is_required', f.is_required,
             'sort_order', f.sort_order,
             'section_key', f.section_key,
             'default_visibility_tier', f.default_visibility_tier,
             'default_release_class', f.default_release_class,
             'label', l.label,
             'help_text', l.help_text
           ) order by f.sort_order
         ), '[]'::jsonb)
    into v_fields
    from pack_v1.schedule_field f
    left join pack_v1.schedule_field_label l
      on l.schedule_field_id = f.id and l.locale = 'en'
   where f.schedule_id = v_schedule.id;

  return jsonb_build_object('ok', true, 'schedule', to_jsonb(v_schedule), 'fields', v_fields);
end;
$fn$;

revoke all on function pack_api.schedule_get(uuid, text, text) from public, anon, authenticated;
grant execute on function pack_api.schedule_get(uuid, text, text) to service_role;


-- ── pack_api.pack_create — Prepare class, founder-only, idempotent ──────────
-- A6: existing-pack lookup now happens BEFORE the schedule-published
-- check (order swapped from revision 1). A retry against an already-
-- created pack returns the fast, idempotent path regardless of whether
-- the schedule has since been unpublished/superseded; the published-
-- schedule check only gates genuinely creating a brand-new pack.
--
-- Reclassified Prepare, not Commit (design note §C2): this writes a
-- private, empty-of-content draft object — "I'm starting a pack for this
-- startup against this schedule" — with nothing shared, no field values,
-- no warranty, and (per this revision) NO record entry at all. There is
-- nothing here an agent committing unilaterally could misrepresent to a
-- counterparty, since no counterparty can see anything about this object
-- until real, confirmed field values exist — which only pack_field_confirm
-- can create.
create or replace function pack_api.pack_create(
  p_uid         uuid,
  p_startup_id  uuid,
  p_schedule_id uuid
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_schedule pack_v1.schedule;
  v_existing pack_v1.pack;
  v_new      pack_v1.pack;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not pack_api.authz_is_startup_founder(p_uid, p_startup_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- A6: idempotent read FIRST — before the published-schedule check.
  select * into v_existing
    from pack_v1.pack
   where subject_ref = p_startup_id and schedule_id = p_schedule_id;

  if found then
    return jsonb_build_object('ok', true, 'pack', to_jsonb(v_existing), 'created', false);
  end if;

  select * into v_schedule from pack_v1.schedule where id = p_schedule_id and status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'schedule_not_found');
  end if;

  insert into pack_v1.pack (org_id, subject_ref, schedule_id, schedule_version, status)
  values (p_startup_id, p_startup_id, p_schedule_id, v_schedule.version, 'draft')
  returning * into v_new;

  return jsonb_build_object('ok', true, 'pack', to_jsonb(v_new), 'created', true);
exception
  -- Race guard: two concurrent first-calls both pass the idempotent read
  -- above before either has inserted, then one of the two inserts hits
  -- the A3 unique constraint. Caught here rather than surfaced as a raw
  -- 500 — re-read and return the row the other call just created.
  when unique_violation then
    select * into v_existing
      from pack_v1.pack
     where subject_ref = p_startup_id and schedule_id = p_schedule_id;
    return jsonb_build_object('ok', true, 'pack', to_jsonb(v_existing), 'created', false);
end;
$fn$;

revoke all on function pack_api.pack_create(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.pack_create(uuid, uuid, uuid) to service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- A4 — record payload finding, read into this revision rather than decided
-- silently. Re-read finalize_deal_close (20260924010000) and
-- deal-room-counsel.ts's five actions (24 Sep 2026) specifically to answer
-- this. Every existing record entry's data payload in this codebase is
-- thin event metadata — action name, a status/kind string, an id, an
-- email address (deal-room-counsel.ts's request_lawyer_invite:
-- {action,lawyerEmail}) — and NONE of them carries a raw business value
-- being proposed, confirmed, or superseded. confirmDeliverable's own two
-- payload shapes are {action,closed} and {action,confirmedBy}. There is
-- no existing instance anywhere of a record entry holding something like
-- "the term sheet valuation was $X" or "the field's value was Y" — the
-- closest analog (lawyerEmail) is a contact identifier, not a confirmed
-- field value.
--
-- Finding, stated plainly: keeping a raw pack-field value OUT of the
-- record chain is consistent with every existing convention in this
-- codebase, not a deviation from one. Revision 1's original
-- {pack_id,field_key,value} and {pack_id,field_key,previous_value}
-- payloads would have been the FIRST instance of a raw value entering the
-- chain. This revision's payload instead carries a SHA-256 hex digest of
-- the value's canonical-JSON form:
--   {pack_id, field_key, value_sha256}
-- computed as encode(extensions.digest(pack_v1.canonical_json(p_value_json), 'sha256'), 'hex')
-- — reusing pack_v1.canonical_json directly (the exact function
-- append_record's own entry_hash computation already calls), never a
-- second, parallel canonicalization implementation. A future verifier
-- holding the real pack_field row can recompute this hash from the live
-- value and confirm it matches the record entry, without the chain ever
-- having stored the value itself.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── pack_api.pack_field_set — Prepare class, draft save ONLY ────────────────
-- A2: this function never SETS warranted_by/warranted_at to a value — it
-- can only CLEAR them: neither column is in its INSERT column list, and its
-- ON CONFLICT DO UPDATE SET list writes both as null. A pre-existing
-- warranted value whose content is CHANGING (IS DISTINCT FROM) has its
-- warranty voided (warranted_by/warranted_at cleared to null) and a
-- 'pack_field_warranty_voided' record entry written. A pre-existing
-- warranted value re-submitted UNCHANGED (IS NOT DISTINCT FROM) is a
-- true no-op: no row change, warranty untouched, no record entry — per
-- instruction, distinct from the "changed" case.
--
-- A1: writes pack_field.currency (upper-cased from value->>'currency')
-- for every money-typed field, on both the fresh-insert and the
-- on-conflict-update path — the column money_requires_currency's CHECK
-- constraint requires, and which revision 1 never populated at all.
--
-- Validation order (A5 tightenings in place), each a distinct, named
-- failure:
--   1. pack exists, caller owns it (authz_is_startup_founder against the
--      pack's own subject_ref — never a separately-passed startup id)
--   2. p_field_key exists in the pack's OWN pinned schedule_id
--   3. value shape matches the field's value_type, INCLUDING the A5
--      tightenings (non-blank text, strict YYYY-MM-DD date format,
--      enum fails closed) — see pack_field_value_matches_type below
--   4. size cap: octet_length(p_value_json::text) <= c_max_value_bytes
--      (A5 — named constant, text-byte-length, not pg_column_size; see
--      the note on this exact line inside the function body for why)
--
-- Row is locked FOR UPDATE before the warranty-void comparison, so a
-- concurrent pack_field_confirm call for the SAME field cannot race this
-- function's read-then-decide-then-write sequence.
create or replace function pack_api.pack_field_set(
  p_uid         uuid,
  p_pack_id     uuid,
  p_field_key   text,
  p_value_json  jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_pack            pack_v1.pack;
  v_field           pack_v1.schedule_field;
  v_existing        pack_v1.pack_field;
  v_warranty_voided boolean := false;
  v_result          pack_v1.pack_field;
  v_type_error      text;
  v_currency        text;
  c_max_value_bytes constant int := 8192;  -- A5: named constant, see pack_field_confirm's identical constant
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_pack from pack_v1.pack where id = p_pack_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not pack_api.authz_is_startup_founder(p_uid, v_pack.subject_ref) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select sf.* into v_field
    from pack_v1.schedule_field sf
   where sf.id = p_field_key and sf.schedule_id = v_pack.schedule_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_field');
  end if;

  v_type_error := pack_api.pack_field_value_matches_type(v_field.value_type, p_value_json);
  if v_type_error is not null then
    return jsonb_build_object('ok', false, 'error', v_type_error);
  end if;

  -- A5: octet_length on the value's text representation, not
  -- pg_column_size — pg_column_size reports the ON-DISK storage size
  -- (which can include TOAST/compression overhead and varies by
  -- Postgres internals, not by the value's own content), where
  -- octet_length(p_value_json::text) is the actual UTF-8 byte length of
  -- the value's JSON text form — the number a client-side size check
  -- would compute identically, and the number that matters for "is this
  -- a reasonable amount of content for one field."
  if octet_length(p_value_json::text) > c_max_value_bytes then
    return jsonb_build_object('ok', false, 'error', 'value_too_large');
  end if;

  v_currency := case when v_field.value_type = 'money' then upper(p_value_json ->> 'currency') else null end;

  -- Lock the row (if it exists) before comparing/deciding — FOR UPDATE,
  -- so a concurrent pack_field_confirm on the same (pack_id, field_key)
  -- cannot interleave with this read-then-write sequence.
  select * into v_existing
    from pack_v1.pack_field
   where pack_id = p_pack_id and schedule_field_id = p_field_key
   for update;

  if found and v_existing.value_json is not distinct from p_value_json then
    -- A2: unchanged resubmission — true no-op. Warranty (if any)
    -- untouched, no row write, no record entry.
    return jsonb_build_object('ok', true, 'field', to_jsonb(v_existing), 'warranty_voided', false, 'unchanged', true);
  end if;

  if found and v_existing.warranted_at is not null then
    v_warranty_voided := true;
  end if;

  if v_warranty_voided then
    perform pack_v1.append_record(
      v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
      'pack_field_warranty_voided', 'pack_field', v_existing.id,
      jsonb_build_object(
        'pack_id', p_pack_id, 'field_key', p_field_key,
        'value_sha256', encode(extensions.digest(pack_v1.canonical_json(v_existing.value_json), 'sha256'), 'hex')
      )
    );
  end if;

  insert into pack_v1.pack_field (
    pack_id, schedule_field_id, value_type, value_json, currency, visibility_tier, release_class, updated_at
  )
  values (
    p_pack_id, p_field_key, v_field.value_type, p_value_json, v_currency,
    v_field.default_visibility_tier, v_field.default_release_class, now()
  )
  -- A2 (REVISION 3 CORRECTION — this comment previously claimed
  -- warranted_by/warranted_at are "NOT in this column list, on either
  -- the insert or the update branch," which is false for the update
  -- branch below: they ARE in the ON CONFLICT DO UPDATE SET list,
  -- explicitly set to null, clearing any existing warranty. The true,
  -- narrower guarantee is: this function can only CLEAR these columns
  -- (write null), never SET them to a non-null value — no branch of
  -- this statement ever writes a real warranted_by/warranted_at value.
  -- A1: currency is written on both the insert and the update branch.
  on conflict (pack_id, schedule_field_id) do update set
    value_json = excluded.value_json,
    currency   = excluded.currency,
    warranted_by = null,
    warranted_at = null,
    updated_at = now()
  returning * into v_result;

  return jsonb_build_object('ok', true, 'field', to_jsonb(v_result), 'warranty_voided', v_warranty_voided, 'unchanged', false);
end;
$fn$;

revoke all on function pack_api.pack_field_set(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function pack_api.pack_field_set(uuid, uuid, text, jsonb) to service_role;


-- ── pack_api.pack_field_confirm — Commit class, the ONLY warranty-setter ────
-- A2: this is the ONLY function in this file that ever sets warranted_by/
-- warranted_at to a non-null value. Requires an EXISTING stored
-- value equal to p_expected_value (IS NOT DISTINCT FROM — comparing the
-- row's current value_json, locked FOR UPDATE first, against what the
-- caller believes is currently stored) — a mismatch returns
-- 'value_mismatch' rather than silently confirming whatever happens to
-- be stored, which would let a stale client confirm a value it never
-- actually saw. Already confirmed with the SAME value: a true no-op
-- (warranted_by/warranted_at left exactly as they are, no new row write,
-- no new record entry) — re-confirming does not re-stamp the timestamp
-- or write a second entry for an unchanged fact.
--
-- This function does NOT re-validate value shape/size/currency — those
-- were already enforced when the value was written via pack_field_set
-- (the only path that can ever place a value into pack_field.value_json
-- in the first place). p_expected_value exists purely as the
-- confirmation target to compare against, not as new content being
-- written.
create or replace function pack_api.pack_field_confirm(
  p_uid            uuid,
  p_pack_id        uuid,
  p_field_key      text,
  p_expected_value jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_pack     pack_v1.pack;
  v_existing pack_v1.pack_field;
  v_result   pack_v1.pack_field;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_pack from pack_v1.pack where id = p_pack_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not pack_api.authz_is_startup_founder(p_uid, v_pack.subject_ref) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- Lock before comparing — FOR UPDATE, so a concurrent pack_field_set
  -- on the same (pack_id, field_key) cannot interleave with this
  -- read-then-decide-then-write sequence.
  select * into v_existing
    from pack_v1.pack_field
   where pack_id = p_pack_id and schedule_field_id = p_field_key
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_existing.value_json is distinct from p_expected_value then
    return jsonb_build_object('ok', false, 'error', 'value_mismatch');
  end if;

  if v_existing.warranted_at is not null then
    -- Already confirmed with this exact value — true no-op.
    return jsonb_build_object('ok', true, 'field', to_jsonb(v_existing), 'already_confirmed', true);
  end if;

  update pack_v1.pack_field set
    warranted_by = p_uid,
    warranted_at = now(),
    updated_at   = now()
   where pack_id = p_pack_id and schedule_field_id = p_field_key
  returning * into v_result;

  perform pack_v1.append_record(
    v_pack.subject_ref, p_uid, 'human'::pack_v1.actor_type,
    'pack_field_confirmed', 'pack_field', v_result.id,
    jsonb_build_object(
      'pack_id', p_pack_id, 'field_key', p_field_key,
      'value_sha256', encode(extensions.digest(pack_v1.canonical_json(v_result.value_json), 'sha256'), 'hex')
    )
  );

  return jsonb_build_object('ok', true, 'field', to_jsonb(v_result), 'already_confirmed', false);
end;
$fn$;

revoke all on function pack_api.pack_field_confirm(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function pack_api.pack_field_confirm(uuid, uuid, text, jsonb) to service_role;


-- ── pack_api.pack_field_value_matches_type — helper, not a gateway fn ───────
-- A5 tightenings: text rejects blank/whitespace-only strings; date
-- requires ^\d{4}-\d{2}-\d{2}$ BEFORE attempting the ::date cast (so a
-- string Postgres's lenient date parser would otherwise accept in some
-- OTHER format, e.g. '1/2/2026' or '20260101', is rejected instead of
-- silently normalized); enum fails closed with its own distinct error
-- rather than a generic shape-only pass, since this slice has no
-- allowed-value list to actually validate against (see design note).
-- Returns the SAME value this helper always returned: null on success,
-- or the specific error string that pack_field_set now returns directly
-- as 'error' (no more generic 'invalid_value_type' wrapper with a
-- separate 'detail' key — each failure IS its own named error code now).
create or replace function pack_api.pack_field_value_matches_type(
  p_value_type pack_v1.value_type,
  p_value      jsonb
)
returns text
language plpgsql immutable security definer
set search_path = ''
as $fn$
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return 'value_required';
  end if;

  case p_value_type
    when 'text' then
      if jsonb_typeof(p_value) <> 'string' then
        return 'expected_string';
      end if;
      -- A5: reject empty/blank text after trimming whitespace.
      if btrim(p_value #>> '{}') = '' then
        return 'value_required';
      end if;
    when 'number' then
      if jsonb_typeof(p_value) <> 'number' then
        return 'expected_number';
      end if;
    when 'money' then
      -- {"amount": <number>, "currency": "USD"} — matches pack_field's
      -- own money_requires_currency CHECK constraint intent, enforced
      -- here at the value-shape level before the row-level CHECK ever
      -- sees it (the actual currency COLUMN write happens in
      -- pack_field_set/pack_field_confirm's callers; this helper only
      -- validates shape).
      --
      -- REVISION 3: currency must match ^[A-Z]{3}$ exactly — uppercase
      -- only, rejected outright on a lowercase/mixed-case code rather
      -- than silently upper-cased here. (The CALLER's own
      -- upper(p_value_json ->> 'currency') is what actually writes the
      -- pack_field.currency COLUMN — unchanged from revision 2 — but
      -- this validator no longer treats a non-uppercase currency as a
      -- valid SHAPE; a value that needs normalizing to pass is not an
      -- accepted value.) Amount must also be >= 0 — a negative amount
      -- is shape-valid JSON but not a valid money value; its own
      -- distinct error name makes this different in kind from a
      -- malformed object, not just another instance of the same error.
      if jsonb_typeof(p_value) <> 'object'
         or jsonb_typeof(p_value -> 'amount') <> 'number'
         or jsonb_typeof(p_value -> 'currency') <> 'string'
         or (p_value ->> 'currency') !~ '^[A-Z]{3}$' then
        return 'expected_money_object_with_amount_and_3letter_currency';
      end if;
      if (p_value ->> 'amount')::numeric < 0 then
        return 'money_amount_negative';
      end if;
    when 'date' then
      if jsonb_typeof(p_value) <> 'string' then
        return 'expected_date_string';
      end if;
      -- A5: strict format check BEFORE the ::date cast. Postgres's own
      -- date parser is lenient (accepts many formats); this guards
      -- against that leniency silently accepting a non-ISO string.
      if (p_value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
        return 'expected_iso_date_string';
      end if;
      begin
        perform (p_value #>> '{}')::date;
      exception when others then
        return 'expected_iso_date_string';
      end;
    when 'enum' then
      -- A5: fail closed, unconditionally. This slice has no per-field
      -- allowed-value list anywhere in the schema to validate an enum
      -- value against (schedule_field carries no such column) — rather
      -- than accept any string and call it validated, enum fields are
      -- rejected outright. No seeded tech.seed field uses value_type=
      -- 'enum' today, so this is untested-by-necessity, not an oversight.
      return 'enum_not_supported';
    when 'structured' then
      if jsonb_typeof(p_value) not in ('object', 'array') then
        return 'expected_object_or_array';
      end if;
    else
      return 'unknown_value_type';
  end case;

  return null;
end;
$fn$;

revoke all on function pack_api.pack_field_value_matches_type(pack_v1.value_type, jsonb) from public, anon, authenticated;
grant execute on function pack_api.pack_field_value_matches_type(pack_v1.value_type, jsonb) to service_role;


-- ── pack_api.pack_missing_fields — Read, pack-owner only ─────────────────────
-- Unchanged in logic from revision 1. Required schedule fields
-- (is_required = true, from the pack's own pinned schedule_id) with no
-- WARRANTED value — keyed on warranted_at is null, not "no row exists",
-- since this function's definition of "missing" is unaffected by the
-- pack_field_set/pack_field_confirm split (a drafted-but-unconfirmed
-- value is still missing from the schedule's point of view either way).
create or replace function pack_api.pack_missing_fields(
  p_uid     uuid,
  p_pack_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  v_pack pack_v1.pack;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_pack from pack_v1.pack where id = p_pack_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not pack_api.authz_is_startup_founder(p_uid, v_pack.subject_ref) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object('ok', true, 'missing_fields', coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'field_key', sf.id,
               'section_key', sf.section_key,
               'sort_order', sf.sort_order,
               'label', l.label
             ) order by sf.sort_order
           )
      from pack_v1.schedule_field sf
      left join pack_v1.schedule_field_label l
        on l.schedule_field_id = sf.id and l.locale = 'en'
      left join pack_v1.pack_field pf
        on pf.pack_id = p_pack_id and pf.schedule_field_id = sf.id
     where sf.schedule_id = v_pack.schedule_id
       and sf.is_required = true
       and (pf.id is null or pf.warranted_at is null)
  ), '[]'::jsonb));
end;
$fn$;

revoke all on function pack_api.pack_missing_fields(uuid, uuid) from public, anon, authenticated;
grant execute on function pack_api.pack_missing_fields(uuid, uuid) to service_role;

-- A7: no closing DO $grants$ block in this revision — every function's
-- own REVOKE/GRANT pair above (immediately following its CREATE OR
-- REPLACE) is the single source of its grant state, including
-- pack_field_confirm and the unchanged helper.
