-- Badge system: definitions table + seed.
-- Badges are trust signals, not gamification. Every description is the
-- honest one-sentence answer to "what does this badge mean?".

CREATE TABLE IF NOT EXISTS badge_definitions (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('trust','readiness','community','investor')),
  label text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  requires_payment boolean DEFAULT false,
  payment_amount_usd integer,
  auto_awarded boolean DEFAULT true,
  visible_on_public_profile boolean DEFAULT true,
  visible_on_directory boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badge_definitions_public_read ON badge_definitions;
CREATE POLICY badge_definitions_public_read ON badge_definitions
  FOR SELECT USING (true);
-- Writes: service role only (no INSERT/UPDATE/DELETE policies).

-- profile_badges: RLS + uniqueness for idempotent awards
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_badges_public_read ON profile_badges;
CREATE POLICY profile_badges_public_read ON profile_badges
  FOR SELECT USING (true);
-- Awards are written by the service-role award engine only.

CREATE UNIQUE INDEX IF NOT EXISTS profile_badges_startup_type_uniq
  ON profile_badges (startup_id, badge_type) WHERE startup_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profile_badges_investor_type_uniq
  ON profile_badges (investor_profile_id, badge_type) WHERE investor_profile_id IS NOT NULL;

-- ── Seed ─────────────────────────────────────────────────────────────────────

INSERT INTO badge_definitions
  (id, category, label, description, icon, color, requires_payment, payment_amount_usd, auto_awarded, visible_on_public_profile, visible_on_directory, sort_order)
VALUES
  -- TRUST (mirror the verification tiers + specific verified facts)
  ('identity_confirmed','trust','Identity Confirmed',
   'Email, website, registry, and domain-infrastructure checks passed. Real person, real company.',
   'shield-check','blue',false,NULL,true,true,true,10),
  ('claims_verified','trust','Claims Verified',
   'At least 3 specific claims, including 1 financial, verified by AI against uploaded evidence documents.',
   'badge-check','blue',false,NULL,true,true,true,20),
  ('revenue_verified','trust','Revenue Verified',
   'Stated revenue confirmed against financial documents by AI review.',
   'circle-dollar-sign','blue',false,NULL,true,true,true,25),
  ('team_verified','trust','Team Verified',
   'Payroll or employment records reviewed by AI and confirmed to name real team members.',
   'users','blue',false,NULL,true,true,true,27),
  ('operationally_verified','trust','Operationally Verified',
   'Three operational documents AI-checked, then reviewed and approved by the Hockystick team.',
   'shield','indigo',false,NULL,true,true,true,30),
  ('hockystick_verified','trust','Hockystick Verified',
   'Full identity and business verification completed by a named Hockystick reviewer, including a live video call.',
   'award','purple',false,NULL,true,true,true,40),

  -- READINESS
  ('deal_ready','readiness','Deal Ready',
   'Deal room open with the NDA signed by both parties and pitch materials uploaded.',
   'briefcase','emerald',false,NULL,true,true,true,50),
  ('fully_documented','readiness','Fully Documented',
   'Documents completed in all 5 diligence categories: market, financials, team, product, legal.',
   'folder-check','emerald',false,NULL,true,true,true,60),
  ('fast_responder','readiness','Fast Responder',
   'Answered at least 3 investor questions within 24 hours of them being asked.',
   'zap','amber',false,NULL,true,true,true,70),
  ('dd_complete','readiness','DD Ready',
   'Completed every due-diligence goal in at least one deal room.',
   'clipboard-check','emerald',false,NULL,true,true,true,80),
  ('first_close','readiness','First Close',
   'At least one deal room reached the Closing stage.',
   'trending-up','emerald',false,NULL,true,true,true,90),
  ('round_closed','readiness','Round Closed',
   'Closed a funding round through Hockystick — a deal room concluded with an Invest decision.',
   'trophy','gold',false,NULL,true,true,true,100),
  ('early_builder','readiness','Early Builder',
   'Among the first 100 identity-verified founders on Hockystick.',
   'star','amber',false,NULL,true,true,true,110),

  -- COMMUNITY
  ('roast_survivor','community','Roast Survivor',
   'Completed a Hockystick Founder Roast — a structured live challenge by active investors.',
   'flame','orange',true,40,false,true,true,120),
  ('roast_champion','community','Roast Champion',
   'Scored highest in a Founder Roast cohort, judged by the participating investors.',
   'crown','gold',false,NULL,false,true,true,130),
  ('cohort_graduate','community','Cohort Graduate',
   'Completed a partner institution program — co-issued with the partner, verified by Hockystick.',
   'graduation-cap','indigo',false,NULL,false,true,true,140),

  -- INVESTOR (activity)
  ('active_investor','investor','Active Investor',
   'Opened 5 or more deal rooms in the past 6 months.',
   'activity','blue',false,NULL,true,true,true,150),
  ('thesis_clarity','investor','Thesis Clarity',
   'Investment thesis fully set and 10 or more thesis-matched companies reviewed.',
   'target','blue',false,NULL,true,true,true,160),
  ('fast_decision','investor','Fast Decision',
   'Submitted an Invest/Hold/Pass decision within 14 days of opening on 3 or more deal rooms.',
   'zap','amber',false,NULL,true,true,true,170),
  ('deal_closed','investor','Deal Closed',
   'Closed an investment through Hockystick — a deal room concluded with their Invest decision.',
   'handshake','purple',false,NULL,true,true,true,180),

  -- INVESTOR (trust — what makes an investor trustworthy TO FOUNDERS)
  ('no_ghosting','investor','No Ghosting',
   'Submitted a decision in every concluded deal room to date (minimum 3). Never left a founder without an answer.',
   'check-check','emerald',false,NULL,true,true,true,190),
  ('reason_giver','investor','Gives Reasons',
   'Every Pass decision included a written reason the founder can act on (minimum 3 passes).',
   'message-square','emerald',false,NULL,true,true,true,200),
  ('verified_fund','investor','Verified Fund',
   'Fund formation and committed-capital evidence reviewed and confirmed by Hockystick.',
   'landmark','purple',false,NULL,false,true,true,210)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  requires_payment = EXCLUDED.requires_payment,
  payment_amount_usd = EXCLUDED.payment_amount_usd,
  auto_awarded = EXCLUDED.auto_awarded,
  sort_order = EXCLUDED.sort_order;
