"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProvaProblem } from "@/lib/prova";

type SortKey = "problemNo" | "title" | "difficulty" | "category" | "solved" | "solvedFirstTime" | "solvedSub20";
const PAGE_SIZE = 25;
const emptyProblem = (): ProvaProblem => ({ id: Date.now(), problemNo: "", title: "", category: "", difficulty: "", url: "", dateSolved: "", solvedFirstTime: "", holeInOne: "", solvedSub20: "", isCompetent: "", notes: "", solved: false });

function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function csv(problems: ProvaProblem[]) {
  const fields: (keyof ProvaProblem)[] = ["id", "problemNo", "title", "category", "difficulty", "url", "dateSolved", "solvedFirstTime", "holeInOne", "solvedSub20", "isCompetent", "notes", "solved"];
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [fields.join(","), ...problems.map((problem) => fields.map((field) => cell(problem[field])).join(","))].join("\n");
}

export function ProvaWorkspace({ seed }: { seed: ProvaProblem[] }) {
  const [problems, setProblems] = useState<ProvaProblem[]>(seed);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"table" | "cards">("table");
  const [editing, setEditing] = useState<ProvaProblem | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("problemNo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.removeItem("lc_tracker_problems"); }, []);

  const categories = useMemo(() => [...new Set(problems.map((problem) => problem.category).filter(Boolean))].sort(), [problems]);
  const visible = useMemo(() => problems.filter((problem) => {
    const matchesQuery = !query || `${problem.problemNo} ${problem.title} ${problem.category} ${problem.notes}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || (status === "solved" ? problem.solved : status === "open" ? !problem.solved : status === "first" ? problem.solvedFirstTime === "Y" : problem.holeInOne === "Y");
    return matchesQuery && matchesStatus && (difficulty === "all" || problem.difficulty.toLowerCase() === difficulty) && (category === "all" || problem.category === category);
  }).sort((a, b) => {
    const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
    const value = (problem: ProvaProblem) => sortKey === "problemNo" ? Number(problem.problemNo) || 0 : sortKey === "difficulty" ? difficultyOrder[problem.difficulty.toLowerCase() as keyof typeof difficultyOrder] || 0 : sortKey === "solved" ? Number(problem.solved) : String(problem[sortKey] ?? "").toLowerCase();
    const left = value(a), right = value(b);
    const comparison = left < right ? -1 : left > right ? 1 : 0;
    return sortDirection === "asc" ? comparison : -comparison;
  }), [problems, query, status, difficulty, category, sortKey, sortDirection]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const solved = problems.filter((problem) => problem.solved).length;
  const firstTry = problems.filter((problem) => problem.solvedFirstTime === "Y").length;
  const holeInOne = problems.filter((problem) => problem.holeInOne === "Y").length;

  async function persist(next: ProvaProblem[]) {
    const previous = problems;
    setProblems(next); setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/prova", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ problems: next }) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not save Prova.");
    } catch (error) { setProblems(previous); setSaveError(error instanceof Error ? error.message : "Could not save Prova."); }
    finally { setSaving(false); }
  }

  async function save(problem: ProvaProblem) {
    const next = problems.some((item) => item.id === problem.id) ? problems.map((item) => item.id === problem.id ? problem : item) : [...problems, problem];
    await persist(next);
    setEditing(null);
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
    setPage(1);
  }

  const sortButton = (key: SortKey, label: string) => <button className="prova-sort" onClick={() => changeSort(key)}>{label}<span aria-hidden="true">{sortKey === key ? sortDirection === "asc" ? "↑" : "↓" : "↕"}</span></button>;

  async function importFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) { await persist(parsed); setPage(1); }
    } catch { window.alert("Prova currently expects a JSON export for importing."); }
  }

  return <>
    <section className="prova-stats" aria-label="Prova progress">
      <div><span>Total</span><strong>{problems.length}</strong></div>
      <div><span>Solved</span><strong>{solved}</strong></div>
      <div><span>First try</span><strong>{firstTry}</strong></div>
      <div><span>Hole in one</span><strong>{holeInOne}</strong></div>
      <div className="prova-progress"><span>Completion</span><strong>{problems.length ? Math.round(solved / problems.length * 100) : 0}%</strong><i><b style={{ width: `${problems.length ? solved / problems.length * 100 : 0}%` }} /></i></div>
    </section>

    <section className="prova-controls">
      <input className="prova-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search problems, categories, notes…" />
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Status"><option value="all">All status</option><option value="solved">Solved</option><option value="open">Open</option><option value="first">First try</option><option value="hole">Hole in one</option></select>
      <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} aria-label="Difficulty"><option value="all">All difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
      <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="Category"><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <div className="prova-view"><button data-active={view === "table"} onClick={() => setView("table")}>List</button><button data-active={view === "cards"} onClick={() => setView("cards")}>Cards</button></div>
    </section>

    <div className="prova-utility">
      <p><strong>{visible.length}</strong> of {problems.length} problems · page {currentPage} of {pageCount}{saving ? " · Saving…" : ""}</p>
      <div><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} /><button onClick={() => fileRef.current?.click()}>Import</button><button onClick={() => download(JSON.stringify(problems, null, 2), "prova.json", "application/json")}>JSON</button><button onClick={() => download(csv(problems), "prova.csv", "text/csv")}>CSV</button><button className="prova-primary" onClick={() => setEditing(emptyProblem())}>Add problem</button></div>
    </div>

    {saveError ? <p className="prova-save-error" role="alert">{saveError}</p> : null}
    {view === "table" ? <div className="prova-table-wrap"><table className="prova-table"><thead><tr><th>{sortButton("problemNo", "#")}</th><th>{sortButton("title", "Problem")}</th><th>{sortButton("difficulty", "Difficulty")}</th><th>{sortButton("category", "Category")}</th><th>{sortButton("solved", "Solved")}</th><th>{sortButton("solvedFirstTime", "First try")}</th><th>{sortButton("solvedSub20", "Sub 20")}</th><th /></tr></thead><tbody>{paginated.map((problem) => <tr key={problem.id}><td>{problem.problemNo}</td><td><a href={problem.url || undefined} target="_blank" rel="noreferrer">{problem.title}</a>{problem.notes ? <small>{problem.notes}</small> : null}</td><td><span data-difficulty={problem.difficulty.toLowerCase()}>{problem.difficulty || "—"}</span></td><td>{problem.category}</td><td>{problem.solved ? "Yes" : "—"}</td><td>{problem.solvedFirstTime || "—"}</td><td>{problem.solvedSub20 || "—"}</td><td><button onClick={() => setEditing(problem)}>Edit</button></td></tr>)}</tbody></table></div>
      : <div className="prova-grid">{paginated.map((problem) => <article key={problem.id}><p className="metric-label">#{problem.problemNo} · {problem.category}</p><h2><a href={problem.url || undefined} target="_blank" rel="noreferrer">{problem.title}</a></h2><div><span>{problem.difficulty}</span><span>{problem.solved ? "Solved" : "Open"}</span>{problem.solvedFirstTime === "Y" ? <span>First try</span> : null}</div><p>{problem.notes || "No notes yet."}</p><button onClick={() => setEditing(problem)}>Edit problem</button></article>)}</div>}
    {visible.length ? <nav className="prova-pagination" aria-label="Prova pages"><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></nav> : null}
    {!visible.length ? <div className="prova-empty"><span>A</span><h2>No problems found.</h2><p>Try clearing a filter or add a new problem.</p></div> : null}

    {editing ? <ProblemDialog problem={editing} categories={categories} onClose={() => setEditing(null)} onSave={save} onDelete={() => { void persist(problems.filter((item) => item.id !== editing.id)); setEditing(null); }} /> : null}
  </>;
}

function ProblemDialog({ problem, categories, onClose, onSave, onDelete }: { problem: ProvaProblem; categories: string[]; onClose: () => void; onSave: (problem: ProvaProblem) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(problem);
  const update = (field: keyof ProvaProblem, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));
  return <div className="prova-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="prova-dialog" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><header><div><p className="metric-label">Practice record</p><h2>{problemsEqual(problem, emptyProblem()) ? "Add problem" : "Edit problem"}</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></header><div className="prova-form-grid"><label>Problem number<input value={draft.problemNo} onChange={(event) => update("problemNo", event.target.value)} /></label><label>Difficulty<select value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="">Select…</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label className="wide">Title<input required value={draft.title} onChange={(event) => update("title", event.target.value)} /></label><label className="wide">LeetCode URL<input type="url" value={draft.url} onChange={(event) => update("url", event.target.value)} /></label><label>Category<input list="prova-categories" value={draft.category} onChange={(event) => update("category", event.target.value)} /><datalist id="prova-categories">{categories.map((item) => <option key={item}>{item}</option>)}</datalist></label><label>Date solved<input type="date" value={draft.dateSolved} onChange={(event) => { update("dateSolved", event.target.value); update("solved", Boolean(event.target.value)); }} /></label><fieldset className="wide"><legend>Progress</legend>{[["solved", "Solved"], ["solvedFirstTime", "First try"], ["holeInOne", "Hole in one"], ["solvedSub20", "Sub 20"], ["isCompetent", "Competent"]].map(([field, label]) => <label className="prova-check" key={field}><input type="checkbox" checked={field === "solved" ? draft.solved : draft[field as keyof ProvaProblem] === "Y"} onChange={(event) => update(field as keyof ProvaProblem, field === "solved" ? event.target.checked : event.target.checked ? "Y" : "N")} />{label}</label>)}</fieldset><label className="wide">Notes<textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label></div><footer>{problemsEqual(problem, emptyProblem()) ? <span /> : <button className="prova-danger" type="button" onClick={onDelete}>Delete</button>}<div><button type="button" onClick={onClose}>Cancel</button><button className="prova-primary" type="submit">Save</button></div></footer></form></div>;
}

function problemsEqual(a: ProvaProblem, b: ProvaProblem) { return a.title === b.title && a.problemNo === b.problemNo; }
