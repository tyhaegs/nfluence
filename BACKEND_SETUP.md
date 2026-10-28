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

The user approved public hosting and domain migration on October 26, 2026. The sibling `nfluence-secure-host/.openai/hosting.json` records the existing Site identity; reuse it for every update. Its public URL is `https://nfluence-secure-host.tyhaegs.chatgpt.site`. The Worker serves the same 62 published assets and sets actual CSP, HSTS, frame protection, MIME protection, referrer and permissions response headers. Both GitHub Pages and Sites static mode ignored `_headers`; the active serving layer is the Worker.

Namecheap DNS targets are two apex A records (`162.159.143.30`, `172.66.3.26`) and a `www` CNAME to `custom-domains.chatgpt.site.`. Website records use a 60-second TTL. Ownership TXT records must stay in place. The Worker redirects `www` to the HTTPS apex and preserves paths and query strings. Both custom domains and certificates are active. Eleven public HTTPS checks passed for page/asset headers, the canonical redirect and 404 handling. Verification evidence is recorded in `notes/remediation-status.json`.

For future frontend releases, build and check this repository, synchronize its published files into the hosting repository's `public/`, run that repository's `npm test` and `npm run build`, and publish the exact pushed source through Sites. `scripts/build-worker.mjs` embeds the public assets into `worker/index.js` and `dist/server/index.js`; do not hand-edit those generated files. Verify actual response headers after publishing. A GitHub push alone does not update the Sites deployment.

Rollback: restore apex A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and `www` CNAME `tyhaegs.github.io.`. Keep GitHub Pages and its apex CNAME configured. The old GitHub certificate covered only the apex, so restoring it also restores the known `www` certificate limitation. Do not change MX, SPF, DKIM, DMARC or Supabase DNS records during a website rollback.

## Verification

`tests/platform.test.mjs` covers pricing, entitlements, test-key blocking, normalized identifiers, capacity, time zones, safe URLs, credential-free pending profiles, and service routes. `tests/backend-regression.sql` creates isolated fixtures inside a transaction and must always be followed by `ROLLBACK`; it exercises actor permissions, content, messages, calls, payouts, reviews, payment replay and the annual cap. It sends no emails and makes no Stripe requests.

The full database audit now reports no performance warnings. Unused indexes and Auth connection allocation are informational. Leaked-password protection is enabled and security advisors now report no findings. References: https://supabase.com/docs/guides/auth/password-security

Agency proof should use approved client examples and verified outcomes. No new client testimonials or numerical case-study results were invented.

Server functions select a current secret key from `SUPABASE_SECRET_KEYS`. Legacy anon/service_role JWT API keys were disabled on this project in May 2026; do not re-enable them or use them for new admin requests. An authenticated production quote returned 29900 cents after this repair; no payment was charged.

The current hosting deployment is `appgdep_6ae25dff5378819187f4a050a9934c38`, saved version 13, source commit `cede0d579be627755ce45af9ee204cfff176a92e`. It was checked against all 62 current asset bytes, plus routing, CSP hashes, conditional requests and canonical redirects.

Marketing headers are generated from `scripts/navigation.mjs` during the production build. Shared presentation and mobile interaction live in `assets/navigation.css` and `assets/navigation.js`. Edit these sources instead of changing a single generated page header. The campaign application retains its React navigation.

Account access uses the shared `campaigns/src/auth-ui.jsx` components and `auth.css`, adapted from the Oasis Peptides panel design with nfluence branding. Brand and creator login, role selection, signup steps, email confirmation and password recovery share the same panel. Recovery stays centered below the Back / Log in action row. Auth service calls and signup persistence remain in the existing handlers.

The four original public demo campaigns in `campaigns/src/demos.js` are intentional examples for prospective brands. Preserve them on the landing and browse pages. Demo records use stable `demo-` IDs and explicit labels, stay separate from live database records, and never accept real applications.

## Free-campaign invitations

`campaign_sponsorship_codes` is a service-only, RLS-enabled inventory of individual single-use invitations. Each invitation waives the $299 platform fee for one standard new campaign. A brand enters it in the existing promo field, applies it, then confirms a $0 publication without a card. This works while ordinary Stripe checkout is unavailable. Featured placement must be turned off; annual access, gigs, edits and creator compensation are separate.

Issue a new cryptographically random code for each chosen brand. Store only SHA-256 of its trimmed uppercase form, plus a short display hint; never commit the actual invitation to website source. `assigned_brand_id` and `expires_at` are optional restrictions. Disabling an unused row revokes that invitation. Share the original code privately with the chosen brand.

The authenticated `stripe-payment` function verifies the brand and looks up the hash for a quote. `redeem_campaign_sponsorship` locks the invitation and atomically prepares/finalizes the publication, writes a zero-dollar payment receipt, and consumes the invitation. It is executable only by the billing service. Matching request retries return the same receipt; a second publication or changed request is rejected. A failed publication rolls back the redemption.

Migration: `20261028203251_free_campaign_invites.sql`. Billing Edge Function version 15 retains JWT verification. `tests/promo-integration.sql` exercises the real database in a transaction and rolls back every fixture.

## Signup confirmation repair — October 28, 2026

Public auth screens provide confirmation resends with a 60-second cooldown and visible delivery-request errors. Login errors retain the `email_not_confirmed` signal so the resend form appears immediately. Repeat signup copy is conditional and does not promise a new email for an already-confirmed account. Email addresses are trimmed and normalized before signup/login/resend.

The active Supabase Confirm sign up template uses subject `Confirm your email for nfluence` and `supabase/templates/confirmation.html`. Its link points to `https://nfluenceagency.com/campaigns/confirm.html#token_hash={{ .TokenHash }}`. This page strips the fragment from history and waits for an explicit confirmation button before calling `verifyOtp` with `type: email`; fetching the page alone does not consume the token. The site must be deployed before enabling this template. Existing direct Supabase confirmation links remain compatible. The sender remains the verified Resend address.

Verified with a temporary QA signup: branded email reached the agency Gmail inbox, the token established a confirmed session, replay was rejected, sign-out removed the session, and the temporary account was deleted. All 19 application checks and four Worker checks passed. Sites version 14 is deployed from hosting commit `fa25b67f0caf48f9fa5cc7e66f93b695ef884861`. Inbox placement at other email providers remains outside application control.
