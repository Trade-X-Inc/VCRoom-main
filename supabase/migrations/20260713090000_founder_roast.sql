-- ═══════════════════════════════════════════════════════════════════════════
-- Founder Roast — live public trust event.
--
-- Design decisions encoded here (all confirmed):
-- 1. Legacy roast_sessions (old tier/outcome schema, 0 rows, no FK
--    dependents) is dropped and replaced.
-- 2. ALL writes go through server functions with the service role — there
--    are NO client INSERT/UPDATE policies. Client-supplied timestamps or
--    payloads can never decide the race or edit answers.
-- 3. roast_questions has NO public SELECT policy: unanswered question text
--    must stay hidden until answered, which is column-level redaction —
--    the public page reads through a server loader that redacts. Founders
--    read their own sessions' questions via RLS.
-- 4. No-delete rule: founders cannot remove questions. Platform moderation
--    sets removed_at/removed_reason via service role; the public page shows
--    a visible "N removed" count, never silent deletion.
-- 5. Race integrity: rank is assigned atomically inside an advisory-locked
--    SECURITY DEFINER function, with UNIQUE(session, round, rank) as a
--    physical backstop against ties, and UNIQUE(session, round, user)
--    against double-clicks. The race promotes the user's pre-written
--    question (written in Phase 2) — typing speed never decides the race.
-- 6. Answer quality: answers under 50 chars or bare yes/no/noted/correct
--    are auto-flagged by the server fn; the badge requires zero
--    unacknowledged flags (founder must improve or explicitly confirm).
-- 7. The 48h written deadline is stored on the session and enforced by
--    cron: missed → status 'expired', no badge, permanently visible.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop legacy table (verified: 0 rows, no inbound FKs)
DROP TABLE IF EXISTS roast_sessions CASCADE;

-- 2. Challenger accounts — audience members who sign up to ask questions
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role = ANY (ARRAY['founder', 'investor', 'investor_member', 'admin', 'deleted', 'challenger']::text[])
);

-- 3. Roast notifications must actually deliver (lesson learned twice)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (
  kind = ANY (ARRAY[
    'deal', 'message', 'invite', 'system', 'ai', 'ai_operator',
    'document_request', 'dd_update',
    'view', 'access_approved',
    'connection_request', 'connection_declined', 'deal_room',
    'deal_activity', 'deal_room_invite', 'verification', 'decision',
    'roast'
  ]::text[])
);

-- ── Sessions ────────────────────────────────────────────────────────────────
CREATE TABLE roast_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL REFERENCES users(id),
  level integer NOT NULL CHECK (level IN (1, 2, 3)),

  -- Lifecycle. written_phase = live done, 48h written window running.
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',        -- created, not started
    'lobby',            -- founder went live, audience gathering
    'pitch_phase',      -- 60s pitch, mic cuts at 0
    'question_writing', -- 60s, everyone writes one question
    'qa_phase',         -- race rounds
    'closing',          -- founder's closing statement
    'written_phase',    -- 48h written-answer window
    'completed',        -- all answered, flags cleared, badge awarded
    'expired',          -- missed the 48h deadline — permanent public state
    'cancelled'
  )),
  payment_status text NOT NULL DEFAULT 'comp' CHECK (payment_status IN ('comp', 'pending', 'paid')),

  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,

  -- Server-side state machine: every timed phase has a deadline; clients
  -- render countdowns from server time and any client may trigger the
  -- idempotent auto-advance once the deadline passes.
  phase_deadline timestamptz,
  current_race_round integer NOT NULL DEFAULT 0,

  -- Timing configuration (defaults per level set at creation)
  pitch_duration_seconds integer NOT NULL DEFAULT 60,
  question_writing_seconds integer NOT NULL DEFAULT 60,
  answer_seconds_per_question integer NOT NULL DEFAULT 120,
  race_interval_seconds integer NOT NULL DEFAULT 300,
  race_winners_per_round integer NOT NULL DEFAULT 3,
  qa_duration_minutes integer NOT NULL DEFAULT 20,   -- L1=20, L2=35, L3=50
  max_audience integer NOT NULL DEFAULT 20,          -- L1=20, L2=50, L3=100

  -- Video
  daily_room_name text,
  daily_room_url text,
  recording_url text,
  recording_status text NOT NULL DEFAULT 'unavailable'
    CHECK (recording_status IN ('unavailable', 'pending', 'ready')), -- 'unavailable' on free tier: transcript is the record

  -- Written round + badge
  written_deadline_at timestamptz,
  badge_awarded boolean NOT NULL DEFAULT false,
  badge_awarded_at timestamptz,

  -- The founder must acknowledge the no-delete rule before scheduling
  rules_acknowledged_at timestamptz,

  -- AI Roast Report (pitch summary, themes, rates, assessment,
  -- credibility flags for the DD engine). Footer disclaimer is fixed copy.
  report jsonb,
  report_generated_at timestamptz,

  is_public boolean NOT NULL DEFAULT true,
  round_closed_at timestamptz,   -- set when the funding round closes; page archives
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_roast_sessions_startup ON roast_sessions(startup_id);
CREATE INDEX idx_roast_sessions_public_upcoming
  ON roast_sessions(scheduled_at) WHERE is_public = true AND status = 'scheduled';

-- ── Audience ────────────────────────────────────────────────────────────────
CREATE TABLE roast_audience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES roast_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),      -- askers are always identified
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'challenger' CHECK (role IN ('founder', 'challenger', 'observer')),
  is_verified_investor boolean NOT NULL DEFAULT false, -- marker shown on their questions
  joined_at timestamptz DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX idx_roast_audience_session ON roast_audience(session_id);

-- ── Questions ───────────────────────────────────────────────────────────────
-- One question per user per session, written in Phase 2. Winning a race
-- promotes it to phase='live'; everything else goes to the written round.
CREATE TABLE roast_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES roast_sessions(id) ON DELETE CASCADE,
  asker_id uuid NOT NULL REFERENCES users(id),
  asker_name text NOT NULL,
  asker_is_investor boolean NOT NULL DEFAULT false,
  question_text text NOT NULL CHECK (char_length(question_text) BETWEEN 10 AND 500),
  submitted_at timestamptz DEFAULT now(),

  phase text NOT NULL DEFAULT 'written' CHECK (phase IN ('live', 'written')),
  race_round integer,

  answer_text text,
  answered_at timestamptz,
  is_answered boolean NOT NULL DEFAULT false,

  -- Answer quality gate: set by the server fn, cleared by improving the
  -- answer or explicitly confirming it (flag_note records the confirmation).
  answer_flag text CHECK (answer_flag IN ('too_short', 'non_answer')),
  flag_acknowledged boolean NOT NULL DEFAULT false,
  flag_note text,

  -- Platform-only moderation. Founders can never remove a question.
  removed_at timestamptz,
  removed_reason text,

  display_order integer,
  UNIQUE (session_id, asker_id)
);

CREATE INDEX idx_roast_questions_session ON roast_questions(session_id, submitted_at);

-- ── Race events ─────────────────────────────────────────────────────────────
CREATE TABLE roast_race_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES roast_sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  click_timestamp timestamptz NOT NULL DEFAULT now(),  -- server time only
  rank integer NOT NULL,
  question_id uuid REFERENCES roast_questions(id),
  UNIQUE (session_id, round_number, user_id),  -- one click per user per round
  UNIQUE (session_id, round_number, rank)      -- ties are physically impossible
);

CREATE INDEX idx_roast_race_session ON roast_race_events(session_id, round_number, rank);

-- ── Atomic race ranking ─────────────────────────────────────────────────────
-- Called by the server fn with a verified user id. The advisory lock
-- serializes concurrent clicks for one session+round so count-then-insert
-- cannot produce duplicate ranks; the unique constraint is the backstop.
CREATE OR REPLACE FUNCTION roast_submit_race_click(
  p_session_id uuid,
  p_user_id uuid,
  p_round integer
) RETURNS TABLE (out_rank integer, made_it boolean, question_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session roast_sessions%ROWTYPE;
  v_rank integer;
  v_question_id uuid;
  v_winners integer;
BEGIN
  SELECT * INTO v_session FROM roast_sessions WHERE id = p_session_id;
  IF v_session.id IS NULL THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF v_session.status <> 'qa_phase' THEN RAISE EXCEPTION 'not_in_qa_phase'; END IF;
  IF v_session.current_race_round <> p_round THEN RAISE EXCEPTION 'wrong_round'; END IF;

  -- The user must have written a question in Phase 2 that is still unasked
  SELECT q.id INTO v_question_id FROM roast_questions q
  WHERE q.session_id = p_session_id AND q.asker_id = p_user_id
    AND q.phase = 'written' AND q.removed_at IS NULL;
  IF v_question_id IS NULL THEN RAISE EXCEPTION 'no_eligible_question'; END IF;

  -- Serialize this session+round's clicks
  PERFORM pg_advisory_xact_lock(hashtext(p_session_id::text || ':' || p_round::text));

  SELECT COUNT(*) + 1 INTO v_rank FROM roast_race_events
  WHERE session_id = p_session_id AND round_number = p_round;

  INSERT INTO roast_race_events (session_id, round_number, user_id, rank, question_id)
  VALUES (p_session_id, p_round, p_user_id, v_rank, v_question_id);

  v_winners := v_session.race_winners_per_round;
  IF v_rank <= v_winners THEN
    UPDATE roast_questions
    SET phase = 'live', race_round = p_round, display_order = (p_round * 10) + v_rank
    WHERE id = v_question_id;
  END IF;

  RETURN QUERY SELECT v_rank, v_rank <= v_winners, v_question_id;
END;
$$;

-- Service role only — never callable from the browser
REVOKE ALL ON FUNCTION roast_submit_race_click(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE roast_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roast_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE roast_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roast_race_events ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can read public sessions; founders read their own.
-- No write policies — writes are service-role only.
CREATE POLICY "roast_sessions_public_read" ON roast_sessions
  FOR SELECT USING (is_public = true OR founder_id = (SELECT auth.uid()));

-- Audience: readable wherever the session is readable (drives live counts).
CREATE POLICY "roast_audience_read" ON roast_audience
  FOR SELECT USING (
    session_id IN (SELECT id FROM roast_sessions WHERE is_public = true OR founder_id = (SELECT auth.uid()))
  );

-- Questions: NO public SELECT — unanswered text must stay hidden, which is
-- column-level redaction done by the public server loader. Founders read
-- their own sessions' questions; askers read their own question.
CREATE POLICY "roast_questions_founder_read" ON roast_questions
  FOR SELECT USING (
    session_id IN (SELECT id FROM roast_sessions WHERE founder_id = (SELECT auth.uid()))
  );
CREATE POLICY "roast_questions_asker_read" ON roast_questions
  FOR SELECT USING (asker_id = (SELECT auth.uid()));

-- Race events: public-readable ranks (no question text lives here).
CREATE POLICY "roast_race_read" ON roast_race_events
  FOR SELECT USING (
    session_id IN (SELECT id FROM roast_sessions WHERE is_public = true OR founder_id = (SELECT auth.uid()))
  );
