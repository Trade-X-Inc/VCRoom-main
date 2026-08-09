-- Deal-room-core step 2b, part 1 of 2: the primitive. Separate migration
-- from the policy changes so it can be verified standalone before anything
-- depends on it (12/12 agreement against ground truth across every
-- user x room pair, including null identity, before part 2 was applied).
--
-- NOTE ON STEP 2a (the authorization port): no migration exists for it
-- because none was needed. All nine authz_* primitives this group requires
-- were already ported in 9398d03 (documents group) and were re-verified
-- this session against the live RLS predicates they replace: 18/18
-- agreement for authz_is_deal_room_member across every user x room pair
-- including null identity, 10/10 for authz_is_startup_founder /
-- authz_founder_has_permission across every user x startup pair. Zero
-- semantic change, which is what step 2a required -- see CLAUDE.md §20.1.
--
-- The room-native lawyer (deal_room_members.role = 'lawyer') has a
-- documented, deliberately narrow scope. LawyerRoomView.tsx states it:
-- "deal summary, term sheet area, the Investment Terms meeting slot, and
-- its records. Nothing else... must never delegate to the shared
-- Overview/Information/Q&A/Diligence routes -- those pages read
-- startup-wide data this role is not scoped to."
--
-- That scope was enforced ONLY in the client. Of 58 membership-based RLS
-- policies, exactly 3 discriminate on role (two of them scoping the lawyer
-- to stage_slug='investment_terms', proving the intent was understood when
-- they were written). The other 55 treated a lawyer as a full principal.
-- Verified live as test-lawyer@ before this change: 10 deal_room_qa rows
-- including real diligence content ("What is your current monthly recurring
-- revenue?", "How many full-time employees do you currently have?"), 6
-- dd_categories, 8 dd_checklist_items, 1 document, 1 team_members row --
-- none of which LawyerRoomView ever renders.

create or replace function pack_api.authz_is_room_lawyer(p_uid uuid, p_deal_room_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select p_uid is not null and p_deal_room_id is not null and exists (
    select 1 from public.deal_room_members
    where user_id = p_uid and deal_room_id = p_deal_room_id and role = 'lawyer'
  );
$function$;

comment on function pack_api.authz_is_room_lawyer(uuid, uuid) is
  'True when the caller is a room-native lawyer for this room. Used to EXCLUDE the lawyer from membership-granted policies covering material outside the documented closing-only scope (Q&A, diligence, non-closing documents, team PII, profile sections). Deliberate behaviour change, 9 Aug 2026 -- not a faithful port. Scoped PER ROOM: a user who is a lawyer in room A and a principal in room B is narrowed only in A. See CLAUDE.md.';
