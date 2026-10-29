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

The current hosting deployment is `appgdep_6ae26689e788819183cfde751cdfdceb`, saved version 20, source commit `debcdbbe692b6e15b64c99e5db6e42b3d4f494cf`. It was checked against all 64 current asset bytes, plus routing, CSP hashes, conditional requests and canonical redirects.

Marketing headers are generated from `scripts/navigation.mjs` during the production build. Shared presentation and mobile interaction live in `assets/navigation.css` and `assets/navigation.js`. Edit these sources instead of changing a single generated page header. The campaign application retains its React navigation.

Account access uses the shared `campaigns/src/auth-ui.jsx` components and `auth.css`, adapted from the Oasis Peptides panel design with nfluence branding. Brand and creator login, role selection, signup steps, email confirmation and password recovery share the same panel. Recovery stays centered below the Back / Log in action row. Auth service calls and signup persistence remain in the existing handlers.

The four original public demo campaigns in `campaigns/src/demos.js` are intentional examples for prospective brands. Preserve them on the landing and browse pages. Demo records use stable `demo-` IDs and explicit labels, stay separate from live database records, and never accept real applications.

## Free-campaign codes

The active `demo` code can be used by multiple brands, once per brand account. After the first successful sponsored campaign, that brand must use regular paid pricing or its existing paid annual entitlement. Code matching is case-insensitive. It waives the standard $299 new-campaign platform fee without a card, even while ordinary Stripe checkout is unavailable. Featured placement must be off; annual access, gigs, edits and creator compensation are separate. The earlier random invitation and `supervibe` name have been replaced.

Codes are created and revoked in `/campaigns/#owner`. The owner chooses one-per-brand, reusable, or single-use behavior, an optional recipient account email, an optional expiration, and a label. Recipient email is compared with the verified Auth email; it can be reserved before the brand signs up. Only a hash is stored; the full code is displayed when created.

`campaign_sponsorship_redemptions` records every use, linked to its zero-dollar payment receipt and campaign. `redeem_campaign_sponsorship` locks the code, checks its restrictions, publishes and consumes a use atomically. Matching request retries return the same receipt; separate campaigns can reuse an unlimited code. Revocation prevents future redemptions and preserves existing campaigns. Completed client checkouts clear their request key so a later identical campaign can use a fresh request.

Migrations: `20261028203251_free_campaign_invites.sql`, `20261028205524_owner_control_center.sql`, `20261028210516_reusable_campaign_codes.sql`. Billing function version 18 retains JWT verification. Transactional tests are in `tests/promo-integration.sql` and `tests/reusable-promo-integration.sql`.

## Signup confirmation repair — October 28, 2026

Public auth screens provide confirmation resends with a 60-second cooldown and visible delivery-request errors. Login errors retain the `email_not_confirmed` signal so the resend form appears immediately. Repeat signup copy is conditional and does not promise a new email for an already-confirmed account. Email addresses are trimmed and normalized before signup/login/resend.

The active Supabase Confirm sign up template uses subject `Confirm your email for nfluence` and `supabase/templates/confirmation.html`. Its link points to `https://nfluenceagency.com/campaigns/confirm.html#token_hash={{ .TokenHash }}`. This page strips the fragment from history and waits for an explicit confirmation button before calling `verifyOtp` with `type: email`; fetching the page alone does not consume the token. The site must be deployed before enabling this template. Existing direct Supabase confirmation links remain compatible. The sender remains the verified Resend address.

Verified with a temporary QA signup: branded email reached the agency Gmail inbox, the token established a confirmed session, replay was rejected, sign-out removed the session, and the temporary account was deleted. All 19 application checks and four Worker checks passed. Sites version 14 is deployed from hosting commit `fa25b67f0caf48f9fa5cc7e66f93b695ef884861`. Inbox placement at other email providers remains outside application control.

Duplicate signup handling now rejects Auth's empty-identities response for already-confirmed emails and maps explicit duplicate errors to a clear existing-account message. Pending signup responses are checked against the saved `profiles_public.role`; editable auth metadata never determines the registered account type. Both brand and creator handlers save local onboarding data only after these checks pass. Matching pending accounts retain confirmation recovery. Live QA verified opposite-role signup rejection before and after confirmation, with the original profile role preserved; the QA account was signed out and removed. Application checks cover both role directions and preserve network/rate-limit errors. Website builds exclude `supabase/` so shared page navigation cannot be inserted into saved email templates.

The confirmation card now contains only a short instruction, email field, resend action, and login/help links. Extra delivery and recovery guidance lives in a native modal dialog opened by “Need help?”. The dialog supports Escape, backdrop dismissal, keyboard focus containment, and password-reset navigation. Resend feedback is concise; the existing cooldown and error handling are retained. Desktop and phone-size browser checks verified the compact layout and help navigation.

## Owner control room

Open `https://nfluenceagency.com/campaigns/#owner`. The requested primary owner login is `tyler@nfluenceagency.com`; an invitation was sent to that address so the owner can confirm it and choose a password. The previous verified owner account remains available. No password was selected or changed by automation.

The dashboard manages real campaigns, account and membership records, promo codes and redemption history, platform payment receipts, private deliverables, recorded creator payouts, and an owner-action audit log. It can grant annual-plan access without inventing a payment, extend or end access, edit campaign descriptions/timing, and move published campaigns through their lifecycle. Drafts still require a checkout or sponsored code. Ending platform membership does not issue a refund or alter external Stripe charges.

`owner-admin` version 5 validates the JWT with Auth, requires a confirmed email and a matching active Auth session, and checks `platform_owners` on every operation. The allowlist and mutation/read RPCs are service-only. Owner status does not come from customer-editable metadata or profile roles. Owner directory queries use canonical Auth emails. Every dashboard mutation is idempotent and audited.

`tests/owner-integration.sql` exercises ownership, session invalidation, metadata forgery, all read views, membership changes, scoped codes, campaign changes, client denials, and audit receipts inside a rolled-back transaction. UI previews use isolated local data; they do not change real memberships or consume the live promo.

## Dashboard audit — October 28, 2026

Migration `20261028230834_dashboard_audit.sql` adds typed list filters to `owner_read` (sixth argument, default `all`) and enforces `auth.sessions.not_after`. The old five-argument overload was removed to avoid RPC ambiguity; existing positional calls resolve to the defaulted sixth argument. The RPC remains service-only with an owner allowlist and pinned search path. Owner API v4 validates filters and dates, bounds streamed bodies, and returns 404 for missing campaigns.

The dashboard refreshes open details/history, cancels stale view requests, keeps save receipts through refresh failures, retries expired tokens once with the same mutation ID, preserves selected membership recipients across searches, clamps pagination, and safely opens signed files with a blocked-popup fallback. Overview links apply matching filters. Code inventory resolves assigned Auth emails and finite use caps. `demo` is now limited to one free campaign per brand account.

Verification: 38 application tests; transactional permissions/session, membership/code/campaign/idempotency tests with 101-row pagination; authenticated owner and brand API checks using disposable accounts; all seven populated sections at 320/390/768/1440 pixels; modal, search, delayed-request and failure recovery checks. Primary owner email confirmation and live Stripe setup remain pending. Browser images use local fixtures; no real membership, payment or promo redemption was changed.

Published as Sites version 23, hosting commit `54aa62618ae3f28ec725496ce9695a8967dbdb93`, deployment `appgdep_6ae2821d76d0819185e86be366159d7f`. All 71 served assets passed four Worker checks; the browser confirmed the live route serves the new release and the security advisor has no findings.

## One free campaign per brand — October 28, 2026

Migration `20261029002337_per_brand_campaign_code_limit.sql` sets `demo.max_redemptions_per_brand = 1` while retaining `max_redemptions = NULL` globally. Every brand account can use the shared code once. Regular standalone campaigns remain $299, and paid annual entitlements continue to apply when no promo is used.

Private `campaign_sponsorship_brand_usage` counters are authoritative for per-brand limits. Existing ledger uses are backfilled. Publication checks the counter under the existing brand advisory lock and code row lock, then publishes, writes the receipt/ledger and increments both counters atomically. Matching successful retries return the original receipt before checking the quota. Failed publications consume no allowance. The counter survives campaign/receipt deletion and cannot be reset by a customer. Account/code removal cascades its own private usage rows.

Billing function v18 checks the same counter for quotes; repeated use returns a message to remove the code and continue at regular pricing. Direct final-publication calls enforce the database rule independently of quotes. Owner API v5 supports the `per_brand` usage option; owner inventory and successful code-creation dialogs display “One free campaign per brand”. Checkout repeats the policy beside a valid free quote. Both functions retain JWT verification.

Verified with 40 application tests, three rolled-back database suites, authenticated API tests using two disposable brand accounts, and desktop/phone dashboard checks. Tests cover first use, repeat and changed-brief rejection, cross-brand eligibility, preserved idempotency, failure rollback, campaign-deletion resistance, denied direct counter access, and restoration of the standard $299 quote without the code. No real campaign, receipt, membership, or payment was changed by tests.

The one-per-brand update is published as Sites version 25, hosting commit `42bdf5a3e4dc0fb2bf27125ce3c66ba42cc39841`, deployment `appgdep_6ae292d7a72c8191aad9931a0ffd45ec`. All four hosting checks passed. The browser confirms the live asset release; the security advisor returned no findings.

## Full owner functionality and visual audit — October 28, 2026

Migration `20261029004052_owner_dashboard_integrity.sql` serializes membership changes by brand and rejects overlapping active access or a pending annual checkout. Campaign deletion now preserves platform receipts and sponsored-use history with `ON DELETE SET NULL`; owner history marks removed campaigns and checkout retries cannot reuse the deleted campaign’s free allowance. Activity rows resolve readable target labels.

The UI separates failed lists from real empty results, restores focus through code-dialog replacement, supports Escape on code confirmation, locks background scrolling, uses 44px minimum touch targets, and displays clear campaign/cap/payment labels. Verification includes 43 application checks, rolled-back integrity/regression suites, 49 populated section and 28 modal size checks, plus real production sign-in, code creation/copy, private upload download, draft editing and membership actions using disposable fixtures. No real money was moved; the real `demo` code was untouched.

Published as Sites version 27, hosting commit `ede2936b604ffb5610e392277ad6a00e5e2a4c67`, deployment `appgdep_6ae2992258808191bb844cde50fa2359`. The primary owner invitation and live Stripe setup remain pending. The complete evidence and limits are in `notes/owner-full-audit-2026-10-28.md`.
