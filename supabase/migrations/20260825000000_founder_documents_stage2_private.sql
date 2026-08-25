-- ============================================================================
-- founder_documents: "stage2" means FULLY PRIVATE, not a wider grant
-- ============================================================================
-- CLAUDE.md §19g-weight defect. Live, wrong, on a real (non-fixture) account.
--
-- THE DEFECT
-- The founder-facing toggle (app.documents.tsx) presents visibility='stage2'
-- as withheld -- its own tooltip reads "Not in deal room - click to include".
-- Both enforcement layers did the OPPOSITE: they treated 'stage2' as a WIDER
-- grant than 'deal_room', releasing the document to any investor holding
-- discovery_requests.detail_pack_approved = true, i.e. at the PRE-deal-room
-- stage. A founder pressing "remove from deal room" published to a strictly
-- larger audience than leaving it in.
--
-- Product decision (founder, 25 Aug 2026): "not in deal room" = fully private.
-- 'stage2' therefore grants NOTHING to any investor by any path.
--
-- BOTH LAYERS ARE FIXED HERE, DELIBERATELY, IN ONE MIGRATION.
-- The row-level policy (investor_read_approved_docs) and the storage-object
-- gate (can_access_founder_doc_path, reached from storage policy
-- documents_bucket_select) each carried the identical stage2 branch. Fixing
-- one alone leaves the document readable by the other path -- the metadata
-- row via PostgREST, or the actual FILE via a signed storage URL.
-- Verified live before this migration, as the real affected investor:
--   problem-solution file      -> can_access = TRUE   (reachable)
--   financial-model file       -> can_access = FALSE  (stage-3 blocklist held)
-- so the storage layer was genuinely open for any non-blocklisted template.
--
-- NOT WIDENED: every 'deal_room' branch is preserved verbatim. This migration
-- only REMOVES grants. No caller gains access it did not already have.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Row-level: drop the stage2 branch from the discovery_requests path.
-- ---------------------------------------------------------------------------
-- Before: (visibility='stage2' AND dr.detail_pack_approved)
--      OR (visibility='deal_room' AND dr.status='connected')
-- After:  (visibility='deal_room' AND dr.status='connected')
-- The two deal_rooms-based branches below are unchanged, character for
-- character, from the original policy.
alter policy "investor_read_approved_docs"
  on public.founder_documents
  using (
    (startup_id IN ( SELECT dr.startup_id
       FROM discovery_requests dr
      WHERE ((dr.investor_id = auth.uid()) AND (founder_documents.visibility = 'deal_room'::text) AND (dr.status = 'connected'::text))))
    OR ((visibility = 'deal_room'::text) AND (startup_id IN ( SELECT d.startup_id
       FROM deal_rooms d
      WHERE ((d.status = 'active'::text) AND (d.investor_email = auth.email())))))
    OR ((visibility = 'deal_room'::text) AND (startup_id IN ( SELECT d.startup_id
       FROM deal_rooms d
      WHERE ((d.status = 'active'::text) AND (d.created_by = auth.uid())))))
  );

-- ---------------------------------------------------------------------------
-- 2. Storage: drop the same stage2 branch from the object-path gate.
-- ---------------------------------------------------------------------------
-- Body preserved verbatim except the removed stage2 branch. The stage-3
-- template blocklist is RETAINED: it is an independent defense-in-depth
-- control (it blocked financial-model even while the stage2 branch was open)
-- and removing it here would silently widen a second boundary while we
-- narrow this one.
create or replace function public.can_access_founder_doc_path(object_name text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_startup_id uuid;
  v_template_slug text;
  v_stage3_slugs text[] := array['financial-model','cap-table','incorporation-docs','shareholder-agreements','bank-statements','customer-references'];
begin
  -- founder-docs/{startup_id}/{template_slug}/{filename}
  if (storage.foldername(object_name))[1] != 'founder-docs' then
    return false;
  end if;
  v_startup_id := ((storage.foldername(object_name))[2])::uuid;
  v_template_slug := (storage.foldername(object_name))[3];

  -- Owner always has full access.
  if is_startup_founder(v_startup_id) then
    return true;
  end if;

  -- Never expose a stage-3 template's file via room approval at the storage
  -- layer, regardless of what the visibility column says.
  if v_template_slug = any(v_stage3_slugs) then
    return false;
  end if;

  -- Investor with an active deal room with this startup, for a
  -- deal_room-visible doc. 'stage2' grants nothing to anyone: it means the
  -- founder has withheld the document.
  return exists (
    select 1 from founder_documents fd
    where fd.startup_id = v_startup_id
      and fd.template_slug = v_template_slug
      and fd.visibility = 'deal_room'
      and exists (
        select 1 from deal_rooms d
        where d.startup_id = v_startup_id
          and d.status = 'active'
          and (d.investor_email = auth.email() or d.created_by = auth.uid())
      )
  );
end;
$function$;

comment on function public.can_access_founder_doc_path(text) is
  'Storage-object gate for founder-docs/. Owner full access; stage-3 template slugs never released to a non-owner; otherwise requires visibility=deal_room AND an active deal room. visibility=''stage2'' means withheld and grants nothing (fixed 25 Aug 2026 -- it previously granted MORE than deal_room, to pre-deal-room detail-pack investors, inverting the founder UI''s own promise).';

-- ---------------------------------------------------------------------------
-- 3. Drop deal_room_stage -- dead column.
-- ---------------------------------------------------------------------------
-- Zero writers anywhere in the codebase (only reads, hardcoded = 1). The
-- investor stage-1/stage-2 split in app.deal-rooms.$id.documents.tsx keys on
-- it, so its stage-2 branch was unreachable: all 5 rows are deal_room_stage=1,
-- including both 'stage2'-visibility rows. Retaining it invites a future
-- author to treat it as a live tier.
alter table public.founder_documents drop column if exists deal_room_stage;
