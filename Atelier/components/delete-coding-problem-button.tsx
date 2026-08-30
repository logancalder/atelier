"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteCodingProblemButton({ problemKey, title }: { problemKey: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm('Delete "' + title + '" from your coding notebook?')) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/coding/problems", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: problemKey }),
      });
      const body = await response.text();
      const result = body ? JSON.parse(body) as { error?: string } : {};
      if (!response.ok) throw new Error(result.error || "Could not delete the problem.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the problem.");
      setBusy(false);
    }
  }

  return (
    <div className="problem-delete">
      <Button type="button" variant="danger" onClick={() => void remove()} disabled={busy}>
        {busy ? "Deleting…" : "Delete"}
      </Button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}