-- notifications.kind CHECK was rejecting several kinds already used by the
-- app (silently — inserts are fire-and-forget): 'view' (profile views),
-- 'access_approved' (old overview panel), and the new connection-request
-- flow kinds. Widen the constraint to match reality.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (
  kind = ANY (ARRAY[
    'deal', 'message', 'invite', 'system', 'ai', 'ai_operator',
    'document_request', 'dd_update',
    'view', 'access_approved',
    'connection_request', 'connection_declined', 'deal_room'
  ]::text[])
);
