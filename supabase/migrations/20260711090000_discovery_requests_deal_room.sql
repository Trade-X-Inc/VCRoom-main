-- Connection request → deal room auto-creation flow.
-- discovery_requests already IS the connection-request table (investor_id,
-- startup_id, status, message + full RLS). The only missing piece is the
-- link to the deal room created on approval.
--
-- New status value used by the flow: 'deal_room_created' (status is free
-- text — existing values: pending / approved / declined / connected).

ALTER TABLE discovery_requests
  ADD COLUMN IF NOT EXISTS deal_room_id uuid REFERENCES deal_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_discovery_requests_deal_room
  ON discovery_requests(deal_room_id) WHERE deal_room_id IS NOT NULL;
