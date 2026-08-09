-- Deal-room-core step 2c: column-scoped read functions on deal_rooms.
--
-- deal_rooms is 58 columns spanning at least five features (room identity,
-- investor CRM fields, deal terms, term sheet, workflow state) -- a single
-- room_get returning all of it would hand every member the full term-sheet
-- and memo surface. Split per concern instead, each independently
-- authorized. Column contract traced from real UI/server-fn consumers
-- (Explore-agent sweep of 27 files, spot-checked directly), not assumed
-- from schema or naming:
--   Room identity  -- DealTermsCard, useDealRoomContext, room-list routes
--   Deal terms     -- DealTermsCard.tsx's own existing .select(), confirmed
--                     the complete real consumer set: no other file reads
--                     these 6 columns
--   Term sheet     -- getDealRoomWorkflow()/DealRoomWorkflow.tsx, read by
--                     BOTH sides once sent (unlike deal terms, not founder-
--                     authored-only)
--   Workflow state -- DealRoomWorkflow.tsx, documents.tsx (stage2_unlocked
--                     alone), qa.tsx (qa_completed_at/by alone)
-- investor_memo/memo_generated_at are investor-PRIVATE analysis notes
-- (app.investor.analysis.tsx, write-only, never read by any founder-facing
-- file) -- carved into their own function, self-scoped to
-- investor_user_id = caller, never returned to the founder side.
-- pitch_deck_url/product_video_url/product_images are room media
-- (DDWorkstation.tsx), unrelated to deal economics -- own function.
--
-- Zero-consumer columns (investor_org_id, investor_scores, investor_notes,
-- decision, decision_reason, decision_at, follow_up_date,
-- term_sheet_requested, term_sheet_requested_at,
-- term_sheet_doc_uploaded_at, last_nudge_sent_at, waived_legal_counsel_at,
-- waived_legal_counsel_founder_confirmed_by,
-- waived_legal_counsel_investor_confirmed_by) are excluded from every
-- function's return set. Add on demand when a real caller needs one,
-- re-traced at that time -- not spec'd in from the schema.
--
-- Lawyer scoping mirrors step 2b's precedent exactly, not re-derived:
-- deal summary and term sheet ARE in the lawyer's documented scope
-- (LawyerRoomView.tsx renders both); workflow-state's QA-adjacent fields
-- (qa_completed_at/by) are diligence-adjacent and excluded, matching the
-- qa_categories/deal_room_qa narrowing already applied. Room identity and
-- deal terms carry no lawyer exclusion -- consistent with deal_rooms_
-- founder_manage and deal_room_term_sheets_members never being narrowed
-- in 2b (they were explicitly left in the lawyer's scope).
-- Room media (pitch deck etc.) is diligence-adjacent product material, not
-- closing material -- excluded for the lawyer, same reasoning as documents.
-- investor_memo is investor-private regardless of lawyer status -- a lawyer
-- is never the investor_user_id, so self-scoping alone already excludes
-- them; no separate lawyer check needed there.

-- ── 1. Room identity ─────────────────────────────────────────────────────
create or replace function pack_api.room_get_identity(p_uid uuid, p_deal_room_id uuid)
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
    'id', d.id, 'startup_id', d.startup_id, 'status', d.status,
    'created_at', d.created_at, 'updated_at', d.updated_at,
    'investor_name', d.investor_name, 'investor_email', d.investor_email,
    'investor_company', d.investor_company, 'created_by', d.created_by,
    'investor_decision', d.investor_decision, 'closed_at', d.closed_at,
    'investor_user_id', d.investor_user_id
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'room', v_row);
end;
$function$;

-- ── 2. Deal terms ────────────────────────────────────────────────────────
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
    'previous_rounds', d.previous_rounds, 'key_metrics', d.key_metrics
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'terms', v_row);
end;
$function$;

-- ── 3. Term sheet ────────────────────────────────────────────────────────
create or replace function pack_api.room_get_term_sheet(p_uid uuid, p_deal_room_id uuid)
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
    'term_sheet_status', d.term_sheet_status,
    'term_sheet_valuation', d.term_sheet_valuation,
    'term_sheet_equity_pct', d.term_sheet_equity_pct,
    'term_sheet_pro_rata', d.term_sheet_pro_rata,
    'term_sheet_board_seat', d.term_sheet_board_seat,
    'term_sheet_investment_amount', d.term_sheet_investment_amount,
    'term_sheet_type', d.term_sheet_type,
    'term_sheet_sent_at', d.term_sheet_sent_at,
    'term_sheet_accepted_at', d.term_sheet_accepted_at,
    'term_sheet_doc_path', d.term_sheet_doc_path,
    'waived_legal_counsel', d.waived_legal_counsel
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'term_sheet', v_row);
end;
$function$;

-- ── 4. Workflow state ────────────────────────────────────────────────────
-- Lawyer excluded from qa_completed_at/by (diligence-adjacent), matching
-- the deal_room_qa narrowing in 2b. Everything else in this bucket
-- (workflow_stage, stage progress, meeting counts) is visible to the
-- lawyer -- it is the same "what stage is this room in" signal
-- LawyerRoomView.tsx itself reads to decide what to render.
create or replace function pack_api.room_get_workflow_state(p_uid uuid, p_deal_room_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_row jsonb;
  v_is_lawyer boolean;
begin
  if p_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not pack_api.authz_is_deal_room_member(p_uid, p_deal_room_id) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_is_lawyer := pack_api.authz_is_room_lawyer(p_uid, p_deal_room_id);

  select jsonb_build_object(
    'workflow_stage', d.workflow_stage, 'stage_entered_at', d.stage_entered_at,
    'meetings_completed', d.meetings_completed, 'meetings_max', d.meetings_max,
    'stage2_unlocked', d.stage2_unlocked, 'stage2_unlocked_at', d.stage2_unlocked_at,
    'stage1_complete', d.stage1_complete, 'closed_at_workflow', d.closed_at_workflow,
    'qa_completed_at', case when v_is_lawyer then null else d.qa_completed_at end,
    'qa_completed_by', case when v_is_lawyer then null else d.qa_completed_by end
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'workflow', v_row);
end;
$function$;

-- ── 5. Room media ────────────────────────────────────────────────────────
-- Diligence-adjacent product material (pitch deck, demo video, product
-- images) -- excluded for the lawyer, same reasoning as documents_room_read
-- in 2b.
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
    'product_images', d.product_images
  ) into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'media', v_row);
end;
$function$;

-- ── 6. Investor memo (self-scoped, never returned to the founder) ───────
-- Written only by app.investor.analysis.tsx, never read by any
-- founder-facing file in the trace -- investor-private analysis notes, not
-- deal terms and not the record (Foundation §16 Rule 16.1 / CLAUDE.md §10 --
-- AI-adjacent notes stay outside anything resembling the record). Scoped to
-- investor_user_id = caller: a founder calling this, even as a genuine
-- member, gets 'forbidden'. A lawyer is never investor_user_id, so no
-- separate lawyer check is needed -- self-scoping already excludes them.
create or replace function pack_api.room_get_investor_memo(p_uid uuid, p_deal_room_id uuid)
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

  select jsonb_build_object('investor_memo', d.investor_memo, 'memo_generated_at', d.memo_generated_at)
  into v_row
  from public.deal_rooms d
  where d.id = p_deal_room_id and d.investor_user_id = p_uid;

  if v_row is null then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'memo', v_row);
end;
$function$;

-- REGRESSION FIX, caught by the adversarial matrix itself: Postgres grants
-- EXECUTE to PUBLIC by default on newly created functions. Every other
-- pack_api function (doc_insert, doc_list_room, pack_get, all authz_*, both
-- 2b additions) is explicitly scoped to postgres/service_role only -- that
-- revoke step was missed for these six on first creation. p_uid is a
-- caller-supplied parameter, not derived from auth.uid() (CLAUDE.md §7.1's
-- identity-spoofing shape); the accepted mitigation in this codebase is
-- that only the trusted service-role layer can reach the function at all.
-- Without this revoke, `set local role anon` plus a real user's uuid as
-- p_uid returned that user's real room data -- verified live before this
-- fix. Re-verified live after: `authenticated` role gets a real
-- "permission denied for function" error, not data.
revoke execute on function pack_api.room_get_identity(uuid, uuid) from public;
revoke execute on function pack_api.room_get_deal_terms(uuid, uuid) from public;
revoke execute on function pack_api.room_get_term_sheet(uuid, uuid) from public;
revoke execute on function pack_api.room_get_workflow_state(uuid, uuid) from public;
revoke execute on function pack_api.room_get_media(uuid, uuid) from public;
revoke execute on function pack_api.room_get_investor_memo(uuid, uuid) from public;

grant execute on function pack_api.room_get_identity(uuid, uuid) to service_role;
grant execute on function pack_api.room_get_deal_terms(uuid, uuid) to service_role;
grant execute on function pack_api.room_get_term_sheet(uuid, uuid) to service_role;
grant execute on function pack_api.room_get_workflow_state(uuid, uuid) to service_role;
grant execute on function pack_api.room_get_media(uuid, uuid) to service_role;
grant execute on function pack_api.room_get_investor_memo(uuid, uuid) to service_role;
