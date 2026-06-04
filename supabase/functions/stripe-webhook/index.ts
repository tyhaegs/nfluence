import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Public endpoint — Stripe cannot present a Supabase JWT, so this is deployed with
// --no-verify-jwt and authenticated ENTIRELY by the Stripe-Signature header.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // whsec_…
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response('Webhook not configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const raw = await req.text(); // RAW body required for signature verification
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, sig, webhookSecret, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return new Response(`Bad signature: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m = pi.metadata ?? {};
      // Authoritative: mark the payment succeeded (idempotent).
      await admin.from('payments').update({ status: 'succeeded' }).eq('stripe_payment_intent_id', pi.id);
      if (m.campaign_id && m.user_id) {
        if (m.type === 'campaign_new') {
          // featured (if any) was already written on the draft by the EF; just publish it.
          await admin.from('campaigns').update({ stage: 'open' })
            .eq('id', m.campaign_id).eq('brand_id', m.user_id);
        } else if (m.type === 'campaign_edit' && m.featured === '1') {
          const weeks = parseInt(m.featured_weeks ?? '7', 10) || 7;
          await admin.from('campaigns').update({
            featured: true,
            featured_until: new Date(Date.now() + weeks * 86400000).toISOString(),
          }).eq('id', m.campaign_id).eq('brand_id', m.user_id);
        }
      }
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m = pi.metadata ?? {};
      // Reconcile, but only roll back PENDING payments — never touch a succeeded one
      // (e.g. a stray canceled event after capture). Closes P3-4 server-side.
      const { data: pays } = await admin.from('payments').select('id').eq('stripe_payment_intent_id', pi.id);
      const ids = (pays ?? []).map((p: any) => p.id);
      if (ids.length) {
        const { data: pendingPays } = await admin.from('payments')
          .select('id').in('id', ids).eq('status', 'pending');
        const pendingIds = (pendingPays ?? []).map((p: any) => p.id);
        if (pendingIds.length) {
          await admin.from('promo_redemptions').delete().in('payment_id', pendingIds);
          await admin.from('payments').delete().in('id', pendingIds);
        }
      }
      if (m.type === 'campaign_new' && m.campaign_id && m.user_id) {
        await admin.from('campaigns').delete()
          .eq('id', m.campaign_id).eq('brand_id', m.user_id).eq('stage', 'draft');
      }
    }
    // other event types: ignore
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return new Response('handler error', { status: 500 }); // 5xx → Stripe retries
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
