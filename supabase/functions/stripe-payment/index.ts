import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const { amount, currency = 'usd', metadata } = await req.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount, // in cents
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
