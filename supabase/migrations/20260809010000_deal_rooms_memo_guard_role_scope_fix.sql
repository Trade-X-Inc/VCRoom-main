-- REGRESSION FIX for 20260809000000's guard trigger. Two defects, both found
-- and closed live in the same session, both by probing rather than reading.
--
-- Defect 1 (the regression): the guard bypassed itself on
-- is_startup_founder(new.startup_id), which is auth.uid()-derived. All nine
-- server-side deal_rooms writers (src/lib/deal-room-fn.ts,
-- src/lib/deal-room-workflow-fn.ts -- stage advance, term-sheet response,
-- pass deal, meetings) use the SERVICE ROLE via sbFetch and therefore have
-- no auth.uid(); the founder check returned false and the guard rejected
-- every one of them. finalize_deal_close() (SECURITY DEFINER, owner postgres)
-- was rejected the same way, which blocked deal closing outright. Verified
-- live before the fix: service_role UPDATE of workflow_stage AND of status
-- both raised the memo-only exception.
--
-- Defect 2 (introduced by the first attempt at fixing defect 1): gating the
-- bypass on `current_user <> 'authenticated'` disables the guard for
-- EVERYONE, because inside a SECURITY DEFINER function current_user and
-- session_user both report the function OWNER (postgres), never the caller.
-- Probed directly to confirm: with `set local role authenticated`, a
-- SECURITY DEFINER function observes current_user=postgres,
-- session_user=postgres, current_setting('role')=authenticated. Caught by
-- re-running the investor funding_ask probe, which stopped raising.
-- current_setting('role') is the only correct discriminator here.
--
-- Verified live across all four contexts after this version:
--   investor  + funding_ask   -> raises (blocked)
--   investor  + investor_memo -> 1 row  (allowed)
--   founder   + full row      -> 1 row  (allowed)
--   service   + workflow_stage/status -> 1 row (allowed)
--   finalize_deal_close()     -> reaches its own mutual-confirmation guard
--
-- CLAUDE.md §7.2 already records that postgres-owned SECURITY DEFINER
-- functions bypass RLS; this adds the companion trap -- they also mask the
-- caller's role from current_user, so never use current_user for
-- caller-role checks inside one.

create or replace function pack_api.enforce_deal_rooms_investor_memo_only()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'pg_temp'
as $$
declare
  v_role text := coalesce(current_setting('role', true), '');
begin
  -- Only the authenticated role reaches this table through the investor-memo
  -- RLS policy. service_role / postgres / SECURITY DEFINER callers bypass RLS
  -- entirely and are out of this guard's scope.
  if v_role <> 'authenticated' then
    return new;
  end if;

  -- Founders are covered by deal_rooms_founder_manage and may write anything.
  if public.is_startup_founder(new.startup_id) then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.workflow_stage is distinct from old.workflow_stage
     or new.funding_ask is distinct from old.funding_ask
     or new.pre_money_valuation is distinct from old.pre_money_valuation
     or new.equity_offered is distinct from old.equity_offered
     or new.funding_stage is distinct from old.funding_stage
     or new.previous_rounds is distinct from old.previous_rounds
     or new.key_metrics is distinct from old.key_metrics
     or new.pitch_deck_url is distinct from old.pitch_deck_url
     or new.product_video_url is distinct from old.product_video_url
     or new.product_images is distinct from old.product_images
     or new.investor_name is distinct from old.investor_name
     or new.investor_email is distinct from old.investor_email
     or new.investor_company is distinct from old.investor_company
     or new.investor_user_id is distinct from old.investor_user_id
     or new.startup_id is distinct from old.startup_id
     or new.term_sheet_status is distinct from old.term_sheet_status
     or new.term_sheet_doc_path is distinct from old.term_sheet_doc_path
     or new.waived_legal_counsel is distinct from old.waived_legal_counsel
  then
    raise exception 'investor may only update investor_memo and memo_generated_at on deal_rooms';
  end if;

  return new;
end;
$$;
