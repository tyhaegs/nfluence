import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://nfluenceagency.com',
  'https://www.nfluenceagency.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8799',
];

// ── Server-side pricing — the ONLY source of truth. Never trust client amounts. ──
const FEATURED_PRICES_CENTS: Record<number, number> = { 1: 299, 7: 1499, 30: 4999 };
const GIG_PRICE_CENTS = 4999;
const VALID_PROMOS: Record<string, number> = { LAUNCH50: 0.50, NFLUENCE20: 0.20, FEATURED10: 0.10 };
const CURRENCY = 'usd';

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// "$500" | "500" | 500 → cents
function parseAmountToCents(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return Math.round(v * 100);
  if (typeof v !== 'string') return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g, ''));
  return isFinite(n) ? Math.round(n * 100) : 0;
}
const isPaidComp = (t: unknown) => t === 'paid' || t === 'product+paid';

// Price a campaign-like record (accepts both DB snake_case and client camelCase).
function priceCampaign(rec: Record<string, unknown>): { escrowCents: number; featuredCents: number } {
  const compType = (rec.comp_type ?? rec.compType) as unknown;
  const spots = Number(rec.spots_total ?? rec.spotsTotal ?? 0) || 0;
  const featured = !!rec.featured;
  const weeks = Number(rec.featured_weeks ?? rec.featuredWeeks ?? 0) || 0;
  const escrowCents = isPaidComp(compType) && spots > 0 ? parseAmountToCents(rec.comp) * spots : 0;
  const featuredCents = featured ? (FEATURED_PRICES_CENTS[weeks] ?? 0) : 0;
  return { escrowCents, featuredCents };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeKey) return json({ error: 'Payment service not configured' }, 500, cors);
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) return json({ error: 'Auth service not configured' }, 500, cors);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401, cors);
  const token = authHeader.slice(7);

  // User-scoped client (RLS) — used for auth + the user's own reads/writes (campaigns, payments insert_own).
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401, cors);

  // Service-role client — privileged writes (promo_redemptions has no INSERT/DELETE policy).
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, cors); }
  const action = body?.action;
  if (action !== 'quote' && action !== 'charge' && action !== 'cancel' && action !== 'unfeature') return json({ error: 'invalid action' }, 400, cors);

  // ── CANCEL — roll back an abandoned/failed charge; sweep stale drafts (Layer 1/2 cleanup) ──
  if (action === 'cancel') {
    const piId: string | undefined = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : undefined;
    const cid: string | undefined = typeof body.campaignId === 'string' ? body.campaignId : undefined;
    const gid: string | undefined = typeof body.gigId === 'string' ? body.gigId : undefined;

    if (piId) {
      const { data: pays } = await admin.from('payments').select('id, brand_id, status').eq('stripe_payment_intent_id', piId);
      const own = (pays ?? []).filter((p: any) => p.brand_id === user.id && p.status === 'pending').map((p: any) => p.id);
      if (own.length) {
        await admin.from('promo_redemptions').delete().in('payment_id', own);
        await admin.from('payments').delete().in('id', own);
      }
    }
    if (cid) {
      const { data: camp } = await admin.from('campaigns').select('id, brand_id, stage').eq('id', cid).maybeSingle();
      if (camp && camp.brand_id === user.id && camp.stage === 'draft') {
        const { data: pays } = await admin.from('payments').select('id, status').eq('campaign_id', cid);
        const ids = (pays ?? []).filter((p: any) => p.status === 'pending').map((p: any) => p.id);
        if (ids.length) { await admin.from('promo_redemptions').delete().in('payment_id', ids); await admin.from('payments').delete().in('id', ids); }
        await admin.from('campaigns').delete().eq('id', cid).eq('brand_id', user.id).eq('stage', 'draft');
      }
    }
    if (gid) {
      const { data: gig } = await admin.from('gig_listings').select('id, brand_id, stage').eq('id', gid).maybeSingle();
      if (gig && gig.brand_id === user.id && gig.stage === 'draft') {
        const { data: pays } = await admin.from('payments').select('id, status').eq('gig_id', gid);
        const ids = (pays ?? []).filter((p: any) => p.status === 'pending').map((p: any) => p.id);
        if (ids.length) { await admin.from('promo_redemptions').delete().in('payment_id', ids); await admin.from('payments').delete().in('id', ids); }
        await admin.from('gig_listings').delete().eq('id', gid).eq('brand_id', user.id).eq('stage', 'draft');
      }
    }
    if (!piId && !cid && !gid) {
      // Sweep ALL of the user's stale drafts (and their linked payments/redemptions).
      const { data: drafts } = await admin.from('campaigns').select('id').eq('brand_id', user.id).eq('stage', 'draft');
      const draftIds = (drafts ?? []).map((d: any) => d.id);
      if (draftIds.length) {
        const { data: pays } = await admin.from('payments').select('id, status').in('campaign_id', draftIds);
        const ids = (pays ?? []).filter((p: any) => p.status === 'pending').map((p: any) => p.id);
        if (ids.length) { await admin.from('promo_redemptions').delete().in('payment_id', ids); await admin.from('payments').delete().in('id', ids); }
        await admin.from('campaigns').delete().in('id', draftIds).eq('brand_id', user.id).eq('stage', 'draft');
      }
      const { data: gdrafts } = await admin.from('gig_listings').select('id').eq('brand_id', user.id).eq('stage', 'draft');
      const gigIds = (gdrafts ?? []).map((d: any) => d.id);
      if (gigIds.length) {
        const { data: gpays } = await admin.from('payments').select('id, status').in('gig_id', gigIds);
        const gp = (gpays ?? []).filter((p: any) => p.status === 'pending').map((p: any) => p.id);
        if (gp.length) { await admin.from('promo_redemptions').delete().in('payment_id', gp); await admin.from('payments').delete().in('id', gp); }
        await admin.from('gig_listings').delete().in('id', gigIds).eq('brand_id', user.id).eq('stage', 'draft');
      }
    }
    return json({ ok: true }, 200, cors);
  }

  // ── UNFEATURE — remove featured placement (owner-verified; service role bypasses the payment gate) ──
  if (action === 'unfeature') {
    const cid: string | undefined = typeof body.campaignId === 'string' ? body.campaignId : undefined;
    if (!cid) return json({ error: 'campaignId required' }, 400, cors);
    const { data: camp } = await admin.from('campaigns').select('id, brand_id').eq('id', cid).maybeSingle();
    if (!camp) return json({ error: 'campaign not found' }, 404, cors);
    if (camp.brand_id !== user.id) return json({ error: 'forbidden' }, 403, cors);
    // Non-refundable per UI copy — no Stripe refund. service_role write bypasses enforce_campaign_payment_gate.
    const { error: upErr } = await admin.from('campaigns')
      .update({ featured: false, featured_until: null, featured_weeks: 0 })
      .eq('id', cid).eq('brand_id', user.id);
    if (upErr) return json({ error: upErr.message }, 500, cors);
    return json({ ok: true }, 200, cors);
  }

  // ── QUOTE / CHARGE ──
  const type = body?.type;
  if (type !== 'campaign_new' && type !== 'campaign_edit' && type !== 'gig') return json({ error: 'invalid type' }, 400, cors);
  const features = body?.features ?? {};
  const campaignId: string | undefined = typeof body?.campaignId === 'string' ? body.campaignId : undefined;

  // Promo validity is checked here for both quote & charge; one-use enforcement happens
  // atomically at charge time via an insert-first claim (relies on UNIQUE(user_id, promo_code)).
  const promo = typeof body?.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : '';
  let discountPct = 0;
  if (promo) {
    if (!(promo in VALID_PROMOS)) return json({ error: 'invalid promo code' }, 400, cors);
    discountPct = VALID_PROMOS[promo];
  }

  // Compute subtotal (server-side) per type.
  let subtotalCents = 0;
  let breakdown: Record<string, number> = {};
  let draftId: string | null = null;
  let gigDraftId: string | null = null;

  if (type === 'gig') {
    subtotalCents = GIG_PRICE_CENTS;
    breakdown = { gig: GIG_PRICE_CENTS };
    if (action === 'charge') {
      const { data: created, error } = await admin.from('gig_listings').insert({
        brand_id: user.id,
        title: features.title ?? '',
        description: features.description ?? null,
        stage: 'draft',
        comp: features.comp != null ? String(features.comp) : null,
        pay_type: features.pay_type ?? features.payType ?? null,
        deadline: features.deadline ?? null,
        location: features.location ?? null,
        platforms: features.platforms ?? [],
        deliverables: features.deliverables ?? null,
        skills_required: features.skills_required ?? features.skills ?? [],
        requirements: features.requirements ?? null,
        equipment: features.equipment ?? null,
      }).select('id').single();
      if (error || !created) return json({ error: 'could not create draft gig' }, 500, cors);
      gigDraftId = created.id;
    }
  } else if (type === 'campaign_edit') {
    if (!campaignId) return json({ error: 'campaignId required' }, 400, cors);
    const { data: existing, error } = await supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle();
    if (error || !existing) return json({ error: 'campaign not found' }, 404, cors);
    const wantFeatured = !!features.featured && !existing.featured;
    const featuredCents = wantFeatured ? (FEATURED_PRICES_CENTS[Number(features.featuredWeeks) || 0] ?? 0) : 0;
    const newEscrow = priceCampaign({ comp_type: features.compType ?? existing.comp_type, comp: features.comp ?? existing.comp, spots_total: features.spotsTotal ?? existing.spots_total }).escrowCents;
    const oldEscrow = priceCampaign(existing).escrowCents;
    const escrowDeltaCents = Math.max(0, newEscrow - oldEscrow);
    breakdown = { escrow: escrowDeltaCents, featured: featuredCents };
    subtotalCents = escrowDeltaCents + featuredCents;
  } else { // campaign_new
    const { escrowCents, featuredCents } = priceCampaign(features);
    breakdown = { escrow: escrowCents, featured: featuredCents };
    subtotalCents = escrowCents + featuredCents;
    if (action === 'charge') {
      const featuredUntil = features.featured ? new Date(Date.now() + ((Number(features.featuredWeeks) || 7) * 86400000)).toISOString() : null;
      const { data: created, error } = await admin.from('campaigns').insert({
        brand_id: user.id,
        brand_name: features.brand ?? features.brandName ?? '',
        name: features.campaign ?? features.name ?? '',
        description: features.description ?? null,
        stage: 'draft',
        comp_type: features.compType ?? null,
        comp: features.comp ?? null,
        spots_total: features.spotsTotal ?? null,
        platforms: features.platforms ?? [],
        deliverables: features.deliverables ?? {},
        following: features.following ?? null,
        deadline: features.deadline ?? null,
        location: features.location ?? null,
        requirements: features.requirements ?? null,
        products: features.products ?? [],
        featured: !!features.featured,
        featured_weeks: features.featured ? (Number(features.featuredWeeks) || 7) : 0,
        featured_until: featuredUntil,
      }).select('id').single();
      if (error || !created) return json({ error: 'could not create draft campaign' }, 500, cors);
      draftId = created.id;
    }
  }

  // Promos discount the FEE portion only (featured/gig) — never escrow, which is creator payment.
  const escrowCents = breakdown.escrow ?? 0;
  const discountedCents = escrowCents + Math.max(0, Math.round((subtotalCents - escrowCents) * (1 - discountPct)));

  if (action === 'quote') {
    return json({ amount_cents: discountedCents, subtotal_cents: subtotalCents, discount_pct: discountPct, breakdown }, 200, cors);
  }

  // ── CHARGE ──
  const effectiveCampaignId = type === 'campaign_new' ? draftId : (campaignId ?? null);
  const effectiveGigId = type === 'gig' ? gigDraftId : null;
  const paymentType = type === 'gig' ? 'campaign_fee' : ((breakdown.escrow ?? 0) > 0 ? 'escrow' : 'featured');

  let promoClaimed = false;
  try {
    // Zero-cost path — skip Stripe entirely. Per policy we do NOT claim a promo
    // redemption when the charge is free (discountedCents === 0).
    if (discountedCents === 0) {
      if (type === 'campaign_new' && draftId) {
        await admin.from('campaigns').update({ stage: 'open' }).eq('id', draftId).eq('brand_id', user.id);
      }
      if (type === 'gig' && gigDraftId) {
        await admin.from('gig_listings').update({ stage: 'open' }).eq('id', gigDraftId).eq('brand_id', user.id);
      }
      return json({ free: true, client_secret: null, amount_cents: 0, campaignId: effectiveCampaignId, gigId: effectiveGigId, breakdown }, 200, cors);
    }

    // Atomic one-use promo claim — insert FIRST so the UNIQUE(user_id, promo_code)
    // constraint (not a read-then-write check) enforces single use. Abort before any PI.
    if (promo) {
      const { error: claimErr } = await admin.from('promo_redemptions')
        .insert({ user_id: user.id, promo_code: promo, payment_id: null });
      if (claimErr) {
        if ((claimErr as any).code === '23505') return json({ error: 'promo code already used' }, 400, cors);
        return json({ error: 'could not apply promo code' }, 500, cors);
      }
      promoClaimed = true;
    }

    const stripe = new Stripe(stripeKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: discountedCents,
      currency: CURRENCY,
      metadata: {
        user_id: user.id,
        type,
        campaign_id: effectiveCampaignId ?? '',
        gig_id: effectiveGigId ?? '',
        promo_code: promo,
        featured: features.featured ? '1' : '0',
        featured_weeks: String(Number(features.featuredWeeks) || 7),
      },
      automatic_payment_methods: { enabled: true },
    });

    const { data: pay } = await admin.from('payments').insert({
      brand_id: user.id,
      campaign_id: effectiveCampaignId,
      gig_id: effectiveGigId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: discountedCents,
      type: paymentType,
      status: 'pending',
      promo_code: promo || null,
      discount_pct: discountPct * 100,
    }).select('id').single();

    // Link the claimed redemption to its payment now that the row exists.
    if (promo && pay?.id) {
      await admin.from('promo_redemptions').update({ payment_id: pay.id })
        .eq('user_id', user.id).eq('promo_code', promo);
    }

    return json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_cents: discountedCents,
      campaignId: effectiveCampaignId,
      gigId: effectiveGigId,
      breakdown,
    }, 200, cors);
  } catch (err) {
    // Roll back anything created before the failure so nothing is orphaned/locked.
    if (promoClaimed) await admin.from('promo_redemptions').delete().eq('user_id', user.id).eq('promo_code', promo);
    if (draftId) await admin.from('campaigns').delete().eq('id', draftId).eq('brand_id', user.id); // don't orphan a draft on charge failure
    if (gigDraftId) await admin.from('gig_listings').delete().eq('id', gigDraftId).eq('brand_id', user.id);
    if (err instanceof Stripe.errors.StripeError) return json({ error: err.message, code: err.code }, err.statusCode ?? 500, cors);
    return json({ error: 'Internal server error' }, 500, cors);
  }
});
