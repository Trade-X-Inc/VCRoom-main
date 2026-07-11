-- discovery_requests.status CHECK only allowed pending/connected/declined/
-- withdrawn — 'approved' (written by the founder access-approval flow since
-- June) and the new 'deal_room_created' both violated it. Widen to match
-- every status the app writes.

ALTER TABLE discovery_requests DROP CONSTRAINT IF EXISTS discovery_requests_status_check;
ALTER TABLE discovery_requests ADD CONSTRAINT discovery_requests_status_check CHECK (
  status = ANY (ARRAY['pending', 'connected', 'declined', 'withdrawn', 'approved', 'deal_room_created']::text[])
);
