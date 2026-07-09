-- ═══════════════════════════════════════════════════════════════════════════
-- Early Builder retroactive award — MANUAL RUN ONLY. Review before executing.
--
-- Awards 'early_builder' to the first 100 identity-verified founders,
-- ordered by WHEN THEY FIRST PASSED Tier 1 (tier1_checked_at), not account
-- creation — being early only counts once you're real.
--
-- Corrected from the original spec: startups.verification_tier does not
-- exist; verification state lives in founder_verifications.
--
-- Idempotent: the partial unique index on profile_badges
-- (startup_id, badge_type) makes re-runs no-ops via ON CONFLICT.
--
-- As of 2026-07-09 there are 0 founders with tier1_passed = true, so this
-- currently awards nothing — it is the backfill for when the first cohort
-- verifies. The award engine also grants early_builder automatically on
-- each founder's own evaluation, so this script is a safety net, not the
-- primary path.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. REVIEW FIRST — who would receive it:
SELECT fv.startup_id, s.company_name, fv.tier1_checked_at,
       row_number() OVER (ORDER BY fv.tier1_checked_at ASC) AS position
FROM founder_verifications fv
JOIN startups s ON s.id = fv.startup_id
WHERE fv.tier1_passed = true
ORDER BY fv.tier1_checked_at ASC
LIMIT 100;

-- 2. THEN award (uncomment to run):
--
-- INSERT INTO profile_badges
--   (startup_id, badge_type, badge_label, badge_source,
--    verified_by_hockystick, verification_evidence, issued_at)
-- SELECT
--   fv.startup_id,
--   'early_builder',
--   'Early Builder',
--   'hockystick',
--   false,
--   jsonb_build_object(
--     'criteria_met', jsonb_build_object(
--       'position', row_number() OVER (ORDER BY fv.tier1_checked_at ASC),
--       'first_verified_at', fv.tier1_checked_at
--     ),
--     'evaluated_at', now()
--   ),
--   now()
-- FROM founder_verifications fv
-- WHERE fv.tier1_passed = true
-- ORDER BY fv.tier1_checked_at ASC
-- LIMIT 100
-- ON CONFLICT (startup_id, badge_type) WHERE startup_id IS NOT NULL DO NOTHING;
