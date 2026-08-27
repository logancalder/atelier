# Atelier

A private Next.js desk with separate coding and tutoring workspaces. Coding holds problem notes synced from the Atelier Problem Notes Chrome extension; tutoring holds students, recurring sessions, notes, and Zelle.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Data lives in `data/studio.json` (gitignored).

## Plaid setup

1. Create a Plaid developer account and copy the sandbox client ID and secret.
2. Copy `.env.example` to `.env.local` and add those credentials.
3. Keep `PLAID_ENV=sandbox` while testing, then restart the dev server.
4. Open the Zelle ledger and choose **Connect bank**.

Atelier checks for new bank activity whenever the ledger opens and can also sync on demand. It only auto-matches incoming transactions labeled as Zelle when exactly one unpaid item has the same amount and a due date within 14 days. Plaid access tokens are stored locally in `data/plaid.json`, which is gitignored.
