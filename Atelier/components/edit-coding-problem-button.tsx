"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { CodingProblem } from "@/lib/types";

type Draft = {
  title: string;
  problemNo: string;
  category: string;
  difficulty: string;
  minutes: string;
  submissionCount: string;
  automaticCount: boolean;
  neededHints: boolean;
  dontUnderstand: boolean;
  notes: string;
};

function draftFrom(problem: CodingProblem): Draft {
  const automaticCount = !Number.isInteger(problem.submissionCountOverride);
  return {
    title: problem.title,
    problemNo: problem.leetcodeFrontendId || "",
    category: problem.tags?.[0] || "",
    difficulty: problem.difficulty || "",
    minutes: problem.seconds > 0 ? String(Math.round((problem.seconds / 60) * 10) / 10) : "",
    submissionCount: String(automaticCount ? problem.submissions.length : problem.submissionCountOverride),
    automaticCount,
    neededHints: problem.neededHints,
    dontUnderstand: problem.dontUnderstand,
    notes: problem.notes,
  };
}

export function EditCodingProblemButton({ problem }: { problem: CodingProblem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(problem));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function beginEditing() {
    setDraft(draftFrom(problem));
    setError("");
    setClosing(false);
    setOpen(true);
  }

  function closeEditor() {
    if (busy || closing) return;
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 180);
  }

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    const minutes = draft.minutes === "" ? 0 : Number(draft.minutes);
    const count = Number(draft.submissionCount);
    if (!draft.title.trim()) { setError("A problem title is required."); return; }
    if (!Number.isFinite(minutes) || minutes < 0) { setError("Time must be zero or a positive number."); return; }
    if (!draft.automaticCount && (!Number.isInteger(count) || count < 0)) { setError("Submissions must be a whole number."); return; }

    setBusy(true);
    setError("");
    const submissionCountOverride = draft.automaticCount ? null : count;
    const next: CodingProblem = {
      ...problem,
      title: draft.title.trim(),
      leetcodeFrontendId: draft.problemNo.trim() || null,
      tags: draft.category.trim() ? [draft.category.trim(), ...(problem.tags || []).slice(1)] : (problem.tags || []).slice(1),
      difficulty: draft.difficulty || null,
      seconds: Math.round(minutes * 60),
      submissionCountOverride,
      holeInOne: submissionCountOverride === null
        ? problem.submissions.length === 1 && Boolean(problem.submissions[0]?.accepted)
        : count === 1 && problem.submissions.some((submission) => submission.accepted),
      neededHints: draft.neededHints,
      dontUnderstand: draft.dontUnderstand,
      notes: draft.notes,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/coding/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await response.text();
      const result = body ? JSON.parse(body) as { error?: string } : {};
      if (!response.ok) throw new Error(result.error || "Could not save this problem.");
      setClosing(true);
      window.setTimeout(() => { setOpen(false); setClosing(false); router.refresh(); }, 180);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this problem.");
    } finally {
      setBusy(false);
    }
  }

  const dialog = open ? <div className="prova-dialog-backdrop" data-closing={closing || undefined} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
    <div className="prova-dialog coding-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`coding-edit-${problem.key}`} onKeyDown={(event) => { if (event.key === "Escape") closeEditor(); }}>
      <header><div><p className="metric-label">Problem Notes</p><h2 id={`coding-edit-${problem.key}`}>Edit problem</h2></div><button type="button" onClick={closeEditor} disabled={busy} aria-label="Close">×</button></header>
      <div className="prova-form-grid">
        <Field label="Problem number"><Input value={draft.problemNo} onChange={(event) => update("problemNo", event.target.value)} /></Field>
        <Field label="Difficulty"><Select value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="">Not set</option><option>Easy</option><option>Medium</option><option>Hard</option></Select></Field>
        <div className="wide"><Field label="Title"><Input required value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field></div>
        <Field label="Time spent" hint="Minutes"><Input type="number" min="0" step="0.1" value={draft.minutes} onChange={(event) => update("minutes", event.target.value)} /></Field>
        <Field label="Category"><Input value={draft.category} onChange={(event) => update("category", event.target.value)} /></Field>
        <Field label="Submissions" hint={draft.automaticCount ? `Using ${problem.submissions.length} recorded submissions` : "Manual total"}><Input type="number" min="0" step="1" disabled={draft.automaticCount} value={draft.submissionCount} onChange={(event) => { update("submissionCount", event.target.value); update("automaticCount", false); }} /></Field>
        <div className="coding-auto-count"><span>Count source</span><Button type="button" variant={draft.automaticCount ? "primary" : "ghost"} onClick={() => { update("automaticCount", true); update("submissionCount", String(problem.submissions.length)); }}>Use recorded count</Button></div>
        <fieldset className="wide"><legend>Review flags</legend><label className="prova-check"><input type="checkbox" checked={draft.neededHints} onChange={(event) => update("neededHints", event.target.checked)} />Needed hints</label><label className="prova-check"><input type="checkbox" checked={draft.dontUnderstand} onChange={(event) => update("dontUnderstand", event.target.checked)} />Don’t understand</label></fieldset>
        <div className="wide"><Field label="Notes"><Textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></Field></div>
      </div>
      {error ? <p className="coding-edit-error" role="alert">{error}</p> : null}
      <footer><span /><div><Button type="button" variant="ghost" onClick={closeEditor} disabled={busy}>Cancel</Button><Button type="button" onClick={() => void save()} disabled={busy} data-busy={busy || undefined}>{busy ? "Saving…" : "Save changes"}</Button></div></footer>
    </div>
  </div> : null;

  return <>
    <Button type="button" variant="ghost" className="problem-edit-button" onClick={beginEditing}>Edit</Button>
    {dialog ? createPortal(dialog, document.body) : null}
  </>;
}
