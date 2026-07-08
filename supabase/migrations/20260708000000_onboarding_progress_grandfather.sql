-- Grandfather pre-existing founders into onboarding_progress so the new
-- profile-gate-nudge-cron doesn't mass-nudge every existing account.
INSERT INTO onboarding_progress (user_id, account_type, current_step, steps)
SELECT u.id, 'founder', 'done', '{"nudge_48h_sent": true, "nudge_7d_sent": true}'::jsonb
FROM users u
JOIN startups s ON s.founder_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM onboarding_progress op WHERE op.user_id = u.id
);
