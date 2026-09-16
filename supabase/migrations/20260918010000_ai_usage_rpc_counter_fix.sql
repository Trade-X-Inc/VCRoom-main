-- ai_usage rate-limiter fix — the platform-wide check_and_increment_ai_usage
-- RPC has almost certainly NEVER successfully run: its own INSERT ... ON
-- CONFLICT (user_id,feature,usage_date) targets a unique constraint that has
-- never existed on this table (only ai_usage_pkey, on id, confirmed via
-- pg_constraint/pg_indexes) — every call 42P10s at the database layer. All 6
-- real callers (ai-secure-fn.ts x3, profile-builder-fn.ts x2,
-- investor-profile-builder-fn.ts, advisor-fn.ts fail open on this error;
-- library.ts's 3a-ii clarity-check is the one caller already hardened
-- fail-closed). This migration does not "repair" a working cap — it turns
-- enforcement ON for the first time ever, which is why the cap value is
-- itself part of this fix (see step 3).
--
-- ai_usage IS TWO INCOMPATIBLE ROW SHAPES SHARING ONE TABLE, found during
-- recon before writing this migration — a plain unique index on
-- (user_id,feature,usage_date) would have broken a second, unrelated write
-- pattern:
--   1. RPC-counter rows: written only by check_and_increment_ai_usage,
--      always with an explicit, real feature name (confirmed against every
--      current caller: "thesis", "summary", "qa_draft", "document_extraction",
--      "investor_profile_extract", "advisor", "library_clarity" — none is
--      "general"). One row per (user,feature,day), incremented via
--      ON CONFLICT.
--   2. Audit-log rows: written directly by linkedin-fn.ts, reply-fn.ts, and
--      ai-fn.ts via a plain `.insert({ user_id, action })`, with no
--      feature/call_count set at all — every such row lands on the column
--      DEFAULTs (feature='general', call_count=0). These are genuinely
--      MULTIPLE per (user,'general',day) BY DESIGN — one row per action
--      logged, not a counter. A plain unique index on the full tuple would
--      have made every insert past the first, per user per day, fail.
--
-- `feature <> 'general'` reliably separates the two: verified against the
-- column DEFAULTs (feature NOT NULL DEFAULT 'general', action NOT NULL
-- DEFAULT 'email_gen' — action IS NULL is impossible and was considered and
-- rejected as a predicate) and against every real caller's literal feature
-- string (none is "general"). A PARTIAL unique index scoped to this
-- predicate is Option A from recon — smaller than splitting into two
-- tables (Option B), and the RPC's own ON CONFLICT target is satisfied
-- since it never inserts a 'general' row.

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — DEDUP (must run before the index; scoped to RPC-counter rows
-- only). Correctness/future-proofing, not required to unblock today's
-- index creation: confirmed live that ZERO current rows have
-- feature <> 'general' (all 11 existing rows are audit-log output, the
-- RPC has never successfully written one) — this migration is a provable
-- no-op against current data, kept anyway so the fix is correct if this
-- table's write pattern ever produces a real RPC-row collision later.
-- Audit-log rows (feature='general') are NEVER touched by either query
-- below — they are real, distinct events, not duplicates.
with ranked as (
  select id, user_id, feature, usage_date, call_count,
    row_number() over (
      partition by user_id, feature, usage_date
      order by created_at asc, id asc
    ) as rn
  from public.ai_usage
  where feature <> 'general'
),
totals as (
  select user_id, feature, usage_date, sum(call_count) as total_calls
  from public.ai_usage
  where feature <> 'general'
  group by user_id, feature, usage_date
)
update public.ai_usage a
set call_count = t.total_calls
from ranked r, totals t
where a.id = r.id and r.rn = 1
  and r.user_id = t.user_id and r.feature = t.feature and r.usage_date = t.usage_date;

with ranked as (
  select id, row_number() over (
    partition by user_id, feature, usage_date
    order by created_at asc, id asc
  ) as rn
  from public.ai_usage
  where feature <> 'general'
)
delete from public.ai_usage a
using ranked r
where a.id = r.id and r.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — the partial unique index. This is the actual fix: the RPC's
-- own ON CONFLICT (user_id,feature,usage_date) target now has a matching
-- unique constraint to satisfy, and only for the row shape it ever writes.
create unique index if not exists ai_usage_rpc_counter_uq
  on public.ai_usage (user_id, feature, usage_date)
  where feature <> 'general';

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3 — cap value: raise free-tier from 20/day to 50/day, decided
-- explicitly BEFORE this fix ships because the cap has never actually
-- fired — turning it on at the old value would be a live, untested
-- behavior change on day one for real users. 20 combined AI actions/day
-- (document extractions + clarity checks + thesis/summary/qa drafts, all
-- summed together per the RPC's own no-per-feature-split design) is
-- plausible to brush against in one real active-building session; 50
-- still stops abuse without walling a legitimate heavy beta user. Pro
-- left unchanged — it bypasses to unlimited via the RPC's own
-- `v_plan IN ('pro','enterprise')` branch regardless of the stored
-- ai_calls_daily_limit value.
alter table public.user_plans
  alter column ai_calls_daily_limit set default 50;

-- Backfill: existing free-plan rows are already sitting at the OLD
-- default (20) as a stored value, not just inheriting the column
-- default going forward — changing the column default alone would only
-- affect brand-new signups. All 9 current free-plan rows confirmed at
-- exactly ai_calls_daily_limit=20 before this migration; only rows at
-- that exact old free-tier value are touched, so a pro user who was ever
-- (for any reason) given a custom 20-limit is not silently overwritten —
-- scoped by plan AND by the specific old value together, not by plan
-- alone.
update public.user_plans
  set ai_calls_daily_limit = 50
  where plan = 'free' and ai_calls_daily_limit = 20;

comment on column public.user_plans.ai_calls_daily_limit is
  'Daily AI-call cap, summed across every feature (see check_and_increment_ai_usage) for free-plan users. 50/day as of 2026-09-18 (raised from 20 the same day the underlying rate-limiter RPC was fixed to actually enforce it for the first time — see the ai_usage_rpc_counter_uq migration). pro/enterprise plans bypass this column entirely via the RPC''s own unlimited branch.';

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4 — RPC reconciled to the LIVE body, verified applied and tested
-- by the product owner directly (not retyped from this draft) — per
-- CLAUDE.md §7.2, pulled fresh via pg_get_functiondef and reproduced
-- byte-for-byte below, comments included, since function-body comments
-- are part of the stored source. Two corrections vs. the drafted version
-- this migration originally shipped for review: the bootstrap INSERT and
-- the denial message both now correctly reflect the free-tier cap
-- dynamically (v_limit) rather than a hardcoded "50/day" string that
-- would silently go stale the next time this value changes; the
-- ON CONFLICT ... WHERE predicate-matching requirement (STEP 2's index is
-- PARTIAL) was found live, in a rolled-back transaction, before this
-- migration was finalized — a bare ON CONFLICT (user_id,feature,
-- usage_date) 42P10s identically to the pre-fix state even with
-- ai_usage_rpc_counter_uq already created, since Postgres's ON CONFLICT
-- inference only matches a partial index when the conflict target's own
-- WHERE clause is present and satisfies the index's predicate.
create or replace function public.check_and_increment_ai_usage(p_user_id uuid, p_feature text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_limit INTEGER;
  v_current INTEGER;
  v_plan TEXT;
BEGIN
  SELECT plan, ai_calls_daily_limit INTO v_plan, v_limit
  FROM public.user_plans WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_plans (user_id, plan, ai_calls_daily_limit, deal_rooms_limit)
    VALUES (p_user_id, 'free', 50, 3);
    v_plan := 'free';
    v_limit := 50;
  END IF;

  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', 0, 'limit', -1);
  END IF;

  SELECT COALESCE(SUM(call_count), 0) INTO v_current
  FROM public.ai_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  IF v_current >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'plan', v_plan, 'used', v_current, 'limit', v_limit,
      'message', 'Daily AI limit reached (' || v_limit || '/day on free plan). Upgrade to Pro for unlimited access.'
    );
  END IF;

  -- ON CONFLICT predicate MUST echo ai_usage_rpc_counter_uq's WHERE, or
  -- Postgres 42P10s (a partial index needs the matching partial conflict
  -- target). p_feature is never 'general', so this always matches.
  INSERT INTO public.ai_usage (user_id, feature, usage_date, call_count)
  VALUES (p_user_id, p_feature, CURRENT_DATE, 1)
  ON CONFLICT (user_id, feature, usage_date) WHERE feature <> 'general'
  DO UPDATE SET call_count = public.ai_usage.call_count + 1;

  RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'used', v_current + 1, 'limit', v_limit);
END;
$function$;
