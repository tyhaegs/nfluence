# Nfluence — Backend Setup Guide

## Overview
- **Database + Auth + Storage**: Supabase
- **Payments**: Stripe (charges only — manual creator payouts for now)
- **Hosting**: GitHub Pages (existing, unchanged)

---

## Step 1 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Name it `nfluence`, choose a region close to your users (US East recommended)
4. Set a strong database password — save it somewhere safe
5. Wait ~2 minutes for the project to spin up

---

## Step 2 — Run the Schema

1. In your Supabase dashboard, go to **Database → SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the editor and click **Run**
5. You should see "Success. No rows returned" — that's correct

---

## Step 3 — Create Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it `content`
4. Check **Public bucket** (creator content URLs need to be publicly accessible)
5. Click **Save**

---

## Step 4 — Get Your API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon / public key** → this is your `SUPABASE_ANON_KEY`

---

## Step 5 — Add Environment Variables

Since the app is built with Babel standalone on GitHub Pages, add these directly to your `build.sh` or `index.html` as global constants before your script tags:

```html
<script>
  window.SUPABASE_URL = 'https://your-project.supabase.co';
  window.SUPABASE_ANON_KEY = 'your-anon-key';
</script>
```

Then update `src/lib/supabase.js` to use:
```js
const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;
```

**Never commit real keys to a public repo.** For GitHub Pages, use a separate private config file that's in `.gitignore`, or use GitHub Actions secrets to inject them at build time.

---

## Step 6 — Install Supabase JS

Since you're using Babel standalone (no bundler), add the CDN script to `index.html` before your app scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

Then replace the import in `supabase.js` with:
```js
const { createClient } = window.supabase;
```

---

## Step 7 — Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Go to **Developers → API keys**
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Add to your HTML config:
```html
<script>
  window.STRIPE_PUBLISHABLE_KEY = 'pk_test_...';
</script>
```
5. Install Stripe.js via CDN:
```html
<script src="https://js.stripe.com/v3/"></script>
```

**For taking real payments** you'll need a backend endpoint (Supabase Edge Function or separate server) to create Payment Intents — Stripe secret keys can never be in the browser. See Step 9.

---

## Step 8 — Wire Auth Into the App

Replace the demo `signIn` / `signUp` flows in `NfluenceApp.jsx`:

**Brand sign in:**
```js
import { signIn } from './src/lib/supabase';

const handleSignIn = async (email, password) => {
  const { user } = await signIn(email, password);
  setUser({ email: user.email, name: user.user_metadata.name, id: user.id });
  setView('dashboard');
};
```

**Brand sign up (new campaign flow):**
```js
import { signUpBrand } from './src/lib/supabase';

const handleSignUp = async (email, password, name) => {
  const { user } = await signUpBrand(email, password, name);
  setUser({ email: user.email, name, id: user.id });
};
```

**Persist session on page load:**
```js
import { getSession } from './src/lib/supabase';

useEffect(() => {
  getSession().then(session => {
    if (session?.user) {
      setUser({ email: session.user.email, name: session.user.user_metadata.name, id: session.user.id });
      // fetch profile, campaigns, etc.
    }
  });
}, []);
```

---

## Step 9 — Supabase Edge Function for Stripe

Stripe Payment Intents must be created server-side. Create a Supabase Edge Function:

1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase functions new create-payment-intent`
3. Edit `supabase/functions/create-payment-intent/index.ts`:

```ts
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
```

4. Set your Stripe secret key:
```
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

5. Deploy:
```
supabase functions deploy create-payment-intent
```

6. Call it from the frontend:
```js
const { data } = await supabase.functions.invoke('create-payment-intent', {
  body: { amount: Math.round(totalDue * 100), metadata: { campaign_id, type: 'featured' } }
});
// data.client_secret → pass to Stripe.js to confirm payment
```

---

## Step 10 — Replace In-Memory State

The `src/lib/api.js` file contains all the functions needed to replace useState calls. Key swaps in `NfluenceApp.jsx`:

| Current (in-memory) | Replace with |
|---|---|
| `setMyCampaigns(...)` | `createCampaign(brandId, data)` |
| `mergedDemos` (DEMO_CAMPAIGNS) | `getPublicCampaigns()` |
| `setAppliedCampaigns(...)` | `applyToCampaign(...)` |
| `setAllMessages(...)` | `sendMessage(...)` |
| `setNotifications(...)` | `createNotification(...)` / `subscribeToNotifications(...)` |
| `setScheduledCalls(...)` | `createScheduledCall(...)` |

---

## Step 11 — Real-time Subscriptions

Replace polling with Supabase real-time. In `NfluenceApp.jsx`:

```js
useEffect(() => {
  if (!user?.id) return;

  // Subscribe to notifications
  const notifSub = subscribeToNotifications(user.id, (payload) => {
    setNotifications(prev => [payload.new, ...prev]);
  });

  return () => { supabase.removeChannel(notifSub); };
}, [user?.id]);
```

Same pattern for messages — subscribe when a thread is open, unsubscribe on close.

---

## Email Confirmation

By default Supabase requires email confirmation. During development, disable it:
1. Go to **Authentication → Settings**
2. Toggle off **Enable email confirmations**
3. Re-enable before going live

---

## Before Going Live Checklist

- [ ] Attorney review complete
- [ ] Supabase email confirmation enabled
- [ ] Stripe account verified (out of test mode)
- [ ] Real domain on HTTPS (required for Stripe.js)
- [ ] `.env` / config file in `.gitignore`
- [ ] Row Level Security tested — sign in as different users and confirm you can't see others' data
- [ ] Storage bucket CORS configured for your domain
- [ ] Supabase project on a paid plan if you expect > 500 MAU or > 1GB storage
