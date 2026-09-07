# Atelier Firebase setup

## Authentication

Enable these providers in Firebase Console → Authentication → Sign-in method:

- Email/Password
- Google
- GitHub

Keep **One account per email address** enabled under Authentication settings. Atelier also handles Firebase's `account-exists-with-different-credential` response: after the user authenticates with their original method, the pending Google, GitHub, or password credential is linked to that same Firebase UID.

The first linked provider that supplies a profile photo becomes the Atelier profile photo. Linking another provider later does not replace it.

## Chrome extension sign-in

The NeetCode drawer opens Atelier's web sign-in in a small popup, then completes a one-time account pairing. Email/password, Google, and GitHub all use the same pairing boundary; Firebase credentials are never returned to extension code.

The extension uses Atelier's short-lived, user-approved web pairing flow, so no Chrome extension origin needs to be added as a Firebase authorized domain. Keep the desired Google, GitHub, and email/password providers enabled under Authentication → Sign-in method.

For GitHub, create an OAuth app and use Firebase's displayed `/__/auth/handler` URL as its callback URL. Add `localhost` and your deployed Atelier domain to Authentication → Settings → Authorized domains.

Copy the web-app and service-account values into `.env.local` using `.env.example`. Never expose `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL` as `NEXT_PUBLIC_` values.

## Firestore design

```text
users/{uid}
  displayName
  email
  photoURL
  timezone
  bio
  updatedAt

users/{uid}/snapshots/studio
  settings
  students[] (includes lateCancelFeeCents)
  series[]
  sessions[] (status may be late_cancel)
  deletedSessionKeys[]
  payments[] (status may be cancelled)
  notes[]
  updatedAt

users/{uid}/snapshots/coding
  problems[]
  updatedAt
  syncedAt

users/{uid}/private/plaid
  accessToken
  itemId
  institutionName
  cursor and reconciliation state

extensionTokens/{sha256(token)}
  uid
  createdAt
  lastUsedAt
  expiresAt
```

This snapshot design mirrors the current local JSON model without lossy migrations and requires no composite indexes. It is appropriate for a private, single-owner desk. If either snapshot approaches Firestore's 1 MiB document limit, split it into `codingProblems/{problemKey}`, `students/{studentId}`, `sessions/{sessionId}`, and related subcollections.

The browser never receives Admin credentials. Firebase Auth ID tokens are accepted only by the same-origin session endpoint, checked for a recent sign-in, and exchanged for a five-day HTTP-only cookie. The server Admin SDK performs Firestore writes under the verified user's UID.

## Extension accounts

Atelier Problem Notes does not embed Firebase or OAuth secrets. Choose **Connect account** in the extension popup; it opens an authenticated Atelier pairing page and issues a random, revocable 30-day extension token scoped to that Firebase UID. The raw token remains in `chrome.storage.local`; Firestore stores only its SHA-256 hash and expiry metadata. Coding API requests without a valid, unexpired session or extension token are rejected once Firebase is configured.

The extension also partitions its offline Chrome cache by Firebase UID. Disconnecting revokes the token but preserves that account's offline notes. Pairing a different user selects a different cache, preventing NeetCode data from crossing accounts.

Plaid connections are likewise UID-scoped. Each user completes Plaid Link independently, Plaid receives their Firebase UID as `client_user_id`, and the access token lives only in the server-owned `users/{uid}/private/plaid` document plus the ignored UID-scoped local cache.

Because Firestore is server-only here, rules can deny direct client access:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Client demos

The `/demos` section requires a verified Atelier session, including on every settings mutation. Demo documents in `demoSites/{id}` are scoped to the creating Firebase UID. They store a salted scrypt password hash, a hashed per-site server key, an enabled flag, an optional ISO UTC expiry, and a version used to invalidate sessions when a password changes or access is toggled.

Set `ATELIER_DEMO_URL=https://<atelier-domain>/api/demo-access` and `ATELIER_DEMO_KEY=<one-time-key>` on each demo host. Keep the key server-only. The integration POSTs `{action:"login",password,userAgent}` or `{action:"validate",session}` with `Authorization: Bearer <key>`. Do not expose this key in browser JavaScript. Tim's Handyman demonstrates the integration. An unavailable API must keep the demo locked.

Successful password entries create `demoSites/{id}/logins/{id}` records with a server timestamp (`at`) and a coarse browser/OS/device description (`device`). Failed passwords and subsequent session checks do not create login records. No IP addresses, raw user-agent strings, fingerprinting, or passwords are logged. The UI displays the latest 50 records; history remains until removed by the owner through database administration. These records show use of a shared password, not a person's identity. The demo login page discloses collection.

Sessions are random tokens stored only as SHA-256 hashes in `sessions/{hash}` with at most 24-hour expiry. Every validation rechecks the demo expiry, enabled state, and version. A per-demo transactional limit allows 100 login attempts per 15-minute window. Direct browser Firestore access must remain denied, as above. Optional Firestore TTL can be configured on a separate Timestamp field in a future retention change; current ISO expiry is enforced by application checks.

Run `node --experimental-strip-types scripts/demo-regression.mjs` for pure checks. Set `DEMO_INTEGRATION_TEST=1` and run with `--env-file=.env.local` after `npm run build` to exercise the real API with a temporary isolated Firebase demo; test fixtures are removed afterward.
