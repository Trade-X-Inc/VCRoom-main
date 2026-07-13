-- Written-round expiry, enforced by the database itself. The client-side
-- watchdog covers live phases (someone always has the page open); the 48-hour
-- written deadline can pass with nobody watching, so pg_cron closes it.
-- Mirrors expireOverdueRoasts in roast-fn.ts minus report generation (which
-- needs OpenAI; regenerateRoastReport covers expired sessions on demand).

CREATE OR REPLACE FUNCTION roast_expire_overdue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    UPDATE roast_sessions
    SET status = 'expired'
    WHERE status = 'written_phase'
      AND written_deadline_at IS NOT NULL
      AND written_deadline_at < now()
    RETURNING id, founder_id, level
  LOOP
    v_count := v_count + 1;
    INSERT INTO notifications (user_id, kind, title, body, read, action_url, meta)
    VALUES (
      r.founder_id,
      'roast',
      'Your Roast expired incomplete',
      'The 48-hour written round closed with unanswered questions. The public record is permanently marked incomplete and no badge was awarded.',
      false,
      '/roast/' || r.id,
      jsonb_build_object('session_id', r.id, 'level', r.level)
    );
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION roast_expire_overdue() FROM PUBLIC, anon, authenticated;

-- Hourly is plenty for a 48-hour deadline.
SELECT cron.schedule('roast-expire-overdue', '7 * * * *', 'SELECT roast_expire_overdue()');
