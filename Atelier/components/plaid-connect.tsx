"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { Button } from "./ui";
import { useToast } from "./toast";
import { formatMoney } from "@/lib/money";
import type { ReconciliationLogEntry } from "@/lib/plaid";

type SyncResult = { imported: number; candidates: number; matched: number };

export function PlaidConnect({
  configured,
  connected,
  institutionName,
  lastSyncedAt,
  reconciliationLog = [],
}: {
  configured: boolean;
  connected: boolean;
  institutionName?: string;
  lastSyncedAt?: string | null;
  reconciliationLog?: ReconciliationLogEntry[];
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const sync = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/plaid/sync", { method: "POST" });
      const result = await response.json() as SyncResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Sync failed.");
      toast.show(result.matched ? `${result.matched} payment${result.matched === 1 ? "" : "s"} matched from Zelle` : "Bank activity is up to date", result.matched ? "success" : "info");
      router.refresh();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Sync failed.", "error");
    } finally {
      setBusy(false);
    }
  }, [router, toast]);

  useEffect(() => {
    if (!connected) return;
    let active = true;
    void fetch("/api/plaid/sync", { method: "POST" })
      .then(async (response) => ({ response, result: await response.json() as SyncResult & { error?: string } }))
      .then(({ response, result }) => {
        if (!active || !response.ok) return;
        if (result.matched > 0) {
          toast.show(`${result.matched} payment${result.matched === 1 ? "" : "s"} matched from Zelle`);
          router.refresh();
        }
      });
    return () => { active = false; };
  }, [connected, router, toast]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (publicToken, metadata) => {
    setBusy(true);
    try {
      const response = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, institutionName: metadata.institution?.name }),
      });
      const result = await response.json() as SyncResult & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not connect the bank.");
      toast.show(`Connected ${metadata.institution?.name ?? "your bank"}`);
      router.refresh();
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not connect the bank.", "error");
    } finally {
      setBusy(false);
      setLinkToken(null);
    }
  }, [router, toast]);

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, open, ready]);

  async function beginConnection() {
    setBusy(true);
    try {
      const response = await fetch("/api/plaid/link-token", { method: "POST" });
      const body = await response.json() as { linkToken?: string; error?: string };
      if (!response.ok || !body.linkToken) throw new Error(body.error || "Could not start Plaid.");
      setLinkToken(body.linkToken);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not start Plaid.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bank-area">
    <section className="bank-strip">
      <div className="min-w-0">
        <p className="section-label">Bank reconciliation</p>
        <p className="mt-1 text-sm text-ink">
          {connected ? institutionName : configured ? "No bank connected" : "Plaid needs credentials"}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          {connected
            ? lastSyncedAt ? `Last checked ${new Date(lastSyncedAt).toLocaleString()}` : "Ready for the first sync"
            : configured ? "Connect once; Atelier checks for Zelle deposits when you open this ledger." : "Copy .env.example to .env.local and add your Plaid sandbox keys."}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {connected ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void sync()}>{busy ? "Checking…" : "Check now"}</Button>
        ) : (
          <Button type="button" disabled={busy || !configured} onClick={() => void beginConnection()}>{busy ? "Opening…" : "Connect bank"}</Button>
        )}
      </div>
    </section>
    {connected ? (
      <details className="reconciliation-log">
        <summary>Reconciliation log <span>{reconciliationLog.length}</span></summary>
        {reconciliationLog.length ? (
          <div className="mt-3 divide-y divide-line border-y border-line">
            {reconciliationLog.map((entry) => (
              <div key={`${entry.transactionId}-${entry.status}`} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr_auto] sm:items-start sm:gap-4">
                <div>
                  <p className="text-xs text-mute">{new Date(`${entry.date}T12:00:00`).toLocaleDateString()}</p>
                  <p className="mt-0.5 text-sm font-medium">{formatMoney(entry.amountCents)}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">Zelle from {entry.senderName}</p>
                  <p className="mt-0.5 text-xs text-mute">{entry.studentName ? `Profile: ${entry.studentName} · ` : ""}{entry.detail}</p>
                </div>
                <span className="log-status" data-status={entry.status}>{entry.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-mute">Run a sync to generate reconciliation details.</p>}
      </details>
    ) : null}
    </div>
  );
}
