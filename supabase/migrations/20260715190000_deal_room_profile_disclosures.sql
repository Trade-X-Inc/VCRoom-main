-- R4B step 7 fix: replace the broken user-level RLS gate with a proper
-- room-scoped disclosure table. The previous approach (20260715160000)
-- gated investor_profiles peer-read on "does ANY shared room between the
-- two users satisfy deal_room_information_unlocked" — this is not
-- expressible correctly at the RLS layer, because a bare
-- `select * from investor_profiles where user_id = X` carries no room
-- context. Confirmed live via direct SQL: a founder/investor pair sharing
-- two rooms, one locked (nda_signed) and one unlocked (closed), let the
-- founder read the investor's full private profile (check_size_min/max,
-- email, etc.) even while querying in the context of the still-locked room.
--
-- Fix: one row per (deal_room_id, investor_user_id) that exists iff that
-- SPECIFIC room has reached the information stage. investor_profiles
-- itself gets NO peer-read policy anymore — every counterparty read must
-- go through get_investor_profile_in_room(), a SECURITY DEFINER RPC that
-- takes the room id explicitly and checks this table, not investor_profiles.
-- This does not hit the "helper function querying the table it protects"
-- anti-pattern from CLAUDE.md §5: the RPC's permission check queries
-- deal_room_profile_disclosures + deal_room_members, never investor_profiles.
create table if not exists public.deal_room_profile_disclosures (
  deal_room_id uuid not null references public.deal_rooms(id) on delete cascade,
  investor_user_id uuid not null,
  unlocked_at timestamptz not null default now(),
  primary key (deal_room_id, investor_user_id)
);

comment on table public.deal_room_profile_disclosures is
  'One row per (deal_room_id, investor_user_id) present iff that specific room has reached the information-disclosure stage. The only thing that gates counterparty investor_profiles reads — never bypass via a bare investor_profiles select.';

alter table public.deal_room_profile_disclosures enable row level security;

create policy "deal_room_profile_disclosures_member_read"
  on public.deal_room_profile_disclosures for select
  using (
    exists (
      select 1 from deal_room_members drm
      where drm.deal_room_id = deal_room_profile_disclosures.deal_room_id
        and drm.user_id = auth.uid()
    )
  );

-- Keeps the disclosure table in sync with deal_rooms.workflow_stage
-- automatically — the "single atomic transaction" requirement from the
-- task: one trigger firing inside the SAME transaction as the existing
-- stage-transition UPDATE (R3's useStageTransition.approveTransition), not
-- a second app-level write the client could fail to perform.
create or replace function public.sync_deal_room_profile_disclosure()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_investor_user_id uuid;
  v_is_unlocked boolean;
begin
  v_is_unlocked := new.workflow_stage in ('initial_review', 'qa', 'diligence', 'term_sheet', 'closed');

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
$$;

drop trigger if exists trg_sync_deal_room_profile_disclosure on public.deal_rooms;
create trigger trg_sync_deal_room_profile_disclosure
  after insert or update of workflow_stage on public.deal_rooms
  for each row
  execute function public.sync_deal_room_profile_disclosure();

insert into public.deal_room_profile_disclosures (deal_room_id, investor_user_id)
select dr.id, drm.user_id
from deal_rooms dr
join deal_room_members drm on drm.deal_room_id = dr.id and drm.role in ('investor', 'viewer')
where dr.workflow_stage in ('initial_review', 'qa', 'diligence', 'term_sheet', 'closed')
on conflict (deal_room_id, investor_user_id) do nothing;

create or replace function public.get_investor_profile_in_room(p_deal_room_id uuid, p_investor_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when p.id is null then null else to_jsonb(p) end
  from investor_profiles p
  where p.user_id = p_investor_user_id
    and (
      p.user_id = auth.uid()
      or exists (
        select 1
        from deal_room_profile_disclosures d
        join deal_room_members caller on caller.deal_room_id = d.deal_room_id and caller.user_id = auth.uid()
        where d.deal_room_id = p_deal_room_id
          and d.investor_user_id = p_investor_user_id
      )
    )
  limit 1;
$$;

comment on function public.get_investor_profile_in_room(uuid, uuid) is
  'The only way to read a counterparty investor''s full profile from within a specific deal room. Checks deal_room_profile_disclosures for that exact room, not investor_profiles or workflow_stage directly, and confirms the caller is a member of that same room. Room-scoped — cannot be satisfied by an unrelated unlocked room the same two users happen to also share.';

grant execute on function public.get_investor_profile_in_room(uuid, uuid) to authenticated;

drop policy if exists "investor_profiles_peer_read" on public.investor_profiles;
drop policy if exists "founder_read_dealroom_investor_profile" on public.investor_profiles;
