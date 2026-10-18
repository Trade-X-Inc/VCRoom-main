-- Applied to production by hand on 2026-10-18 via the dashboard SQL editor, after a passing production dry run (206 checks); recorded here for the migration history.
-- pack_api.pack_structured_value_valid(p_field_id text, p_value jsonb) returns text: null when valid, otherwise an error code.
--   Rules for tech.seed.incorporation, tech.seed.team, tech.seed.cap_table and tech.seed.market_size_tam (the methodology key;
--   amount and currency required); null for every other field id. STABLE, SECURITY DEFINER, search_path="".
--   Live body md5 (md5(prosrc)): 46bae42c324e0edb05b3ab231d63664f.
-- pack_api.pack_field_set(p_uid, p_pack_id, p_field_key, p_value_json) returns jsonb: the previous body plus a call to
--   pack_api.pack_structured_value_valid after pack_api.pack_field_value_matches_type passes. SECURITY DEFINER, VOLATILE,
--   search_path="". Live body md5: 5b7e79a76adbd162f286f1fc001eee6c (previous body md5: fcad255e9a1f8b957db3199328c8de05).
-- pack_api.pack_field_value_matches_type is not changed (md5 0baf0a9a0c88ae33486a3e67de8bf54e).
-- Both functions: execute for service_role only (public, anon and authenticated revoked).
-- Client side: frontend/src/lib/pack/field-shapes.ts, tested against frontend/src/lib/pack/field-shape-cases.json.
-- The statements below are re-runnable (create or replace; revoke and grant are idempotent).

create or replace function pack_api.pack_structured_value_valid(
  p_field_id text,
  p_value    jsonb
)
returns text
language plpgsql stable security definer
set search_path = ''
as $fn$
declare
  c_max_value_bytes constant int := 8192;
  c_blank           constant text := '^[ \t\n\v\f\r]*$';
  c_url             constant text := '^https://[^ \t\n\v\f\r]+$';
  v_item   jsonb;
  v_key    text;
  v_keys   text[];
  v_max    int[];
  v_i      int;
  v_n      int;
  v_str    text;
  v_num    numeric;
  v_date   date;
  v_found  boolean := false;
begin
  -- Only the four validated fields have rules here; every other field id is accepted unchanged.
  if p_field_id is null or p_field_id not in (
       'tech.seed.incorporation', 'tech.seed.team', 'tech.seed.cap_table', 'tech.seed.market_size_tam') then
    return null;
  end if;

  if p_value is null or pg_catalog.jsonb_typeof(p_value) = 'null' then
    return 'value_required';
  end if;

  -- Size first, so no rule below runs on an oversize value. Same byte measure pack_field_set uses.
  if pg_catalog.octet_length(p_value::text) > c_max_value_bytes then
    return 'value_too_large';
  end if;

  -- ───────── tech.seed.market_size_tam: the money rules of pack_field_value_matches_type stay in force
  -- ───────── (amount >= 0, currency ^[A-Z]{3}$); this function adds the optional methodology key and
  -- ───────── requires amount and currency to be present. pack_field_value_matches_type alone lets an object
  -- ───────── with a missing amount or currency through (a NULL comparison), so the presence check is repeated
  -- ───────── here for this field only. Other money fields are untouched.
  if p_field_id = 'tech.seed.market_size_tam' then
    if pg_catalog.jsonb_typeof(p_value) = 'object' then
      if pg_catalog.jsonb_typeof(p_value -> 'amount') is distinct from 'number'
         or pg_catalog.jsonb_typeof(p_value -> 'currency') is distinct from 'string'
         or (p_value ->> 'currency') !~ '^[A-Z]{3}$' then
        return 'expected_money_object_with_amount_and_3letter_currency';
      end if;
    end if;
    if pg_catalog.jsonb_typeof(p_value) = 'object' and pg_catalog.jsonb_exists(p_value, 'methodology') then
      if pg_catalog.jsonb_typeof(p_value -> 'methodology') <> 'string' then
        return 'invalid_shape';
      end if;
      v_str := p_value ->> 'methodology';
      if v_str ~ c_blank then
        return 'blank';
      end if;
      if pg_catalog.char_length(v_str) > 500 then
        return 'too_long';
      end if;
    end if;
    return null;
  end if;

  -- ───────── tech.seed.incorporation: one object.
  if p_field_id = 'tech.seed.incorporation' then
    if pg_catalog.jsonb_typeof(p_value) <> 'object' then
      return 'invalid_shape';
    end if;
    for v_key in select k from pg_catalog.jsonb_object_keys(p_value) as t(k) loop
      if v_key <> all (array['status', 'legal_name', 'entity_type', 'jurisdiction_country', 'jurisdiction_region',
                             'incorporation_date', 'registration_number', 'registered_address']) then
        return 'unknown_key';
      end if;
    end loop;
    if not pg_catalog.jsonb_exists(p_value, 'status') then
      return 'missing_required';
    end if;
    if pg_catalog.jsonb_typeof(p_value -> 'status') <> 'string' then
      return 'invalid_shape';
    end if;
    v_str := p_value ->> 'status';
    if v_str not in ('incorporated', 'not_yet_incorporated') then
      return 'bad_enum';
    end if;
    if v_str = 'not_yet_incorporated' then
      for v_key in select k from pg_catalog.jsonb_object_keys(p_value) as t(k) loop
        if v_key <> all (array['status', 'jurisdiction_country', 'jurisdiction_region']) then
          return 'unknown_key';
        end if;
      end loop;
    else
      foreach v_key in array array['legal_name', 'entity_type', 'jurisdiction_country', 'incorporation_date'] loop
        if not pg_catalog.jsonb_exists(p_value, v_key) then
          return 'missing_required';
        end if;
      end loop;
    end if;
    v_keys := array['legal_name', 'entity_type', 'jurisdiction_country', 'jurisdiction_region',
                    'incorporation_date', 'registration_number', 'registered_address'];
    v_max  := array[200, 100, null, 100, null, 64, 300];
    for v_i in 1 .. pg_catalog.array_length(v_keys, 1) loop
      v_key := v_keys[v_i];
      if pg_catalog.jsonb_exists(p_value, v_key) then
        if pg_catalog.jsonb_typeof(p_value -> v_key) <> 'string' then
          return 'invalid_shape';
        end if;
        v_str := p_value ->> v_key;
        if v_str ~ c_blank then
          return 'blank';
        end if;
        if v_max[v_i] is not null and pg_catalog.char_length(v_str) > v_max[v_i] then
          return 'too_long';
        end if;
        if v_key = 'jurisdiction_country' and v_str !~ '^[A-Z]{2}$' then
          return 'bad_country';
        end if;
        if v_key = 'incorporation_date' then
          if v_str !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return 'bad_date';
          end if;
          begin
            v_date := v_str::date;
          exception when others then
            return 'bad_date';
          end;
          if v_date > (pg_catalog.now() at time zone 'UTC')::date then
            return 'future_date';
          end if;
        end if;
      end if;
    end loop;
    return null;
  end if;

  -- ───────── tech.seed.team: array of 1 to 15 objects.
  if p_field_id = 'tech.seed.team' then
    if pg_catalog.jsonb_typeof(p_value) <> 'array' then
      return 'invalid_shape';
    end if;
    v_n := pg_catalog.jsonb_array_length(p_value);
    if v_n < 1 then
      return 'too_few_items';
    end if;
    if v_n > 15 then
      return 'too_many_items';
    end if;
    for v_item in select e from pg_catalog.jsonb_array_elements(p_value) as t(e) loop
      if pg_catalog.jsonb_typeof(v_item) <> 'object' then
        return 'invalid_shape';
      end if;
      for v_key in select k from pg_catalog.jsonb_object_keys(v_item) as t(k) loop
        if v_key <> all (array['name', 'role', 'is_founder', 'full_time', 'is_director', 'linkedin_url']) then
          return 'unknown_key';
        end if;
      end loop;
      foreach v_key in array array['name', 'role', 'is_founder', 'full_time', 'is_director'] loop
        if not pg_catalog.jsonb_exists(v_item, v_key) then
          return 'missing_required';
        end if;
      end loop;
      v_keys := array['name', 'role', 'linkedin_url'];
      v_max  := array[120, 120, 300];
      for v_i in 1 .. 3 loop
        v_key := v_keys[v_i];
        if pg_catalog.jsonb_exists(v_item, v_key) then
          if pg_catalog.jsonb_typeof(v_item -> v_key) <> 'string' then
            return 'invalid_shape';
          end if;
          v_str := v_item ->> v_key;
          if v_str ~ c_blank then
            return 'blank';
          end if;
          if pg_catalog.char_length(v_str) > v_max[v_i] then
            return 'too_long';
          end if;
          if v_key = 'linkedin_url' and v_str !~ c_url then
            return 'bad_url';
          end if;
        end if;
      end loop;
      foreach v_key in array array['is_founder', 'full_time', 'is_director'] loop
        if pg_catalog.jsonb_typeof(v_item -> v_key) <> 'boolean' then
          return 'invalid_shape';
        end if;
      end loop;
      if (v_item ->> 'is_founder') = 'true' then
        v_found := true;
      end if;
    end loop;
    if not v_found then
      return 'no_founder';
    end if;
    return null;
  end if;

  -- ───────── tech.seed.cap_table: array of 1 to 30 objects.
  if pg_catalog.jsonb_typeof(p_value) <> 'array' then
    return 'invalid_shape';
  end if;
  v_n := pg_catalog.jsonb_array_length(p_value);
  if v_n < 1 then
    return 'too_few_items';
  end if;
  if v_n > 30 then
    return 'too_many_items';
  end if;
  for v_item in select e from pg_catalog.jsonb_array_elements(p_value) as t(e) loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object' then
      return 'invalid_shape';
    end if;
    for v_key in select k from pg_catalog.jsonb_object_keys(v_item) as t(k) loop
      if v_key <> all (array['holder_name', 'holder_kind', 'holder_type', 'ownership_percent', 'share_class', 'shares']) then
        return 'unknown_key';
      end if;
    end loop;
    foreach v_key in array array['holder_name', 'holder_kind', 'holder_type', 'ownership_percent'] loop
      if not pg_catalog.jsonb_exists(v_item, v_key) then
        return 'missing_required';
      end if;
    end loop;
    v_keys := array['holder_name', 'share_class'];
    v_max  := array[120, 60];
    for v_i in 1 .. 2 loop
      v_key := v_keys[v_i];
      if pg_catalog.jsonb_exists(v_item, v_key) then
        if pg_catalog.jsonb_typeof(v_item -> v_key) <> 'string' then
          return 'invalid_shape';
        end if;
        v_str := v_item ->> v_key;
        if v_str ~ c_blank then
          return 'blank';
        end if;
        if pg_catalog.char_length(v_str) > v_max[v_i] then
          return 'too_long';
        end if;
      end if;
    end loop;
    foreach v_key in array array['holder_kind', 'holder_type'] loop
      if pg_catalog.jsonb_typeof(v_item -> v_key) <> 'string' then
        return 'invalid_shape';
      end if;
      v_str := v_item ->> v_key;
      if v_key = 'holder_kind' and v_str not in ('person', 'company', 'pool') then
        return 'bad_enum';
      end if;
      if v_key = 'holder_type' and v_str not in ('founder', 'investor', 'employee_pool', 'advisor', 'other') then
        return 'bad_enum';
      end if;
    end loop;
    if pg_catalog.jsonb_typeof(v_item -> 'ownership_percent') <> 'number' then
      return 'invalid_shape';
    end if;
    v_num := (v_item ->> 'ownership_percent')::numeric;
    if v_num < 0 or v_num > 100 or v_num <> pg_catalog.round(v_num, 2) then
      return 'bad_percent';
    end if;
    if pg_catalog.jsonb_exists(v_item, 'shares') then
      if pg_catalog.jsonb_typeof(v_item -> 'shares') <> 'number' then
        return 'invalid_shape';
      end if;
      v_num := (v_item ->> 'shares')::numeric;
      if v_num < 0 or v_num <> pg_catalog.trunc(v_num) then
        return 'bad_shares';
      end if;
    end if;
  end loop;
  return null;
end;
$fn$;

revoke all on function pack_api.pack_structured_value_valid(text, jsonb) from public, anon, authenticated;
grant execute on function pack_api.pack_structured_value_valid(text, jsonb) to service_role;

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
  if v_type_error is null then
    -- Field-specific shape rules for the incorporation, team, cap table and market size fields
    -- (pack_api.pack_structured_value_valid); it returns null for every other field.
    v_type_error := pack_api.pack_structured_value_valid(p_field_key, p_value_json);
  end if;
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
