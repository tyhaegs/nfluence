# Owner dashboard functionality and visual audit — October 28, 2026

Dashboard: https://nfluenceagency.com/campaigns/#owner

Completed a fresh audit of every owner section and dialog. This pass included the live sign-in flow and real backend actions using a disposable verified owner, brand, creator, private draft, private upload and invitation. Public campaign records were never committed during fixture setup: the application setup transaction returned the test campaign to draft before committing. All test accounts, sessions, membership grants, codes, uploads and audit entries were removed afterward. Tyler’s credentials and real memberships were not changed. The real `demo` code stayed enabled, unused, and limited to one free campaign per brand.

## Fixed findings

| Severity | Finding | Fix |
| --- | --- | --- |
| High | Restoring an older membership could overlap another active membership for the same brand. | Membership changes now take the same brand lock used by grants, recheck for overlapping access, and reject a pending annual checkout. Valid extensions and restoration still work. |
| High | Deleting a campaign cascaded into its financial receipt and promo redemption history. | Receipts survive with a null campaign reference; history identifies a deleted campaign and disables its unavailable management link. A replay of the deleted campaign returns a clear error and never resets the free allowance. |
| Medium | A failed list request could display a misleading “No records found” state and stale pagination. | Lists show a distinct error panel with a retry action and hide the unverified record count. |
| Medium | Replacing the creation form with the code confirmation could lose keyboard return focus; that confirmation did not close with Escape. | Focus returns to the original trigger, Escape closes the confirmation, and closing dialogs restores page scrolling. |
| Medium | A successful write with an unreadable response could look like a definite failure. | The message explains that the change may have saved and preserves the idempotent retry path. |
| Low | Raw campaign states and expired application windows were hard to interpret. | Campaigns use clear labels, including “Applications closed” for elapsed open windows. Codes distinguish per-brand and total-use caps; payment types use plain labels. |
| Low | Activity rows lacked an immediately recognizable target. | Rows identify the campaign, code label, or canonical recipient email. |
| Low | Some touch targets were 42px, dialogs could scroll the page behind them, and some modal titles were generic. | Controls have a 44px minimum height, dialogs contain scrolling, campaign dialog titles name the action, and the redundant loading branch was removed. |

## Verification

| Area | Evidence |
| --- | --- |
| Application | All 43 tests passed, including new state-label, cap, and ambiguous-write regressions. |
| Database | Owner integration, per-brand promo, and new integrity suites passed inside rolled-back transactions. Covered permissions, sessions, all read views, membership grant/extend/end and overlap/pending-checkout rejection, code caps/retries/revocation, campaign edits/stages, retained receipts/history and deletion-resistant free allowances. |
| Live browser | Temporary owner signed in through the production login page and reached the owner dashboard. Verified real code creation with an email reservation and one-per-brand setting, copying, Escape, focus/scroll restoration, membership grant, a saved private draft edit, application/deliverable display, private signed-file opening, and draft status protection. |
| Live API | Using the same disposable fixture: membership extension/end persisted; code usage history and revocation worked; activity identified the recipient; the private file downloaded successfully; revoking owner access immediately denied the existing session. |
| Responsive layouts | All seven populated sections passed at 320, 375, 390, 700, 768, 1024 and 1440px: 49 checks, no horizontal overflow and no buttons below the 44px target height. |
| Dialogs | Create code, grant/extend/end membership, edit campaign, change status and revoke code passed at 320×640, 390×844, 667×375 and 1440×900: 28 checks for fit, overflow, focus and page-scroll locking. Code confirmation was additionally exercised through the live flow. |
| Failure states | Isolated preview verified a failed list shows a retry panel without a false empty result. Existing regression coverage and prior fixtures verify delayed-response cancellation, expired sessions, inaccessible records, refresh failures after a successful save and blocked-popup fallback. |
| Hosting | Four Worker tests passed against all 71 served assets, covering response protections, routing, CSP hashes and HTTP behavior. Sites version 27 deployed successfully. |
| Security | Supabase security advisor returned no findings. Regular brands and revoked sessions cannot use owner endpoints. Private counters remain inaccessible to clients. |

The section and modal matrices are saved beside this report as `section-layouts.json` and `dialog-layouts.json`. Large-population and responsive screenshots use isolated local data. The authenticated browser actions above used actual production APIs and disposable records, not simulated API responses.

## Remaining setup and scope

- `tyler@nfluenceagency.com` is still awaiting confirmation of the already-sent invitation. This audit did not bypass verification or choose a password.
- Live paid Stripe checkout remains disabled. Receipts and access controls were tested without charging a card. Creator payouts remain manual, as requested.
- The owner view inspects applications, deliverables, recorded manual payouts and platform receipts. It does not initiate transfers, Stripe refunds, or creator-content approval decisions. Those were not represented as completed financial actions.

Publication: Sites version 27, hosting commit `ede2936b604ffb5610e392277ad6a00e5e2a4c67`, deployment `appgdep_6ae2992258808191bb844cde50fa2359`. Database migration: `20261029004052_owner_dashboard_integrity.sql`. Owner API version 5; billing API version 18.
