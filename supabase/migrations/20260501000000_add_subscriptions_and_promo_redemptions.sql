-- ============================================================
-- Migration: add subscriptions + promo_redemptions tables
-- Applied: 2026-05-01
-- ============================================================

-- subscriptions -----------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id               uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text        UNIQUE,
  status                 text        NOT NULL DEFAULT 'incomplete',
  -- status values: 'incomplete' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  plan                   text        NOT NULL DEFAULT 'annual',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_brand_id ON subscriptions(brand_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_select_own"
    ON subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = brand_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- promo_redemptions -------------------------------------------

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promo_code text        NOT NULL,
  payment_id uuid        REFERENCES payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promo_code)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_redemptions(user_id);

ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "promo_redemptions_select_own"
    ON promo_redemptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
