# Workflow Overhaul Results

Implemented on `feature/ui-overhaul` in the two requested folders: `Atelier/` and `coding-notes-extension/`.

## Problem library and recent notes

1. **Extension saves now enter the master library.** Every extension record is merged into Prova using stable source identities (extension key, normalized LeetCode/NeetCode URL, LeetCode slug, or frontend ID). A newly discovered problem creates a library record automatically.
2. **Prova and notes now have distinct roles.** `/prova` is the complete master library. `/coding` is the chronological Recent Notes view. Shared workflow tabs connect them.
3. **Every title opens a unique problem detail page.** `/problems/[id]` combines library metrics, current notes, earlier merged notes, extension note revisions, submissions, timing, hints/revisit state, and safe original problem links.
4. **Recent Notes is paginated.** The page accepts `?page=` and renders 12 records per page with previous/next controls.
5. **The Prova workspace now uses the available viewport.** On desktop, its filter column and results share a bounded height and scroll internally; mobile layouts return to natural document flow.

Identity merging is deterministic and idempotent. Display titles are deliberately excluded from identity matching, so two unrelated problems with the same title cannot be merged. A NeetCode record only joins a LeetCode record when an explicit shared source identifier proves they are the same problem. Earlier notes are retained when a proven duplicate is consolidated.

## Tutoring and payments

6. **Cancelled sessions leave the Zelle matching view.** Reconciliation removes cancelled and late-cancelled session placeholders from eligible matching data.
7. **Existing receipts are preserved.** A payment already marked received keeps its payment ID, Plaid/bank reference, amount, and received timestamp. If its session is cancelled, it becomes an unapplied credit or moves to the next eligible unpaid scheduled/completed session of the same value. Repeated cancellation is idempotent and can move that same receipt forward again without duplication.
8. **Tutoring navigation is consolidated.** Today, Calendar, Students, and Billing are the four workflow tabs. The former `/sessions` and `/students` index pages redirect into the matching Tutoring tab; student detail pages remain available.

## Extension interface

9. **Editor typography is consistent.** Labels, field copy, metrics, and controls use a small 12/14/16 type scale with regular body weights and restrained emphasis.
10. **Contrast is stronger.** Muted copy, input text, borders, and controls were darkened against the light surfaces.
11. **Account/profile text no longer clips vertically.** The footer account name has an explicit line height, minimum block size, and safe overflow behavior.

The requested Gooey treatment remains on the site and extension. Border Beam stays removed from the extension, and extension action buttons no longer show the green accent before hover.

## Account linking

12. **Google and GitHub use one verified linking policy.** The profile page now lets a signed-in user prove the existing account and explicitly link Google or GitHub. Linking is allowed only when Firebase reports the same UID and a verified matching email; cross-account data is never silently merged or overwritten. Extension connect preserves the chosen provider and offers a visible “Use different account” path.

Production provider setup still needs the matching Firebase project configuration: enable Google and GitHub providers, add the GitHub OAuth client/secret and Firebase callback URL, include the deployed domain in Firebase Authorized Domains, and keep the account-per-email policy consistent with the desired collision flow. No provider secrets are stored in this repository.

## Validation

- `npm run test:workflow` passes identity, idempotence, note-history, stale-save, local mirror recovery, cancellation/reallocation, receipt preservation, repeated cancellation, and verified-account guard cases.
- `node node_modules/typescript/bin/tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes with Next.js 16.3.3.
- Browser verification passes for the full-height Problem Library, encoded unique problem links, Recent Notes pagination shell, Tutoring tabs, and legacy route redirects.
- The extension drawer and popup were rendered from the final CSS to inspect scale, contrast, button treatment, and overflow behavior.

## Pacific Zelle bank-date follow-up (2026-09-21)

The Plaid history request previously used a UTC date key for its end date, while payment matching converted Plaid's date-only bank values into local noon timestamps. That made the requested range depend on the server's timezone and could exclude a payment exactly 14 calendar days away across the fall daylight-saving transition. The request now explicitly includes the current `America/Los_Angeles` calendar date as Plaid's inclusive `end_date`, with the start date calculated 90 calendar days earlier. Matching compares calendar dates rather than elapsed hours, so PST/PDT changes cannot shrink the ±14-day window.

The Billing view now shows the requested-through Pacific date and, when Plaid provides it, the last successful bank-data update. A successful check with no new match no longer claims that bank activity itself is up to date. Plaid and the financial institution can still deliver a same-day transaction later; the application cannot make an unavailable transaction appear early.

`npm run test:plaid-dates` covers Pacific midnight, the UTC day rollover, winter PST, spring/fall DST, today's inclusive request boundary, and both edges of the 14-day matching window. The existing workflow regression, TypeScript, ESLint, and production build were rerun for this follow-up.

The fix was merged through [PR #4](https://github.com/logancalder/atelier/pull/4) as main commit `b37a0641f00188e1459f508649399872f7fc980e`. GitHub reported the linked Vercel Production deployment successful, and the canonical [Atelier site](https://atelier-olive-omega.vercel.app/) returned HTTP 200. No private bank account or live Zelle transaction was used in verification.
