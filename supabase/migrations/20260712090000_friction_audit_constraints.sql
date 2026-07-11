-- Friction audit: align CHECK constraints with what the app actually writes.
--
-- 1. notifications.kind — four more kinds the code writes were being
--    silently rejected: deal_activity (stage changes), deal_room_invite
--    (invite accepted), verification (registry check complete, edge fn),
--    decision (investor invest/hold/pass).
-- 2. users.role — account deletion soft-deletes by setting role='deleted';
--    the constraint rejected it, so deletion has been a silent no-op.
-- 3. Existing notification rows pointing at the removed /app/vc-leads
--    route (404) now point at /app/connections.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (
  kind = ANY (ARRAY[
    'deal', 'message', 'invite', 'system', 'ai', 'ai_operator',
    'document_request', 'dd_update',
    'view', 'access_approved',
    'connection_request', 'connection_declined', 'deal_room',
    'deal_activity', 'deal_room_invite', 'verification', 'decision'
  ]::text[])
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role = ANY (ARRAY['founder', 'investor', 'investor_member', 'admin', 'deleted']::text[])
);

UPDATE notifications SET action_url = '/app/connections' WHERE action_url = '/app/vc-leads';
