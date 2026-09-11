-- Build Step 1: server-side lifecycle stage enforcement. Collapses the
-- 9-value deal_rooms.workflow_stage CHECK constraint (two overlapping
-- vocabularies with synonym pairs) into one canonical 5-stage sequence, and
-- adds real server-side ordering enforcement — previously a client could
-- call advanceDealStage({to_stage:"closed"}) (or the equivalent direct
-- .update()) on a room at ANY stage and it would succeed; neither the
-- CHECK constraint nor any trigger validated old->new adjacency.
--
-- Canonical sequence, approved:
--   nda_signed -> qa -> diligence -> term_sheet -> closing_confirmed
--
-- Collapses applied:
--   nda_signed, information_vault  -> nda_signed
--   initial_review, qa             -> qa
--   diligence, due_diligence       -> diligence
--   term_sheet                     -> term_sheet (unchanged)
--   closing, closed                -> closing_confirmed
--
-- The terminal value is deliberately NOT "closed". workflow_stage='closed'
-- previously collided, in grep and in review, with the separate, real,
-- trigger-guarded deal_rooms.status='closed' (the mutual-confirmation close
-- event via finalize_deal_close()) — a documented live incident, not a
-- hypothetical (a room was found with workflow_stage='closed',
-- status='active', and an audit initially misread which column was stale).
-- "closing_confirmed" cannot be confused with status='closed' in a quick
-- read or grep. This does NOT touch status, decision, investor_decision, or
-- term_sheet_status — all four confirmed out of scope (status is already
-- correctly guarded by enforce_deal_room_close_guard(); decision has zero
-- writers/readers; investor_decision has one reader, zero writers).

-- ── 1. Drop the OLD constraint FIRST ────────────────────────────────────────
-- MUST precede the backfill below. Sequencing lesson, found on first apply
-- (not caught by logic-trace review — it only surfaces when actually run):
-- a migration that both backfills a value AND changes the constraint
-- governing that value must drop/change the constraint BEFORE the backfill,
-- never after. The old constraint (excluding 'closing_confirmed') is still
-- in force against any UPDATE issued before it's dropped, so writing the
-- new canonical value first raises a 23514 check violation against the
-- constraint being replaced. Verified: this exact ordering failed on first
-- apply attempt with the backfill written before the drop; corrected order
-- below is what was actually applied and verified live.
--
-- No tracked migration ever created deal_rooms_workflow_stage_check (it was
-- applied out-of-band against the live project) — this is the first time
-- it enters tracked history.
alter table deal_rooms drop constraint if exists deal_rooms_workflow_stage_check;

-- ── 2. Manual, verified backfill — AFTER the old constraint is gone ────────
-- Exactly 3 live rows exist in production as of this migration's authoring
-- (confirmed independently against the live DB, not inferred). Two are
-- already canonical values and need no write. The third is targeted by its
-- specific row id, not a blanket `WHERE workflow_stage = 'closed'` clause,
-- so this migration is self-documenting about exactly which row was
-- touched and why.
--
-- Row 957f9750-00c7-402a-b1ba-d9c7a4e3ba2f is the Atlas Robotics FIXTURE
-- deal room (CLAUDE.md §13's permanent adversarial/test fixture, not a
-- real customer deal) — verified live. It is the exact room CLAUDE.md's
-- workflow_stage='closed'/status='active' incident describes. Remapped
-- explicitly here: workflow_stage 'closed' -> 'closing_confirmed'. Its
-- status column (a separate, real value, currently 'active') is NOT
-- touched by this migration.
update deal_rooms
set workflow_stage = 'closing_confirmed'
where id = '957f9750-00c7-402a-b1ba-d9c7a4e3ba2f'
  and workflow_stage = 'closed';

-- The other two live rows (workflow_stage 'nda_signed' and 'qa') are
-- already canonical values under the new constraint below and require no
-- write — confirmed, not assumed, against the live GROUP BY count taken
-- before this migration was authored.

-- ── 3. Add the NEW constraint — collapse to the canonical 5-value set ──────
-- Added only after the backfill above, so the table never has a moment
-- where a row's value fails the constraint currently in force.
alter table deal_rooms add constraint deal_rooms_workflow_stage_check
  check (workflow_stage = any (array[
    'nda_signed', 'qa', 'diligence', 'term_sheet', 'closing_confirmed'
  ]::text[]));

-- ── 4. Disclosure-unlock sync — updated in the SAME migration as the ───────
-- constraint/rename, per the standing lesson this table's own history
-- already recorded once (9 Aug 2026: the unlock list omitted two values,
-- silently revoking investor access to founder team PII on forward stage
-- progress — CLAUDE.md's own incident). The 7-value list collapses to 4:
-- qa/diligence now each cover what two names covered before, and "closed"
-- is gone from workflow_stage entirely. nda_signed remains deliberately
-- excluded (pre-diligence stage, matching the existing precedent).
create or replace function public.sync_deal_room_profile_disclosure()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_investor_user_id uuid;
  v_is_unlocked boolean;
begin
  v_is_unlocked := new.workflow_stage in ('qa', 'diligence', 'term_sheet', 'closing_confirmed');

  select drm.user_id into v_investor_user_id
  from deal_room_members drm
  where drm.deal_room_id = new.id
    and drm.role in ('investor', 'viewer')
  limit 1;

  if v_investor_user_id is null then
    return new;
  end if;

  if v_is_unlocked then
    insert into public.deal_room_profile_disclosures (deal_room_id, investor_user_id)
    values (new.id, v_investor_user_id)
    on conflict (deal_room_id, investor_user_id) do nothing;
  else
    delete from public.deal_room_profile_disclosures
    where deal_room_id = new.id and investor_user_id = v_investor_user_id;
  end if;

  return new;
end;
$function$;
-- Trigger declaration unchanged (AFTER INSERT OR UPDATE OF workflow_stage,
-- created in 20260715190000_deal_room_profile_disclosures.sql) — this
-- CREATE OR REPLACE only swaps the function body bound to the existing
-- trigger, same pattern as the 9 Aug 2026 fix.

-- ── 5. SECURITY DEFINER RPC — the sanctioned write path ────────────────────
-- Mirrors finalize_deal_close()'s shape exactly: SECURITY DEFINER,
-- re-derives the caller's authorization internally rather than trusting the
-- request, returns a {ok, error} row. Unlike finalize_deal_close (called
-- server-side via service-role sbFetch), this RPC is called directly from
-- the browser client (supabase.rpc(...), same pattern as
-- finalize_counsel_waiver in LawyerGate.tsx) — auth.uid() derives the
-- caller from the request's own session, never a client-supplied id.
--
-- Authorization: founder/investor principals only, mirroring
-- principalRoomMember()'s logic (deal-room-fn.ts /
-- deal-room-workflow-fn.ts) — a lawyer or viewer role is rejected. This is
-- the load-bearing line: a SECURITY DEFINER function bypasses RLS by
-- definition, so this internal check IS the authorization boundary, not a
-- convenience check backed by RLS underneath it.
--
-- Adjacency: strict, exactly one canonical step forward. No evidence found
-- anywhere in the codebase of a legitimate multi-stage skip (approved,
-- flagged as an assumption in the structural-fit report, confirmed by
-- product decision before this migration was written).
create or replace function public.advance_workflow_stage(p_deal_room_id uuid, p_to_stage text)
returns table(ok boolean, error text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_order text[] := array['nda_signed','qa','diligence','term_sheet','closing_confirmed'];
  v_uid uuid := auth.uid();
  v_role text;
  v_current text;
  v_current_idx int;
  v_target_idx int;
begin
  if v_uid is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  select drm.role into v_role
  from deal_room_members drm
  where drm.deal_room_id = p_deal_room_id and drm.user_id = v_uid;

  if v_role is distinct from 'founder' and v_role is distinct from 'investor' then
    return query select false, 'not_authorized';
    return;
  end if;

  select workflow_stage into v_current from deal_rooms where id = p_deal_room_id;
  if v_current is null then
    return query select false, 'not_found';
    return;
  end if;

  v_current_idx := array_position(v_order, v_current);
  v_target_idx := array_position(v_order, p_to_stage);

  if v_target_idx is null then
    return query select false, 'invalid_stage';
    return;
  end if;

  if v_current_idx is null or v_target_idx <> v_current_idx + 1 then
    return query select false, 'not_adjacent';
    return;
  end if;

  update deal_rooms set workflow_stage = p_to_stage, updated_at = now() where id = p_deal_room_id;
  return query select true, null::text;
end;
$$;

revoke all on function public.advance_workflow_stage(uuid, text) from public;
revoke execute on function public.advance_workflow_stage(uuid, text) from anon;
grant execute on function public.advance_workflow_stage(uuid, text) to authenticated;
-- service_role/postgres retain implicit execute as table/function owners;
-- explicit anon revoke per the Build Step 0 lesson (a function's default
-- PUBLIC execute grant is inherited by anon independently of "revoke all
-- from public"'s ordering relative to any later grant).

comment on function public.advance_workflow_stage(uuid, text) is
  'Build Step 1: the sanctioned write path for deal_rooms.workflow_stage transitions. Founder/investor principals only (lawyer/viewer rejected). Validates strict one-step adjacency against the canonical 5-stage sequence before writing. Mirrors finalize_deal_close()''s shape.';

-- ── 6. BEFORE UPDATE trigger — defense-in-depth ─────────────────────────────
-- Catches any write to workflow_stage that bypasses the RPC above (e.g. a
-- reintroduced raw client .update(), exactly useStageTransition.ts's
-- pre-this-build pattern). Only evaluates when workflow_stage actually
-- changes — an UPDATE touching other columns with workflow_stage unchanged
-- passes through untouched (`new.workflow_stage IS DISTINCT FROM old`).
--
-- Trigger name deliberately chosen to sort alphabetically AFTER the three
-- existing BEFORE UPDATE triggers on deal_rooms (Postgres fires same-timing
-- triggers in alphabetical order by name, not declaration order):
--   deal_rooms_investor_memo_only_guard  (already blocks any workflow_stage
--     change from a non-founder `authenticated` caller outright, before
--     this trigger would ever run for that caller class — confirmed,
--     no further action needed per the approved decision)
--   enforce_counsel_waiver_write          (no workflow_stage overlap)
--   trg_deal_room_close_guard             (no workflow_stage overlap)
--   zz_enforce_workflow_stage_order       (this trigger — fires last)
-- Firing last means it evaluates after the two column-unrelated triggers
-- (whose outcomes are unaffected by this trigger's position, since they
-- inspect different columns) and, for founder/service-role callers who
-- bypass the memo-only guard, is the trigger that actually enforces
-- adjacency on this column.
create or replace function public.enforce_workflow_stage_order()
returns trigger
language plpgsql
as $$
declare
  v_order text[] := array['nda_signed','qa','diligence','term_sheet','closing_confirmed'];
  v_old_idx int;
  v_new_idx int;
begin
  if new.workflow_stage is distinct from old.workflow_stage then
    v_old_idx := array_position(v_order, old.workflow_stage);
    v_new_idx := array_position(v_order, new.workflow_stage);
    if v_new_idx is null then
      raise exception 'workflow_stage must be one of %', v_order;
    end if;
    if v_old_idx is not null and v_new_idx <> v_old_idx + 1 then
      raise exception 'illegal workflow_stage transition: % -> % (must advance exactly one canonical stage)', old.workflow_stage, new.workflow_stage;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_enforce_workflow_stage_order on deal_rooms;
create trigger zz_enforce_workflow_stage_order
  before update on deal_rooms
  for each row execute function public.enforce_workflow_stage_order();

comment on function public.enforce_workflow_stage_order() is
  'Build Step 1: defense-in-depth for workflow_stage ordering. Catches any write bypassing advance_workflow_stage(), e.g. a raw client .update() or a future service-role writer. Only evaluates on actual workflow_stage change (no-op otherwise). Fires last among deal_rooms'' BEFORE UPDATE triggers by design (see trigger name).';
