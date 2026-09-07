-- Build Step 0 hardening, fix 2 of 3: `invites` has no SELECT policy at
-- all today (invites_select_by_token / its R40 successor invites_token_select
-- were both dropped, the latter deliberately per R40's comment, "restored by
-- a future SECURITY DEFINER RPC refactor, out of scope for that branch" --
-- this is that follow-up). Confirmed against production: only invites_insert
-- and invites_recipient_accept (UPDATE) currently exist, so an unauthenticated
-- recipient cannot read an invite row at all.
--
-- Scope decision: token-possession, not recipient-identity. The one live
-- consumer, join.team.$token.tsx, reads the row BEFORE the visitor is
-- necessarily signed in (it renders a "sign in to accept" state precisely
-- because auth.uid() is null at read time) -- gating on caller identity would
-- break that flow. This matches the ORIGINAL invites_select_by_token design
-- intent ("Anyone can read an invite by token") and the same
-- token-possession-as-credential model this codebase already uses for
-- team_invites' preview_team_invite() RPC (returns {valid:false} uniformly
-- for invalid/expired/already-accepted, rather than distinguishing them, so
-- a dead token can't be probed). invites.email is nullable ("null = open
-- invite" per the original 20240528000000_invites.sql comment), so an
-- identity-scoped policy could not work for every row shape anyway.
--
-- FOOTGUN, DELIBERATELY ACCEPTED -- READ BEFORE ADDING A NEW CONSUMER:
-- this policy scopes ROW VISIBILITY ONLY, by invite state, NOT by recipient
-- identity. Any authenticated OR anonymous caller holding a valid,
-- unexpired, unaccepted token can read that row. It does NOT stop a caller
-- from reading a DIFFERENT invite's row if they somehow have that row's id
-- rather than its token. Every consumer MUST filter by the exact token
-- (`.eq("token", token)`), never list/browse the table -- an unfiltered
-- `select("*")` with no token predicate would return the full list of every
-- active, unaccepted invite in the system, not just the caller's own. This
-- mirrors the original design and the one live consumer's actual behavior;
-- it is not a mistake, but it is a real constraint on future callers.
create policy "invites_recipient_read" on invites
  for select
  using (
    accepted_at is null
    and expires_at > now()
  );

-- Cross-user notification for invite-fn.ts's sendInviteEmail, which
-- currently inserts into `notifications` for the INVITEE (not the caller)
-- using an anon-key-with-caller-bearer-token client. Since R40 dropped
-- authenticated_insert_any/notifications_authenticated_insert, the only
-- remaining policy (notifications_own, ALL, qual user_id = auth.uid(),
-- with_check NULL) makes that insert fail RLS silently -- caught only by
-- the call site's own try/catch. This RPC is the sole path for that one
-- specific case: it re-derives its own justification (a matching invites
-- row must exist) rather than trusting the caller, so it cannot be used as
-- a general arbitrary-notification-spoofing primitive even though it is
-- callable by any authenticated user.
--
-- kind is hardcoded to 'deal_room_invite', confirmed present in the current
-- notifications_kind_check constraint (20260713090000_founder_roast.sql) --
-- verified before hardcoding, not assumed.
create or replace function public.notify_invite_recipient(
  p_invite_id uuid,
  p_recipient_user_id uuid,
  p_deal_room_id uuid,
  p_title text,
  p_body text,
  p_action_url text
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into notifications (user_id, kind, title, body, meta, action_url, read)
  select p_recipient_user_id, 'deal_room_invite', p_title, p_body,
         jsonb_build_object('deal_room_id', p_deal_room_id), p_action_url, false
  where exists (
    select 1 from invites where id = p_invite_id and deal_room_id = p_deal_room_id
  );
$$;

revoke all on function public.notify_invite_recipient(uuid, uuid, uuid, text, text, text) from public;
-- "revoke all from public" alone does not strip anon's inherited PUBLIC
-- execute grant on this instance (functions get a default PUBLIC execute
-- grant at creation, and anon inherits from PUBLIC independently of this
-- revoke's ordering relative to the grant below) -- confirmed live: after
-- applying this migration without the line below, anon still had EXECUTE.
-- Explicit revoke required so a fresh run reproduces the corrected state.
revoke execute on function public.notify_invite_recipient(uuid, uuid, uuid, text, text, text) from anon;
grant execute on function public.notify_invite_recipient(uuid, uuid, uuid, text, text, text) to authenticated;
