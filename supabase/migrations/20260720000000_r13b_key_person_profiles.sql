-- R13B step 1/7 — key-person profile schema, split for the same reason
-- CLAUDE.md §32.3 documents for payment_status: Postgres RLS is row-level
-- only, never column-level. Confirmed empirically before writing this
-- migration: team_members' existing team_deal_room_member policy grants
-- ANY deal-room counterparty a full-row SELECT (bio included) with zero
-- disclosure-stage gate — a direct query as the test investor against a
-- real inserted row returned the full bio text. The only structural fix
-- is splitting gated fields into their own table, not adding an RPC
-- alongside an already-fully-visible row (an RPC is not a security
-- boundary if the base table already leaks the same data via SELECT *).
--
-- team_members / investor_team_members KEEP only what the founder's
-- decision says is always visible pre-unlock: name, title/designation,
-- photo. Everything else (bio, highlights, individual social links) moves
-- to new *_details tables, gated by deal_room_profile_disclosures via the
-- same room-scoped check get_investor_profile_in_room already uses.

-- ── Founder side ────────────────────────────────────────────────────────

alter table team_members add column key_person boolean not null default false;

create table team_member_details (
  team_member_id uuid primary key references team_members(id) on delete cascade,
  highlights jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- bio moves here too — team_members.bio is dropped after backfill so
-- there's no lingering duplicate copy of gated content on the public row.
insert into team_member_details (team_member_id, highlights, social_links)
select id, '[]'::jsonb, case when linkedin_url is not null and linkedin_url <> ''
  then jsonb_build_array(jsonb_build_object('platform', 'LinkedIn', 'url', linkedin_url))
  else '[]'::jsonb end
from team_members;

-- Preserve existing bio text into team_member_details before dropping it
-- from the public table (added as a real column, not folded into
-- highlights, since it's a distinct field in the founder's spec).
alter table team_member_details add column bio text;
update team_member_details tmd set bio = tm.bio from team_members tm where tm.id = tmd.team_member_id;

alter table team_members drop column bio;
alter table team_members drop column linkedin_url;

alter table team_member_details enable row level security;

-- Owner (founder) always has full access to their own team's detail rows.
create policy "team_member_details_owner"
  on team_member_details for all
  using (
    exists (
      select 1 from team_members tm
      join startups s on s.id = tm.startup_id
      where tm.id = team_member_details.team_member_id
        and s.founder_id = auth.uid()
    )
  );

-- Deal-room counterparty: only once THEIR OWN unlock row exists for a
-- room they share with this startup — same shape as
-- get_investor_profile_in_room's check, applied here as a direct RLS
-- predicate since this is a plain table read, not an RPC.
create policy "team_member_details_unlocked_room_member"
  on team_member_details for select
  using (
    exists (
      select 1
      from team_members tm
      join deal_rooms dr on dr.startup_id = tm.startup_id
      join deal_room_profile_disclosures dpd
        on dpd.deal_room_id = dr.id and dpd.investor_user_id = auth.uid()
      where tm.id = team_member_details.team_member_id
    )
  );

-- ── Investor side ───────────────────────────────────────────────────────
-- Per spec: simpler than founder side — photo, name, contact, description,
-- designation only, no individual social links. "Contact" was captured in
-- the UI form but never persisted (confirmed in audit) — adding a real
-- column now. key_person mirrors the founder side so the same Overview/
-- Information rendering logic can treat both symmetrically.

alter table investor_team_members add column key_person boolean not null default false;
alter table investor_team_members add column contact_email text;

create table investor_team_member_details (
  team_member_id uuid primary key references investor_team_members(id) on delete cascade,
  bio text,
  updated_at timestamptz not null default now()
);

insert into investor_team_member_details (team_member_id, bio)
select id, bio from investor_team_members;

alter table investor_team_members drop column bio;
alter table investor_team_members drop column linkedin_url;

alter table investor_team_member_details enable row level security;

create policy "investor_team_member_details_owner"
  on investor_team_member_details for all
  using (
    exists (
      select 1 from investor_team_members itm
      join investor_profiles ip on ip.id = itm.investor_profile_id
      where itm.id = investor_team_member_details.team_member_id
        and ip.user_id = auth.uid()
    )
  );

-- Founder counterparty: unlocked via the SAME deal_room_profile_disclosures
-- row (keyed by investor_user_id, matched directly to deal_rooms.investor_user_id
-- — that FK already identifies which investor account owns a given room,
-- no need to join through investor_profiles.email/created_by at all) —
-- the founder side of the mutual disclosure, mirroring how
-- MutualDisclosure.tsx already gates the investor's OWN profile fields for
-- the founder once unlocked.
create policy "investor_team_member_details_unlocked_founder"
  on investor_team_member_details for select
  using (
    exists (
      select 1
      from investor_team_members itm
      join investor_profiles ip on ip.id = itm.investor_profile_id
      join deal_rooms dr on dr.investor_user_id = ip.user_id
      join deal_room_members drm on drm.deal_room_id = dr.id and drm.user_id = auth.uid()
      join deal_room_profile_disclosures dpd
        on dpd.deal_room_id = dr.id and dpd.investor_user_id = ip.user_id
      where itm.id = investor_team_member_details.team_member_id
    )
  );
