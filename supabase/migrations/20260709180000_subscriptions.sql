-- Payment foundation: subscriptions + plan_limits.
-- No Stripe code — the stripe_* columns exist but stay null until integration.

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','cancelled','paused')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can READ their own subscription. Writes are service-role only:
-- a FOR ALL policy would let users self-upgrade to 'active'. Stripe
-- webhooks and admin tooling run server-side with the service key.
DROP POLICY IF EXISTS "own_subscription" ON subscriptions;
CREATE POLICY "own_subscription_read" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_unique ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

-- ── Plan limits: source of truth for what each plan allows ──────────────────

CREATE TABLE IF NOT EXISTS plan_limits (
  plan_id text PRIMARY KEY,
  plan_name text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('founder','investor','both')),
  price_monthly_usd integer NOT NULL,
  deal_room_limit integer NOT NULL DEFAULT 1,
  team_member_limit integer NOT NULL DEFAULT 1,
  ai_calls_per_month integer NOT NULL DEFAULT 50,
  vc_connections_limit integer NOT NULL DEFAULT 30,
  has_full_ai boolean DEFAULT false,
  has_verification boolean DEFAULT true,
  has_roast_discount boolean DEFAULT false,
  roast_price_usd integer,
  extra_deal_room_price_usd integer DEFAULT 5,
  extra_user_price_usd integer DEFAULT 5,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0
);

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_limits_public_read ON plan_limits;
CREATE POLICY plan_limits_public_read ON plan_limits
  FOR SELECT USING (true);

INSERT INTO plan_limits VALUES
('founder_starter', 'Founder Starter', 'founder', 19,
  3, 1, 100, 30, false, true, false, 50, 5, 5, true, 1),
('founder_pro', 'Founder Pro', 'founder', 49,
  13, 3, 500, 100, true, true, true, 40, 5, 5, true, 2),
('founder_scale', 'Founder Scale', 'founder', 199,
  30, 5, 9999, 1000, true, true, true, 0, 5, 5, true, 3),
('investor_growth', 'Investor Growth', 'investor', 99,
  50, 3, 500, 500, true, true, false, null, 5, 5, true, 1),
('investor_pro', 'Investor Pro', 'investor', 299,
  150, 10, 9999, 1000, true, true, false, null, 5, 5, true, 2),
('investor_enterprise', 'Enterprise', 'investor', 1999,
  999, 20, 9999, 9999, true, true, false, null, 0, 0, true, 3)
ON CONFLICT (plan_id) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  deal_room_limit = EXCLUDED.deal_room_limit,
  team_member_limit = EXCLUDED.team_member_limit,
  ai_calls_per_month = EXCLUDED.ai_calls_per_month,
  vc_connections_limit = EXCLUDED.vc_connections_limit,
  has_full_ai = EXCLUDED.has_full_ai,
  has_roast_discount = EXCLUDED.has_roast_discount,
  roast_price_usd = EXCLUDED.roast_price_usd,
  extra_deal_room_price_usd = EXCLUDED.extra_deal_room_price_usd,
  extra_user_price_usd = EXCLUDED.extra_user_price_usd,
  sort_order = EXCLUDED.sort_order;
