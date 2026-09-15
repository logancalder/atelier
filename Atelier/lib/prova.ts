import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminDb, firebaseAdminConfigured } from "./firebase-admin";
import { mergeProblemLibrary } from "./problem-library";
import { readCodingNotebook } from "./coding-db";
import { DATA_DIR } from "./data-path";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import type { CodingProblem } from "./types";

export type ProvaProblem = {
  identity?: string; codingKeys?: string[]; codingUpdatedAt?: string; mergedLibraryNotes?: string[];
  id: number; problemNo: string; title: string; category: string; difficulty: string; url: string;
  dateSolved: string; solvedFirstTime: string; holeInOne: string; solvedSub20: string;
  isCompetent: string; notes: string; solved: boolean; solveTime: string; site: string;
};

const TARGET_EMAIL = "lcalder2022@gmail.com";
const reference = (uid: string) => adminDb().collection("users").doc(uid).collection("snapshots").doc("prova");

function readSeed(): ProvaProblem[] {
  const candidates = [path.join(process.cwd(), "data", "prova-seed.json"), path.join(process.cwd(), "..", "data.json")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (validProvaProblems(parsed)) return normalizeProblems(parsed);
    } catch { /* A missing or malformed local seed should not prevent the app from starting. */ }
  }
  return [];
}

export function validProvaProblems(value: unknown): value is ProvaProblem[] {
  const requiredStringFields = ["problemNo", "title"];
  const optionalStringFields = ["category", "difficulty", "url", "dateSolved", "solvedFirstTime", "holeInOne", "solvedSub20", "isCompetent", "notes"];
  return Array.isArray(value) && value.length <= 5000 && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const problem = item as Record<string, unknown>;
    if (typeof problem.id !== "number" || !Number.isFinite(problem.id) || typeof problem.solved !== "boolean") return false;
    if (!requiredStringFields.every((field) => typeof problem[field] === "string" && (problem[field] as string).length <= 2_048)) return false;
    if (!optionalStringFields.every((field) => problem[field] === undefined || (typeof problem[field] === "string" && (problem[field] as string).length <= (field === "notes" ? 50_000 : 2_048)))) return false;
    if (problem.solveTime !== undefined && typeof problem.solveTime !== "string") return false;
    if (problem.identity !== undefined && (typeof problem.identity !== "string" || problem.identity.length > 2_048)) return false;
    if (problem.codingUpdatedAt !== undefined && (typeof problem.codingUpdatedAt !== "string" || problem.codingUpdatedAt.length > 2_048)) return false;
    if (problem.codingKeys !== undefined && (!Array.isArray(problem.codingKeys) || problem.codingKeys.length > 100 || problem.codingKeys.some((key) => typeof key !== "string" || key.length > 2_048))) return false;
    if (problem.mergedLibraryNotes !== undefined && (!Array.isArray(problem.mergedLibraryNotes) || problem.mergedLibraryNotes.length > 100 || problem.mergedLibraryNotes.some((note) => typeof note !== "string" || note.length > 50_000))) return false;
    if (problem.site !== undefined && !["", "LC", "NC"].includes(String(problem.site))) return false;
    const minutes = problem.solveTime === undefined || problem.solveTime === "" ? 0 : Number(problem.solveTime);
    return Number.isFinite(minutes) && minutes >= 0;
  });
}

function normalizeProblem(problem: ProvaProblem): ProvaProblem {
  return {
    id: problem.id,
    ...(Array.isArray(problem.mergedLibraryNotes) ? {mergedLibraryNotes:problem.mergedLibraryNotes.filter(n=>typeof n === "string")} : {}),
    ...(typeof problem.identity === "string" ? { identity:problem.identity } : {}),
    ...(Array.isArray(problem.codingKeys) ? { codingKeys:problem.codingKeys.filter(k=>typeof k === "string") } : {}),
    ...(typeof problem.codingUpdatedAt === "string" ? { codingUpdatedAt:problem.codingUpdatedAt } : {}),
    problemNo: problem.problemNo ?? "",
    title: problem.title ?? "",
    category: problem.category ?? "",
    difficulty: problem.difficulty ?? "",
    url: problem.url ?? "",
    dateSolved: problem.dateSolved ?? "",
    solvedFirstTime: problem.solvedFirstTime ?? "",
    holeInOne: problem.holeInOne ?? "",
    solvedSub20: problem.solvedSub20 ?? "",
    isCompetent: problem.isCompetent ?? "",
    notes: problem.notes ?? "",
    solved: Boolean(problem.solved),
    solveTime: problem.solveTime && Number.isFinite(Number(problem.solveTime)) && Number(problem.solveTime) >= 0 ? String(Number(problem.solveTime)) : "",
    site: problem.site === "LC" || problem.site === "NC" ? problem.site : "",
  };
}

function normalizeProblems(problems: ProvaProblem[]) {
  return problems.map(normalizeProblem);
}

export async function readProva(user: DecodedIdToken | null) {
  const seed = readSeed();
  if (!firebaseAdminConfigured) {
    const file = path.join(DATA_DIR, "prova.json");
    const stored = existsSync(file) ? JSON.parse(readFileSync(file,"utf8")) : seed;
    return mergeProblemLibrary(validProvaProblems(stored) ? normalizeProblems(stored) : seed, readCodingNotebook("local").problems);
  }
  if (!user) return [];
  const snapshot = await reference(user.uid).get();
  if (snapshot.exists) {
    const problems = snapshot.data()?.problems;
    return mergeProblemLibrary(validProvaProblems(problems) ? normalizeProblems(problems) : [], readCodingNotebook(user.uid).problems);
  }
  const problems = user.email?.toLowerCase() === TARGET_EMAIL ? seed : [];
  await writeProva(user.uid, problems);
  return mergeProblemLibrary(problems, readCodingNotebook(user.uid).problems);
}

export async function writeProva(uid: string, problems: ProvaProblem[]) {
  if (!firebaseAdminConfigured) {
    mkdirSync(DATA_DIR,{recursive:true}); const file=path.join(DATA_DIR,"prova.json");
    const merged=mergeProblemLibrary(normalizeProblems(problems),readCodingNotebook("local").problems);
    writeFileSync(file+".tmp",JSON.stringify(merged,null,2)); renameSync(file+".tmp",file); return merged;
  }
  const normalized = mergeProblemLibrary(normalizeProblems(problems), readCodingNotebook(uid).problems);
  await reference(uid).set({ problems: normalized, updatedAt: FieldValue.serverTimestamp(), source: "atelier" });
  await adminDb().collection("users").doc(uid).set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return normalized;
}

export async function syncCodingProblemsToProva(uid: string, codingProblems: CodingProblem[]) {
  if (!firebaseAdminConfigured) { const current=await readProva(null); await writeProva('local',mergeProblemLibrary(current,codingProblems)); return {matched:codingProblems.length,unmatched:0}; }
  await adminDb().runTransaction(async transaction => {
    const ref=reference(uid), snapshot=await transaction.get(ref);
    const stored=snapshot.data()?.problems;
    const next=mergeProblemLibrary(validProvaProblems(stored) ? normalizeProblems(stored) : [],codingProblems);
    transaction.set(ref,{problems:next,updatedAt:FieldValue.serverTimestamp(),source:'atelier'});
  });
  return {matched:codingProblems.length,unmatched:0};
}
