-- R42 (3/4) — repoint every dependent policy from the bare public helper to
-- rls_private.<fn>. Mechanically generated (exact `fn(` -> `rls_private.fn(`
-- replacement on each policy's real expression), 39 policies.
alter policy "portfolio_entries_own" on "public"."investor_portfolio_entries"
  using ((investor_profile_id = rls_private.get_investor_profile_id_for_user(auth.uid())))
  with check ((investor_profile_id = rls_private.get_investor_profile_id_for_user(auth.uid())));
alter policy "term_config_select" on "public"."deal_room_term_config"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "agreement_comments_read" on "public"."deal_room_agreement_comments"
  using (rls_private.dr_is_room_member(deal_room_id, auth.uid()));
alter policy "startups_invited_read" on "public"."startups"
  using (rls_private.startup_id_has_open_invite(id));
alter policy "investor_profiles_invited_read" on "public"."investor_profiles"
  using (rls_private.investor_user_id_has_open_invite(user_id));
alter policy "reopen_read" on "public"."deal_room_term_reopen_requests"
  using (rls_private.dr_is_room_member(deal_room_id, auth.uid()));
alter policy "fees_principal_read" on "public"."deal_room_fees"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "signed_principal_read" on "public"."deal_room_signed_agreements"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "payment_proof_read" on "public"."deal_room_payment_proof"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "payment_proof_insert" on "public"."deal_room_payment_proof"
  with check ((rls_private.dr_is_principal(deal_room_id, auth.uid()) AND (uploaded_by = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "close_principal_read" on "public"."deal_room_close"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "invoices_principal_read" on "public"."deal_room_invoices"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "terms_insert" on "public"."deal_room_terms"
  with check ((rls_private.dr_is_principal(deal_room_id, auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_notes_own_delete" on "public"."deal_room_notes"
  using (((user_id = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "investor_team_members_room_read" on "public"."investor_team_members"
  using ((EXISTS ( SELECT 1
   FROM (deal_rooms dr
     JOIN deal_room_members drm ON (((drm.deal_room_id = dr.id) AND (drm.user_id = auth.uid()))))
  WHERE (dr.investor_user_id = rls_private.investor_team_member_owner_user_id(investor_team_members.investor_profile_id)))));
alter policy "investor_team_member_details_unlocked_founder" on "public"."investor_team_member_details"
  using ((EXISTS ( SELECT 1
   FROM (((investor_team_members itm
     JOIN deal_rooms dr ON ((dr.investor_user_id = rls_private.investor_team_member_owner_user_id(itm.investor_profile_id))))
     JOIN deal_room_members drm ON (((drm.deal_room_id = dr.id) AND (drm.user_id = auth.uid()))))
     JOIN deal_room_profile_disclosures dpd ON (((dpd.deal_room_id = dr.id) AND (dpd.investor_user_id = dr.investor_user_id))))
  WHERE (itm.id = investor_team_member_details.team_member_id))));
alter policy "investor_insert_own" on "public"."discovery_requests"
  with check (((investor_id = auth.uid()) AND rls_private.investor_can_request_access(auth.uid())));
alter policy "term_proposals_read" on "public"."deal_room_term_proposals"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "term_reset_read" on "public"."deal_room_term_reset_requests"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "terms_select" on "public"."deal_room_terms"
  using (rls_private.dr_is_principal(deal_room_id, auth.uid()));
alter policy "summaries_member_read" on "public"."deal_room_summaries"
  using (rls_private.dr_is_room_member(deal_room_id, auth.uid()));
alter policy "agreements_member_read" on "public"."deal_room_agreements"
  using (rls_private.dr_is_room_member(deal_room_id, auth.uid()));
alter policy "term_proposals_insert" on "public"."deal_room_term_proposals"
  with check ((rls_private.dr_is_principal(deal_room_id, auth.uid()) AND (actor_user_id = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "term_config_insert" on "public"."deal_room_term_config"
  with check ((rls_private.dr_is_principal(deal_room_id, auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "term_reset_insert" on "public"."deal_room_term_reset_requests"
  with check ((rls_private.dr_is_principal(deal_room_id, auth.uid()) AND (requested_by = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "reopen_insert" on "public"."deal_room_term_reopen_requests"
  with check ((rls_private.dr_is_room_member(deal_room_id, auth.uid()) AND (requested_by = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "agreements_member_insert" on "public"."deal_room_agreements"
  with check ((rls_private.dr_is_room_member(deal_room_id, auth.uid()) AND (uploaded_by = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "agreement_comments_insert" on "public"."deal_room_agreement_comments"
  with check ((rls_private.dr_is_room_member(deal_room_id, auth.uid()) AND (author_user_id = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "qa_members_write" on "public"."deal_room_qa"
  with check (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "qa_members_update" on "public"."deal_room_qa"
  using (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "qa_members_delete" on "public"."deal_room_qa"
  using (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_notes_own_write" on "public"."deal_room_notes"
  with check (((user_id = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_notes_own_update" on "public"."deal_room_notes"
  using (((user_id = auth.uid()) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_message_write" on "public"."deal_room_messages"
  with check (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_meetings_insert" on "public"."deal_room_meetings"
  with check (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_meetings_update" on "public"."deal_room_meetings"
  using (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)))
  with check (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_meetings_delete" on "public"."deal_room_meetings"
  using (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_stage_request_write" on "public"."deal_room_stage_requests"
  with check (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
alter policy "deal_room_stage_request_update" on "public"."deal_room_stage_requests"
  using (((deal_room_id IN ( SELECT deal_room_members.deal_room_id
   FROM deal_room_members
  WHERE (deal_room_members.user_id = auth.uid()))) AND rls_private.dr_is_open(deal_room_id)));
