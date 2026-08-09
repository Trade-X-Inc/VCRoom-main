-- One fix found during the deal-room-core step-0 audit (CLAUDE.md §20.1),
-- a live production defect independent of the migration itself. Fixed
-- now per §5 ("a security gap found mid-phase is never out of scope").
-- See CLAUDE.md §7.4 for the general lesson this establishes.
--
-- A second finding from the same audit -- that pack_api.authz_dr_is_open
-- tests the wrong column -- was investigated further this session and
-- found to be a MISDIAGNOSIS. Not applied. See the session note in
-- CLAUDE.md §20.1 / the amendment log: status is the real, trigger-guarded,
-- mutual-confirmation-gated close state (enforce_deal_room_close_guard +
-- finalize_deal_close()), authoritative and already correctly what
-- authz_dr_is_open and its long-established twin rls_private.dr_is_open
-- (18 RLS policies depend on the latter) both test. workflow_stage='closed'
-- is a separate, older, unrelated field written by a different code path
-- (advanceWorkflowStage / deal-room-workflow-fn.ts) with no trigger guard
-- and no mutual-confirmation requirement -- changing authz_dr_is_open to
-- test it would have DEsynchronized it from rls_private.dr_is_open and
-- broken the real close mechanism, reproducing the exact two-vocabulary
-- defect in the opposite direction. Left unchanged pending a product
-- decision on reconciling the two fields (see CLAUDE.md).
--
-- ============================================================================
-- FIX -- silent no-op writes on deal_rooms for investors
-- ============================================================================
-- deal_rooms had exactly one write policy, deal_rooms_founder_manage
-- (ALL, gated on is_startup_founder(startup_id)). No investor write policy
-- existed at all. But four UI surfaces let an investor attempt a write:
-- investor_memo (app.investor.analysis.tsx), deal terms (DealTermsCard.tsx),
-- pitch_deck_url/product_video_url/product_images (DDWorkstation.tsx), and
-- workflow_stage (useStageTransition.ts).
--
-- PostgREST returns NO ERROR for a 0-row UPDATE. Every one of those sites
-- does `if (error) throw error` -- correctly -- and then shows a success
-- toast, because a request rejected by RLS is indistinguishable at the
-- client from a request that matched zero rows for an unrelated reason.
-- Verified live (rolled back, no data changed): investor UPDATE of
-- investor_memo on a room they are a genuine member of affected 0 rows;
-- the identical UPDATE run as the room's founder affected 1 row.
--
-- Product decision (this session): investors MAY write investor_memo and
-- memo_generated_at only. They MAY NOT write deal terms, workflow_stage,
-- or the pitch/media URLs -- those controls are being removed from the
-- investor-facing UI in the same change, not just left disabled.
--
-- Scope is deliberately narrow: memo write requires the caller to be BOTH
-- deal_rooms.investor_user_id AND a deal_room_members row for that room.
-- The audit found investor_user_id is a second, unenforced identity path
-- that today happens to coincide with membership on every row that has it
-- but nothing enforces that coincidence -- requiring both closes that gap
-- rather than trusting either alone.

-- RLS UPDATE policies apply their USING clause to the whole row -- there is
-- no native column-scoped UPDATE policy in Postgres. A policy alone would
-- grant the investor a full-row UPDATE (funding_ask, workflow_stage,
-- pitch_deck_url, everything), the opposite of the "memo columns only"
-- decision. Verified live during this session's own rollout, caught before
-- being left in place: after creating the policy without the trigger below,
-- an investor's UPDATE of workflow_stage on their own room's row affected 1
-- row (should be 0), as did funding_ask. Column enforcement must be a
-- trigger, not the policy.

create function pack_api.enforce_deal_rooms_investor_memo_only()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'pg_temp'
as $$
begin
  -- The founder-manage policy already permits everything for the founder;
  -- this trigger only needs to constrain the investor-memo policy's grant.
  -- A caller who is the room's founder is never blocked here because
  -- is_startup_founder's own predicate already stands independently -- this
  -- trigger fires for every UPDATE regardless of which policy admitted it,
  -- so it must not reject a legitimate founder edit.
  if public.is_startup_founder(new.startup_id) then
    return new;
  end if;

  -- Non-founder path (the investor-memo policy is the only other UPDATE
  -- grant on this table): every column except investor_memo and
  -- memo_generated_at must be unchanged.
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

create trigger deal_rooms_investor_memo_only_guard
  before update on public.deal_rooms
  for each row
  execute function pack_api.enforce_deal_rooms_investor_memo_only();

create policy "deal_rooms_investor_memo_write"
  on public.deal_rooms
  for update
  to authenticated
  using (
    investor_user_id = (select auth.uid())
    and id in (
      select deal_room_id from public.deal_room_members
      where user_id = (select auth.uid())
    )
  )
  with check (
    investor_user_id = (select auth.uid())
    and id in (
      select deal_room_id from public.deal_room_members
      where user_id = (select auth.uid())
    )
  );

comment on policy "deal_rooms_investor_memo_write" on public.deal_rooms is
  'Grants the investor a row-level UPDATE right; column scoping to investor_memo/memo_generated_at is enforced by the deal_rooms_investor_memo_only_guard trigger, not by this policy -- RLS cannot restrict UPDATE to specific columns on its own. Do not widen the investor-facing update surface without also widening the trigger''s allow-list.';
