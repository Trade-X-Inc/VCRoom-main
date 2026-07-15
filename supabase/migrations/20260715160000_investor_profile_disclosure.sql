-- R4B: Investor Digital Profile + mutual disclosure data model.
--
-- 1. Extends investor_profiles with the fields the new profile page and the
--    deal-room Information tab need: fund/role/size/cheque-range already
--    exist under different names (fund_size, check_size_min/max) and are
--    reused as-is. What's missing: a verifiable track_record array, a
--    public_fields whitelist, and a cached profile_completeness score.
--    (The editable team roster stays on investor_team_members — no new
--    team column, reusing what already exists per the task's instruction.)
-- 2. Upgrades investor_claims to match startup_claims (claim_category,
--    ai_verdict, ai_reasoning, ai_confidence, human_reviewed, notes) so
--    track-record verification can mirror the founder claims pattern
--    exactly, per explicit decision (was a strict subset before this).

alter table public.investor_profiles
  add column if not exists track_record jsonb not null default '[]'::jsonb,
  add column if not exists public_fields text[] not null default array[
    'fund_name', 'your_name', 'role', 'thesis_statement', 'sectors', 'stages',
    'geography', 'verification_tier', 'achievements', 'avatar_url', 'social_links'
  ],
  add column if not exists profile_completeness int not null default 0;

comment on column public.investor_profiles.track_record is
  'jsonb array of {label, detail, verified boolean default false}; verified flips true only via an investor_claims AI/human check, never a self-report.';
comment on column public.investor_profiles.public_fields is
  'Whitelist of investor_profiles column names renderable on the public /i/:slug page. Enforced at the query layer, not just in the UI.';

alter table public.investor_claims
  add column if not exists claim_category text,
  add column if not exists ai_verdict text,
  add column if not exists ai_reasoning text,
  add column if not exists ai_confidence text,
  add column if not exists human_reviewed boolean not null default false,
  add column if not exists human_reviewer_notes text;

-- 3. SECURITY FIX: investor_profiles today has NO stage gate at all — any
--    deal room counterparty can read the full row (including cheque range,
--    exclusions, key metrics) from the moment the room is created, before
--    NDA even. This closes that gap: peer read access now requires BOTH
--    deal room membership AND workflow_stage having advanced past
--    nda_signed. Production data uses "qa" as well as "initial_review" for
--    that milestone (see src/lib/deal-room-stages.ts's stageRank(), which
--    already normalizes both spellings) — this function matches both.
--
--    SECURITY DEFINER is required so the policy can read deal_rooms /
--    deal_room_members without those tables' own RLS blocking the check,
--    but the function itself never queries investor_profiles — no
--    self-referential recursion risk (the exact bug class CLAUDE.md warns
--    about).
create or replace function public.deal_room_information_unlocked(p_deal_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from deal_rooms dr
    where dr.id = p_deal_room_id
      and dr.workflow_stage in ('initial_review', 'qa', 'diligence', 'term_sheet', 'closed')
  );
$$;

comment on function public.deal_room_information_unlocked(uuid) is
  'True once a deal room has advanced past nda_signed (the app''s Information stage gate). Used by investor_profiles / founder-facing disclosure RLS so counterparty profile fields are unreadable before that point, even via a direct API query.';

drop policy if exists "investor_profiles_peer_read" on public.investor_profiles;
create policy "investor_profiles_peer_read"
  on public.investor_profiles for select
  using (
    user_id = auth.uid()
    or (
      user_id in (
        select deal_room_members.user_id
        from deal_room_members
        where deal_room_members.deal_room_id in (
          select deal_room_members_1.deal_room_id
          from deal_room_members deal_room_members_1
          where deal_room_members_1.user_id = auth.uid()
        )
      )
      and exists (
        select 1
        from deal_room_members drm
        where drm.user_id = investor_profiles.user_id
          and drm.deal_room_id in (
            select drm2.deal_room_id from deal_room_members drm2 where drm2.user_id = auth.uid()
          )
          and public.deal_room_information_unlocked(drm.deal_room_id)
      )
    )
  );

drop policy if exists "founder_read_dealroom_investor_profile" on public.investor_profiles;
create policy "founder_read_dealroom_investor_profile"
  on public.investor_profiles for select
  using (
    exists (
      select 1
      from deal_rooms dr
      join startups s on s.id = dr.startup_id
      where dr.status = 'active'
        and s.founder_id = auth.uid()
        and (investor_profiles.user_id = dr.created_by or investor_profiles.email = dr.investor_email)
        and public.deal_room_information_unlocked(dr.id)
    )
  );
