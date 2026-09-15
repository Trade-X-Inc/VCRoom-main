-- Revoke anon/PUBLIC EXECUTE on the two legacy invite-ACCEPT functions.
--
-- WHY, stated precisely so this is not mistaken for an incident fix:
-- this is DEFENCE IN DEPTH, not the closure of a live gap. Both functions
-- were probed live (15 Sep 2026) against a genuinely valid, unexpired,
-- unaccepted invite while acting as `anon`, and both correctly returned
-- not_authenticated from their own in-body `auth.uid() is null` guard:
--
--   accept_lawyer_invite : {ok:false, deal_room_id:null, error:"not_authenticated"}
--   accept_team_invite   : {"ok": false, "error": "not_authenticated"}
--
-- The invite was proven live at the time of the probe by measuring as the
-- table owner (anon's own RLS-filtered view reported 0 rows and would have
-- been a false pass); zero rows were marked accepted; the whole probe ran
-- inside a rolled-back transaction. So the grant let anon CALL these; the
-- body refused to DO anything.
--
-- It is still wrong. An accept function has no legitimate anonymous caller:
-- accepting an invite requires an identity to attach the membership to, and
-- §7.1 records that the public anon key is a real platform-signed JWT which
-- passes verify_jwt on its own. Relying solely on an in-body guard leaves
-- one edit between a refactor and a real gap.
--
-- THE CONVENTION THIS ENFORCES (established by the 14 Sep Build Step 2
-- migration, which already got it right for its own functions):
--   get_*_by_token  -> MUST be anon-granted. A join screen previews an
--                      invite before the visitor has any session.
--   accept_* /      -> MUST NOT be anon-granted. There is no such thing as
--   graduate_*         an anonymous acceptance.
-- accept_deal_room_invite_link and graduate_deal_room_prep already follow
-- this (authenticated + service_role only); these two predate it and were
-- missed. get_lawyer_invite_by_token / get_deal_room_invite_by_token keep
-- their anon grant deliberately — see §19o-adjacent note in CLAUDE.md.
--
-- Fixed together rather than one at a time, per §7.5: the same risk shape on
-- a sibling is not independently flagged by the pass that found the first.

revoke execute on function public.accept_lawyer_invite(uuid) from anon;
revoke execute on function public.accept_lawyer_invite(uuid) from public;
grant  execute on function public.accept_lawyer_invite(uuid) to authenticated;
grant  execute on function public.accept_lawyer_invite(uuid) to service_role;

revoke execute on function public.accept_team_invite(uuid) from anon;
revoke execute on function public.accept_team_invite(uuid) from public;
grant  execute on function public.accept_team_invite(uuid) to authenticated;
grant  execute on function public.accept_team_invite(uuid) to service_role;
