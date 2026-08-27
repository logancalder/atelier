# Atelier Firebase setup

## Authentication

Enable these providers in Firebase Console → Authentication → Sign-in method:

- Email/Password
- Google
- GitHub

Keep **One account per email address** enabled under Authentication settings. Atelier also handles Firebase's `account-exists-with-different-credential` response: after the user authenticates with their original method, the pending Google, GitHub, or password credential is linked to that same Firebase UID.

The first linked provider that supplies a profile photo becomes the Atelier profile photo. Linking another provider later does not replace it.

## Chrome extension sign-in

The NeetCode drawer signs in without navigating away from the problem. Email/password runs in the extension and Google/GitHub use Firebase's Manifest V3 offscreen-document flow.

After loading the unpacked extension, copy its ID from `chrome://extensions`. In Firebase Console → Authentication → Settings → Authorized domains, add `chrome-extension://YOUR_EXTENSION_ID`. Google and GitHub must also remain enabled under Authentication → Sign-in method.

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
  students[]
  series[]
  sessions[]
  payments[]
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
```

This snapshot design mirrors the current local JSON model without lossy migrations and requires no composite indexes. It is appropriate for a private, single-owner desk. If either snapshot approaches Firestore's 1 MiB document limit, split it into `codingProblems/{problemKey}`, `students/{studentId}`, `sessions/{sessionId}`, and related subcollections.

The browser never receives Admin credentials. Firebase Auth ID tokens are accepted only by the same-origin session endpoint, checked for a recent sign-in, and exchanged for a five-day HTTP-only cookie. The server Admin SDK performs Firestore writes under the verified user's UID.

## Extension accounts

Atelier Problem Notes does not embed Firebase or OAuth secrets. Choose **Connect account** in the extension popup; it opens an authenticated Atelier pairing page and issues a random, revocable extension token scoped to that Firebase UID. The raw token remains in `chrome.storage.local`; Firestore stores only its SHA-256 hash. Coding API requests without a valid session or extension token are rejected once Firebase is configured.

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
