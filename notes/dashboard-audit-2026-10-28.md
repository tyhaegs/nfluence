# nfluence owner dashboard audit — October 28, 2026

Dashboard: https://nfluenceagency.com/campaigns/#owner

The owner control room was reviewed across overview, campaigns and details, memberships, promo codes and usage history, brands/creators, payment receipts, private deliverables, and the activity log. Confirmed defects were fixed. Testing combined source review, real authenticated API requests with disposable accounts, database transactions that roll back, and populated local browser fixtures. No real campaign, membership, payment, or promo redemption was changed by testing.

## Fixed findings

| Finding | Result |
| --- | --- |
| Refresh omitted open campaign details and code history | Refresh reloads the visible records as well as lists and totals. |
| Delayed requests could reopen a campaign/history after switching sections | Independent request sequences discard outdated responses; closing history invalidates pending loads. |
| Successful edits could appear unsuccessful when the follow-up read failed | A saved-change receipt remains visible, updated campaign fields are retained, and refresh failures are shown separately. The retry key survives ambiguous write failures. |
| Expired access tokens produced dead-end errors | The transport refreshes once and retries with the same request body and mutation ID. Access denials and network writes are not blindly retried. |
| Expired time-boxed Auth sessions could still pass the owner session check | The server now checks session expiry in addition to ownership and session existence. All access failures close private views and forms. |
| Overview totals opened unrelated/unfiltered records | Metric links set matching server filters for active campaigns/memberships, available codes, account roles, and confirmed payments. Visible filters are also available in lists. |
| Membership recipient could disappear beyond the first 50 accounts or after searching | The chosen canonical account is retained and visible across search results. Tested from page three and after changing selection. |
| Removing the final filtered record could strand pagination on an empty page | Lists and usage history clamp to the last valid page and reload. Database regression uses 101 codes. |
| Async signed-file opening could be blocked by the browser | The window opens synchronously, its opener is severed, and navigation waits for a verified HTTPS storage URL. Blocked popups get a normal click-to-open link; failed signing closes the empty window. |
| Code input label included the Generate button | Code has its own explicit accessible label; selects also expose concise names. |
| Brand-bound code could appear open to everyone; finite multi-use code could say Single use | Codes display the canonical assigned account and the actual use cap. Memberships retain their actual pending/failed status instead of all being called expired. |
| Impossible dates and malformed/missing-record requests produced poor errors | Calendar dates/durations are checked; filters are allowlisted; request bodies are bounded to 30 KB; missing campaign details return 404. |

## Verification

- 38 application tests passed, including refresh/retry behavior, unchanged mutation IDs, ambiguous network failures, denied access, popup ordering, URL validation, pagination boundaries, and calendar dates.
- Database suite passed: owner allowlist, forged metadata denial, live/revoked/expired sessions, direct-client denials, membership grant/extend/end, code assignment/redemption/revocation, idempotency, campaign state/edit rules, draft checkout guard, audit receipts, all filters, canonical recipients, and 101-row pagination. Every fixture was rolled back.
- Authenticated production API checks passed for a disposable verified owner across every dashboard section/filter, missing campaigns, malformed requests, invalid filters/dates, and revoked-session rejection. The temporary owner and session were removed.
- Ordinary-brand API checks passed, including forged actor/owner metadata denial and a $0 quote for `demo`. The quote did not redeem the code. Temporary fixtures were removed.
- Browser fixtures passed all seven sections at 320, 390, 768, and 1440 px: 28 populated section checks and four membership-modal checks without horizontal overflow. Browser checks covered page-three account selection, search retention, code creation, Escape/focus behavior, delayed-response navigation, saved-write/read-failure behavior, overview-error retry, and denied-owner screens.
- Supabase security advisor returned no findings before the changes. Post-change security advisor also returned no findings. Four hosting tests passed, covering all 71 served assets, security headers, routing, CSP hashes, and HTTP behavior. The browser confirmed the live owner route loads the new JS/CSS release.

## Live setup still required

1. `tyler@nfluenceagency.com` is allowlisted as an owner but its email remains unconfirmed. Complete the already-sent invitation and choose a password, then use the dashboard link above. Verification was not bypassed and no password was changed.
2. Live paid Stripe checkout is disabled. The deployed API reports it unavailable; production billing needs the existing live-Stripe configuration to be completed. This audit did not charge a card, change Stripe accounts, or enable live billing.

The `demo` code remains enabled, reusable, and unlimited. Its real redemption count was 0 at the audit checks. It covers the standard $299 campaign fee; creator compensation, paid extras, and annual membership are separate. The advertised annual plan remains $1,999 for 12 months.

## Scope and evidence limits

Creator applications, uploaded deliverables, recorded manual payouts, and Stripe receipts are inspected in the owner dashboard. Applicant acceptance, content approval, external transfers, and Stripe refunds are not controls offered in this owner view. They were not represented as completed money movements by the audit. Real positive owner UI sign-in was not performed using Tyler's credentials: private flows were tested through isolated browser fixtures and a disposable authenticated API owner.

`dashboard-preview.png` and `dashboard-mobile-preview.png` show local fixture previews, not an authenticated screenshot of Tyler's live account. `responsive-checks.json` contains the populated section-size results.

## Publication

Sites version 23 deployed successfully. Hosting commit: `54aa62618ae3f28ec725496ce9695a8967dbdb93`. Owner API: version 4. Database migration: `20261028230834_dashboard_audit.sql`. The live owner link correctly displays sign-in while logged out. Raw Python HTTP verification received a 403 from the edge; browser verification succeeded. Private authenticated UI checks used local fixtures, as described above.

Performance advisor reported informational notices for 12 unused indexes and Auth’s fixed 10-connection allocation. They are not runtime failures. Unused indexes were retained because production traffic is low and several support foreign keys; reassess with representative traffic. Review [unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) and [production connection guidance](https://supabase.com/docs/guides/deployment/going-into-prod) when scaling.
