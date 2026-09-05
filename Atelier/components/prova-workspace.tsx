"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProvaProblem } from "@/lib/prova";
import type { CodingProblem } from "@/lib/types";

type SortKey = "problemNo" | "title" | "difficulty" | "category" | "solved" | "dateSolved" | "solvedFirstTime" | "solvedSub20" | "solveTime";
const PAGE_SIZE = 25;
const emptyProblem = (): ProvaProblem => ({ id: Date.now(), problemNo: "", title: "", category: "", difficulty: "", url: "", dateSolved: "", solvedFirstTime: "", holeInOne: "", solvedSub20: "", isCompetent: "", notes: "", solved: false, solveTime: "", site: "" });
const exactTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function firstAcceptedDate(problem: CodingProblem) {
  return problem.submissions
    .filter((submission) => submission.accepted && !Number.isNaN(new Date(submission.at).valueOf()))
    .map((submission) => submission.at)
    .sort()[0]
    ?.slice(0, 10) ?? "";
}

function detectSite(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "leetcode.com" || hostname === "www.leetcode.com") return "LC";
    if (hostname === "neetcode.io" || hostname === "www.neetcode.io") return "NC";
  } catch { /* A partial URL has no site label yet. */ }
  return "";
}

async function scrapeUrlMetadata(url: string): Promise<{ title: string; problemNo: string; site: string }> {
  const response = await fetch(`/api/scrape-problem?url=${encodeURIComponent(url)}`);
  const result = await response.json().catch(() => ({})) as { title?: string; problemNo?: string; site?: string; error?: string };
  if (!response.ok) throw new Error(result.error || "Problem details could not be loaded.");
  return { title: result.title || "", problemNo: result.problemNo || "", site: result.site || detectSite(url) };
}

function codingProblemUrl(problem: CodingProblem) {
  return problem.leetcodeSlug ? `https://leetcode.com/problems/${problem.leetcodeSlug}/` : problem.url;
}

function codingToProva(problem: CodingProblem): ProvaProblem {
  const dateSolved = firstAcceptedDate(problem);
  const submissionCount = Number.isInteger(problem.submissionCountOverride)
    ? problem.submissionCountOverride as number
    : problem.submissions.length;
  const url = codingProblemUrl(problem);
  return {
    id: Date.now(),
    problemNo: problem.leetcodeFrontendId || "",
    title: problem.title,
    category: problem.tags?.[0] || "",
    difficulty: problem.difficulty || "",
    url,
    dateSolved,
    solvedFirstTime: dateSolved ? (submissionCount === 1 ? "Y" : "N") : "",
    holeInOne: dateSolved ? (problem.holeInOne ? "Y" : "N") : "",
    solvedSub20: dateSolved ? (problem.seconds > 0 && problem.seconds <= 1200 ? "Y" : "N") : "",
    isCompetent: "",
    notes: problem.notes,
    solved: Boolean(dateSolved),
    solveTime: problem.seconds > 0 ? String(Math.round(problem.seconds / 60)) : "",
    site: detectSite(url),
  };
}

function displayDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

function csv(problems: ProvaProblem[]) {
  const fields: (keyof ProvaProblem)[] = ["id", "problemNo", "title", "category", "difficulty", "url", "dateSolved", "solvedFirstTime", "holeInOne", "solvedSub20", "isCompetent", "notes", "solved", "solveTime", "site"];
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
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [codingLoading, setCodingLoading] = useState(true);
  const [codingError, setCodingError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.removeItem("lc_tracker_problems");
    const controller = new AbortController();
    void fetch("/api/coding/problems", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Problem Notes could not be loaded.");
        const notebook = await response.json() as { problems?: CodingProblem[] };
        setCodingProblems(Array.isArray(notebook.problems) ? notebook.problems : []);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setCodingError(error.message); })
      .finally(() => setCodingLoading(false));
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => [...new Set(problems.map((problem) => problem.category).filter(Boolean))].sort(), [problems]);
  const unmatchedCodingProblems = useMemo(() => {
    const titles = new Set(problems.map((problem) => exactTitle(problem.title)));
    return codingProblems.filter((problem) => problem.title.trim() && !titles.has(exactTitle(problem.title)));
  }, [codingProblems, problems]);
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
  const resultMotionKey = `${query}-${status}-${difficulty}-${category}-${sortKey}-${sortDirection}-${currentPage}-${view}`;

  const solved = problems.filter((problem) => problem.solved).length;
  const firstTry = problems.filter((problem) => problem.solvedFirstTime === "Y").length;
  const holeInOne = problems.filter((problem) => problem.holeInOne === "Y").length;
  const competent = problems.filter((problem) => problem.isCompetent === "Y").length;
  const difficultyCounts = problems.reduce((counts, problem) => {
    const key = problem.difficulty.toLowerCase();
    if (key === "easy" || key === "medium" || key === "hard") counts[key] += 1;
    return counts;
  }, { easy: 0, medium: 0, hard: 0 });

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
      <div className="is-good"><span>Solved</span><strong>{solved}</strong></div>
      <div className="is-teal"><span>First try</span><strong>{firstTry}</strong></div>
      <div className="is-teal"><span>Hole in one</span><strong>{holeInOne}</strong></div>
      <div><span>Competent</span><strong>{competent}</strong></div>
      <div className="prova-progress"><span>Completion</span><strong>{problems.length ? Math.round(solved / problems.length * 100) : 0}%</strong><i><b style={{ width: `${problems.length ? solved / problems.length * 100 : 0}%` }} /></i></div>
    </section>

    <div className="prova-layout">
      <aside className="prova-filter-sidebar" aria-label="Problem filters">
        <p className="prova-sidebar-label">Overview</p>
        <button data-active={status === "all" && category === "all"} onClick={() => { setStatus("all"); setCategory("all"); setPage(1); }}><span>All problems</span><b>{problems.length}</b></button>
        <button data-active={status === "solved"} onClick={() => { setStatus("solved"); setPage(1); }}><span>Solved</span><b>{solved}</b></button>
        <button data-active={status === "open"} onClick={() => { setStatus("open"); setPage(1); }}><span>Open</span><b>{problems.length - solved}</b></button>
        <p className="prova-sidebar-label">Milestones</p>
        <button data-active={status === "first"} onClick={() => { setStatus("first"); setPage(1); }}><span>First try</span><b>{firstTry}</b></button>
        <button data-active={status === "hole"} onClick={() => { setStatus("hole"); setPage(1); }}><span>Hole in one</span><b>{holeInOne}</b></button>
        <p className="prova-sidebar-label">Difficulty</p>
        {(["easy", "medium", "hard"] as const).map((level) => <button key={level} data-active={difficulty === level} onClick={() => { setDifficulty(level); setPage(1); }}><span className={`prova-dot ${level}`} />{level}<b>{difficultyCounts[level]}</b></button>)}
        {categories.length ? <><p className="prova-sidebar-label">Categories</p>{categories.map((item) => <button key={item} data-active={category === item} onClick={() => { setCategory(item); setPage(1); }}><span>{item}</span><b>{problems.filter((problem) => problem.category === item).length}</b></button>)}</> : null}
      </aside>

      <div className="prova-results">
        <section className="prova-controls">
          <label className="prova-search-wrap"><span aria-hidden="true">⌕</span><input className="prova-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search problems, categories, notes…" /></label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Status"><option value="all">All status</option><option value="solved">Solved</option><option value="open">Open</option><option value="first">First try</option><option value="hole">Hole in one</option></select>
          <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} aria-label="Difficulty"><option value="all">All difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          <div className="prova-view"><button data-active={view === "table"} onClick={() => setView("table")}>List</button><button data-active={view === "cards"} onClick={() => setView("cards")}>Cards</button></div>
        </section>

        <div className="prova-utility">
          <p><strong>{visible.length}</strong> of {problems.length} problems · page {currentPage} of {pageCount}{saving ? " · Saving…" : ""}</p>
          <div><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} /><button onClick={() => fileRef.current?.click()}>Import</button><button onClick={() => download(JSON.stringify(problems, null, 2), "prova.json", "application/json")}>JSON</button><button onClick={() => download(csv(problems), "prova.csv", "text/csv")}>CSV</button><button className="prova-primary" onClick={() => setEditing(emptyProblem())}>+ Add problem</button></div>
        </div>

    {saveError ? <p className="prova-save-error" role="alert">{saveError}</p> : null}
    {view === "table" ? <div className="prova-table-wrap"><table className="prova-table"><thead><tr><th>{sortButton("problemNo", "#")}</th><th>{sortButton("title", "Problem")}</th><th>{sortButton("difficulty", "Difficulty")}</th><th>{sortButton("category", "Category")}</th><th>{sortButton("solved", "Solved")}</th><th>{sortButton("dateSolved", "Solved on")}</th><th>{sortButton("solvedFirstTime", "First try")}</th><th>{sortButton("solvedSub20", "Sub 20")}</th><th>{sortButton("solveTime", "Time")}</th><th /></tr></thead><tbody key={resultMotionKey}>{paginated.map((problem) => <ProblemRow key={problem.id} problem={problem} onEdit={() => setEditing(problem)} />)}</tbody></table></div>
      : <div className="prova-grid" key={resultMotionKey}>{paginated.map((problem) => <article data-motion-item key={problem.id}><p className="metric-label">{problem.site ? `[${problem.site}] ` : ""}#{problem.problemNo} · {problem.category}</p><h2><a href={problem.url || undefined} target="_blank" rel="noreferrer">{problem.title}</a></h2><div><span>{problem.difficulty}</span><span>{problem.solved ? "Solved" : "Open"}</span>{problem.dateSolved ? <span>Solved {displayDate(problem.dateSolved)}</span> : null}{problem.solvedFirstTime === "Y" ? <span>First try</span> : null}{problem.solveTime ? <span>{problem.solveTime}m</span> : null}</div><p>{problem.notes || "No notes yet."}</p><button onClick={() => setEditing(problem)}>Edit problem</button></article>)}</div>}
    {visible.length ? <nav className="prova-pagination" aria-label="Prova pages"><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></nav> : null}
    {!visible.length ? <div className="prova-empty"><span>A</span><h2>No problems found.</h2><p>Try clearing a filter or add a new problem.</p></div> : null}

      </div>
    </div>
    {editing ? <ProblemDialog problem={editing} categories={categories} imports={unmatchedCodingProblems} importsLoading={codingLoading} importsError={codingError} onClose={() => setEditing(null)} onSave={save} onDelete={() => persist(problems.filter((item) => item.id !== editing.id))} /> : null}
  </>;
}

function ProblemRow({ problem, onEdit }: { problem: ProvaProblem; onEdit: () => void }) {
  return <tr data-motion-item><td className="prova-number">{problem.problemNo}</td><td><div className="prova-problem-cell"><a href={problem.url || undefined} target="_blank" rel="noreferrer">{problem.site ? <span className="prova-site-label">{problem.site}</span> : null}{problem.title}</a></div>{problem.notes ? <small>{problem.notes}</small> : null}</td><td><span data-difficulty={problem.difficulty.toLowerCase()}>{problem.difficulty || "—"}</span></td><td>{problem.category}</td><td>{problem.solved ? <span className="prova-status-good">Yes</span> : "—"}</td><td className="prova-date">{displayDate(problem.dateSolved)}</td><td>{problem.solvedFirstTime || "—"}</td><td>{problem.solvedSub20 || "—"}</td><td>{problem.solveTime ? `${problem.solveTime}m` : "—"}</td><td><button type="button" className="prova-edit-visible" onClick={onEdit}>Edit</button></td></tr>;
}

function ProblemDialog({ problem, categories, imports, importsLoading, importsError, onClose, onSave, onDelete }: { problem: ProvaProblem; categories: string[]; imports: CodingProblem[]; importsLoading: boolean; importsError: string; onClose: () => void; onSave: (problem: ProvaProblem) => Promise<void>; onDelete: () => Promise<void> }) {
  const [draft, setDraft] = useState(problem);
  const [selectedImport, setSelectedImport] = useState("");
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [closing, setClosing] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);
  const isNew = !problem.title && !problem.problemNo;
  const update = (field: keyof ProvaProblem, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));

  const closeDialog = () => {
    if (savingDialog || closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  };

  const finishAndClose = async (action: () => Promise<void>) => {
    setSavingDialog(true);
    await action();
    setClosing(true);
    window.setTimeout(onClose, 180);
  };

  const handleUrlChange = (url: string) => {
    setScrapeError("");
    setDraft((current) => ({ ...current, url, site: detectSite(url) }));
  };

  const lookupUrlMetadata = async () => {
    if (!draft.url || !detectSite(draft.url)) return;
    setScrapingUrl(true);
    setScrapeError("");
    try {
      const metadata = await scrapeUrlMetadata(draft.url);
      setDraft((current) => ({ ...current, title: metadata.title || current.title, problemNo: metadata.problemNo || current.problemNo, site: metadata.site || current.site }));
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Problem details could not be loaded.");
    } finally {
      setScrapingUrl(false);
    }
  };

  const dialog = (
    <div className="prova-dialog-backdrop" data-closing={closing || undefined} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }} onKeyDown={(event) => { if (event.key === "Escape") closeDialog(); }}>
      <form className="prova-dialog" role="dialog" aria-modal="true" aria-labelledby="prova-dialog-title" onSubmit={(event) => { event.preventDefault(); void finishAndClose(() => onSave(draft)); }}>
        <header><div><p className="metric-label">Practice record</p><h2 id="prova-dialog-title">{isNew ? "Add problem" : "Edit problem"}</h2></div><button type="button" onClick={closeDialog} disabled={savingDialog} aria-label="Close">×</button></header>
        {isNew ? <section className="prova-import-panel"><label>Import from Problem Notes<select value={selectedImport} onChange={(event) => { const key = event.target.value; setSelectedImport(key); const selected = imports.find((item) => item.key === key); setDraft(selected ? codingToProva(selected) : problem); }}><option value="">Start with a blank problem</option>{imports.map((item) => <option key={item.key} value={item.key}>{item.leetcodeFrontendId ? `${item.leetcodeFrontendId}. ` : ""}{item.title}</option>)}</select></label><p>{importsLoading ? "Loading Problem Notes…" : importsError || (imports.length ? `${imports.length} unmatched note${imports.length === 1 ? "" : "s"} available to import.` : "Every Problem Note already matches a Prova problem.")}</p></section> : null}
        <div className="prova-form-grid"><label>Problem number<input value={draft.problemNo} onChange={(event) => update("problemNo", event.target.value)} /></label><label>Difficulty<select value={draft.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="">Select…</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label><label className="wide">Title<input required value={draft.title} onChange={(event) => update("title", event.target.value)} /></label><label className="wide">URL{scrapingUrl ? " (fetching…)" : ""}<input type="url" value={draft.url} onChange={(event) => handleUrlChange(event.target.value)} onBlur={() => void lookupUrlMetadata()} placeholder="LeetCode or NeetCode problem URL" />{draft.site ? <small>Detected: {draft.site === "LC" ? "LeetCode" : "NeetCode"}</small> : null}{scrapeError ? <small className="prova-field-error" role="alert">{scrapeError}</small> : null}</label><label>Time spent (minutes)<input type="number" min="0" step="0.1" value={draft.solveTime} onChange={(event) => update("solveTime", event.target.value)} placeholder="0" /></label><label>Category<input list="prova-categories" value={draft.category} onChange={(event) => update("category", event.target.value)} /><datalist id="prova-categories">{categories.map((item) => <option key={item}>{item}</option>)}</datalist></label><label>Date solved<input type="date" value={draft.dateSolved} onChange={(event) => { update("dateSolved", event.target.value); update("solved", Boolean(event.target.value)); }} /></label><fieldset className="wide"><legend>Progress</legend>{[["solved", "Solved"], ["solvedFirstTime", "First try"], ["holeInOne", "Hole in one"], ["solvedSub20", "Sub 20"], ["isCompetent", "Competent"]].map(([field, label]) => <label className="prova-check" key={field}><input type="checkbox" checked={field === "solved" ? draft.solved : draft[field as keyof ProvaProblem] === "Y"} onChange={(event) => update(field as keyof ProvaProblem, field === "solved" ? event.target.checked : event.target.checked ? "Y" : "N")} />{label}</label>)}</fieldset><label className="wide">Notes<textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label></div>
        <footer>{isNew ? <span /> : <button className="prova-danger" type="button" onClick={() => void finishAndClose(onDelete)} disabled={savingDialog}>Delete</button>}<div><button type="button" onClick={closeDialog} disabled={savingDialog}>Cancel</button><button className="prova-primary" type="submit" disabled={scrapingUrl || savingDialog} data-busy={savingDialog || undefined}>{savingDialog ? "Saving…" : "Save"}</button></div></footer>
      </form>
    </div>
  );
  return createPortal(dialog, document.body);
}
