-- Deal-room-core, §20.4 error semantics: write failure + concurrent-edit
-- fixes for DealTermsCard.tsx and DDWorkstation.tsx's product_images.
--
-- Both writers currently write directly via supabase.from("deal_rooms")
-- .update(...) with no optimistic-concurrency guard and no affected-row
-- check beyond `if (error) throw error` -- the same 0-row-silent-failure
-- shape as the investor-memo defect fixed earlier this group (CLAUDE.md
-- §7.4), PLUS a genuine data-loss bug on product_images specifically: two
-- concurrent uploads each compute [...existing, url] from independently
-- stale reads, and the second write silently overwrites the first's
-- addition entirely (not merges, not conflicts -- the first upload
-- vanishes with no error, no trace, nothing). See the new §7.4 entry.
--
-- Fix: compare-and-swap on updated_at, done server-side in two new
-- pack_api write functions rather than a raw client .update() with a
-- WHERE clause, because the three distinct outcomes (forbidden / not
-- found / conflict / ok) need to be distinguishable to the client, which
-- a bare 0-row PostgREST response cannot express on its own.

-- ── room_get_deal_terms: add updated_at so the client can detect drift ──
create or replace function pack_api.room_get_deal_terms(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_row jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select jsonb_build_object(
    'funding_stage', d.funding_stage, 'funding_ask', d.funding_ask,
    'pre_money_valuation', d.pre_money_valuation, 'equity_offered', d.equity_offered,
    'previous_rounds', d.previous_rounds, 'key_metrics', d.key_metrics,
    'updated_at', d.updated_at
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'terms', v_row);
end;
$function$;

-- ── room_get_media: add updated_at, same reason ──────────────────────────
create or replace function pack_api.room_get_media(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_row jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if pack_api.authz_is_room_lawyer(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select jsonb_build_object(
    'pitch_deck_url', d.pitch_deck_url,
    'product_video_url', d.product_video_url,
    'product_images', d.product_images,
    'updated_at', d.updated_at
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'media', v_row);
end;
$function$;

-- ── room_update_deal_terms: founder-only write, optimistic concurrency ──
-- Whole-row compare-and-swap on updated_at, not field-level -- two
-- parties' edits to a negotiation record are never silently merged
-- (Foundation §8.3 record-integrity principle). A caller whose
-- p_expected_updated_at no longer matches gets 'conflict', distinguishable
-- from 'forbidden' (not the founder) and 'not_found'.
create or replace function pack_api.room_update_deal_terms(
  p_uid uuid, p_deal_room_id uuid, p_expected_updated_at timestamptz,
  p_funding_stage text, p_funding_ask text, p_pre_money_valuation text,
  p_equity_offered text, p_previous_rounds jsonb, p_key_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_startup_id uuid;
  v_new jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select startup_id into v_startup_id from public.deal_rooms where id = p_deal_room_id;
  if v_startup_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not pack_api.authz_is_startup_founder(p_uid, v_startup_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.deal_rooms set
    funding_stage = p_funding_stage, funding_ask = p_funding_ask,
    pre_money_valuation = p_pre_money_valuation, equity_offered = p_equity_offered,
    previous_rounds = p_previous_rounds, key_metrics = p_key_metrics,
    updated_at = now()
  where id = p_deal_room_id and updated_at = p_expected_updated_at
  returning jsonb_build_object(
    'funding_stage', funding_stage, 'funding_ask', funding_ask,
    'pre_money_valuation', pre_money_valuation, 'equity_offered', equity_offered,
    'previous_rounds', previous_rounds, 'key_metrics', key_metrics, 'updated_at', updated_at
  ) into v_new;

  if v_new is null then return jsonb_build_object('ok', false, 'error', 'conflict'); end if;
  return jsonb_build_object('ok', true, 'terms', v_new);
end;
$function$;

-- ── room_append_product_image: founder-only write, optimistic concurrency
-- Read-append-write done server-side inside the CAS, so two concurrent
-- callers each retry against the CURRENT array on conflict rather than a
-- client-computed [...existing, url] going stale between read and write.
create or replace function pack_api.room_append_product_image(
  p_uid uuid, p_deal_room_id uuid, p_expected_updated_at timestamptz, p_image_url text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_startup_id uuid;
  v_new jsonb;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;

  select startup_id into v_startup_id from public.deal_rooms where id = p_deal_room_id;
  if v_startup_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not pack_api.authz_is_startup_founder(p_uid, v_startup_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.deal_rooms set
    product_images = coalesce(product_images, '[]'::jsonb) || to_jsonb(p_image_url),
    updated_at = now()
  where id = p_deal_room_id and updated_at = p_expected_updated_at
  returning jsonb_build_object('product_images', product_images, 'updated_at', updated_at) into v_new;

  if v_new is null then return jsonb_build_object('ok', false, 'error', 'conflict'); end if;
  return jsonb_build_object('ok', true, 'media', v_new);
end;
$function$;

revoke execute on function pack_api.room_update_deal_terms(uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb) from public;
revoke execute on function pack_api.room_append_product_image(uuid, uuid, timestamptz, text) from public;

grant execute on function pack_api.room_update_deal_terms(uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb) to service_role;
grant execute on function pack_api.room_append_product_image(uuid, uuid, timestamptz, text) to service_role;
