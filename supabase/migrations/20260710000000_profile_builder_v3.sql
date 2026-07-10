-- Profile Builder v3 — richer digital profile output columns.
-- Reuses existing columns where they already exist: team_size, founded_year,
-- registration_number, legal_entity_name (spec's legal_name), incorporated_in
-- (spec's jurisdiction), growth_rate, burn_rate, runway_months.

ALTER TABLE startups
  ADD COLUMN IF NOT EXISTS one_liner text,
  ADD COLUMN IF NOT EXISTS investor_narrative text,
  ADD COLUMN IF NOT EXISTS fundraising_instrument text,
  ADD COLUMN IF NOT EXISTS fundraising_target_close text,
  ADD COLUMN IF NOT EXISTS fundraising_committed_amount bigint,
  ADD COLUMN IF NOT EXISTS founder_ownership_pct numeric,
  ADD COLUMN IF NOT EXISTS has_options_pool boolean,
  ADD COLUMN IF NOT EXISTS total_shareholders integer,
  ADD COLUMN IF NOT EXISTS incorporated_at date,
  ADD COLUMN IF NOT EXISTS mrr_usd numeric;
