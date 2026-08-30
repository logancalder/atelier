import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./data-path";
import {
  AccountSubtype,
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type Transaction,
} from "plaid";
import { updateStudio } from "./db";

export type PlaidConnection = {
  accessToken: string;
  itemId: string;
  institutionName: string;
  cursor: string | null;
  lastSyncedAt: string | null;
  seenTransactionIds: string[];
  zelleDeposits: PlaidZelleDeposit[];
  reconciliationLog: ReconciliationLogEntry[];
};

export type PlaidZelleDeposit = {
  transactionId: string;
  transactionIds: string[];
  senderName: string;
  amountCents: number;
  date: string;
  description: string;
  matchedPaymentIds: string[];
};

export type ReconciliationLogEntry = {
  transactionId: string;
  date: string;
  senderName: string;
  amountCents: number;
  studentName: string | null;
  status: "matched" | "linked_received" | "already_reconciled" | "unmatched_sender" | "no_payment_in_window" | "amount_mismatch";
  detail: string;
};

const safeOwner = (ownerId: string) => ownerId.replace(/[^a-zA-Z0-9_-]/g, "_");
const connectionFile = (ownerId: string) => path.join(DATA_DIR, "users", safeOwner(ownerId), "plaid.json");

export function plaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function readPlaidConnection(ownerId: string): PlaidConnection | null {
  const file = connectionFile(ownerId);
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as PlaidConnection;
  return {
    ...parsed,
    seenTransactionIds: parsed.seenTransactionIds ?? [],
    zelleDeposits: (parsed.zelleDeposits ?? []).map((deposit) => ({
      ...deposit,
      transactionIds: deposit.transactionIds ?? [deposit.transactionId],
    })),
    reconciliationLog: parsed.reconciliationLog ?? [],
  };
}

export function writePlaidConnection(connection: PlaidConnection, ownerId: string) {
  const file = connectionFile(ownerId);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(connection, null, 2));
  renameSync(temporary, file);
}

async function mirrorPlaidConnection(connection: PlaidConnection, ownerId: string) {
  try {
    const { adminDb, firebaseAdminConfigured } = await import("./firebase-admin");
    if (firebaseAdminConfigured) await adminDb().collection("users").doc(ownerId).collection("private").doc("plaid").set(connection);
  } catch { /* The UID-scoped local connection remains available if Firestore is offline. */ }
}

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) throw new Error("Plaid credentials are not configured.");
  const environment = process.env.PLAID_ENV ?? "sandbox";
  const basePath = PlaidEnvironments[environment as keyof typeof PlaidEnvironments] ?? PlaidEnvironments.sandbox;
  return new PlaidApi(new Configuration({
    basePath,
    baseOptions: { headers: { "PLAID-CLIENT-ID": clientId, "PLAID-SECRET": secret } },
  }));
}

export async function createPlaidLinkToken(ownerId: string) {
  const response = await getPlaidClient().linkTokenCreate({
    user: { client_user_id: ownerId },
    client_name: "Atelier",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return response.data.link_token;
}

export async function exchangePlaidToken(publicToken: string, institutionName: string | undefined, ownerId: string) {
  const response = await getPlaidClient().itemPublicTokenExchange({ public_token: publicToken });
  const previous = readPlaidConnection(ownerId);
  const connection: PlaidConnection = {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
    institutionName: institutionName || "Connected bank",
    cursor: null,
    lastSyncedAt: null,
    seenTransactionIds: previous?.seenTransactionIds ?? [],
    zelleDeposits: previous?.zelleDeposits ?? [],
    reconciliationLog: previous?.reconciliationLog ?? [],
  };
  writePlaidConnection(connection, ownerId);
  await mirrorPlaidConnection(connection, ownerId);
  return syncPlaidTransactions(ownerId);
}

function transactionDescription(transaction: Transaction) {
  return transaction.original_description || transaction.name || transaction.merchant_name || "";
}

function parseZelleSender(transaction: Transaction) {
  if (transaction.amount >= 0) return null;
  const description = transactionDescription(transaction).replace(/\s+/g, " ").trim();
  const match = description.match(/zelle(?:®)?\s+payment\s+from\s+(.+)/i);
  if (!match) return null;
  const sender = match[1]
    .replace(/\s+(?:ref(?:erence)?|confirmation|conf|transaction|on\s+\d).*/i, "")
    .trim();
  return sender || null;
}

function normalizedName(value: string) {
  return value.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function zelleDepositKey(deposit: Pick<PlaidZelleDeposit, "senderName" | "amountCents" | "date">) {
  return [
    deposit.date,
    deposit.amountCents,
    normalizedName(deposit.senderName),
  ].join("|");
}

function nameMatches(senderName: string, savedName: string) {
  if (normalizedName(senderName) === normalizedName(savedName)) return true;
  const senderTokens: string[] = senderName.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const savedTokens: string[] = savedName.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return savedTokens.length >= 2 && savedTokens.every((token) => senderTokens.includes(token));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function checkingTransactions(client: PlaidApi, accessToken: string) {
  const accounts = await client.accountsGet({ access_token: accessToken });
  const checkingIds = accounts.data.accounts
    .filter((account) => account.subtype === AccountSubtype.Checking)
    .map((account) => account.account_id);
  if (!checkingIds.length) return [];

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  const transactions: Transaction[] = [];
  let offset = 0;
  let total = 1;
  while (offset < total) {
    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: dateKey(start),
      end_date: dateKey(end),
      options: { account_ids: checkingIds, count: 500, offset, include_original_description: true },
    });
    transactions.push(...response.data.transactions);
    total = response.data.total_transactions;
    offset += response.data.transactions.length;
    if (!response.data.transactions.length) break;
  }
  return transactions;
}

export async function syncPlaidTransactions(ownerId: string) {
  const connection = readPlaidConnection(ownerId);
  if (!connection) throw new Error("Connect a bank before syncing.");

  const client = getPlaidClient();
  let cursor = connection.cursor ?? undefined;
  let hasMore = true;
  const added: Transaction[] = [];

  while (hasMore) {
    const response = await client.transactionsSync({ access_token: connection.accessToken, cursor, options: { include_original_description: true } });
    added.push(...response.data.added);
    cursor = response.data.next_cursor;
    hasMore = response.data.has_more;
  }

  const history = await checkingTransactions(client, connection.accessToken);
  const deposits = new Map(connection.zelleDeposits.map((deposit) => [deposit.transactionId, deposit]));
  const depositsByTransactionId = new Map(
    connection.zelleDeposits.flatMap((deposit) =>
      deposit.transactionIds.map((transactionId) => [transactionId, deposit] as const),
    ),
  );
  const depositsByKey = new Map<string, PlaidZelleDeposit[]>();
  for (const deposit of connection.zelleDeposits) {
    const key = zelleDepositKey(deposit);
    depositsByKey.set(key, [...(depositsByKey.get(key) ?? []), deposit]);
  }
  const claimedDeposits = new Set<string>();
  for (const transaction of history) {
    const senderName = parseZelleSender(transaction);
    if (!senderName) continue;
    const candidate = {
      senderName,
      amountCents: Math.round(Math.abs(transaction.amount) * 100),
      date: transaction.date,
      description: transactionDescription(transaction),
    };
    const existing = depositsByTransactionId.get(transaction.transaction_id)
      ?? depositsByKey.get(zelleDepositKey(candidate))?.find((deposit) => !claimedDeposits.has(deposit.transactionId));
    const deposit: PlaidZelleDeposit = {
      transactionId: existing?.transactionId ?? transaction.transaction_id,
      transactionIds: [...new Set([...(existing?.transactionIds ?? []), transaction.transaction_id])],
      ...candidate,
      matchedPaymentIds: existing?.matchedPaymentIds ?? [],
    };
    deposits.set(deposit.transactionId, deposit);
    depositsByTransactionId.set(transaction.transaction_id, deposit);
    claimedDeposits.add(deposit.transactionId);
  }

  const zelleDeposits = [...deposits.values()].sort((a, b) => b.date.localeCompare(a.date));
  const reconciliationLog: ReconciliationLogEntry[] = [];
  let matched = 0;

  await updateStudio((studio) => {
    for (const deposit of zelleDeposits) {
      const student = studio.students.find((item) =>
        [item.zelleName, item.parentName, item.name]
          .filter(Boolean)
          .some((name) => nameMatches(deposit.senderName, name)),
      );
      if (!student) {
        reconciliationLog.push({
          transactionId: deposit.transactionId,
          date: deposit.date,
          senderName: deposit.senderName,
          amountCents: deposit.amountCents,
          studentName: null,
          status: "unmatched_sender",
          detail: "No student profile has a matching Zelle, parent, or student name.",
        });
        continue;
      }

      const alreadyAllocated = studio.payments
        .filter((payment) => deposit.matchedPaymentIds.includes(payment.id))
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      let availableCents = Math.max(0, deposit.amountCents - alreadyAllocated);
      const depositTime = new Date(`${deposit.date}T12:00:00`).getTime();
      if (availableCents === 0) {
        reconciliationLog.push({
          transactionId: deposit.transactionId,
          date: deposit.date,
          senderName: deposit.senderName,
          amountCents: deposit.amountCents,
          studentName: student.name,
          status: "already_reconciled",
          detail: `Already linked to ${deposit.matchedPaymentIds.length} payment${deposit.matchedPaymentIds.length === 1 ? "" : "s"}.`,
        });
        continue;
      }

      const inWindow = studio.payments
        .filter((payment) => payment.studentId === student.id && !deposit.matchedPaymentIds.includes(payment.id))
        .filter((payment) => Math.abs(new Date(`${payment.dueDate}T12:00:00`).getTime() - depositTime) <= 14 * 86400000);

      const manuallyReceived = inWindow
        .filter((payment) => payment.status === "received" && !payment.plaidTransactionId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      let linkedReceived = 0;
      for (const payment of manuallyReceived) {
        if (payment.amountCents > availableCents) continue;
        payment.plaidTransactionId = deposit.transactionId;
        deposit.matchedPaymentIds.push(payment.id);
        availableCents -= payment.amountCents;
        linkedReceived += 1;
        reconciliationLog.push({
          transactionId: deposit.transactionId,
          date: deposit.date,
          senderName: deposit.senderName,
          amountCents: deposit.amountCents,
          studentName: student.name,
          status: "linked_received",
          detail: `Linked to an existing ${payment.amountCents / 100} payment that was already marked received.`,
        });
      }

      const possible = inWindow
        .filter((payment) => payment.studentId === student.id && (payment.status === "missing" || payment.status === "upcoming") && !deposit.matchedPaymentIds.includes(payment.id))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      let matchedThisDeposit = 0;
      for (const payment of possible) {
        if (payment.amountCents > availableCents) continue;
        payment.status = "received";
        payment.receivedAt = `${deposit.date}T12:00:00.000Z`;
        payment.plaidTransactionId = deposit.transactionId;
        deposit.matchedPaymentIds.push(payment.id);
        availableCents -= payment.amountCents;
        matched += 1;
        matchedThisDeposit += 1;
      }

      if (matchedThisDeposit > 0) {
        reconciliationLog.push({
          transactionId: deposit.transactionId,
          date: deposit.date,
          senderName: deposit.senderName,
          amountCents: deposit.amountCents,
          studentName: student.name,
          status: "matched",
          detail: `Marked ${matchedThisDeposit} outstanding payment${matchedThisDeposit === 1 ? "" : "s"} received.`,
        });
      } else if (linkedReceived === 0) {
        const hasUnpaidInWindow = inWindow.some((payment) => payment.status === "missing" || payment.status === "upcoming");
        reconciliationLog.push({
          transactionId: deposit.transactionId,
          date: deposit.date,
          senderName: deposit.senderName,
          amountCents: deposit.amountCents,
          studentName: student.name,
          status: hasUnpaidInWindow ? "amount_mismatch" : "no_payment_in_window",
          detail: hasUnpaidInWindow
            ? "Sender matched, but the remaining deposit was smaller than every outstanding payment in the ±14 day window."
            : "Sender matched, but no outstanding payment was found within ±14 days.",
        });
      }
    }
  }, ownerId);

  const seen = new Set(connection.seenTransactionIds);
  for (const transaction of added) seen.add(transaction.transaction_id);
  const updatedConnection: PlaidConnection = {
    ...connection,
    cursor: cursor ?? null,
    lastSyncedAt: new Date().toISOString(),
    seenTransactionIds: [...seen].slice(-2000),
    zelleDeposits: zelleDeposits.slice(0, 1000),
    reconciliationLog: reconciliationLog.slice(0, 100),
  };
  writePlaidConnection(updatedConnection, ownerId);
  await mirrorPlaidConnection(updatedConnection, ownerId);

  return { imported: history.length, candidates: zelleDeposits.length, matched };
}
