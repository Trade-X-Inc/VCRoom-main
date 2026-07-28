-- R43 -- drop deal_room_members.accepted_at.
--
-- Confirmed unread across all six surfaces, re-verified exhaustively in this
-- pass: client code, RLS policies, SECURITY DEFINER functions, triggers,
-- views, edge functions. The only function referencing both
-- deal_room_members and accepted_at in its body is accept_lawyer_invite --
-- confirmed its accepted_at write targets deal_room_lawyer_invites, a
-- different table; it never touches this column.
--
-- The only client write (app.deal-rooms.$id.nda.tsx's upsert) has been
-- removed in this same branch -- it always failed with 42P10 (no unique
-- constraint ever existed on (deal_room_id, user_id)) and its error was
-- silently swallowed, so the write never actually landed in production.
-- Membership itself is created correctly by approveConnectionRequest
-- (connection-request-fn.ts) and accept_lawyer_invite, neither of which
-- sets this column.

alter table public.deal_room_members drop column if exists accepted_at;
