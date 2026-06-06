-- ============================================================
-- Migration: gig listings feature
-- Applied: 2026-06-05
--
-- gig_listings + gig_applications + payments.gig_id.
-- Publish model mirrors campaigns: owner creates a draft; only the payment
-- system (service_role) may publish (stage 'draft' -> 'open'). Idempotent.
-- ============================================================

-- ---------- gig_listings (created FIRST so payments.gig_id FK can reference it) ----------
CREATE TABLE IF NOT EXISTS public.gig_listings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  stage           text        NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft','open','closed')),
  comp            text,
  pay_type        text,
  deadline        text,
  location        text,
  platforms       text[]      NOT NULL DEFAULT '{}',
  deliverables    text,
  skills_required text[]      NOT NULL DEFAULT '{}',
  requirements    text,
  equipment       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gig_listings_brand_id ON public.gig_listings(brand_id);
CREATE INDEX IF NOT EXISTS idx_gig_listings_stage    ON public.gig_listings(stage);

ALTER TABLE public.gig_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gig_listings_insert_own_draft" ON public.gig_listings;
CREATE POLICY "gig_listings_insert_own_draft" ON public.gig_listings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = brand_id AND stage = 'draft');

DROP POLICY IF EXISTS "gig_listings_read_public" ON public.gig_listings;
CREATE POLICY "gig_listings_read_public" ON public.gig_listings
  FOR SELECT USING (stage <> 'draft' OR auth.uid() = brand_id);

DROP POLICY IF EXISTS "gig_listings_update_own" ON public.gig_listings;
CREATE POLICY "gig_listings_update_own" ON public.gig_listings
  FOR UPDATE USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "gig_listings_delete_own" ON public.gig_listings;
CREATE POLICY "gig_listings_delete_own" ON public.gig_listings
  FOR DELETE USING (auth.uid() = brand_id);

-- payment gate: only service_role may publish (draft -> non-draft). Owner open->closed allowed.
CREATE OR REPLACE FUNCTION public.enforce_gig_payment_gate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF OLD.stage = 'draft' AND NEW.stage <> 'draft' THEN
    RAISE EXCEPTION 'publishing requires payment' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS gig_payment_gate ON public.gig_listings;
CREATE TRIGGER gig_payment_gate BEFORE UPDATE ON public.gig_listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gig_payment_gate();

DROP TRIGGER IF EXISTS gig_listings_updated_at ON public.gig_listings;
CREATE TRIGGER gig_listings_updated_at BEFORE UPDATE ON public.gig_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------- payments: link a payment to a gig listing (AFTER gig_listings exists) ----------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gig_id uuid REFERENCES public.gig_listings(id) ON DELETE SET NULL;

-- ---------- gig_applications ----------
CREATE TABLE IF NOT EXISTS public.gig_applications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id      uuid        NOT NULL REFERENCES public.gig_listings(id) ON DELETE CASCADE,
  creator_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage       text        NOT NULL DEFAULT 'applied' CHECK (stage IN ('applied','accepted','rejected','paid')),
  message     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_gig_applications_gig_id     ON public.gig_applications(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_applications_creator_id ON public.gig_applications(creator_id);

ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gig_applications_creator_insert" ON public.gig_applications;
CREATE POLICY "gig_applications_creator_insert" ON public.gig_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND stage = 'applied');

DROP POLICY IF EXISTS "gig_applications_creator_read" ON public.gig_applications;
CREATE POLICY "gig_applications_creator_read" ON public.gig_applications
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "gig_applications_brand_read" ON public.gig_applications;
CREATE POLICY "gig_applications_brand_read" ON public.gig_applications
  FOR SELECT USING (auth.uid() IN (SELECT brand_id FROM public.gig_listings WHERE id = gig_id));

DROP POLICY IF EXISTS "gig_applications_brand_update" ON public.gig_applications;
CREATE POLICY "gig_applications_brand_update" ON public.gig_applications
  FOR UPDATE USING (auth.uid() IN (SELECT brand_id FROM public.gig_listings WHERE id = gig_id));
