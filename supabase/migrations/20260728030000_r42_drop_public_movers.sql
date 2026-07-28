-- R42 (4/4) — drop the public (RPC-reachable) copies. All 39 dependent
-- policies now reference rls_private.<fn> (verified 0 remaining public refs).
-- This is what removes the RPC-exposure surface. Verified after: every moved
-- function returns PostgREST 404, and a zero-membership attacker gets 0 rows
-- from every sensitive deal-room table for a foreign room.
drop function public.deal_room_information_unlocked(uuid);
drop function public.dr_is_open(uuid);
drop function public.dr_is_principal(uuid, uuid);
drop function public.dr_is_room_member(uuid, uuid);
drop function public.drm_is_founder_of_room(uuid, uuid);
drop function public.get_deal_room_member_ids(uuid);
drop function public.get_investor_profile_id_for_user(uuid);
drop function public.investor_can_request_access(uuid);
drop function public.investor_team_member_owner_user_id(uuid);
drop function public.investor_user_id_has_open_invite(uuid);
drop function public.startup_id_has_open_invite(uuid);
