# nfluence operations

The active frontend source is `campaigns/src/`. Run `npm ci`, then `npm run check`. `build.sh` delegates to the same production build. The older root JSX files are historical references and are not used by the build.

Production uses GitHub Pages from `main` at the repository root, with Supabase project `xynujmscxjxbfivylfne`. Three October 27, 2026 migrations implement the audit repairs. Do not reset the production database or run the old schema file over it.

## Payments

The user confirmed $299 per campaign, $1,999 for annual access, and manual creator payments. Annual access is a single payment for 12 months, with up to three active campaigns and one 30-day featured placement each subscription month. It does not renew automatically. Creator compensation is paid separately by the brand; the platform records completed transfers and does not claim to move that money.

Existing Stripe credentials have been verified as Nfluence Agency sandbox credentials: test mode, charges disabled, business details not submitted. Online checkout remains unavailable until a verified live account is configured. `billing-info` exposes only public pricing, availability and a publishable key. `stripe-payment` checks the signed-in brand, calculates prices, reserves a durable request and records the Stripe reference. A signed webhook or authenticated reconciliation completes payment and publication in one database transaction. Repeated requests and events do not publish twice. Canceling an attempt cancels its unpaid Stripe intent and retains the ledger.

Configure these secrets through the Supabase dashboard or a secure environment, never source control or chat:

- `STRIPE_SECRET_KEY`: live Stripe secret key.
- `STRIPE_PUBLISHABLE_KEY`: matching live publishable key.
- `STRIPE_WEBHOOK_SECRET`: signature secret for this project's webhook endpoint.
- `BILLING_ENABLED`: set to `true` only after the live integration has been verified.

Stripe webhook URL: `https://xynujmscxjxbfivylfne.supabase.co/functions/v1/stripe-webhook`. Subscribe to `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled`. The Supabase JWT gateway is disabled for this function because Stripe authenticates with its signature; the handler requires and verifies that signature. The checkout function authenticates its user with Supabase.

Deploy functions using their checked-in `supabase/config.toml` settings. The four deployed functions are `stripe-payment`, `stripe-webhook`, `billing-info`, and `site-events`. After configuration, verify the signed webhook and a live purchase/refund with the account owner before opening checkout publicly. No real charge was made during remediation.

## Auth and files

Leaked-password protection is now enabled on the existing Pro plan. The site URL and email redirect allowlist include `https://nfluenceagency.com/campaigns/` and `https://nfluenceagency.com/campaigns/?recovery=1`. The browser reset flow is implemented; actual recovery-email delivery still needs an account-owner acceptance test.

Deliverables live in the private `content` bucket, under creator/application paths. Participants obtain five-minute signed links. Storage and database rules verify the exact application and actor. Never make this bucket public. Manual payment records are immutable to clients and require an amount and transfer reference.

## Remaining hosting work

DNS currently uses Namecheap nameservers. The `www` CNAME to `tyhaegs.github.io` is saved and verified on authoritative and recursive DNS. GitHub's certificate still needs to include `www`; do not call HTTPS complete until it does. Keep the existing apex configuration. Reference: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

GitHub Pages does not apply the checked-in `_headers` file. HTML pages now have a script-restricting Content Security Policy and referrer policy, but response-only controls such as `frame-ancestors` require a suitable hosting layer or proxy. `_headers` is prepared for a compatible host. Do not assume the response headers are active on Pages.

## Verification

`tests/platform.test.mjs` covers pricing, entitlements, test-key blocking, normalized identifiers, capacity, time zones, safe URLs, credential-free pending profiles, and service routes. `tests/backend-regression.sql` creates isolated fixtures inside a transaction and must always be followed by `ROLLBACK`; it exercises actor permissions, content, messages, calls, payouts, reviews, payment replay and the annual cap. It sends no emails and makes no Stripe requests.

The full database audit now reports no performance warnings. Unused indexes and Auth connection allocation are informational. Leaked-password protection is enabled and security advisors now report no findings. References: https://supabase.com/docs/guides/auth/password-security

Agency proof should use approved client examples and verified outcomes. No new client testimonials or numerical case-study results were invented.

Server functions select a current secret key from `SUPABASE_SECRET_KEYS`. Legacy anon/service_role JWT API keys were disabled on this project in May 2026; do not re-enable them or use them for new admin requests. An authenticated production quote returned 29900 cents after this repair; no payment was charged.

The prepared private hosting copy is recorded in the sibling `nfluence-secure-host/.openai/hosting.json`. Public access and domain cutover await the specific hosting approval requested in chat. Its source must be kept in sync with this repository before cutover.
