import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminDb, firebaseAdminConfigured } from "./firebase-admin";
import type { CodingProblem } from "./types";

export type ProvaProblem = {
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
    if (problem.site !== undefined && !["", "LC", "NC"].includes(String(problem.site))) return false;
    const minutes = problem.solveTime === undefined || problem.solveTime === "" ? 0 : Number(problem.solveTime);
    return Number.isFinite(minutes) && minutes >= 0;
  });
}

function normalizeProblem(problem: ProvaProblem): ProvaProblem {
  return {
    id: problem.id,
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
  if (!firebaseAdminConfigured) return seed;
  if (!user) return [];
  const snapshot = await reference(user.uid).get();
  if (snapshot.exists) {
    const problems = snapshot.data()?.problems;
    return validProvaProblems(problems) ? normalizeProblems(problems) : [];
  }
  const problems = user.email?.toLowerCase() === TARGET_EMAIL ? seed : [];
  await writeProva(user.uid, problems);
  return problems;
}

export async function writeProva(uid: string, problems: ProvaProblem[]) {
  if (!firebaseAdminConfigured) return problems;
  const normalized = normalizeProblems(problems);
  await reference(uid).set({ problems: normalized, updatedAt: FieldValue.serverTimestamp(), source: "atelier" });
  await adminDb().collection("users").doc(uid).set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return normalized;
}

const exactTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function firstAcceptedDate(problem: CodingProblem) {
  return problem.submissions
    .filter((submission) => submission.accepted && !Number.isNaN(new Date(submission.at).valueOf()))
    .map((submission) => submission.at)
    .sort()[0]
    ?.slice(0, 10) ?? "";
}

function codingUrl(problem: CodingProblem) {
  return problem.leetcodeSlug ? `https://leetcode.com/problems/${problem.leetcodeSlug}/` : problem.url;
}

export async function syncCodingProblemsToProva(uid: string, codingProblems: CodingProblem[]) {
  if (!firebaseAdminConfigured) return { matched: 0, unmatched: codingProblems.length };
  const snapshot = await reference(uid).get();
  const stored = snapshot.data()?.problems;
  if (!snapshot.exists || !validProvaProblems(stored)) return { matched: 0, unmatched: codingProblems.length };

  const next = [...stored];
  const indexes = new Map(next.map((problem, index) => [exactTitle(problem.title), index]));
  let matched = 0;

  for (const coding of codingProblems) {
    const index = indexes.get(exactTitle(coding.title));
    if (index === undefined) continue;
    const current = next[index];
    const dateSolved = firstAcceptedDate(coding);
    const solved = Boolean(dateSolved);
    const submissionCount = Number.isInteger(coding.submissionCountOverride)
      ? coding.submissionCountOverride as number
      : coding.submissions.length;
    next[index] = {
      ...current,
      problemNo: current.problemNo || coding.leetcodeFrontendId || "",
      category: current.category || coding.tags?.[0] || "",
      difficulty: current.difficulty || coding.difficulty || "",
      url: current.url || codingUrl(coding),
      dateSolved: dateSolved || current.dateSolved,
      notes: coding.notes || current.notes,
      solved: current.solved || solved,
      solvedFirstTime: solved ? (submissionCount === 1 ? "Y" : "N") : current.solvedFirstTime,
      holeInOne: solved ? (coding.holeInOne ? "Y" : "N") : current.holeInOne,
      solvedSub20: solved ? (coding.seconds > 0 && coding.seconds <= 1200 ? "Y" : "N") : current.solvedSub20,
    };
    matched += 1;
  }

  if (matched) await writeProva(uid, next);
  return { matched, unmatched: codingProblems.length - matched };
}
