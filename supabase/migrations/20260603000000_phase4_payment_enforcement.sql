-- ============================================================
-- Migration: Phase 4 — server-authoritative payment enforcement
-- Applied: 2026-06-03
--
-- Closes:
--   P3-1  free featured/publish via direct RLS write (campaigns INSERT/UPDATE)
--   N1    forged 'succeeded' payments via direct RLS insert
--   featured-on-edit / publish must come from the payment system, not the owner token
--
-- Model: the Stripe webhook + Edge Function (service_role) are the ONLY writers that may
--        publish a campaign (stage draft->open), set featured, or set featured_until, and
--        the ONLY writers of the payments table. Owners may create draft, non-featured
--        campaigns and edit non-gated columns; everything price-gated is enforced here.
-- ============================================================

-- ── campaigns INSERT: owners may create draft, non-featured campaigns only ──
-- (The EF creates drafts via service_role, which bypasses RLS, so it is unaffected.)
DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own_draft" ON public.campaigns;
CREATE POLICY "campaigns_insert_own_draft" ON public.campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = brand_id
    AND stage = 'draft'
    AND COALESCE(featured, false) = false
  );

-- ── campaigns UPDATE: keep owner update (campaigns_update_own), but gate the
--    price-controlled columns via a BEFORE UPDATE trigger. service_role bypasses RLS
--    but NOT triggers, so the explicit role check is required to let the EF/webhook through.
CREATE OR REPLACE FUNCTION public.enforce_campaign_payment_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- The payment system (Edge Function + Stripe webhook) connects as service_role.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Publishing a draft requires going through payment.
  IF OLD.stage = 'draft' AND NEW.stage <> 'draft' THEN
    RAISE EXCEPTION 'publishing requires payment' USING ERRCODE = 'P0001';
  END IF;

  -- Turning featured on requires payment.
  IF NEW.featured AND NOT COALESCE(OLD.featured, false) THEN
    RAISE EXCEPTION 'featured placement requires payment' USING ERRCODE = 'P0001';
  END IF;

  -- The featured term is set by the payment system, never by the owner.
  IF NEW.featured_until IS DISTINCT FROM OLD.featured_until THEN
    RAISE EXCEPTION 'featured term is set by the payment system' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_payment_gate ON public.campaigns;
CREATE TRIGGER campaign_payment_gate
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_campaign_payment_gate();

-- ── payments INSERT: service_role only. Removing the owner INSERT policy means
--    authenticated tokens can no longer write payments (RLS denies with no policy);
--    the EF inserts via service_role, which bypasses RLS. Closes N1.
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
