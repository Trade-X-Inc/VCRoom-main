-- Deal-room-core step 2b, part 2 of 2: narrow the lawyer to the documented
-- closing-only scope. DELIBERATE BEHAVIOUR CHANGE, not a faithful port --
-- closing a real gap where the client enforced a boundary RLS did not.
-- Product decision recorded in CLAUDE.md; see 20260809030000 for the
-- primitive and the evidence of what the lawyer could read before this.
--
-- Method: each policy below keeps its EXISTING predicate verbatim and gains
-- one appended term, `and not pack_api.authz_is_room_lawyer(auth.uid(), <room>)`.
-- Nothing else about any policy changes -- no membership logic rewritten,
-- no dr_is_open term touched. Founder and investor paths are unaffected by
-- construction, since the added term is false for them; proven live rather
-- than assumed (see the verification block at the bottom of this comment).
--
-- NOT touched, deliberately -- these do not grant via room membership, so a
-- lawyer either never satisfies them or legitimately should:
--   documents_own                                   (uploader_id = auth.uid())
--   team_startup_owner / team_member_details_owner  (founder-owned)
--   profile_sections_founder                        (is_startup_founder)
--   profile_sections_public                         (visibility='public')
-- documents_own in particular is load-bearing for the lawyer: they must
-- still see closing documents THEY upload. Verified live -- a lawyer-
-- uploaded document remains visible to them after this change.
--
-- Also NOT touched: the 3 policies that ALREADY scope the lawyer correctly
-- (deal_room_meetings_select, meeting_records_room_members,
-- meeting_private_notes_investor) -- they are the precedent this follows.
--
-- IN SCOPE for the lawyer, therefore NOT narrowed: deal_room_term_sheets,
-- deal_room_agreements, deal_room_closing_items, deal_room_closure_reports,
-- nda_*, deal_rooms itself (deal summary). Verified still readable after.
--
-- LIVE VERIFICATION (fixture room, all rolled back):
--   lawyer   qa 10->0, dd_categories 6->0, dd_checklist 8->0,
--            documents 1->0, team_members 1->0, profile_sections 0->0
--   lawyer   deal_rooms 1, members 3, agreements 1, meetings 1, ndas 3  (kept)
--   lawyer   INSERT into deal_room_qa -> RLS violation                  (blocked)
--   lawyer   own uploaded document still visible                        (kept)
--   investor qa 23=23, dd 12=12/31=31, documents 6=6, team 1=1     (unchanged)
--   investor INSERT into deal_room_qa -> 1 row                     (unchanged)
--   founder  qa 23, dd 12/31, documents 6, profile_sections 11, PII 1 (unchanged)
--   non-member  qa/dd on foreign room -> 0                          (isolated)
--   anon        qa/dd/deal_rooms -> 0                               (isolated)
--   service     qa 23, dd 12, documents 9, team 1                  (unaffected)
--   cross-room  lawyer in room A + principal in room B -> 0 in A, 1 in B

-- ── Q&A: all four commands ───────────────────────────────────────────────
alter policy "qa_members_read" on public.deal_room_qa
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "qa_members_write" on public.deal_room_qa
  with check ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                                where deal_room_members.user_id = auth.uid()))
              and rls_private.dr_is_open(deal_room_id)
              and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "qa_members_update" on public.deal_room_qa
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and rls_private.dr_is_open(deal_room_id)
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "qa_members_delete" on public.deal_room_qa
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and rls_private.dr_is_open(deal_room_id)
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

-- ── Diligence ────────────────────────────────────────────────────────────
alter policy "dd_categories_member_access" on public.dd_categories
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "dd_checklist_member_access" on public.dd_checklist_items
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "dd_analysis_member_read" on public.deal_room_dd_analysis
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = (select auth.uid())))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

-- ── Documents outside closing ────────────────────────────────────────────
alter policy "documents_room_read" on public.documents
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "doc_reviews_member_access" on public.document_reviews
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

alter policy "doc_requests_access" on public.document_requests
  using ((deal_room_id in (select deal_room_members.deal_room_id from public.deal_room_members
                           where deal_room_members.user_id = auth.uid()))
         and not pack_api.authz_is_room_lawyer(auth.uid(), deal_room_id));

-- ── Team PII and profile sections (startup-wide data) ────────────────────
alter policy "team_deal_room_member" on public.team_members
  using (exists (select 1 from public.deal_rooms dr
                 join public.deal_room_members drm on drm.deal_room_id = dr.id
                 where dr.startup_id = team_members.startup_id
                   and drm.user_id = auth.uid()
                   and not pack_api.authz_is_room_lawyer(auth.uid(), dr.id)));

alter policy "team_member_details_unlocked_room_member" on public.team_member_details
  using (exists (select 1 from public.team_members tm
                 join public.deal_rooms dr on dr.startup_id = tm.startup_id
                 join public.deal_room_members caller on caller.deal_room_id = dr.id and caller.user_id = auth.uid()
                 join public.deal_room_profile_disclosures dpd on dpd.deal_room_id = dr.id and dpd.investor_user_id = auth.uid()
                 where tm.id = team_member_details.team_member_id
                   and not pack_api.authz_is_room_lawyer(auth.uid(), dr.id)));

alter policy "profile_sections_deal_room" on public.startup_profile_sections
  using ((visibility = 'deal_room'::text)
         and (startup_id in (select dr.startup_id from public.deal_rooms dr
                             join public.deal_room_members drm on drm.deal_room_id = dr.id
                             where drm.user_id = auth.uid()
                               and not pack_api.authz_is_room_lawyer(auth.uid(), dr.id))));
