-- R41: pin every remaining SECURITY DEFINER function against pg_temp
-- shadowing. See CLAUDE.md §49 for the full lesson.
--
-- R40 proved `SET search_path TO 'public'` does NOT protect a SECURITY
-- DEFINER function body: pg_temp is searched IMPLICITLY FIRST for relation
-- names unless it is named explicitly, so an attacker who can CREATE TEMP
-- TABLE (any authenticated user -- TEMP is granted to PUBLIC) can shadow an
-- unqualified table reference and make the function read their fake table.
-- A real exploit read foreign deal-room nda_acceptances this way.
--
-- Two patterns are equivalent for safety (both verified in R41 against a
-- full multi-table simultaneous shadow attack, as a genuinely non-member
-- authenticated account -- 0 rows leaked everywhere):
--   (a) SET search_path = '' + every reference fully qualified (public.x)
--   (b) SET search_path = public, pg_temp   -- pg_temp named LAST
-- This sweep uses (b): a pure ALTER FUNCTION SET, NO body changes, so zero
-- risk of a typo in a rewritten body silently breaking a policy across 33
-- functions. The 8 functions fixed in R40 already use (a); the 4 already on
-- `public, pg_temp` already have (b). After this migration, zero SECURITY
-- DEFINER functions in public remain on the vulnerable bare `public`.

ALTER FUNCTION public.accept_lawyer_invite(p_token uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_access_deal_room_doc_path(object_name text) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_access_founder_doc_path(object_name text) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_appoint_role(p_startup_id uuid, p_investor_profile_id uuid, p_new_role text) SET search_path = public, pg_temp;
ALTER FUNCTION public.deal_room_information_unlocked(p_deal_room_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.dr_is_open(p_deal_room_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.dr_is_principal(p_deal_room_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.dr_is_room_member(p_deal_room_id uuid, p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.finalize_counsel_waiver(p_deal_room_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.finalize_deal_close(p_deal_room_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_investor_profile_id_for_user(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_investor_profile_in_room(p_deal_room_id uuid, p_investor_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_investor_startup_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_investor_team_role(p_investor_profile_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_investor_team_role_by_profile_id(p_investor_profile_row_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_lawyer_invite_by_token(p_token uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_investor_profile(p_slug text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_investor_profile_by_user_id(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_investor_profiles_by_user_ids(p_user_ids uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_startup_team_user_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_team_startup_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.global_search(search_query text, searcher_id uuid, searcher_role text, result_limit integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.investor_can_request_access(p_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.investor_has_permission(p_investor_profile_id uuid, p_permission text) SET search_path = public, pg_temp;
ALTER FUNCTION public.investor_median_days_to_decision(p_investor_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.investor_team_member_owner_user_id(p_investor_profile_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.investor_user_id_has_open_invite(p_investor_user_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_startup_founder(startup_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.roast_expire_overdue() SET search_path = public, pg_temp;
ALTER FUNCTION public.roast_question_pool_count(p_session_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.roast_submit_race_click(p_session_id uuid, p_user_id uuid, p_round integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.startup_id_has_open_invite(p_startup_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_deal_room_profile_disclosure() SET search_path = public, pg_temp;
