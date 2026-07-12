-- Roast integrity: founders must not be able to pre-read the written question
-- pool while the session is live. The control panel shows a count only; this
-- makes the DB enforce it. Founders see a question's text only once it is
-- promoted to a live race slot, or once the session reaches the written round
-- (answers queue) or a terminal state.

DROP POLICY "roast_questions_founder_read" ON roast_questions;

CREATE POLICY "roast_questions_founder_read" ON roast_questions
  FOR SELECT USING (
    session_id IN (SELECT id FROM roast_sessions WHERE founder_id = (SELECT auth.uid()))
    AND (
      phase = 'live'
      OR session_id IN (
        SELECT id FROM roast_sessions
        WHERE status IN ('written_phase', 'completed', 'expired')
      )
    )
  );

-- Pool size is not secret (the public page shows who has submitted); expose
-- the count without exposing text so the founder panel can display it.
CREATE OR REPLACE FUNCTION roast_question_pool_count(p_session_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*)::integer FROM roast_questions
  WHERE session_id = p_session_id
    AND phase = 'written'
    AND removed_at IS NULL;
$$;

REVOKE ALL ON FUNCTION roast_question_pool_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION roast_question_pool_count(uuid) TO authenticated, anon;
