-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: vc_leads — founder fundraising pipeline / investor CRM
-- Apply via: Supabase SQL editor or CLI (supabase db push)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vc_leads (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id     uuid        REFERENCES users(id) ON DELETE CASCADE,
  investor_name  text        NOT NULL,
  firm_name      text,
  email          text,
  linkedin_url   text,
  sector         text,
  stage          text,
  geography      text,
  ticket_size    text,
  status         text        NOT NULL DEFAULT 'New'
    CHECK (status IN (
      'New', 'Shortlisted', 'Contacted', 'Replied',
      'Meeting Booked', 'Interested',
      'Deal Room Created', 'Rejected', 'Follow Up'
    )),
  notes          text,
  follow_up_date date,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE vc_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_owner" ON vc_leads
  FOR ALL
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_vc_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vc_leads_updated_at
  BEFORE UPDATE ON vc_leads
  FOR EACH ROW EXECUTE FUNCTION update_vc_leads_updated_at();
