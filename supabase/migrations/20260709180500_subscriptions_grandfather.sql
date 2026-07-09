-- Grandfather ALL existing users as active subscribers — never restricted.
-- Rule from CLAUDE.md: any new gating mechanism must grandfather existing
-- accounts in the same migration, not as a follow-up fix.
--
-- Role detection: auth metadata only covers the two test accounts, so role
-- derives from ownership — investor_profiles row => investor_pro, otherwise
-- founder_pro (founders and their team members alike).
--
-- Idempotent: WHERE NOT EXISTS on user_id.

INSERT INTO subscriptions (user_id, plan_id, plan_name, status, trial_ends_at, current_period_end)
SELECT
  u.id,
  CASE WHEN ip.user_id IS NOT NULL THEN 'investor_pro' ELSE 'founder_pro' END,
  CASE WHEN ip.user_id IS NOT NULL THEN 'Investor Pro' ELSE 'Founder Pro' END,
  'active',
  NULL,   -- no trial: grandfathered
  NULL    -- no period end: never expires until Stripe manages it
FROM users u
LEFT JOIN investor_profiles ip ON ip.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);
