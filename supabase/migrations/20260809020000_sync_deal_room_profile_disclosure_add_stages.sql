-- Fix (a) from the workflow_stage scoping report (9 Aug 2026). See
-- CLAUDE.md §20.1 for the full trace. Trigger dependents checked before
-- this change per the new standing rule: three RLS policies
-- (team_member_details_unlocked_room_member,
-- investor_team_member_details_unlocked_founder,
-- deal_room_profile_disclosures_member_read) plus one RPC
-- (get_investor_profile_in_room, not previously identified — widens
-- automatically, no separate allow-list) all key off
-- deal_room_profile_disclosures and needed no changes of their own.
-- MutualDisclosure.tsx (frontend) hardcoded an identical copy of the
-- unlock list purely for UI decisions — updated in the same commit, or
-- this fix would have had no visible effect (its queries stay disabled
-- for the newly-unlocked stages even once RLS permits them).
--
-- sync_deal_room_profile_disclosure()'s unlock set omitted due_diligence
-- and closing, the exact two stages useStageTransition.ts's STAGE_ORDER
-- advances into after qa/term_sheet. Proven live before this fix:
-- advancing a room qa -> due_diligence deleted its
-- deal_room_profile_disclosures row, silently revoking the investor's
-- access to founder team PII (and the founder's to the investor's) on
-- forward progress through the deal.
--
-- nda_signed and information_vault remain deliberately locked
-- (pre-diligence stages). This is a minimal two-value addition only --
-- the broader vocabulary questions (workflow_stage/status reconciliation,
-- the diligence/due_diligence and initial_review/qa synonym pairs) are
-- explicitly out of scope here and tracked in CLAUDE.md §20.1 as open
-- items for the deal-room-core group.

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
  v_is_unlocked := new.workflow_stage in ('initial_review', 'qa', 'diligence', 'due_diligence', 'term_sheet', 'closing', 'closed');

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
