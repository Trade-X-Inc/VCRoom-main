-- Verification system redesign — active proof at every tier.
-- Additive only: new columns + content updates. No drops.

-- ── 1. verification_tiers: new tier definitions ──────────────────────────────

UPDATE verification_tiers SET
  tier_name = 'Identity Confirmed',
  description = 'Automated identity checks — all must pass: email domain matches website, website mentions the company, company found in a public registry, and real domain infrastructure (mail records + domain age).'
WHERE id = 1;

UPDATE verification_tiers SET
  tier_name = 'Claims Verified',
  description = 'Every stated number is backed by a document that AI confirmed supports that specific claim. Requires at least 3 verified claims including at least 1 financial claim. A pitch deck never verifies a financial claim.'
WHERE id = 2;

UPDATE verification_tiers SET
  tier_name = 'Operationally Verified',
  description = 'Primary evidence of active operations: three independent documents (bank statement, customer contract, tax/VAT registration, accounts, or payroll), each AI-checked against strict criteria, then spot-checked by a human before the badge is awarded.'
WHERE id = 3;

UPDATE verification_tiers SET
  tier_name = 'Hockystick Verified',
  description = 'Full human review: live video call, identity matched against documents, manual sign-off by a named Hockystick reviewer.'
WHERE id = 4;

-- ── 2. founder_verifications: per-check Tier 1 columns (all-must-pass model) ─

ALTER TABLE founder_verifications
  ADD COLUMN IF NOT EXISTS tier1_email_match boolean,
  ADD COLUMN IF NOT EXISTS tier1_email_detail text,
  ADD COLUMN IF NOT EXISTS tier1_website_match boolean,
  ADD COLUMN IF NOT EXISTS tier1_website_detail text,
  ADD COLUMN IF NOT EXISTS tier1_registry_match boolean,
  ADD COLUMN IF NOT EXISTS tier1_registry_source text,
  ADD COLUMN IF NOT EXISTS tier1_registry_detail text,
  ADD COLUMN IF NOT EXISTS tier1_infra_match boolean,
  ADD COLUMN IF NOT EXISTS tier1_infra_detail text;
-- (tier1_passed, tier1_checked_at, current_tier already exist)

-- ── 3. founder_verifications: Tier 4 sign-off ────────────────────────────────

ALTER TABLE founder_verifications
  ADD COLUMN IF NOT EXISTS tier4_passed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tier4_reviewer_name text,
  ADD COLUMN IF NOT EXISTS tier4_reviewed_at timestamptz;

-- ── 4. startup_claims: category + verdict model ──────────────────────────────
-- Reuses existing columns: claim_label/claim_value (the claim text),
-- proof_document_id (evidence document), ai_checked_at.

ALTER TABLE startup_claims
  ADD COLUMN IF NOT EXISTS claim_category text
    CHECK (claim_category IN ('financial', 'legal', 'operational', 'team') OR claim_category IS NULL),
  ADD COLUMN IF NOT EXISTS ai_verdict text
    CHECK (ai_verdict IN ('verified', 'insufficient', 'contradicted') OR ai_verdict IS NULL),
  ADD COLUMN IF NOT EXISTS ai_reasoning text,
  ADD COLUMN IF NOT EXISTS ai_confidence text
    CHECK (ai_confidence IN ('high', 'medium', 'low') OR ai_confidence IS NULL),
  ADD COLUMN IF NOT EXISTS human_reviewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_reviewer_notes text;

-- ── 5. Reset: every badge shown after this ships means the NEW rules ─────────
-- (1 row exists today, already tier 0 — this is a formal clean cut.)

UPDATE founder_verifications SET
  current_tier = 0,
  tier1_passed = false,
  tier1_checked_at = NULL;

-- ── 6. Trade license as a registry-equivalent Tier 1 path (added same day) ──
ALTER TABLE founder_verifications
  ADD COLUMN IF NOT EXISTS license_authority text,
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS license_name_match boolean;
