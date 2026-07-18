-- R14B step 1 — interview stage schema.
--
-- Extends deal_room_meetings (the existing 3-slot DD meetings table; UI
-- currently unmounted, one live row) into the 5-stage interview sequence:
-- Introduction → Product Demo → Financial Discussion → Terms Discussion →
-- Investment Terms. Status stays DERIVED (scheduled_at/completed_at/
-- meeting_type='skipped'), per the confirmed decision — no stored status
-- column. The CRM `meetings` table is untouched.
--
-- Also fixes a §33-class bug found in the R14B audit: notes_investor sat
-- on the same row as notes_shared with a single any-room-member ALL
-- policy, so a founder's direct REST SELECT could read the investor's
-- private notes. Column moves to its own investor-scoped table. (Writes
-- go through service-role server fns, so this was invisible in the UI —
-- exactly the "the client only selects three columns" trap §33 warns
-- about.)

-- ── 1. Five stages + slugs + Daily.co room refs ─────────────────────────

alter table deal_room_meetings drop constraint deal_room_meetings_meeting_number_check;
alter table deal_room_meetings add constraint deal_room_meetings_meeting_number_check
  check (meeting_number >= 1 and meeting_number <= 5);

alter table deal_room_meetings add column stage_slug text
  check (stage_slug in ('introduction','product_demo','financial_discussion','terms_discussion','investment_terms'));

-- Backfill: slot N was always the Nth meeting in sequence; the new stage
-- list is the authoritative naming of that same sequence.
update deal_room_meetings
  set stage_slug = (array['introduction','product_demo','financial_discussion','terms_discussion','investment_terms'])[meeting_number];

alter table deal_room_meetings alter column stage_slug set not null;

-- Daily.co room refs (private rooms, minted server-side — step 2).
alter table deal_room_meetings add column daily_room_name text;
alter table deal_room_meetings add column daily_room_url text;

-- ── 2. §33 fix: notes_investor → investor-scoped table ─────────────────

create table deal_room_meeting_private_notes (
  meeting_id uuid primary key references deal_room_meetings(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

insert into deal_room_meeting_private_notes (meeting_id, notes)
select id, notes_investor from deal_room_meetings where notes_investor is not null;

alter table deal_room_meetings drop column notes_investor;

alter table deal_room_meeting_private_notes enable row level security;

-- Investor side of the room only. Queries deal_room_meetings +
-- deal_room_members, never its own table (no recursion). Founders and
-- lawyers/externals match no row.
create policy "meeting_private_notes_investor"
  on deal_room_meeting_private_notes for all
  using (
    exists (
      select 1
      from deal_room_meetings m
      join deal_room_members drm on drm.deal_room_id = m.deal_room_id
      where m.id = deal_room_meeting_private_notes.meeting_id
        and drm.user_id = auth.uid()
        and drm.role = 'investor'
    )
  );

-- ── 3. Recordings / transcripts / AI-extracted notes ───────────────────

-- Deal-room content: same treatment as documents. deal_room_id is the
-- soft-delete handle — "deleting" a recording nulls it (row survives for
-- audit, RLS stops matching), never a hard delete. meeting_id keeps
-- provenance either way.
create table deal_room_meeting_records (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references deal_room_meetings(id) on delete cascade,
  deal_room_id uuid references deal_rooms(id),
  daily_recording_id text,
  recording_url text,
  transcript_text text,
  transcript_status text not null default 'pending'
    check (transcript_status in ('pending','processing','ready','failed')),
  transcript_error text,
  extracted_notes jsonb,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending','processing','ready','failed')),
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table deal_room_meeting_records enable row level security;

-- Read: any member of the room, while the room ref is live. Soft-deleted
-- rows (deal_room_id null) match nobody. No client write policies at all —
-- ingestion/extraction writes are service-role server fns only (step 5).
create policy "meeting_records_room_members"
  on deal_room_meeting_records for select
  using (
    deal_room_id is not null
    and deal_room_id in (
      select deal_room_id from deal_room_members where user_id = auth.uid()
    )
  );
