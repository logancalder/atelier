import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type { CodingNotebook, CodingProblem } from "./types";

import { DATA_DIR } from "./data-path";
const LEGACY_FILE = path.join(DATA_DIR, "coding.json");
const LEGACY_OWNER_FILE = path.join(DATA_DIR, ".coding-legacy-owner");
const safeOwner = (ownerId: string) => ownerId.replace(/[^a-zA-Z0-9_-]/g, "_");
const dataFile = (ownerId: string) => ownerId === "local" ? LEGACY_FILE : path.join(DATA_DIR, "users", safeOwner(ownerId), "coding.json");

function emptyNotebook(): CodingNotebook {
  return { problems: [], updatedAt: null, deletedProblems: {} };
}

function persist(notebook: CodingNotebook, ownerId = "local") {
  const file = dataFile(ownerId);
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, JSON.stringify(notebook, null, 2));
  renameSync(temporary, file);
}

export function readCodingNotebook(ownerId = "local"): CodingNotebook {
  const file = dataFile(ownerId);
  if (!existsSync(file)) {
    let notebook = emptyNotebook();
    if (ownerId !== "local" && existsSync(LEGACY_FILE)) {
      if (!existsSync(LEGACY_OWNER_FILE)) writeFileSync(LEGACY_OWNER_FILE, ownerId);
      if (readFileSync(LEGACY_OWNER_FILE, "utf8") === ownerId) notebook = JSON.parse(readFileSync(LEGACY_FILE, "utf8")) as CodingNotebook;
    }
    persist(notebook, ownerId);
    return notebook;
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<CodingNotebook>;
  return {
    problems: Array.isArray(parsed.problems) ? parsed.problems : [],
    updatedAt: parsed.updatedAt ?? null,
    deletedProblems: parsed.deletedProblems && typeof parsed.deletedProblems === "object" ? parsed.deletedProblems : {},
  };
}

export function replaceCodingNotebook(notebook: CodingNotebook, ownerId: string) { persist({ ...notebook, deletedProblems: notebook.deletedProblems ?? {} }, ownerId); }

let queue: Promise<unknown> = Promise.resolve();

export async function upsertCodingProblems(incoming: CodingProblem[], ownerId = "local") {
  const run = queue.then(() => {
    const notebook = readCodingNotebook(ownerId);
    notebook.deletedProblems ||= {};
    const byKey = new Map(notebook.problems.map((problem) => [problem.key, problem]));
    for (const problem of incoming) {
      const deletedAt = notebook.deletedProblems[problem.key];
      if (deletedAt && new Date(problem.updatedAt).getTime() <= new Date(deletedAt).getTime()) continue;
      const current = byKey.get(problem.key);
      if (!current || new Date(problem.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) {
        byKey.set(problem.key, problem);
        delete notebook.deletedProblems[problem.key];
      }
    }
    notebook.problems = [...byKey.values()].sort((a, b) =>
      (b.sortAt || b.updatedAt).localeCompare(a.sortAt || a.updatedAt),
    );
    notebook.updatedAt = new Date().toISOString();
    persist(notebook, ownerId);
    return notebook;
  });
  queue = run.then(() => undefined, () => undefined);
  const result = await run;
  try { const { mirrorDataForUser } = await import("./cloud-sync"); if (ownerId !== "local") await mirrorDataForUser(ownerId); } catch { /* Local persistence remains available without Firebase. */ }
  return result;
}
export async function deleteCodingProblem(key: string, ownerId = "local") {
  const run = queue.then(() => {
    const notebook = readCodingNotebook(ownerId);
    notebook.deletedProblems ||= {};
    const next = notebook.problems.filter((problem) => problem.key !== key);
    if (next.length === notebook.problems.length) return { deleted: false, notebook };
    notebook.problems = next;
    notebook.updatedAt = new Date().toISOString();
    notebook.deletedProblems[key] = notebook.updatedAt;
    persist(notebook, ownerId);
    return { deleted: true, notebook };
  });
  queue = run.then(() => undefined, () => undefined);
  const result = await run;
  if (result.deleted && ownerId !== "local") {
    const { mirrorDataForUser } = await import("./cloud-sync");
    await mirrorDataForUser(ownerId);
  }
  return result;
}
