import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://nfluenceagency.com',
  'https://www.nfluenceagency.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // Require STRIPE_SECRET_KEY
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return json({ error: 'Payment service not configured' }, 500, cors);
  }

  // Supabase auth — require a valid Bearer token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401, cors);
  }
  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: 'Auth service not configured' }, 500, cors);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401, cors);
  }

  // Parse request body
  let body: { amount?: unknown; currency?: unknown; metadata?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, cors);
  }

  const { amount, currency, metadata } = body;

  // Validate amount — must be a positive integer (cents)
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return json({ error: 'amount must be a positive integer representing cents' }, 400, cors);
  }

  // Validate currency
  if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
    return json({ error: 'currency is required' }, 400, cors);
  }

  // Create PaymentIntent
  try {
    const stripe = new Stripe(stripeKey);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: metadata && typeof metadata === 'object' ? metadata as Record<string, string> : {},
      automatic_payment_methods: { enabled: true },
    });

    return json({ client_secret: paymentIntent.client_secret }, 200, cors);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return json({ error: err.message, code: err.code }, err.statusCode ?? 500, cors);
    }
    return json({ error: 'Internal server error' }, 500, cors);
  }
});
