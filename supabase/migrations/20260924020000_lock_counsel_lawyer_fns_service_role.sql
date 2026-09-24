-- SUPERSEDED, SAME SESSION, 24 Sep 2026 — see
-- 20260924030000_counsel_lawyer_fns_explicit_actor.sql. Both 1-arg
-- signatures locked down here were found, in this session's OWN live
-- verification immediately after this migration was applied, to rely on
-- auth.uid() internally — which evaluates to NULL once called via
-- runAction's service-role client (no user session bound), breaking
-- accept_lawyer_invite live with a false not_authenticated on a fully
-- valid caller. The follow-up migration drops both 1-arg signatures and
-- recreates them as 2-arg (uuid, uuid), taking the caller's uid as an
-- explicit parameter instead. This file is left as-is, unmodified, as
-- the accurate historical record of what was applied and why, at the
-- time it was applied — the grant lockdown itself (service_role-only,
-- reasoning below) is not wrong, only superseded in shape. Annotated
-- here rather than rewritten, per this repo's own changelog convention
-- (CLAUDE.md §19).
--
-- Locks finalize_counsel_waiver and accept_lawyer_invite down to
-- service_role only, migrating them off the direct-client-call pattern
-- onto the runAction gateway (Closing-stage record-wiring pass, 24 Sep
-- 2026 — extending the confirmDeliverable atomicity work, commit
-- 230a0a0, to the remaining unwired commit-class closing events).
--
-- NEITHER FUNCTION'S INTERNAL BODY CHANGES. Per direct decision: both
-- deal_rooms.waived_legal_counsel_{founder,investor}_confirmed_by/_at and
-- deal_room_lawyer_invites.accepted_by/accepted_at already give an
-- independent actor+timestamp trail for their respective state changes
-- (deal_room_members.user_id cross-references the invite's accepted_by
-- for the acceptance case) — so unlike finalize_deal_close, these two do
-- NOT need an atomic-in-SQL record_entry append. The record entry for
-- each is written by a SEPARATE pack_api.append_record call from inside
-- the new gateway action's handle(), immediately after this RPC returns
-- ok — same non-atomic 2-call shape already used for
-- confirmDeliverable's own partial-confirm branch. A gap between this
-- RPC succeeding and the record call succeeding is a correctable
-- records incident (the fallback columns above are exactly what makes it
-- correctable), not the unrecoverable state finalize_deal_close's
-- atomicity fix specifically had to close.
--
-- Before this migration, both were reachable by any authenticated
-- caller directly via supabase.rpc(...) (accept_lawyer_invite also by
-- anon, since it must be callable by someone who just signed up with no
-- prior session context beyond the invite token itself — though in
-- practice the frontend always calls it post-authentication). Their own
-- in-body auth.uid()-based checks were doing full duty as the only
-- authorization boundary. That boundary now moves into TypeScript
-- (runAction's authorize(), src/lib/actions/deal-room-counsel.ts) and
-- these functions become reachable ONLY through the service-role
-- gateway client — matching finalize_deal_close's final shape exactly
-- (CLAUDE.md §7.2: every new SECURITY DEFINER function inherits EXECUTE
-- TO PUBLIC by default; explicit revoke-then-grant, verified live via
-- pg_proc.proacl, not assumed from this file).
--
-- Old client-direct call sites (LawyerGate.tsx's finalize_counsel_waiver
-- RPC call, join-room.tsx's accept_lawyer_invite RPC call) are migrated
-- to the new gateway actions in THE SAME frontend change as this grant
-- revocation lands — no window where a stale client build calls a
-- revoked grant, per explicit instruction. get_lawyer_invite_by_token
-- is UNCHANGED here: it is a pure read with no state mutation, already
-- scoped correctly for its purpose (a public, pre-auth invite preview,
-- the same class of function CLAUDE.md §19o's "get_*_by_token MUST stay
-- anon-granted, accept_*/graduate_* must not be" rule already
-- establishes for the sibling team-invite flow) — not touched by this
-- migration.

revoke all on function finalize_counsel_waiver(uuid) from public;
revoke execute on function finalize_counsel_waiver(uuid) from anon;
revoke execute on function finalize_counsel_waiver(uuid) from authenticated;
grant execute on function finalize_counsel_waiver(uuid) to service_role;

revoke all on function accept_lawyer_invite(uuid) from public;
revoke execute on function accept_lawyer_invite(uuid) from anon;
revoke execute on function accept_lawyer_invite(uuid) from authenticated;
grant execute on function accept_lawyer_invite(uuid) to service_role;
-- postgres retains implicit execute as function owner on both.
