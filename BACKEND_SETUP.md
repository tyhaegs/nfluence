# nfluence operations

The active frontend source is `campaigns/src/`. Run `npm ci`, then `npm run check`. `build.sh` delegates to the same production build. The older root JSX files are historical references and are not used by the build.

Production frontend hosting uses the public Sites project `appgprj_6ae022d409a88191b1a20166a6e9580d`, with Supabase project `xynujmscxjxbfivylfne`. GitHub Pages from `main` remains available as a rollback copy. Three October 27, 2026 migrations implement the audit repairs. Do not reset the production database or run the old schema file over it.

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

Leaked-password protection is now enabled on the existing Pro plan. The site URL and email redirect allowlist include `https://nfluenceagency.com/campaigns/` and `https://nfluenceagency.com/campaigns/?recovery=1`. The browser reset flow is implemented; recovery-email delivery was verified in the agency Gmail mailbox using a temporary QA account. SPF, DKIM and DMARC passed; the test messages landed in Spam. A branded subject and body are configured, although the original template was still observed during the test. Both temporary QA accounts and the diagnostic function were removed.

Deliverables live in the private `content` bucket, under creator/application paths. Participants obtain five-minute signed links. Storage and database rules verify the exact application and actor. Never make this bucket public. Manual payment records are immutable to clients and require an amount and transfer reference.

## Website hosting

The user approved public hosting and domain migration on October 26, 2026. The sibling `nfluence-secure-host/.openai/hosting.json` records the existing Site identity; reuse it for every update. Its public URL is `https://nfluence-secure-host.tyhaegs.chatgpt.site`. The Worker serves the same 59 published assets and sets actual CSP, HSTS, frame protection, MIME protection, referrer and permissions response headers. Both GitHub Pages and Sites static mode ignored `_headers`; the active serving layer is the Worker.

Namecheap DNS targets are two apex A records (`162.159.143.30`, `172.66.3.26`) and a `www` CNAME to `custom-domains.chatgpt.site.`. Website records use a 60-second TTL. Ownership TXT records must stay in place. The Worker redirects `www` to the HTTPS apex and preserves paths and query strings. Both custom domains and certificates are active. Eleven public HTTPS checks passed for page/asset headers, the canonical redirect and 404 handling. Verification evidence is recorded in `notes/remediation-status.json`.

For future frontend releases, build and check this repository, synchronize its published files into the hosting repository's `public/`, run that repository's `npm test` and `npm run build`, and publish the exact pushed source through Sites. `scripts/build-worker.mjs` embeds the public assets into `worker/index.js` and `dist/server/index.js`; do not hand-edit those generated files. Verify actual response headers after publishing. A GitHub push alone does not update the Sites deployment.

Rollback: restore apex A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and `www` CNAME `tyhaegs.github.io.`. Keep GitHub Pages and its apex CNAME configured. The old GitHub certificate covered only the apex, so restoring it also restores the known `www` certificate limitation. Do not change MX, SPF, DKIM, DMARC or Supabase DNS records during a website rollback.

## Verification

`tests/platform.test.mjs` covers pricing, entitlements, test-key blocking, normalized identifiers, capacity, time zones, safe URLs, credential-free pending profiles, and service routes. `tests/backend-regression.sql` creates isolated fixtures inside a transaction and must always be followed by `ROLLBACK`; it exercises actor permissions, content, messages, calls, payouts, reviews, payment replay and the annual cap. It sends no emails and makes no Stripe requests.

The full database audit now reports no performance warnings. Unused indexes and Auth connection allocation are informational. Leaked-password protection is enabled and security advisors now report no findings. References: https://supabase.com/docs/guides/auth/password-security

Agency proof should use approved client examples and verified outcomes. No new client testimonials or numerical case-study results were invented.

Server functions select a current secret key from `SUPABASE_SECRET_KEYS`. Legacy anon/service_role JWT API keys were disabled on this project in May 2026; do not re-enable them or use them for new admin requests. An authenticated production quote returned 29900 cents after this repair; no payment was charged.

The current hosting deployment is `appgdep_6ae02ee3259481919543a2dd07357d25`, saved version 3, source commit `0b172dd378eec262fcddd038820a9b7c8a038696`. It was checked against all 59 original asset bytes, plus routing, CSP hashes, conditional requests and canonical redirects.
